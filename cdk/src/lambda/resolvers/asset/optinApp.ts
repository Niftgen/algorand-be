import {AssetType} from '../../db/models/Asset'
import {findAsset, optinAssetApp} from "../../helpers/asset.helper";
import {currentUser} from "../../services/auth";

const optinApp = async (asset: AssetType, ctx: any) => {
  const owner = await currentUser(ctx.jwt, asset.ownerAddress)
  const assetInstance: any = await findAsset(asset.id)
  if (!assetInstance) throw Error(`Could not find asset with id:  ${asset.id}`)
  if (!assetInstance.$minted()) throw Error('Can not create an app for an unminted asset')
  if (!assetInstance.$appCreated()) throw Error('Can not optin to app as no app has been created')
  if (owner.walletAddress != assetInstance.owner.walletAddress) throw Error('Unable to optin app as wallet address does not match asset owner wallet address')
  return await optinAssetApp(assetInstance, asset)
}

export default optinApp