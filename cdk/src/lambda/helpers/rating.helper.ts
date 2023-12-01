import {Rating, RatingType} from "../db/models/Rating";
import {createNotification} from "./notification.helper";
import {NOTIFICATION_TYPES} from "../db/models/Notification";
import {AssetType} from "../db/models/Asset";
import {UserType} from "../db/models/User";
import {giveUserRewards} from "./user.helper";
import {REWARDTYPE} from "../services/const";

export const findRating = async (id: number, userId: number) => {
  return await Rating.query()
    .select(Rating.knex().ref('rating').as('asset:myRating'))
    .withGraphJoined('[user, asset]')
    .where('ratings.id', id)
    .first()
}

export const getRatingTotal = async (id: number, field: string) => {
  return await Rating.query()
    .count('rating', {as: 'ratingCount'})
    .avg('rating as averageRating')
    .groupBy(`${field}`)
    .where(`${field}`, id)
    .andWhere('rating', '>', 0)
    .first()
}

export const createRating = async (assetInstance: AssetType, rating: any, user: UserType) => {
  let ratingRecord: any
  ratingRecord = await Rating.query()
    .where({assetID: rating.assetId, userId: user.id})
    .first()
  let msg: string = ''
  await Rating.transaction(async trx => {
    msg = `${user.userName} rated your NFT`
    if (ratingRecord) {
      await ratingRecord.$query(trx)
        .patch({rating: Number(rating.rating)})
      if (Number(rating.rating) > 0)
        msg = `${user.userName} updated their rating on your NFT`
      else
        msg = `${user.userName} removed their rating on your NFT`
    } else {
      ratingRecord = await Rating.query(trx)
        .insert({
          assetId: assetInstance.id,
          userId: user.id,
          rating: rating.rating
        })
    }
  })
  await createNotification({
    userId: assetInstance.userId,
    notification: msg,
    assetId: assetInstance.id,
    notificationType: NOTIFICATION_TYPES.RATING,
    ratingId: ratingRecord.id,
    originatorId: user.id
  })
  await giveUserRewards(user.walletAddress, REWARDTYPE.RATING, 1, assetInstance.id)
  if (rating.rating >= 4 && assetInstance.owner.kyc)
    await giveUserRewards(assetInstance.owner.walletAddress, REWARDTYPE.RATING, 1, assetInstance.id)
  return await findRating(ratingRecord?.id, user.id)
}