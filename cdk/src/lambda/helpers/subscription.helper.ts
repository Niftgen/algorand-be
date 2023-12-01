import {createNotification} from "./notification.helper";
import {NOTIFICATION_TYPES} from "../db/models/Notification";
import {User} from "../db/models/User";
import {getExpiredSubscriptions} from "../services/algorand";
import {findUser} from "./user.helper";
const AWS = require('aws-sdk');

export const sendSubscriptionNotifications =  async () => {
  AWS.config.update({ region: process.env.REGION });
  const creators = await User.query()
    //.whereNotNull('creatorAppTransactionId')
    .whereNotNull('kyc')
    .where('kyc', '=', true)
  console.log(`sendSubscriptionNotifications creator count: ${creators.length}`)
  for (const creator of creators) {
    console.log("sendSubscriptionNotifications: found creator: ", creator)
    // Find all expired subs for this creator
    const [expiredSubs, subscriptions] = await getExpiredSubscriptions(creator.walletAddress, (process.env.NODE_ENV == 'test') ? 999 : 7)
    // Send notifications
    if (expiredSubs && expiredSubs.length > 0) {
      for (const expiredSub of expiredSubs) {
        const user = await findUser(expiredSub.address)
        if (user) {
          console.log(`sendSubscriptionNotifications create notification for ${user.userName}`)
          await createNotification({
            userId: user.id,
            notification: `Your subscription to ${creator.userName} is set to expire soon, please renew to continue to have access to their content`,
            notificationType: NOTIFICATION_TYPES.EXPIRED_SUBSCRIPTION,
            originatorId: creator.id
          })
          let strExpiryDate = ''
          if (expiredSub.expiryDate) {
            const yy = expiredSub.expiryDate.getFullYear()
            const dd = expiredSub.expiryDate.getDate()
            const monthNames = ["January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November", "December"
            ]
            const mm = monthNames[expiredSub.expiryDate.getMonth()]
            strExpiryDate = `${dd} ${mm} ${yy}`
          }
          var params = {
            Destination: { ToAddresses: [user.email] },
            TemplateData: `{ \"name\":\"${user.userName}\", \"creator\":\"${creator.userName}\", \"expiry\":\"${strExpiryDate}\" }`,
            Source: 'test@gmail.com',
            Template: 'SubscriptionExpiring',
            ReplyToAddresses: [ 'noreply@niftgen.com' ]
          }
          console.log("sendSubscriptionNotifications params:", params)
          try {
            await new AWS.SES({apiVersion: '2010-12-01'}).sendTemplatedEmail(params).promise()
          } catch (error) {
            console.log(error)
          }
        }
      }
    }
  }
}
