import {RatingType, Rating} from "../../db/models/Rating"
import {createRating, findRating} from "../../helpers/rating.helper"
import {findAsset} from "../../helpers/asset.helper";
import {currentUser} from "../../services/auth";
import {createNotification} from "../../helpers/notification.helper";
import {NOTIFICATION_TYPES} from "../../db/models/Notification";

const addRating = async (rating: RatingType, ctx: any) => {
  const user = await currentUser(ctx.jwt, rating.walletAddress)
  const assetInstance: any = await findAsset(rating.assetId)
  if (!assetInstance) throw Error(`Could not find asset with id:  ${rating.assetId}`)
  if (user.walletAddress == assetInstance.owner.walletAddress) throw Error('Unable to add rating as you can not rate an asset you own')
  rating['userId'] = user.id
  return await createRating(assetInstance, rating, user)
}

export default addRating