import {UserType} from '../../db/models/User'
import {findUser, findUserByReferral} from "../../helpers/user.helper";

const getUser = async (user: UserType) => {
  let results
  if (user.referralCode)
    results =  await findUserByReferral(user.referralCode)
  else
    results =  await findUser(user.walletAddress)
  return results
}

export default getUser