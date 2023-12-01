import {AssetType} from '../../db/models/Asset'
import {endAssetAuction, findAsset} from "../../helpers/asset.helper";
import {currentUser} from "../../services/auth";

const endAuction = async (asset: AssetType, ctx: any) => {
  const user = await currentUser(ctx.jwt, asset.walletAddress)
  const assetInstance: any = await findAsset(asset.id)
  if (!assetInstance) throw Error(`Could not find asset with id:  ${asset.id}`)
  if (!assetInstance.$auction()) throw Error('This asset is not currently being auctioned')
  if (user.walletAddress != assetInstance.owner.walletAddress &&
    (!assetInstance.winningBid ||
      (assetInstance.winningBid && user.walletAddress != assetInstance.winningBid.owner.walletAddress)))
    throw Error('Unable to end auction as wallet address does not match asset owner or winning bidder wallet address')
  //const startTime = new Date(asset.startTime).getTime()
  //const endTime = new Date(asset.endTime).getTime()
  //const now = new Date(Date.now()).getTime()
  //if (now < new Date(assetInstance.auction.startTime).getTime()) throw Error('Cannot end an auction that has not started')
  // Allow auctions to be ended before endtime
  //if (new Date(assetInstance.auction.endTime).getTime() < now) throw Error('Cannot end an auction that has not finished')
  return await endAssetAuction(assetInstance, asset)
}

export default endAuction