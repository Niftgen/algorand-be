import {Asset, AssetType} from '../../db/models/Asset'
import {findAsset} from "../../helpers/asset.helper";
import {currentUser} from "../../services/auth";

const deleteAsset = async (asset: AssetType, ctx: any) => {
  const owner = await currentUser(ctx.jwt, asset.ownerAddress)
  const assetInstance: any = await findAsset(asset.id)
  if (!assetInstance) throw Error(`Could not find asset with id:  ${asset.id}`)
  if (owner.walletAddress != assetInstance.owner.walletAddress) throw Error('Unable to delete as owner wallet address does not match asset owner wallet address')
  return await Asset.query().deleteById(asset.id)
}

export default deleteAsset