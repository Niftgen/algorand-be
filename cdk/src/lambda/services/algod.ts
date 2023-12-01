import {Algodv2} from 'algosdk'
const dotenv = require('dotenv')
dotenv.config()

const algodToken = process.env.ALGO_API_TOKEN
const algodServer = process.env.ALGOD_URI
const algodPort = process.env.ALGOD_PORT || ''
const algodAuthHeader = process.env.ALGOD_AUTH_HEADER || 'X-API-Key'

const authKey = {
  [algodAuthHeader!]: algodToken!
};
export default new Algodv2(authKey, algodServer, algodPort)
