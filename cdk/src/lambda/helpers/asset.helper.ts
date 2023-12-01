import {User} from "../db/models/User";
import {Asset} from "../db/models/Asset";
import {Transaction, TRANSACTION_TYPES} from "../db/models/Transaction";
import {createTransaction, TransactionParams} from "./transaction.helper";
import {Lookup, LOOKUP_SALE_TYPES} from "../db/models/Lookup";
import {AppAddress, sendTxn} from "../services/algorand";
import {createNotification} from "./notification.helper";
import {NOTIFICATION_TYPES} from "../db/models/Notification";
import {Optin, OptinType} from "../db/models/Optins";
import {ASSETKIND, ASSETSTATUS, REWARDTYPE} from "../services/const";
import {Rating} from "../db/models/Rating";
import {raw, ref} from "objection";
import {findUser, giveUserRewards} from "./user.helper";

export const ASSET_FIND_RELATIONSHIPS = '[saleType, owner, minter, categories, mint.[asset, owner, buyer, saleType], list.[asset, owner, buyer, saleType], buy.[asset, owner, buyer, saleType], winningBid.[asset, owner, buyer, saleType], delist.[asset, owner, buyer, saleType], auction.[asset, owner, buyer, saleType], app.[asset, owner, buyer, saleType], optin.[asset, owner, buyer, saleType]]'

const dbRef = (asset: any) => {
  if (asset.hasOwnProperty('categories'))
    asset.categories = asset.categories.map((id: number) => ({"#dbRef": id}))
  return asset
}

export const getAge = (dob: any) => {
  var today = new Date()
  var birthDate = new Date(dob)
  var age = today.getFullYear() - birthDate.getFullYear()
  var m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate()))
  {
    age--
  } else if (m > 0) {
    age++
  }
  //console.log(`dob: ${dob} age: ${age} months: ${m}`)
  return age
}

export const findAsset = async (id: number) => {
  return await Asset.query()
    .withGraphJoined(ASSET_FIND_RELATIONSHIPS)
    .findOne('assets.id', id)
}

export const getAssetsQuery = async(args: any, user: User, countOnly: boolean) => {
  let query = Asset.query()
    .withGraphJoined(ASSET_FIND_RELATIONSHIPS)
  if (!args.hasOwnProperty('status') || !args.status)
    args.status = []
  // For backward compatability
  if (args.hasOwnProperty('ownedByCurrentUser') && args.ownedByCurrentUser == true) {
    if (args.hasOwnProperty('onlyListed') && args.onlyListed) {
      args.status.push(ASSETSTATUS.LISTED)
    } else {
      if (args.status.length <= 0) {
        query.where('assets.user_id', user.id)
      }
    }
  } else {
    if (args.hasOwnProperty('onlyListed') && args.onlyListed) {
      args.status.push(ASSETSTATUS.VISIBLE)
    } else {
      if (args.status.length <= 0) {
        args.status.push(ASSETSTATUS.HIDDEN)
        args.status.push(ASSETSTATUS.VISIBLE)
      }
    }
  }
  if (args.hasOwnProperty('ownedByWalletAddress') && args.ownedByWalletAddress) {
    const owner = await findUser(args.ownedByWalletAddress)
    if (owner) {
      query.where('assets.user_id', owner.id)
      if (args.hasOwnProperty('status') && args.status) {
        if (!args.status.includes(ASSETSTATUS.VISIBLE))
          args.status.push(ASSETSTATUS.VISIBLE)
      }
      else {
        args.status = [ASSETSTATUS.VISIBLE]
      }
    }
  } else if (args.status.length <= 0) {
    query.where('assets.user_id', user.id)
  }
  /*
  MINTED - current user minted
  UNMINTED - current user unminted
  LISTED - current user listed
  SOLD - current user sold
  VISIBLE - listed(visible) for all users
  HIDDEN - current user all non-listed
  */
  if (args.status.length > 0) {
    if (args.status.includes(ASSETSTATUS.VISIBLE) && args.status.includes(ASSETSTATUS.HIDDEN)) {
      // Include hidden assets for current user & all visible assets
      query.where(function () {
        this.where('assets.user_id', user.id)
          .orWhereNotNull('assets.listTransactionId')
          .orWhereNotNull('assets.auctionTransactionId')
          .orWhereIn('assets.kind', [ASSETKIND.AUDIO, ASSETKIND.VIDEO, ASSETKIND.FREE_VIDEO])
      })
    } else {
      if (!args.status.includes(ASSETSTATUS.VISIBLE) ||
        (args.status.includes(ASSETSTATUS.VISIBLE) && args.status.length > 1))
        // All statuses other than visible are filtered by current user
        query.where('assets.user_id', user.id)
      if (args.status.includes(ASSETSTATUS.VISIBLE) ||
        args.status.includes(ASSETSTATUS.LISTED)) {
        query.where(function () {
          this.whereNotNull('assets.listTransactionId')
            .orWhereNotNull('assets.auctionTransactionId')
            .orWhereIn('assets.kind', [ASSETKIND.AUDIO, ASSETKIND.VIDEO, ASSETKIND.FREE_VIDEO])
        })
      }
      if (!args.status.includes(ASSETSTATUS.LISTED) && args.status.includes(ASSETSTATUS.HIDDEN))
        // If we are already filtering by current users listing then do not include hidden
        query.whereNull('assets.listTransactionId')
          .whereNull('assets.auctionTransactionId')
          .whereNotIn('assets.kind', [ASSETKIND.AUDIO, ASSETKIND.VIDEO, ASSETKIND.FREE_VIDEO])
    }
    if (args.status.includes(ASSETSTATUS.UNMINTED))
      query.whereNull('assets.mintTransactionId')
    if (args.status.includes(ASSETSTATUS.MINTED))
      query.whereNotNull('assets.mintTransactionId')
    if (args.status.includes(ASSETSTATUS.SOLD))
      query.whereNotNull('assets.buyTransactionId')
  }
  if (args.hasOwnProperty('categories') &&
    args.categories &&
    Array.isArray(args.categories) &&
    args.categories.length > 0)
    query.whereIn('categories.id', args.categories)
  if (args.hasOwnProperty('kind') && args.kind)
    query.whereIn('assets.kind', args.kind)
  if (args.hasOwnProperty('sort')) {
    if (args.sort == 'LATEST_ADDED')
      query.orderBy('assets.created_at', 'desc')
    else if (args.sort == 'PRICE_HL')
      query.orderBy('assets.price', 'desc')
    else if (args.sort == 'PRICE_LH')
      query.orderBy('assets.price', 'asc')
    else if (args.sort == 'MOST_VIEWED')
      query.orderBy('assets.views', 'desc')
    else if (args.sort == 'TOP_RATED') {
      query.select([
        Rating.query()
          .select(raw('coalesce(sum(rating), 0)'))
          .where('assetId', ref('assets.id'))
          .as('ratings')
      ])
      query.orderBy('ratings', 'desc')
    }
  } else {
    query.orderBy('assets.created_at', 'desc')
  }
  if (args.hasOwnProperty('offset')) query.offset(args.offset)
  query.select([
    Rating.query()
      .select('rating')
      .where('userId', user.id)
      .where('assetId', ref('assets.id'))
      .as('myRating')
  ])
  if (args.hasOwnProperty('limit') && args.limit > 0) query.limit(args.limit)
  //if (args.hasOwnProperty('ownedByCurrentUser') && args.ownedByCurrentUser == true)
  //  console.log("query: ", query.toKnexQuery().toQuery())
  let results = await query
  if (countOnly)
    return {totalCount: results.length}
  else
    return results
}

export const findOptinTransaction = async (assetId: number, userId: number) => {
  let tranRecord = null
  const optin :any = await Optin.query()
    .findOne({
      assetId: assetId,
      userId: userId
    })
  if (optin)
    tranRecord = await Transaction.query()
      .withGraphJoined('[asset, owner, buyer, saleType]')
      .findOne('transactions.id', optin.transactionId)
  return tranRecord
}

export const createAsset = async (asset: any, owner: User) => {
  // For related records that already exist we need to add ID's using #dbRef
  dbRef(asset)
  asset.userId = owner.id
  if (asset.hasOwnProperty('ownerAddress')) delete asset.ownerAddress
  let newAsset: any
  await Asset.transaction(async trx => {
    newAsset = await Asset.query(trx)
      .insertGraph(asset)
    await createTransaction({
      type: TRANSACTION_TYPES.ADD,
      userId: asset.userId,
      assetId: newAsset.id
    }, trx)
  })
  if (owner.kyc &&
    (asset.kind == ASSETKIND.FREE_VIDEO ||
      asset.kind == ASSETKIND.NFT_VIDEO || asset.kind == ASSETKIND.VIDEO ||
      asset.kind == ASSETKIND.NFT_AUDIO || asset.kind == ASSETKIND.AUDIO))
    await giveUserRewards(owner.walletAddress, REWARDTYPE.CONTENT, 1, newAsset.id)
  return await findAsset(newAsset.id)
}

export const updateAssetList =  async (existingAsset: any, asset: any) => {
  const fixedPrice = await Lookup.query()
    .where({
      type: LOOKUP_SALE_TYPES,
      description: 'Fixed Price'
    }).first()
  if (!fixedPrice) throw Error('Could not find Fixed Price look up record')
  const result = await sendTxn(asset.signedTxn)
  let transaction: TransactionParams = {
    type: TRANSACTION_TYPES.LIST,
    userId: existingAsset.userId,
    assetId: existingAsset.id,
    currency: asset.currency,
    sellType: fixedPrice?.id,
    txIds: JSON.stringify(result.txnId[0]),
    amount: asset.price
  }
  let updates: any = {
    currency: asset.currency,
    buyTxId: null,
    buyTransactionId: null,
    winBidTransactionId: null,
    deListTransactionId: null,
    deListTxId: null,
    sellType: fixedPrice.id,
    listingTxId: result.txnId[0]
  }
  if (asset.hasOwnProperty('price')) updates["price"] = asset.price
  await Asset.transaction(async trx => {
    const listTransaction = await createTransaction(transaction, trx)
    updates['listTransactionId'] = listTransaction.id
    await Asset.query(trx)
      .patch(updates)
      .findById(existingAsset.id)
  })
  return await findAsset(existingAsset.id)
}

export const createAssetApp =  async (existingAsset: any, asset: any) => {
  const result = await sendTxn(asset.signedTxn)
  const address = await AppAddress(result.txnId[1])
  let transaction: TransactionParams = {
    type: TRANSACTION_TYPES.APP_CREATE,
    userId: existingAsset.userId,
    assetId: existingAsset.id,
    txIds: JSON.stringify(result.txnId[1]),
    appAddress: address.appAddress,
    appId: address.appId,
    currency: getCurrency(existingAsset),
  }
  let updates: any = {}
  if (asset.hasOwnProperty('royaltyFee')) transaction["royaltyFee"] = asset.royaltyFee
  await Asset.transaction(async trx => {
    const appTransactionId = await createTransaction(transaction, trx)
    let updates: any = {
      appTransactionId: appTransactionId.id
    }
    await Asset.query(trx)
      .patch(updates)
      .findById(existingAsset.id)
  })
  return await findAsset(existingAsset.id)
}

export const optinAssetApp =  async (existingAsset: any, asset: any) => {
  const result = await sendTxn(asset.signedTxn)
  let transaction: TransactionParams = {
    type: TRANSACTION_TYPES.APP_OPTIN,
    userId: existingAsset.userId,
    assetId: existingAsset.id,
    txIds: JSON.stringify(result.txnId[0]),
    currency: getCurrency(existingAsset),
  }
  let updates: any = {}
  await Asset.transaction(async trx => {
    const optinTransactionId = await createTransaction(transaction, trx)
    let updates: any = {
      optinTransactionId: optinTransactionId.id
    }
    await Asset.query(trx)
      .patch(updates)
      .findById(existingAsset.id)
  })
  return await findAsset(existingAsset.id)
}

export const optinAssetUser =  async (existingAsset: any, userId: number, signedTxn: string) => {
  const result = await sendTxn(signedTxn)
  let transaction: TransactionParams = {
    type: TRANSACTION_TYPES.ASSET_OPTIN,
    userId: existingAsset.userId,
    assetId: existingAsset.id,
    txIds: JSON.stringify(result.txnId[0]),
    currency: getCurrency(existingAsset),
  }
  let updates: any = {}
  await Optin.transaction(async trx => {
    const optinTransactionId = await createTransaction(transaction, trx)
    let updates: any = {
      transactionId: optinTransactionId.id,
      userId: userId,
      assetId: existingAsset.id,
    }
    await Optin.query(trx)
      .insert(updates)
  })
  return await findOptinTransaction(existingAsset.id, userId)
}

export const updateAssetValues =  async (existingAsset: any, asset: any) => {
  let updates: any = {
    kind: asset.kind
  }
  await Asset.transaction(async trx => {
    await Asset.query(trx)
      .patch(updates)
      .findById(existingAsset.id)
  })
  return await findAsset(existingAsset.id)
}

export const updateAssetMint =  async (existingAsset: any, asset: any) => {
  const result = await sendTxn(asset.signedTxn)
  let updates: any = {
    minterId: asset.minterId,
    txId: result.txnId[0],
    asaId: result?.txnResponse?.['asset-index']
  }
  const transaction: TransactionParams = {
    type: TRANSACTION_TYPES.MINT,
    userId: existingAsset.userId,
    assetId: existingAsset.id,
    txIds: JSON.stringify(result.txnId[0])
  }
  await Asset.transaction(async trx => {
    const mintTransactionId = await createTransaction(transaction, trx)
    updates['mintTransactionId'] = mintTransactionId.id
    await Asset.query(trx)
      .patch(updates)
      .findById(existingAsset.id)
  })
  return await findAsset(existingAsset.id)
}

export const updateAssetDelisted =  async (existingAsset: any, asset: any) => {
  const result = await sendTxn(asset.signedTxn)
  const transaction: TransactionParams = {
    type: TRANSACTION_TYPES.DELIST,
    userId: existingAsset.userId,
    assetId: existingAsset.id,
    txIds: JSON.stringify(result.txnId[0])
  }
  // Asset updates
  let updates: any = {
    sellType: null,
    currency: null,
    price: null,
    listingTxId: null,
    listTransactionId: null,
    winBidTransactionId: null,
    auctionTransactionId: null,
    deListTxId: result.txnId[0]
  }
  await Asset.transaction(async trx => {
    const deListTransactionId  = await createTransaction(transaction, trx)
    updates['deListTransactionId'] = deListTransactionId.id
    await Asset.query(trx)
      .patch(updates)
      .findById(existingAsset.id)
  })
  return await findAsset(existingAsset.id)
}

export const updateAssetBuy =  async (existingAsset: any, asset: any) => {
  const result = await sendTxn(asset.signedTxn)
  const transaction: TransactionParams = {
    type: TRANSACTION_TYPES.BUY,
    userId: existingAsset.userId,
    assetId: existingAsset.id,
    buyerId: asset.userId,
    amount: getPrice(existingAsset),
    currency: getCurrency(existingAsset),
    sellType: getSellType(existingAsset),
    txIds: JSON.stringify(result.txnId[0])
  }
  let updates: any = {
    listingTxId: null,
    listTransactionId: null,
    userId: asset.userId,
    price: null,
    buyTxId: result.txnId[0],
    winBidTransactionId: null,
    auctionTransactionId: null,
  }
  const user = await User.query().findById(asset.userId)
  let buyTransactionId: any
  await Asset.transaction(async trx => {
    buyTransactionId = await createTransaction(transaction, trx)
    updates['buyTransactionId'] = buyTransactionId.id
    await Asset.query(trx)
      .patch(updates)
      .findById(existingAsset.id)
  })
  await createNotification({
    userId: existingAsset.userId,
    notification: `Your NFT was sold for ${transaction.currency}: ${transaction.amount} to ${user?.userName}.`,
    assetId: existingAsset.id,
    notificationType: NOTIFICATION_TYPES.SALE,
    originatorId: asset.userId,
    transactionId: buyTransactionId.id
  })
  await createNotification({
    userId: asset.userId,
    notification: `You have purchased the NFT from ${existingAsset?.owner?.userName} for ${transaction.currency}: ${transaction.amount}`,
    assetId: existingAsset.id,
    notificationType: NOTIFICATION_TYPES.PURCHASE,
    originatorId: existingAsset.userId,
    transactionId: buyTransactionId.id
  })
  return await findAsset(existingAsset.id)
}

export const processAssetBid =  async (existingAsset: any, asset: any) => {
  // Zach says the Tx will fail if this bid is not the highest bid
  const result = await sendTxn(asset.signedTxn)
  const transaction: TransactionParams = {
    type: TRANSACTION_TYPES.BID,
    userId: asset.userId,
    assetId: existingAsset.id,
    amount: asset.amount,
    currency: Number(existingAsset.auctionTransactionId) > 0 ? existingAsset.auction.currency : asset.currency,
    sellType: Number(existingAsset.auctionTransactionId) > 0 ? existingAsset.auction.sellType : asset.sellType,
    auctionId: existingAsset.auctionTransactionId,
    txIds: JSON.stringify(result.txnId[0])
  }
  let bidTransaction: any
  await Asset.transaction(async trx => {
    // Create bid transaction
    bidTransaction = await createTransaction(transaction, trx)
    // Update winning bid if this is the highest bid
    await Asset.query(trx)
      .patch({winBidTransactionId: bidTransaction.id})
      .where({id: existingAsset.id})
      .whereNotExists(Asset.relatedQuery('winningBid').where('winningBid.amount',  '>=', asset.amount))
    //console.log("query: ", q.toKnexQuery().toQuery())
  })
  await createNotification({
    userId: existingAsset.userId,
    notification: `A bid has been placed for ${transaction.currency}: ${transaction.amount}`,
    assetId: existingAsset.id,
    notificationType: NOTIFICATION_TYPES.BID,
    originatorId: transaction.userId,
    transactionId: bidTransaction.id
  })
  await createNotification({
    userId: transaction.userId,
    notification: `You have placed a bid for ${transaction.currency}: ${transaction.amount}`,
    assetId: existingAsset.id,
    notificationType: NOTIFICATION_TYPES.BID,
    originatorId: existingAsset.userId,
    transactionId: bidTransaction.id
  })
  return await findAsset(existingAsset.id)
}

export const createAssetAuction =  async (existingAsset: any, asset: any) => {
  const auction = await Lookup.query()
    .where({
      type: LOOKUP_SALE_TYPES,
      description: 'Auction'
    }).first()
  if (!auction) throw Error('Could not find Auction look up record')
  const result = await sendTxn(asset.signedTxn)
  let transaction: TransactionParams = {
    type: TRANSACTION_TYPES.AUCTION,
    userId: existingAsset.userId,
    assetId: existingAsset.id,
    currency: asset.currency,
    sellType: auction.id,
    txIds: JSON.stringify(result.txnId[0]),
    appId: result?.txnResponse?.['application-index'],
    startTime: asset.startTime,
    endTime: asset.endTime,
    amount: asset.reservePrice,
  }
  let updates: any = {
    currency: asset.currency,
    buyTxId: null,
    buyTransactionId: null,
    winBidTransactionId: null,
    deListTransactionId: null,
    deListTxId: null,
    sellType: auction.id,
    listingTxId: null,
    listTransactionId: null
  }
  await Asset.transaction(async trx => {
    const auctionTransaction = await createTransaction(transaction, trx)
    updates['auctionTransactionId'] = auctionTransaction.id
    await Asset.query(trx)
      .patch(updates)
      .findById(existingAsset.id)
  })
  return await findAsset(existingAsset.id)
}

export const startAssetAuction =  async (existingAsset: any, asset: any) => {
  const result = await sendTxn(asset.signedTxn)
  let transaction: TransactionParams = {
    type: TRANSACTION_TYPES.LIST,
    userId: existingAsset.userId,
    assetId: existingAsset.id,
    currency: existingAsset.auction.currency,
    sellType: existingAsset.auction.sellType,
    txIds: JSON.stringify(result.txnId[0]),
    appId: existingAsset.auction.appId,
    startTime: existingAsset.auction.startTime,
    endTime: existingAsset.auction.endTime,
    amount: existingAsset.auction.amount,
  }
  let updates: any = {
    buyTxId: null,
    buyTransactionId: null,
    winBidTransactionId: null,
    deListTransactionId: null,
    deListTxId: null,
    listingTxId: result.txnId[0]
  }
  await Asset.transaction(async trx => {
    const listTransaction = await createTransaction(transaction, trx)
    updates['listTransactionId'] = listTransaction.id
    await Asset.query(trx)
      .patch(updates)
      .findById(existingAsset.id)
  })
  return await findAsset(existingAsset.id)
}

export const endAssetAuction =  async (existingAsset: any, asset: any) => {
  const result = await sendTxn(asset.signedTxn)
  const sale = (Number(existingAsset.winBidTransactionId) > 0)
  let transaction: TransactionParams = {
    type: TRANSACTION_TYPES.AUCTION_NO_SALE,
    userId: existingAsset.userId,
    assetId: existingAsset.id,
    sellType: Number(existingAsset.auctionTransactionId) > 0 ? existingAsset.auction.sellType : asset.sellType,
    txIds: JSON.stringify(result.txnId[0]),
    auctionId: existingAsset.auctionTransactionId,
    appId: existingAsset.auction.appId,
    startTime: existingAsset.auction.startTime,
    endTime: existingAsset.auction.endTime,
    amount: 0,
  }
  let updates: any = {
    listingTxId: null,
    listTransactionId: null,
    price: null,
    winBidTransactionId: null,
    auctionTransactionId: null,
    buyTransactionId: null
  }
  if (sale) {
    transaction['type'] = TRANSACTION_TYPES.BUY
    transaction['buyerId'] = existingAsset.winningBid?.userId
    transaction['amount'] = existingAsset.winningBid?.amount
    transaction['currency'] = Number(existingAsset.auctionTransactionId) > 0 ? existingAsset.auction.currency : asset.currency
    updates['buyTxId'] = result.txnId[0]
    updates['userId'] = existingAsset.winningBid?.userId
  }
  let buyTransactionId: any
  await Asset.transaction(async trx => {
    buyTransactionId = await createTransaction(transaction, trx)
    if (sale) updates['buyTransactionId'] = buyTransactionId.id
    await Asset.query(trx)
      .patch(updates)
      .findById(existingAsset.id)
  })
  if (sale) {
    await createNotification({
      userId: existingAsset.userId,
      notification: `Your NFT was purchased by ${existingAsset.winningBid?.owner?.userName} for ${transaction.currency}: ${transaction.amount}`,
      assetId: existingAsset.id,
      notificationType: NOTIFICATION_TYPES.SALE,
      originatorId: existingAsset.userId,
      transactionId: buyTransactionId.id
    })
    await createNotification({
      userId: existingAsset.winningBid?.userId,
      notification: `You have purchased the NFT from ${existingAsset?.owner?.userName} for ${transaction.currency}: ${transaction.amount}`,
      assetId: existingAsset.id,
      notificationType: NOTIFICATION_TYPES.PURCHASE,
      originatorId: existingAsset.userId,
      transactionId: buyTransactionId.id
    })
  }
  return await findAsset(existingAsset.id)
}

export const endAuctions =  async () => {
  //console.log('endAuctions')
  // Find all auctions that have ended, generate required notifications
  const endTime = new Date().toISOString()
  const auctions = await Transaction.query()
    .whereNotNull('endTime')
    .whereNotNull('startTime')
    .whereNull('auctionClosedTime')
    .where('endTime',  '<=', endTime)
  //console.log(`endAuctions action count: ${auctions.length}`)
  for (const auction of auctions) {
    //console.log("endAuctions: found auction: ", auction)
    const asset = await Asset.query()
      .withGraphJoined('[owner, transactions.[asset, owner, buyer, saleType], winningBid.[asset, owner, buyer, saleType]]')
      .findOne('assets.id', auction.assetId)
    const transaction = await Transaction.query().findOne({id: auction.id})
    if (transaction && !transaction.auctionClosedTime) {
      await transaction.$query()
        .patch({auctionClosedTime: endTime})
      if (asset && asset.winBidTransactionId &&
        Number(asset.winBidTransactionId) > 0 &&
        transaction.type == TRANSACTION_TYPES.LIST) {
        const winningBid = asset.winningBid
        await createNotification({
          userId: asset.userId,
          notification: `Your NFT was sold for ${winningBid?.currency}: ${winningBid?.amount} to ${winningBid?.owner?.userName}`,
          assetId: asset.id,
          notificationType: NOTIFICATION_TYPES.SALE,
          originatorId: winningBid.userId,
          transactionId: asset.winBidTransactionId
        })
        await createNotification({
          userId: winningBid.userId,
          notification: `You have the winning bid of ${winningBid?.currency}: ${winningBid?.amount} for the NFT from ${asset?.owner?.userName}`,
          assetId: asset.id,
          notificationType: NOTIFICATION_TYPES.WON,
          originatorId: asset.userId,
          transactionId: asset.winBidTransactionId
        })
      }
    }
  }

}

const getCurrency = (asset: any) => {
  return Number(asset.listTransactionId) > 0 ? asset.list.currency : asset.currency
}

const getPrice = (asset: any) => {
  return Number(asset.listTransactionId) > 0 ? asset.list.amount : asset.price
}

const getSellType = (asset: any) => {
  return Number(asset.listTransactionId) > 0 ? asset.list.sellType : asset.sellType
}