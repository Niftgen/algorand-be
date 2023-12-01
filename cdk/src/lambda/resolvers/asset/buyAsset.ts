import {AssetType} from '../../db/models/Asset'
import {findAsset, updateAssetBuy} from "../../helpers/asset.helper";
import {currentUser} from "../../services/auth";

const buyAsset = async (asset: AssetType, ctx: any) => {
  const buyer = await currentUser(ctx.jwt, asset.buyerAddress)
  const assetInstance: any = await findAsset(asset.id)
  if (!assetInstance) throw Error(`Could not find asset with id:  ${asset.id}`)
  if (!assetInstance.$listed()) throw Error(`Can not buy an unlisted asset`)
  if (!assetInstance.$minted()) throw Error(`Can not buy an unminted asset`)
  if (assetInstance.$bought()) throw Error(`Already bought unable to buy again`)
  asset.userId = buyer.id
  return await updateAssetBuy(assetInstance, asset)
}

export default buyAsset