import {CommentType, MessageType} from '../../db/models/Comment'
import {User} from "../../db/models/User";
import {createComment} from "../../helpers/comment.helper";
import {currentUser} from "../../services/auth";
import {NOTIFICATION_TYPES} from "../../db/models/Notification";
import {findAsset} from "../../helpers/asset.helper";

const addNftMessage = async (comment: CommentType, ctx: any) => {
  const user = await currentUser(ctx.jwt, comment.walletAddress)
  const addressee = await User.query().findById(comment.addresseeId)
  if (!addressee) throw Error(`Could not find user(addressee) with Id: ${comment.addresseeId}`)
  const assetInstance: any = await findAsset(comment.assetId)
  if (!assetInstance) throw Error(`Could not find asset with id:  ${comment.assetId}`)
  return await createComment({
      userId: user.id,
      content: comment.content,
      messageType: MessageType.ASSET_MESSAGE,
      assetId: assetInstance.id,
      addresseeId: comment.addresseeId
    },
    {
      notification: `${user.userName} messaged you about your NFT`,
      notificationType: NOTIFICATION_TYPES.MESSAGE,
      userId: addressee.id,
      assetId: assetInstance.id,
      originatorId: user.id
    }
  )
}

export default addNftMessage