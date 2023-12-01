import {AssetType} from '../../db/models/Asset'
import {findAsset, processAssetBid} from "../../helpers/asset.helper";
import {currentUser} from "../../services/auth";

const bidOnAsset = async (asset: AssetType, ctx: any) => {
  const bidTime = new Date().getTime()
  const buyer = await currentUser(ctx.jwt, asset.buyerAddress)
  const assetInstance: any = await findAsset(asset.id)
  if (!assetInstance) throw Error(`Could not find asset with id:  ${asset.id}`)
  if (!assetInstance.$auction()) throw Error('Can not bid on an asset not for auction')
  //if (!assetInstance.$listed()) throw Error('Can not bid on an unlisted asset')
  if (!assetInstance.$minted()) throw Error('Can not bid on an unminted asset')
  if (assetInstance.$bought()) throw Error('Can not bid on an asset already bought')
  const startTime = new Date(assetInstance.auction.startTime).getTime()
  const endTime = new Date(assetInstance.auction.endTime).getTime()
  if (bidTime < startTime) throw Error('Auction has not started')
  if (bidTime > endTime) throw Error('Auction has ended')
  if (!asset.amount || asset.amount <= 0) throw Error('Bid must be greater than 0')
  if (asset.amount && assetInstance.auction.amount && asset.amount < assetInstance.auction.amount) throw Error('Bid must be greater than reserve price')
  if (asset.amount && assetInstance.winningBid && asset.amount <= assetInstance.winningBid.amount) throw Error('Bid must be greater than the current highest bid')
  if (assetInstance.winningBid && assetInstance.winningBid.userId == buyer.id) throw Error('Your last bid is currently the highest bid')
  if (!asset.signedTxn) throw Error('Signed transaction for bid required')
  asset.userId = buyer.id
  return await processAssetBid(assetInstance, asset)
}

export default bidOnAsset