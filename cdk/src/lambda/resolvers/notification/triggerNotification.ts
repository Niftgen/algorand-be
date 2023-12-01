import {findNotification} from "../../helpers/notification.helper";
const jwt = require('jsonwebtoken');

const triggerNotification = async (args: any) => {
  const decodedJwt = await jwt.verify(args.token, process.env.JWT_SECRET)
  console.log("triggerNotification decodedJwt: ", decodedJwt)
  console.log(`triggerNotification id: ${decodedJwt.id}`)
  const record = await findNotification(decodedJwt.id)
  if (!record) throw "Notification not found"
  console.log("triggerNotification record: ", record)
  return record
}

export default triggerNotification