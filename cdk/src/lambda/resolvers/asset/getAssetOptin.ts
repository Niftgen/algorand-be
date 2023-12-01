import {AssetType} from '../../db/models/Asset'
import {findAsset, findOptinTransaction} from "../../helpers/asset.helper";
import {currentUser} from "../../services/auth";

const getAssetOptin = async (asset: AssetType, ctx: any) => {
  const user = await currentUser(ctx.jwt, asset.walletAddress)
  const assetInstance: any = await findAsset(asset.id)
  if (!assetInstance) throw Error(`Could not find asset with id:  ${asset.id}`)
  return await findOptinTransaction(assetInstance.id, user.id)
}

export default getAssetOptin