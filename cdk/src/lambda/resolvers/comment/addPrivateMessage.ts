import {CommentType, MessageType} from '../../db/models/Comment'
import {User} from "../../db/models/User";
import {createComment} from "../../helpers/comment.helper";
import {currentUser} from "../../services/auth";
import {NOTIFICATION_TYPES} from "../../db/models/Notification";

const addPrivateMessage = async (comment: CommentType, ctx: any) => {
  const user = await currentUser(ctx.jwt, comment.walletAddress)
  const addressee = await User.query().findById(comment.addresseeId)
  if (!addressee) throw Error(`Could not find user(addressee) with Id: ${comment.addresseeId}`)
  return await createComment({
      userId: user.id,
      content: comment.content,
      messageType: MessageType.PRIVATE_MESSAGE,
      addresseeId: comment.addresseeId
    },
    {
      notification: `${user.userName} sent you a private message`,
      notificationType: NOTIFICATION_TYPES.MESSAGE,
      userId: addressee.id,
      originatorId: user.id
    }
  )
}

export default addPrivateMessage