import {Asset} from '../../db/models/Asset'
import {downloadPinataIpfsFile, uploadIpfsFile} from "../../services/pinata";
import {pinFileToIPFS} from "../../services/ipfs";
import {User} from "../../db/models/User";
import {mixpanelUser} from "../../services/mixpanel";

const updateAssetIpfs = async () => {
  console.log("updateAssetIpfs")
  let count = 0
  /*
  let assets = await Asset.query()
    .whereNotNull('ipfsPath')
    .whereNull('ipfsPathOld')
  console.log(`asset count: ${assets.length}`)
  for (const asset of assets) {
    try {
      console.log(`converting ipfs ${asset.ipfsPath} id: ${asset.id}`)
      const path = asset.ipfsPath
      const image_data = await downloadPinataIpfsFile(path)
      if (image_data) {
        const storj = await pinFileToIPFS('', image_data)
        console.log(`pinata ipfsPath: ${asset.ipfsPath} storj: ${storj}`)
        const updates = {
          ipfsPath: storj,
          ipfsPathOld: path
        }
        console.log("updates: ", updates)
        await Asset.query()
          .patch(updates)
          .findById(asset.id)
        const updated_asset = await Asset.query().findOne({id: asset.id})
        console.log(`updated asset ipfsPath: ${updated_asset?.ipfsPath} ipfsPathOld: ${updated_asset?.ipfsPathOld}`)
      }
    } catch (error) {
    }
  }
  */
  /*
  let users = await User.query()
    .whereNotNull('avatarPath')
    .where({avatarUpdated: false})
  console.log(`user count: ${users.length}`)
  for (const user of users) {
    try {
      console.log(`converting ipfs ${user.avatarPath} id: ${user.id}`)
      const path = user.avatarPath
      const image_data = await downloadPinataIpfsFile(path)
      if (image_data) {
        const storj = await pinFileToIPFS('', image_data)
        console.log(`pinata avatarPath: ${user.avatarPath} storj: ${storj}`)
        const updates = {
          avatarPath: storj,
          avatarUpdated: true
        }
        console.log("updates: ", updates)
        await User.query()
          .patch(updates)
          .findById(user.id)
        //const updated_user = await User.query().findOne({id: user.id})
        //console.log(`updated user avatarPath: ${updated_user?.avatarPath}`)
      }
    } catch (error) {
    }
  }
   */
  let users = await User.query()
    .where('updateVersion', '<', 10)
  console.log(`user count: ${users.length}`)
  for (const user of users) {
    try {
      console.log(`adding user to mixpanel username: ${user.userName} id: ${user.id}`)
      mixpanelUser(user, '127.0.0.1', '')
      await User.query()
        .patch({updateVersion: 10})
        .findById(user.id)
    } catch (error) {
    }
  }
  return count
}

export default updateAssetIpfs