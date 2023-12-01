import {UserLookup} from "../db/models/UserLookup";
import {LOOKUP_CATEGORIES, LOOKUP_USER_TYPES} from "../db/models/Lookup";
import {User, UserType} from "../db/models/User";
import {creatorAppAddress, giveRewards, sendTxn} from "../services/algorand";
import {createTransaction, TransactionParams} from "./transaction.helper";
import {TRANSACTION_TYPES} from "../db/models/Transaction";
import {checkCreatorWhitelist} from "../services/whitelist";
import {CREATOR_REFERRAL_CODE_PREFIX, REWARDTYPE} from "../services/const";
import {Asset} from "../db/models/Asset";
import {ASSET_FIND_RELATIONSHIPS} from "./asset.helper";

const USER_FIND_RELATIONSHIPS = '[interests, rewards, types, creatorApp, notifications.[asset, rating, comment, owner, originator, transaction.[buyer, owner, asset, saleType]]]'

export const findUser = async (walletAddress: string) => {
  return await User.query()
      .withGraphJoined(USER_FIND_RELATIONSHIPS)
      .findOne('users.walletAddress', walletAddress)
}

export const findUserByReferral = async (referralCode: string) => {
  const [id, startWallet, endWallet] = decodeReferralCode(referralCode)
  let user = undefined
  if (referralCode && id > 0) {
    user = await User.query()
      .withGraphJoined(USER_FIND_RELATIONSHIPS)
      .findOne('users.id', id)
    if (user && (startWallet != user.walletAddress.substring(0,3) || endWallet != user.walletAddress.slice(-3)))
      user = undefined
  }
  return user
}

export const getReferralCode = (walletAddress: string, id: number) => {
  return Buffer.from(walletAddress.substring(0,3) + walletAddress.slice(-3) + '-' + id.toString()).toString('base64')
}

export const decodeReferralCode = (referralCode: string) => {
  const creatorCode = referralCode.startsWith(CREATOR_REFERRAL_CODE_PREFIX)
  let referral: any
  if (creatorCode) {
    referral = referralCode.split(CREATOR_REFERRAL_CODE_PREFIX).pop()
    referral = Buffer.from(referral, 'base64').toString()
  } else {
    referral = Buffer.from(referralCode, 'base64').toString()
  }
  const refParts = referral.split('-')
  let id: number = 0
  let startWallet: string = ''
  let endWallet: string = ''
  if (refParts.length > 1) {
    if (creatorCode) {
      startWallet = refParts[1].substring(0,3)
      endWallet = refParts[1].slice(-3)
      id = parseInt(refParts[0])
    } else {
      startWallet = refParts[0].substring(0,3)
      endWallet = refParts[0].slice(-3)
      id = parseInt(refParts[1])
    }
  }
  return [id, startWallet, endWallet]
}

export const getCreatorReferralCode = (walletAddress: string, id: number) => {
  return CREATOR_REFERRAL_CODE_PREFIX + Buffer.from( id.toString() + '-' + walletAddress.substring(0,3) + walletAddress.slice(-3)).toString('base64')
}

export const kycUser = async(id: number, kyc: boolean) => {
  const user = await User.query().findById(id)
  if (user) {
    await user.$query().patch({
      kyc: kyc ? kyc : false,
      kycDate: kyc ? (new Date()).toISOString() : null,
      referralCode: kyc ? getReferralCode(user.walletAddress, user.id) : null,
      creatorReferralCode: kyc ? getCreatorReferralCode(user.walletAddress, user.id) : null
    })
  }
}

export const createUser = async (user: any) => {
  // For related records that already exist we need to add ID's using #dbRef
  dbRef(user)
  if (user.hasOwnProperty('metadata')) user.metadata = JSON.stringify(user.metadata)
  await User.transaction(async trx => {
    const newUser = await User.query(trx)
      .insertGraph(user)
    // Everyone gets a referral code
    const updates = {
      referralCode: getReferralCode(newUser.walletAddress, newUser.id),
      creatorReferralCode: getCreatorReferralCode(newUser.walletAddress, newUser.id)
    }
    await User.query(trx)
      .patch(updates)
      .findById(newUser.id)
  })
  return await findUser(user.walletAddress)
}

export const updateUser =  async (existingUser: any, user: any) => {
  delete user.walletAddress
  if (user.hasOwnProperty('metadata')) user.metadata = JSON.stringify(user.metadata)
  await User.transaction(async trx => {
    await existingUser.$query(trx).patch(user)
    if (user.hasOwnProperty('interests')) {
      await UserLookup.query(trx)
        .joinRelated('lookup')
        .delete()
        .where({userId: existingUser.id, type: LOOKUP_CATEGORIES})
      if (user.interests && user.interests.length > 0) await existingUser.$relatedQuery('interests', trx).relate(user.interests)
    }
    if (user.hasOwnProperty('types') ) {
      await UserLookup.query(trx)
        .joinRelated('lookup')
        .delete()
        .where({userId: existingUser.id, type: LOOKUP_USER_TYPES})
      if (user.types && user.types.length > 0) await existingUser.$relatedQuery('types', trx).relate(user.types)
    }
  })
  return await findUser(existingUser.walletAddress)
}

const dbRef = (user: any) => {
  if (user.hasOwnProperty('interests'))
    user.interests = user.interests.map((id: number) => ({"#dbRef": id}))
  if (user.hasOwnProperty('types'))
    user.types = user.types.map((id: number) => ({"#dbRef": id}))
  return user
}

export const getMessageReceivedTotals = async (id: number) => {
  return await User.query().select(
    User.relatedQuery('nftMessages')
      .count()
      .as('nftMessageTotal'),
    User.relatedQuery('nftMessages')
      .count()
      .as('nftMessageRead')
      .whereNotNull('messageRead'),
    User.relatedQuery('privateMessages')
      .count()
      .as('privateMessageTotal'),
    User.relatedQuery('privateMessages')
      .count()
      .as('privateMessageRead')
      .whereNotNull('messageRead'))
    .where(`id`, id)
    .first()
}

export const createCreatorApp =  async (existingUser: any, user: any) => {
  const result = await sendTxn(user.unsignedTxn)
  //console.log("createCreatorApp result: ", result)
  const address = await creatorAppAddress(result)
  //console.log("createCreatorApp address: ", address)
  let transaction: TransactionParams = {
    type: TRANSACTION_TYPES.APP_CREATE,
    userId: existingUser.id,
    txIds: JSON.stringify(address.txnIds[0]),
    appAddress: address.appAddress,
    appId: address.appId
  }
  //console.log("createCreatorApp transaction: ", transaction)
  await User.transaction(async trx => {
    const creatorAppTransactionId = await createTransaction(transaction, trx)
    let updates: any = {
      creatorAppTransactionId: creatorAppTransactionId.id
    }
    await User.query(trx)
      .patch(updates)
      .findById(existingUser.id)
  })
  return await findUser(existingUser.walletAddress)
}

export const giveUserRewards =  async (walletAddress: string, rewardType: string, rewardAmount: number = 1,  assetId: any = null) => {
  let amount = rewardAmount
  let transactionRecord = undefined
  let res = await User.query().select(
    User.relatedQuery('rewards')
      .sum('rewards.amount')
      .as('rewardCount')
      .whereRaw("rewards.updated_at BETWEEN NOW() - INTERVAL '24 HOURS' AND NOW()"))
    .where('walletAddress', walletAddress)
    .first()
  // Only allowed 20 rewards per 24 hour period
  if (res && res.rewardCount >= 20) return transactionRecord
  // For asset related activity only credit one token per
  // day for a particular activity on an asset
  if (assetId) {
    res = await User.query().select(
      User.relatedQuery('rewards')
        .sum('rewards.amount')
        .as('rewardCount')
        .whereRaw("rewards.updated_at BETWEEN NOW() - INTERVAL '24 HOURS' AND NOW()")
        .where('rewards.asset_id', assetId)
        .where('rewards.reward_type', rewardType))
      .where('walletAddress', walletAddress)
      .first()
    if (res && res.rewardCount > 0) return transactionRecord
  }
  // For LOGIN reward type only credit one login per 24 hour period
  if (rewardType == REWARDTYPE.LOGIN) {
    res = await User.query().select(
      User.relatedQuery('rewards')
        .sum('rewards.amount')
        .as('rewardCount')
        .whereRaw("rewards.updated_at BETWEEN NOW() - INTERVAL '24 HOURS' AND NOW()")
        .where('rewards.reward_type', rewardType))
      .where('walletAddress', walletAddress)
      .first()
    if (res && res.rewardCount > 0) return transactionRecord
    // Check login count and if login for 7 days straight give reward
    res = await User.query().select(
      User.relatedQuery('rewards')
        .count()
        .as('rewardCount')
        .whereRaw("rewards.updated_at BETWEEN NOW() - INTERVAL '168 HOURS' AND NOW()")
        .where('rewards.reward_type', rewardType))
      .where('walletAddress', walletAddress)
      .first()
    if (res && res.rewardCount >= 6) amount += 1
  }
  // Give rewards
  const user = await findUser(walletAddress)
  if (user) {
    const result = await giveRewards(user.walletAddress, amount * 1000000)
    if (result) {
      let transaction: TransactionParams = {
        type: TRANSACTION_TYPES.REWARD,
        userId: user.id,
        assetId: assetId ? assetId : null,
        txIds: JSON.stringify(result.txnId[0]),
        amount: amount,
        rewardType: rewardType
      }
      await Asset.transaction(async trx => {
        transactionRecord = await createTransaction(transaction, trx)
      })
    }
  }
  return transactionRecord
}



