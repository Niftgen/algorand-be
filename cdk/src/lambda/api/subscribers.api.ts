import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {getExpiredSubscriptions} from "../services/algorand";
import {checkApiAccess} from "../services/whitelist";

const getAuth = (auth: string | null) => {
  let token: any | undefined = undefined
  console.log("getAuth: auth: ", auth)
  if (auth && auth.split(' ')[0] === 'Bearer')
    token = auth.split(' ')[1]
  return token
}

export const verifyJwt = async (jwt: string, walletAddress: string) => {
  let valid = false
  const referral = Buffer.from(jwt, 'base64').toString()
  console.log("verifyJwt referral: ", referral)
  if (referral) {
    const refParts = referral.split('-')
    console.log("verifyJwt refParts: ", refParts)
    if (refParts.length > 1) {
      console.log(`verifyJwt substring: ${refParts[0].substring(0,3)} == ${walletAddress.substring(0,3)}`)
      console.log(`verifyJwt slice: ${refParts[0].slice(-3)} == ${walletAddress.slice(-3)}`)
      if (refParts[0].substring(0,3) == walletAddress.substring(0,3) &&
        refParts[0].slice(-3) == walletAddress.slice(-3)) valid = true
    }
  }
  return valid
}

// API handler
export const handler= async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log("subscribers handler -> incoming event: ", JSON.stringify(event, null, 2))
  let rc = 200
  let body = 'OK'

  let auth = null
  if (event.multiValueHeaders && event.multiValueHeaders["Authorization"]) auth = event.multiValueHeaders["Authorization"][0]
  let wallet = null
  if (event.pathParameters) wallet = event.pathParameters["walletaddress"]

  console.log("subscribers wallet: ", wallet)
  console.log("subscribers auth: ", auth)

  const token = getAuth(auth)
  console.log("subscribers token: ", token)
  if (token && wallet) {
    let verified = false
    verified = await checkApiAccess(wallet, 'subscribers')
    if (verified) verified = await verifyJwt(token, wallet)
    console.log("subscribers verified: ", verified)
    if (!verified) {
      rc = 403
      body = 'Not authorised'
    } else {
      const [expiredSubs, subscriptions] = await getExpiredSubscriptions(wallet, 0)
      let subs: any = []
      if (subscriptions && subscriptions.length > 0) {
        for (const subscription of subscriptions) {
          subs.push([subscription.address, subscription.expiryDate])
        }
      }
      body = JSON.stringify({subscribers: subs})
    }
  } else {
    rc = 401
    body = 'Not authorised'
  }

  return {
    statusCode: rc,
    body: body
  }
}
