import {AssetType} from '../../db/models/Asset'
import {createAsset} from "../../helpers/asset.helper";
import {currentUser} from "../../services/auth";
import {ASSETKIND} from "../../services/const";

const addVideo = async (asset: AssetType, ctx: any) => {
  const owner = await currentUser(ctx.jwt, asset.ownerAddress)
  asset.kind = ASSETKIND.NFT_VIDEO
  return await createAsset(asset, owner)
}

export default addVideo