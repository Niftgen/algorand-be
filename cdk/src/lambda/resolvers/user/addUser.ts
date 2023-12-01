import {UserType} from '../../db/models/User'
import {createUser, findUser, kycUser} from "../../helpers/user.helper";
import {getAge} from "../../helpers/asset.helper";
import {mixpanelUser} from "../../services/mixpanel";
import {checkCreatorWhitelist} from "../../services/whitelist";
import {decodeJwt} from "../../services/auth";

const addUser = async (user: UserType, ctx: any) => {
  const existingUser = await findUser(user.walletAddress)
  if (existingUser) return existingUser
  if (user.hasOwnProperty('dateOfBirth') && getAge(user.dateOfBirth) <= 14) throw Error("User is too young to join, must be over 14 years old")
  const newUser = await createUser(user)
  let clientIp = ''
  let browser = ''
  if (ctx.headers) {
    clientIp = ctx.headers["x-forwarded-for"]?.split(",")[0]?.trim()
    browser = ctx.headers["sec-ch-ua"]?.split(';')[0]?.trim()?.replace(/"/g, '')
  }
  if (newUser) {
    // Check if user on creator whitelist, if so set kyc
    // Creator whitelist no longer used
    /*
    if (process.env.USE_CREATOR_WHITELIST && process.env.USE_CREATOR_WHITELIST.toString() == "true") {
      const decodedJwt: any = await decodeJwt(ctx.jwt)
      if (!decodedJwt) throw Error("Unable to decode jwt")
      const kyc = decodedJwt.kyc ? decodedJwt.kyc : false
      await kycUser(newUser.id, kyc)
    }
     */
    mixpanelUser(newUser, clientIp, browser)
  }
  return findUser(newUser?.walletAddress || '')
}

export default addUser