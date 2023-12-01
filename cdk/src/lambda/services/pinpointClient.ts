import { PinpointClient } from "@aws-sdk/client-pinpoint";

const REGION = process.env.REGION
export default new PinpointClient({
  region: REGION
})

