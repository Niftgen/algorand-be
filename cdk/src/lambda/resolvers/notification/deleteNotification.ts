import {NotificationType, Notification} from "../../db/models/Notification";
import {currentUser} from "../../services/auth";
import {findNotification} from "../../helpers/notification.helper";

const deleteNotification = async (notification: NotificationType, ctx: any) => {
  const owner = await currentUser(ctx.jwt, notification.ownerAddress)
  const notificationInstance: any = await findNotification(notification.id)
  if (!notificationInstance) throw Error(`Could not find notification with id:  ${notification.id}`)
  if (owner.walletAddress != notificationInstance.owner.walletAddress) throw Error('Unable to delete as owner wallet address does not match notification owner wallet address')
  return await Notification.query().deleteById(notification.id)
}

export default deleteNotification