import {AssetType} from '../../db/models/Asset'
import {findAsset, updateAssetList} from "../../helpers/asset.helper";
import {currentUser} from "../../services/auth";
import {Lookup} from "../../db/models/Lookup";

const listAsset = async (asset: AssetType, ctx: any) => {
  const owner = await currentUser(ctx.jwt, asset.ownerAddress)
  const assetInstance: any = await findAsset(asset.id)
  if (!assetInstance) throw Error(`Could not find asset with id:  ${asset.id}`)
  if (assetInstance.$auction()) throw Error('Can not list an asset up for auction')
  if (assetInstance.$listed()) throw Error('Already listed unable to list again')
  if (!assetInstance.$minted()) throw Error('Can not list an unminted asset')
  if (owner.walletAddress != assetInstance.owner.walletAddress) throw Error('Unable to list as wallet address does not match asset owner wallet address')
  if (!asset.price) throw Error('Price needed for fixed price listing')
  return await updateAssetList(assetInstance, asset)
}

export default listAsset