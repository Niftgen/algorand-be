import {currentUser} from "../../services/auth";
import {findNotifications} from "../../helpers/notification.helper";

const getNotifications = async (args: any, ctx: any) => {
  const user = await currentUser(ctx.jwt, args.walletAddress)
  args['userId'] = user.id
  return await findNotifications(args)
}

export default getNotifications