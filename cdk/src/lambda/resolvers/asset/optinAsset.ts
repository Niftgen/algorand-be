import {AssetType} from '../../db/models/Asset'
import {findAsset, findOptinTransaction, optinAssetUser} from "../../helpers/asset.helper";
import {currentUser} from "../../services/auth";

const optinAsset = async (asset: AssetType, ctx: any) => {
  const user = await currentUser(ctx.jwt, asset.ownerAddress)
  const assetInstance: any = await findAsset(asset.id)
  if (!assetInstance) throw Error(`Could not find asset with id:  ${asset.id}`)
  if (!assetInstance.$minted()) throw Error('Can not optin for an unminted asset')
  const transaction = await findOptinTransaction(assetInstance.id, user.id)
  if (transaction)
    return transaction
  else
    return await optinAssetUser(assetInstance, user.id, asset.signedTxn)
}

export default optinAsset