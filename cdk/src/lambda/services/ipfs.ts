import axios from "axios"
import * as fs from "fs";
const formData = require('form-data')

export const pinFileToIPFS = async (filePath: string, image_data: Buffer | null = null) => {
  const body = new formData()
  if (image_data) {
    body.append("image_data", image_data)
  } else {
    if (!fs.existsSync(filePath)) throw Error(`File ${filePath} does not exist`)
    body.append('file', fs.createReadStream(filePath))
  }
  const ipfs = `${process.env.IPFS_URI}/api/v0/add`
  const auth = Buffer.from(`${process.env.IPFS_UID}:${process.env.IPFS_PWD}`).toString('base64')
  try {
    const response = await axios.post(
      ipfs,
      body,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          //'Content-Type': `multipart/form-data; boundary= ${body._boundary}`
        },
        // These arguments remove any client-side upload size restrictions
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    )
    const ipfsUrl = `ipfs://${response.data.Hash}`
    return ipfsUrl
  } catch (error: any) {
    console.log("pinFileToIPFS Error: ", error)
    let msg
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      msg = 'Data: ' + JSON.stringify(error.response.data) + ' Status: ' + JSON.stringify(error.response.status) + ' Headers: ' + JSON.stringify(error.response.headers)
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      msg = "Request: " + JSON.stringify(error.request)
    } else {
      // Something happened in setting up the request that triggered an Error
      msg = "Message: " + JSON.stringify(error.message)
    }
    throw new Error(`pinFileToIPFS error: ${msg}`)
  }
}

export const downloadIpfsFile = async (url: string) => {
  const ipfs = `${process.env.IPFS_URI}/ipfs`
  const id = `${url}`.replace('ipfs://', '');
  let ipfsUrl :string
  if (id.startsWith('Qm') && id.length === 46) {
    ipfsUrl = `${ipfs}/${id}`;
  } else {
    throw Error(`Invalid ipfs CID`)
  }
  try {
    const response = await axios.get(
      ipfsUrl,
      {
        responseType: 'arraybuffer'
      })
    return Buffer.from(response.data, 'base64');
  } catch (error: any) {
    console.log("downloadIpfsFile Error: ", error)
    let msg
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      msg = 'Data: ' + JSON.stringify(error.response.data) + ' Status: ' + JSON.stringify(error.response.status) + ' Headers: ' + JSON.stringify(error.response.headers)
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      msg = "Request: " + JSON.stringify(error.request)
    } else {
      // Something happened in setting up the request that triggered an Error
      msg = "Message: " + JSON.stringify(error.message)
    }
    throw new Error(`downloadIpfsFile error: ${msg}`)
  }
}
