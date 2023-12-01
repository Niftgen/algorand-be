import {CommentSortOrder, MessageType} from '../../db/models/Comment'
import {getComments} from "../../helpers/comment.helper";

const getNftMessages = async (args: any) => {
  let ids = args.assetId
  if (ids) {
    ids = Array.isArray(args.assetId) ? args.assetId : [args.assetId]
  }
  return await getComments(
    args.walletAddress,
    MessageType.ASSET_MESSAGE,
    ids,
    CommentSortOrder.CREATED_DESC,
    args.limit,
    args.offset
  )
}

export default getNftMessages