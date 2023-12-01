import {AssetType} from '../../db/models/Asset'
import {findAsset} from "../../helpers/asset.helper";

const getAsset = async (asset: AssetType) => {
  return await findAsset(asset.id)
}

export default getAsset