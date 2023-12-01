import {UserType} from '../../db/models/User'
import {findUser, updateUser} from "../../helpers/user.helper";
import {getAge} from "../../helpers/asset.helper";

const editUser = async (user: UserType) => {
  const existingUser = await findUser(user.walletAddress)
  if (!existingUser) throw Error(`User with wallet address ${user.walletAddress} not found`)
  if (user.hasOwnProperty('dateOfBirth') && getAge(user.dateOfBirth) <= 14) throw Error("User is too young to join, must be over 14 years old")
  return await updateUser(existingUser, user)
}

export default editUser