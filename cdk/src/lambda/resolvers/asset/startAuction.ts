import {AssetType} from '../../db/models/Asset'
import {findAsset, startAssetAuction} from "../../helpers/asset.helper";
import {currentUser} from "../../services/auth";

const startAuction = async (asset: AssetType, ctx: any) => {
  const owner = await currentUser(ctx.jwt, asset.ownerAddress)
  const assetInstance: any = await findAsset(asset.id)
  if (!assetInstance) throw Error(`Could not find asset with id:  ${asset.id}`)
  if (!assetInstance.$auction()) throw Error('Auction not yet created')
  if (!assetInstance.$minted()) throw Error('Can not list an unminted asset')
  if (assetInstance.$listed()) throw Error('Auction already started')
  if (owner.walletAddress != assetInstance.owner.walletAddress) throw Error('Unable to start auction as wallet address does not match asset owner wallet address')
  return await startAssetAuction(assetInstance, asset)
}

export default startAuction