import {AssetType} from '../../db/models/Asset'
import {findAsset, updateAssetDelisted} from "../../helpers/asset.helper";
import {currentUser} from "../../services/auth";

const delistAsset = async (asset: AssetType, ctx: any) => {
  const owner = await currentUser(ctx.jwt, asset.ownerAddress)
  const assetInstance: any = await findAsset(asset.id)
  if (!assetInstance) throw Error(`Could not find asset with id:  ${asset.id}`)
  if (!assetInstance.$listed() && !assetInstance.$auction()) {
      throw Error(`Not listed can not delist`)
  } else {
    if (assetInstance.$auction() && assetInstance.winBidTransactionId) {
      throw Error('Auction has a winning bid, unable to delist')
    }
  }
  if (owner.walletAddress != assetInstance.owner.walletAddress) throw Error('Unable to delist as owner wallet address does not match asset owner wallet address')
  return await updateAssetDelisted(assetInstance, asset)
}

export default delistAsset