import {AssetType} from '../../db/models/Asset'
import {findAsset, updateAssetMint} from "../../helpers/asset.helper";
import {currentUser} from "../../services/auth";

const mintAsset = async (asset: AssetType, ctx: any) => {
  const minter = await currentUser(ctx.jwt, asset.minterAddress)
  const assetInstance: any = await findAsset(asset.id)
  if (!assetInstance) throw Error(`Could not find asset with id:  ${asset.id}`)
  if (await assetInstance.$minted()) throw Error(`Already minted unable to mint again`)
  if (minter.walletAddress != assetInstance.owner.walletAddress) throw Error('Unable to mint as minter wallet address does not match asset owner wallet address')
  asset.minterId = minter.id
  return await updateAssetMint(assetInstance, asset)
}

export default mintAsset