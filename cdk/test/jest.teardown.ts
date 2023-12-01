import {stopDb} from "./testDB"
//import {deleteIpfsFile} from "../src/lambda/services/pinata";
module.exports = async () => {
  stopDb()
  //if (process.env.IPFS_TEST_FILE) await deleteIpfsFile(process.env.IPFS_TEST_FILE)
  //if (process.env.IPFS_TEST_NUDE_FILE) await deleteIpfsFile(process.env.IPFS_TEST_NUDE_FILE)
}

