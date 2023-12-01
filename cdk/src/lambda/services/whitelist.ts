import {s3Get} from "./s3"
import {decodeSignedTransaction} from "algosdk";

export const checkWhitelist = async (walletAddress: string) => {
  //console.log("checkWhitelist walletAddress: ", walletAddress)
  const addresses = await s3Get('niftgen-whitelist','whitelist.txt')
  //console.log("checkWhitelist addresses: ", addresses)
  const verify = addresses.split('\n').map((l: string) => l.trim()).filter(Boolean).includes(walletAddress)
  //console.log("checkWhitelist verify: ", verify)
  return verify
}

export const checkCreatorWhitelist = async (walletAddress: string) => {
  //console.log("checkCreatorWhitelist walletAddress: ", walletAddress)
  const environment = process.env.NODE_ENV || 'development'
  const addresses = await s3Get('niftgen-whitelist','creators.txt')
  //console.log("checkCreatorWhitelist addresses: ", addresses)
  const verify = addresses.split('\n').map((l: string) => l.trim()).filter(Boolean).includes(walletAddress)
  //console.log("checkCreatorWhitelist verify: ", verify)
  return verify
}

export const checkApiAccess = async (walletAddress: string, apiEndpoint: string) => {
  //console.log("checkApiAccess walletAddress: ", walletAddress)
  const addresses = await s3Get('niftgen-whitelist','api_access.txt')
  //console.log("checkApiAccess addresses: ", addresses)
  let verify = false
  for (const value of addresses.split('\n')) {
    //console.log(`checkApiAccess value: ${value}`)
    const [address, access] = value.split(':')
    //console.log(`checkApiAccess address: ${address} access: ${access}`)
    if (address.trim() == walletAddress && JSON.parse(access).indexOf(apiEndpoint) >= 0) {
      verify = true
      break
    }
  }
  //console.log("checkApiAccess verify: ", verify)
  return verify
}
