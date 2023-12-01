import {User} from "../db/models/User";
import mixpanelClient from "./mixpanelClient";

export const mixpanelUser = (user: User, ip: string, browser: string) => {
  let dob = ''
  if (user.dateOfBirth) dob = new Date(user.dateOfBirth)?.toISOString().split('T', 1)[0]
  //console.log(`mixpanelUser dob: ${dob}`)
  mixpanelClient.people.set(user.id, {
      $name: user.userName,
      $created: (new Date()).toISOString(),
      $email: user.email,
      walletAddress: user.walletAddress,
      dateOfBirth: dob,
      browser: browser,
      registrationDate: new Date(user.createdAt)?.toISOString()
    }, {
      $ip: ip || '127.0.0.1'
    }
  )
  //mixpanelClient.people.set_once(user.id, 'ip', ip || '127.0.0.1')

  //console.log(`mixpanelUser user.userName: ${user.userName} userId: ${user.id}`)
  //Username, email, wallet address, date account was created
  //@etienne another metric, if possible, would be "last logged in date" with this, we can determine daily active users (DAU) and monthly active users (MAU)
}

export const mixpanelEvent = async (name: string, userId: number, ip: string, details: Object = {}) => {
  console.log(`mixpanelEvent name: ${name} userId: ${userId} ip: ${ip}`)
  const stdData = {
    distinct_id: userId,
    ip: ip || '127.0.0.1'
  }
  const data = Object.assign({}, stdData, details)
  mixpanelClient.track(name, data)
}
