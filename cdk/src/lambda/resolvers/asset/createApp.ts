import {AssetType} from '../../db/models/Asset'
import {createAssetApp, findAsset, updateAssetList, updateAssetMint} from "../../helpers/asset.helper";
import {currentUser} from "../../services/auth";

const createApp = async (asset: AssetType, ctx: any) => {
  const owner = await currentUser(ctx.jwt, asset.ownerAddress)
  const assetInstance: any = await findAsset(asset.id)
  if (!assetInstance) throw Error(`Could not find asset with id:  ${asset.id}`)
  if (!assetInstance.$minted()) throw Error('Can not create an app for an unminted asset')
  if (owner.walletAddress != assetInstance.owner.walletAddress) throw Error('Unable to create app as wallet address does not match asset owner wallet address')
  return await createAssetApp(assetInstance, asset)
}

export default createApp