import { createSecurityTransaction, verifySecurityTransaction } from "../../services/auth"
import { checkWhitelist } from "../../services/whitelist"

const authenticate = async (auth: any, ctx: any) => {
  //console.log("authenticate: ", auth)
  if (!auth.walletAddress && !auth.transaction) throw "Either a wallet address or transaction required"
  let data: Object | null
  if (auth.walletAddress) {
    let valid = true
    if (process.env.USE_WHITELIST && process.env.USE_WHITELIST.toString() == "true")
      valid = await checkWhitelist(auth.walletAddress)
    if (valid)
      data = await createSecurityTransaction(auth.walletAddress)
    else
      throw Error("Wallet address not in white list")
    //console.log("xxx data: ", data)
  } else {
    let clientIp = ''
    let browser = ''
    if (ctx.headers) {
      if (ctx.headers["x-forwarded-for"]) clientIp = ctx.headers["x-forwarded-for"].split(",")[0]?.trim()
      if (ctx.headers["sec-ch-ua"]) browser = ctx.headers["sec-ch-ua"]?.split(';')[0].trim()?.replace(/"/g, '')
    }
    data = await verifySecurityTransaction(auth.transaction, clientIp, browser)
  }
  return {
    data:data
  }
}

export default authenticate