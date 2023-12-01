import rekognitionClient from "./rekognitionClient";
import {downloadIpfsFile} from "./ipfs";

const detectModerationLabels = async (ipfsUri: string) => {
  if (process.env.NODE_ENV == 'development') return []
  if (!ipfsUri) throw Error('ipfsUri can not be blank')
  const bytes = await downloadIpfsFile(ipfsUri)
  const params = {
    Image: {
      Bytes: bytes,
    },
    MinConfidence: 70,
  }
  let results :any
  try {
    results = await rekognitionClient.detectModerationLabels(params).promise()
  } catch (error) {
    console.log(error)
    throw Error(`detectModerationLabels Error: ${error}`)
  }
  //console.log("detectModerationLabels results: ", results)
  return results
}

export const moderateImage = async (ipfsUri: string) => {
  const results = await detectModerationLabels(ipfsUri)
  let errors: string = ''
  const categories = ['Explicit Nudity', 'Hate Symbols']
  if (results.ModerationLabels && results.ModerationLabels.length > 0) {
    results.ModerationLabels.forEach((label :any) => {
      categories.forEach(category => {
        if (label.Name == category || label.ParentName == category) {
          if (errors.length > 0) errors += ", "
          errors += label.Name
        }
      })
    })
  }
  //console.log(`moderateImage errors: ${errors}`)
  return errors
}
