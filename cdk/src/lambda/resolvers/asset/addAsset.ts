import {AssetType} from '../../db/models/Asset'
import {createAsset} from "../../helpers/asset.helper";
import {currentUser} from "../../services/auth";
import {moderateImage} from "../../services/rekognition";
import {ASSETKIND} from "../../services/const";

const addAsset = async (asset: AssetType, ctx: any) => {
  const owner = await currentUser(ctx.jwt, asset.ownerAddress)
  if (!asset.ipfsPath && !asset.filePath) throw Error("Either ipfsPath or filePath need to be specified")
  if (!asset.kind) asset.kind = ASSETKIND.NFT_IMAGE
  let moderationResult = ''
  if (asset.kind == ASSETKIND.NFT_IMAGE) moderationResult = await moderateImage(asset.ipfsPath)
  if (moderationResult) throw Error(`Image moderation failure due to ${moderationResult}`)
  return await createAsset(asset, owner)
}

export default addAsset