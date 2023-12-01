import {Comment, CommentType, MessageType} from '../../db/models/Comment'
import {currentUser} from "../../services/auth";
import {findComment} from "../../helpers/comment.helper";
import {NOTIFICATION_TYPES} from "../../db/models/Notification";
import {createNotification} from "../../helpers/notification.helper";

const deleteComment = async (comment: CommentType, ctx: any) => {
  const user = await currentUser(ctx.jwt, comment.walletAddress)
  const record: any = await findComment(comment.id)
  if (!record) throw Error(`Could not find comment with Id: ${comment.id}`)
  if ((record.messageType != MessageType.ASSET_COMMENT &&
      user.walletAddress != record.owner.walletAddress &&
      user.walletAddress != record.addressee.walletAddress) ||
    (record.messageType == MessageType.ASSET_COMMENT && user.walletAddress != record.owner.walletAddress))
    throw Error('Unable to delete comment as it is not owned or addressed to the user with specified wallet address')
  const ownerDeleting = user.walletAddress == record.owner.walletAddress
  let msg: string = `${user.userName} has deleted the comment they made on your NFT`
  if (record.messageType == MessageType.ASSET_MESSAGE)
    msg = `${ownerDeleting ? record.owner.userName : record.addressee.userName} has deleted an NFT message`
  else if (record.messageType == MessageType.PRIVATE_MESSAGE)
    msg = `${ownerDeleting ? record.owner.userName : record.addressee.userName} has deleted a private message`
  await await Comment.query().deleteById(record.id)
  await createNotification({
    userId: record.assetId ? record.asset?.userId : record.addresseeId,
    notification: msg,
    assetId: record.assetId,
    notificationType: record.messageType == MessageType.ASSET_COMMENT ? NOTIFICATION_TYPES.COMMENT : NOTIFICATION_TYPES.MESSAGE,
    originatorId: ownerDeleting ? user.id : record.userId,
    deletedCommentId: record.id,
  })
  if (record.messageType == MessageType.ASSET_COMMENT)
    msg = `You have deleted your comment on the NFT owned by ${record.asset.owner.userName}}`
  await createNotification({
    userId: ownerDeleting ? user.id : record.userId,
    notification: msg,
    assetId: record.assetId,
    notificationType: record.messageType == MessageType.ASSET_COMMENT ? NOTIFICATION_TYPES.COMMENT : NOTIFICATION_TYPES.MESSAGE,
    originatorId: record.assetId ? record.asset?.userId : record.addresseeId,
    deletedCommentId: record.id,
  })
  return comment.id
}

export default deleteComment