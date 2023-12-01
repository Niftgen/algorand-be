import axios from "axios"
import * as fs from "fs";
const formData = require('form-data')

export const generatePinataJwt = async () => {
  const url = `${process.env.PINATA_API_URI}/users/generateApiKey`
  const body = {
    keyName: `niftgen_${Math.floor(Math.random() * 999999)}`,
    permissions: {
      endpoints: {
        pinning: {
          pinFileToIPFS: true,
        }
      }
    }
  }
  try {
    const response = await axios.post(
      url,
      body,
      {
        headers: {
          pinata_api_key: `${process.env.PINATA_API_KEY}`,
          pinata_secret_api_key: `${process.env.PINATA_API_SECRET}`
        }
      }
    )
    //console.log("generatePinataJwt response: ", response.data);
    return {
      jwt: response.data.JWT,
      secret: response.data.pinata_api_secret,
      key: response.data.pinata_api_key,

    }
  } catch (error: any) {
    console.log("generatePinataJwt Error: ", error)
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
    throw new Error(`generatePinataJwt error: ${msg}`)
  }
}

export const downloadPinataIpfsFile = async (url: string) => {
  const ipfs = 'https://niftgen.mypinata.cloud/ipfs'
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

export const uploadIpfsFile = async (filePath: string) => {
  if (!fs.existsSync(filePath)) throw Error(`File ${filePath} does not exist`)
  const body = new formData()
  body.append('file', fs.createReadStream(filePath));
  try {
    const response = await axios.post(
      `https://api.pinata.cloud/pinning/pinFileToIPFS`,
      body,
      {
        headers: {
          pinata_api_key: `${process.env.PINATA_API_KEY}`,
          pinata_secret_api_key: `${process.env.PINATA_API_SECRET}`
        }
      }
    )
    const ipfsUrl = `ipfs://${response.data.IpfsHash}`
    return ipfsUrl
  } catch (error: any) {
    console.log("uploadIpfsFile Error: ", error)
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
    throw new Error(`uploadIpfsFile error: ${msg}`)
  }
}

export const deleteIpfsFile = async (url: string) => {
  const id = `${url}`.replace('ipfs://', '');
  const ipfsUrl = `https://api.pinata.cloud/pinning/unpin/${id}`
  try {
    const response = await axios.delete(
      ipfsUrl,
      {
        headers: {
          pinata_api_key: `${process.env.PINATA_API_KEY}`,
          pinata_secret_api_key: `${process.env.PINATA_API_SECRET}`
        }
      })
  } catch (error: any) {
    console.log("deleteIpfsFile Error: ", error)
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
    throw new Error(`deleteIpfsFile error: ${msg}`)
  }
}