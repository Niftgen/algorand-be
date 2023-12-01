import {CommentSortOrder, MessageType} from '../../db/models/Comment'
import {getComments} from "../../helpers/comment.helper";

const getPrivateMessages = async (args: any) => {
  return await getComments(
    args.walletAddress,
    MessageType.PRIVATE_MESSAGE,
    null,
    CommentSortOrder.CREATED_DESC,
    args.limit,
    args.offset
  )
}

export default getPrivateMessages