import {Asset, AssetType} from '../../db/models/Asset'
import {findAsset, updateAssetMint} from "../../helpers/asset.helper";
import {currentUser} from "../../services/auth";

const viewedAsset = async (asset: AssetType, ctx: any) => {
  const user = await currentUser(ctx.jwt, asset.walletAddress)
  let assetInstance: any = await findAsset(asset.id)
  if (!assetInstance) throw Error(`Could not find asset with id:  ${asset.id}`)
  if (user.walletAddress != assetInstance.owner.walletAddress) {
    await Asset.query()
      .increment('views', 1)
      .where({id: assetInstance.id})
    assetInstance = await findAsset(assetInstance.id)
  }
  return assetInstance
}

export default viewedAsset