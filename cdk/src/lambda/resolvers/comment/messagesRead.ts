import { Comment, CommentType } from '../../db/models/Comment'
import {findComment, findComments} from "../../helpers/comment.helper";
import {currentUser} from "../../services/auth";

const messagesRead = async (comment: any, ctx: any) => {
  const user = await currentUser(ctx.jwt, comment.walletAddress)
  await Comment.query()
    .patch({messageRead: new Date()})
    .whereIn('comments.id', comment.ids)
    .where(function() {
      this.where({userId: user.id}).orWhere({addresseeId: user.id})
    })
  return await findComments(comment.ids)
}

export default messagesRead