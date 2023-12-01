import {User} from '../../db/models/User'
import {findUser} from "../../helpers/user.helper";

const deleteUser = async (user: any) => {
  const existingUser = await findUser(user.walletAddress)
  if (!existingUser) throw Error(`User with wallet address ${user.walletAddress} not found`)
  await User.query().deleteById(existingUser.id)
  return existingUser.id
}

export default deleteUser