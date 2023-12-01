import {Auth} from '../db/models/Auth'
import {buildSecurityTransaction, getJwtFromSignedTransaction} from "./algorand"
import {findUser, giveUserRewards, kycUser} from "../helpers/user.helper";
import {generatePinataJwt} from "./pinata";
import {mixpanelEvent, mixpanelUser} from "./mixpanel";
import {MIXPANELEVENT, REWARDTYPE} from "./const";
import {checkCreatorWhitelist} from "./whitelist";
import {User} from "../db/models/User";
const jwt = require('jsonwebtoken');

export const createSecurityTransaction = async (walletAddress: string) => {
  const expiryDays = 30
  let authRecord: Auth | undefined | null = await Auth.find(walletAddress)
  if (authRecord) {
    //console.log("createSecurityTransaction - auth exists")
    if (authRecord.expiry <= new Date()) {
      //console.log("createSecurityTransaction - auth expired delete")
      await Auth.query()
        .deleteById(authRecord.id)
      authRecord = null
    } else {
      //console.log("createSecurityTransaction - auth exists reset authorised to false")
      await Auth.query()
        .update({ verified: false })
        .where({
          id: authRecord.id
        })
    }
  }
  if (!authRecord) {
    //console.log("createSecurityTransaction - auth does not exist, create")
    let expiry = new Date()
    expiry.setDate(expiry.getDate()+expiryDays)
    authRecord = await Auth.query().insert({
      walletAddress: walletAddress,
      expiry: expiry,
      verified: false
    })
  }
  //console.log("process.env.JWT_SECRET: ", process.env.JWT_SECRET)
  let kyc = false
  // Creator whitelist no longer used
  //if (process.env.USE_CREATOR_WHITELIST && process.env.USE_CREATOR_WHITELIST.toString() == "true") {
  //  kyc = await checkCreatorWhitelist(walletAddress)
  //}
  //console.log(`createSecurityTransaction kyc: ${kyc} walletAddress: ${walletAddress}`)
  const securityJwt = await jwt.sign({
    walletAddress: walletAddress,
    authId: authRecord.id,
    kyc: kyc
  }, process.env.JWT_SECRET, {expiresIn: `${expiryDays}d`})
  //console.log("securityJwt: ", JSON.stringify(securityJwt))
  const securityTransaction = await buildSecurityTransaction(walletAddress, JSON.stringify(securityJwt))
  //console.log("securityTransaction: ", JSON.stringify(securityTransaction))
  return {
    txn: securityTransaction,
    jwt: securityJwt
  }
}

export const verifySecurityTransaction = async (txn: string, clientIp: string = '', browser: string = '') => {
  const securityJwt = await getJwtFromSignedTransaction(txn)
  //console.log("verifySecurityTransaction jwt: ", securityJwt)
  let rc = null
  let pinataJwt
  const decoded = await decodeJwt(securityJwt)
  //console.log("verifySecurityTransaction decoded: ", decoded)
  if (decoded) {
    let authRecord = await Auth.query().findById(decoded.authId)
    if (!authRecord) {
      throw Error("Not authorised, could not locate auth record")
    } else {
      await Auth.query()
        .update({ verified: true })
        .where({
          id: decoded.authId
        })
      pinataJwt = await generatePinataJwt();
      const user = await findUser(authRecord.walletAddress)
      if (user) {
        // Creator whitelist no longer used
        //if (process.env.USE_CREATOR_WHITELIST && process.env.USE_CREATOR_WHITELIST.toString() == "true") {
        //  if ((decoded.kyc && !user.kyc) || (!decoded.kyc && user.kyc)) {
        //    await kycUser(user.id, decoded.kyc)
        //  }
       // }
        await giveUserRewards(user.walletAddress, REWARDTYPE.LOGIN)
        if (clientIp) {
          mixpanelUser(user, clientIp, browser)
          mixpanelEvent(MIXPANELEVENT.LOGIN,
            user.id,
            clientIp,
            {loginDate: (new Date()).toISOString()})
        }
      }
    }
    rc = {
      jwt: securityJwt,
      pinata: pinataJwt.jwt
    }
  }
  return rc
}

export const verifyJwt = async (jwtToken: string) => {
  console.log("verifyJwt jwtToken: ", jwtToken)
  let rc = false
  const decodedJwt: any = await decodeJwt(jwtToken)
  if (decodedJwt) {
    console.log("verifyJwt decodedJwt: ", decodedJwt)
    let authRecord = await Auth.query().findById(decodedJwt.authId)
    console.log("verifyJwt authRecord: ", authRecord)
    if (authRecord && authRecord.verified) {
      rc = true
    }
  }
  return rc
}

export const decodeJwt = async (jwtToken: string) => {
  //console.log("decodeJwt jwtToken: ", jwtToken)
  let decodedJwt = null
  try {
    decodedJwt = await jwt.verify(jwtToken, process.env.JWT_SECRET)
    //console.log("decodeJwt decoded: ", decodedJwt)
  } catch (e) {
    console.log("verifySecurityTransaction jwt.verify error: ", e)
  }
  return decodedJwt
}

export const currentUser = async (jwt: string, walletAddress?: string) => {
  //console.log("currentUser jwt: ", jwt)
  if (!jwt) throw Error('Missing JWT')
  const decodedJwt: any = await decodeJwt(jwt)
  if (!decodedJwt) throw Error('Invalid JWT')
  //console.log("decodedJwt.walletAddress: ", decodedJwt.walletAddress)
  const user = await findUser(decodedJwt.walletAddress)
  if (!user) throw Error(`Could not find user with wallet address specified in jwt`)
  if (walletAddress && user.walletAddress != walletAddress) throw Error('User wallet address in JWT does not match wallet address param')
  return user
}

