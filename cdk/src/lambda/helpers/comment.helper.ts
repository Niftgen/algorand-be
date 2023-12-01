import {Asset} from "../db/models/Asset";
import {Comment, CommentSortOrder, MessageType} from "../db/models/Comment";
import {findUser} from "./user.helper";
import {createNotification, NotificationParams} from "./notification.helper";

const COMMENT_FIND_RELATIONSHIPS = '[asset.[owner], owner, addressee]'

export const findComment = async (id: number) => {
  return await Comment.query()
    .withGraphJoined(COMMENT_FIND_RELATIONSHIPS)
    .findOne('comments.id', id)
}

export const findComments = async (ids: [number]) => {
  return await Comment.query()
    .withGraphJoined(COMMENT_FIND_RELATIONSHIPS)
    .orderBy('comments.createdAt', 'desc')
    .whereIn('comments.id', ids)
}

export const createComment = async (comment: any, notification: NotificationParams) => {
  let newComment: any
  newComment = await Comment.query()
   .insert(comment)
  notification['commentId'] = newComment.id
  await createNotification(notification)
  return await findComment(newComment.id)
}

export const getComments = async (
  walletAddress: string,
  type: MessageType,
  assetIds: [number] | null,
  sort: CommentSortOrder,
  limit: number,
  offset: number)  => {
  let query = Comment.query()
    .where({
      messageType: type
    })
  if (type === MessageType.ASSET_COMMENT && (!assetIds || (assetIds && assetIds.length <= 0)))
    throw Error("assetId param required for ASSET_COMMENT message type")
  if (assetIds && assetIds.length > 0) {
    query.whereIn('assetId', assetIds)
  }
  if (type === MessageType.PRIVATE_MESSAGE ||
    type === MessageType.ASSET_MESSAGE) {
    const user = await findUser(walletAddress)
    if (!user) throw Error(`Could not find user with wallet address ${walletAddress}`)
    query.where(function() {
      this.where('comments.user_id', user.id)
        .orWhere('addresseeId', user.id)
    })
  }
  if (sort !== undefined) {
    if (sort === CommentSortOrder.CREATED_DESC)
      query.orderBy('comments.createdAt', 'desc')
    else if (sort == CommentSortOrder.CREATED_ASC)
      query.orderBy('comments.createdAt', 'asc')
  } else {
    query.orderBy('createdAt', 'desc')
  }
  if (limit !== undefined) query.limit(limit)
  if (offset !== undefined) query.offset(offset)
  return await query
    .withGraphJoined('[asset, owner, addressee]')
}

export const getCommentTotal = async (id: number, field: string) => {
  const result = await Comment.query()
    .count('id', {as: 'totalComments'})
    .groupBy(`${field}`)
    .where(`${field}`, id)
    .where({
      messageType: MessageType.ASSET_COMMENT
    })
    .first()
  if (result)
    return Number(result?.totalComments)
  else
    return 0
}
