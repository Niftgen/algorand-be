import {Indexer} from 'algosdk'
const dotenv = require('dotenv')
dotenv.config()

const algodToken = process.env.ALGO_API_TOKEN
const algodServer = process.env.ALGO_INDEXER_URI
const algodPort = process.env.ALGO_INDEXER_PORT || ''
const algodAuthHeader = process.env.ALGOD_AUTH_HEADER || 'X-API-Key'

const authKey = {
  [algodAuthHeader!]: algodToken!
};
export default new Indexer(authKey, algodServer, algodPort)
