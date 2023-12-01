const AWS = require('aws-sdk')

const REGION = process.env.REGION
export default new AWS.Rekognition({
  region: REGION,
  apiVersion: "latest"
})
