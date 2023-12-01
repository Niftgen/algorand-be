import {currentUser} from "../../services/auth";
import {getAssetsQuery} from "../../helpers/asset.helper";

const getAssetsCount = async (args: any, ctx: any) => {
  const user = await currentUser(ctx.jwt, args.walletAddress)
  return await getAssetsQuery(args, user, true)
}

export default getAssetsCount