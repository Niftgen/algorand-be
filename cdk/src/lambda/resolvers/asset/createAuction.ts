import {AssetType} from '../../db/models/Asset'
import {createAssetAuction, findAsset} from "../../helpers/asset.helper";
import {currentUser} from "../../services/auth";

const createAuction = async (asset: AssetType, ctx: any) => {
  const owner = await currentUser(ctx.jwt, asset.ownerAddress)
  const assetInstance: any = await findAsset(asset.id)
  if (!assetInstance) throw Error(`Could not find asset with id:  ${asset.id}`)
  if (!assetInstance.$minted()) throw Error('Can not auction an unminted asset')
  if (assetInstance.$listed()) throw Error('Already listed unable to list again')
  // Allow auction to created even if there is already an auction created this is to allow
  // a new create request if there was an issue between the create and then the start of the auction
  // once auction starts (listed) then another create will raise an error, these are cleared when the
  // actual winning purchase is made or auction fails
  //if (assetInstance.$auction()) throw Error('Auction already created')
  if (owner.walletAddress != assetInstance.owner.walletAddress) throw Error('Unable to create auction as wallet address does not match asset owner wallet address')
  if (!asset.startTime) throw Error('Start time needed for auction listing')
  if (!asset.endTime) throw Error('End time needed for auction listing')
  if (!asset.reservePrice) throw Error('Reserve Price needed for auction listing')
  const startTime = new Date(asset.startTime).getTime()
  const endTime = new Date(asset.endTime).getTime()
  const now = new Date(Date.now()).getTime()
  if (endTime <= startTime) throw Error('Start time must be less than end time for auction listing')
  if (startTime < now) throw Error('Start time can not be in the past for auction listing')
  if (endTime < now) throw Error('End time can not be in the past for auction listing')
  let minEndDate = new Date()
  minEndDate.setDate(minEndDate.getDate() + 1)
  // Temp remove 24 hour requirement for prod
  if (endTime < minEndDate.getTime() && (process.env.NODE_ENV == 'production1' || process.env.NODE_ENV == 'test')) throw Error('End time less than a day after start time, auctions need to run for at least 24 hours')
  return await createAssetAuction(assetInstance, asset)
}

export default createAuction