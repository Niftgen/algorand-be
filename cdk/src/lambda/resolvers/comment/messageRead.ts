import { Comment, CommentType } from '../../db/models/Comment'
import {findComment} from "../../helpers/comment.helper";
import {currentUser} from "../../services/auth";

const messageRead = async (comment: CommentType, ctx: any) => {
  const user = await currentUser(ctx.jwt, comment.walletAddress)
  const record: any = await findComment(comment.id)
  if (!record) throw Error(`Could not find comment with Id: ${comment.id}`)
  if (user.walletAddress != record.owner.walletAddress && user.walletAddress != record.addressee.walletAddress) throw Error('Unable to mark comments as read as the comment does not belong to the user with the specified wallet address')
  await record.$query().patch({messageRead: new Date()})
  return await findComment(comment.id)
}

export default messageRead