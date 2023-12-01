import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import axios from "axios";

// Transak KYC handler
export const handler= async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log("transak handler -> incoming event: ", JSON.stringify(event, null, 2))
  console.log("transak handler -> body: ", event.body)
  if (event.body) {
    const body = JSON.parse(event.body)
    console.log("transak handler -> json body: ", body)
    await transakRequest(body.data)
  }

  return {
    statusCode: 200,
    body: 'OK'
  }
}


const transakRequest = async (data: string) => {
  if (!process.env?.GRAPHQL_URI) return
  const body = {
    query: `
      mutation {
        transak(
          data: "${data}" 
        )
      }
    `
  }
  //console.log(`transakRequest GRAPHQL_URI: ${process.env.GRAPHQL_URI} API_KEY: ${process.env.GRAPHQL_API_KEY}`)
  //console.log("transakRequest body: ", body)
  try {
    const resp = await axios.post(
      process.env?.GRAPHQL_URI || '',
      body,
      {
        headers: {
          "x-api-key": process.env.GRAPHQL_API_KEY || '',
          "content-type": "application/json",
        }
      })
    console.log("transakRequest response: ", resp.data)
  } catch (error: any) {
    console.log("transakRequest Error: ", error)
    let msg: string
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
    throw new Error(`transakRequest error: ${msg}`)
  }
}

