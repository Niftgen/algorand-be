import {createCreatorApp, findUser} from "../../helpers/user.helper";
import {UserType} from "../../db/models/User";

const addCreatorApp = async (user: UserType, ctx: any) => {
  const existingUser = await findUser(user.walletAddress)
  if (!existingUser) throw Error(`User with wallet address ${user.walletAddress} not found`)
  if (existingUser.$creatorAppCreated()) return existingUser
  const rec = await createCreatorApp(existingUser, user)
  //console.log("addCreatorApp rec: ", rec)
  return rec
}

export default addCreatorApp