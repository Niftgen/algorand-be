import {pinFileToIPFS} from "../src/lambda/services/ipfs";
import {downloadPinataIpfsFile, uploadIpfsFile} from "../src/lambda/services/pinata";
import {createAsset} from "../src/lambda/helpers/asset.helper";
import {ASSETKIND} from "../src/lambda/services/const";
import {createUser} from "../src/lambda/helpers/user.helper";
import {findByType} from "../src/lambda/helpers/lookup.helper";
import {LOOKUP_CATEGORIES} from "../src/lambda/db/models/Lookup";
import {Asset} from '../src/lambda/db/models/Asset'

require('dotenv').config({
  path: '../.env',
})

module.exports = async () => {
  process.env.PINATA_API_KEY=""
  process.env.PINATA_API_SECRET=""
  process.env.PINATA_API_URI="https://api.pinata.cloud"

  process.env.IPFS_URI="https://www.storj-ipfs.com"
  process.env.IPFS_UID=""
  process.env.IPFS_PWD=""

  process.env.PINATA_TEST_FILE = await uploadIpfsFile(`${__dirname}/lacey.jpg`)
  process.env.PINATA_TEST_FILE2 = await pinFileToIPFS(`${__dirname}/bird.jpeg`)
  console.log(`${process.env.PINATA_TEST_FILE} ${process.env.PINATA_TEST_FILE2}`)

  process.env.IPFS_TEST_FILE = await pinFileToIPFS(`${__dirname}/lacey.jpg`)
  process.env.IPFS_TEST_NUDE_FILE = await pinFileToIPFS(`${__dirname}/test_nude.jpg`)
  console.log(`${process.env.IPFS_TEST_FILE}`)
}

