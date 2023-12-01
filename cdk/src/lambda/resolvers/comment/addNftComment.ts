import {CommentType, MessageType} from '../../db/models/Comment'
import {createComment} from "../../helpers/comment.helper";
import {currentUser} from "../../services/auth";
import {NOTIFICATION_TYPES} from "../../db/models/Notification";
import {findAsset} from "../../helpers/asset.helper";
import {giveUserRewards} from "../../helpers/user.helper";
import {REWARDTYPE} from "../../services/const";

const addNftComment = async (comment: CommentType, ctx: any) => {
  const user = await currentUser(ctx.jwt, comment.walletAddress)
  const assetInstance: any = await findAsset(comment.assetId)
  if (!assetInstance) throw Error(`Could not find asset with id:  ${comment.assetId}`)
  const newComment = await createComment(  {
      userId: user.id,
      content: comment.content,
      messageType: MessageType.ASSET_COMMENT,
      assetId: assetInstance.id,
    },
    {
      notification: `${user.userName} commented on your NFT`,
      notificationType: NOTIFICATION_TYPES.COMMENT,
      userId: assetInstance.userId,
      assetId: assetInstance.id,
      originatorId: user.id
    }
  )
  await giveUserRewards(user.walletAddress, REWARDTYPE.COMMENT, 1, assetInstance.id)
  return newComment
}

export default addNftComment