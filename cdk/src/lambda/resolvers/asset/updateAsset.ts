import {AssetType} from '../../db/models/Asset'
import {findAsset, updateAssetValues} from "../../helpers/asset.helper";
import {currentUser} from "../../services/auth";

const updateAsset = async (asset: AssetType, ctx: any) => {
  const updater = await currentUser(ctx.jwt, asset.ownerAddress)
  const assetInstance: any = await findAsset(asset.id)
  if (!assetInstance) throw Error(`Could not find asset with id:  ${asset.id}`)
  if (updater.walletAddress != assetInstance.owner.walletAddress) throw Error('Unable to update as updater wallet address does not match asset owner wallet address')
  return await updateAssetValues(assetInstance, asset)
}

export default updateAsset