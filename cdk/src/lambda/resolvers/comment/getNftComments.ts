import {CommentSortOrder, MessageType} from '../../db/models/Comment'
import {getComments} from "../../helpers/comment.helper";

const getNftComments = async (args: any) => {
  return await getComments(
    args.walletAddress,
    MessageType.ASSET_COMMENT,
    [args.assetId],
    CommentSortOrder.CREATED_DESC,
    args.limit,
    args.offset
  )
}

export default getNftComments