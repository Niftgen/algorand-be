import {transakKyc} from "../../helpers/transak.helper";

const transak = async (args: any) => {
  await transakKyc(args)
  return true
}

export default transak