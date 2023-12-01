import pinpointClient from "./pinpointClient"
import {
  PhoneNumberValidateCommand,
  PhoneNumberValidateCommandInput, SendOTPMessageCommand,
  SendOTPMessageCommandInput
} from "@aws-sdk/client-pinpoint"
import {SMS} from "aws-sdk";

export const validatePhoneNumber = async (phone: string) => {
  if (!phone) throw Error('phone can not be blank')
  const params :PhoneNumberValidateCommandInput = {
    NumberValidateRequest: {
      PhoneNumber: phone
    }
  }
  const command = new PhoneNumberValidateCommand(params)
  let results: any
  try {
    results = await pinpointClient.send(command)
  } catch (error) {
    console.log(error)
    throw Error(`validatePhone Error: ${error}`)
  } finally {
    let valid :boolean = false
    if (results.NumberValidateResponse && results.NumberValidateResponse.PhoneType) {
      valid = (results.NumberValidateResponse.PhoneType != 'INVALID')
    }
    return valid
  }
}

export const generateOTP = async (phone: string) => {
  if (!phone) throw Error('phone can not be blank')
  const params :SendOTPMessageCommandInput = {
    ApplicationId: "1729d6dd27b147df904b83cfd98fbc1e",
    SendOTPMessageRequestParameters: {
      BrandName: 'Niftgen',
      Channel: 'SMS',
      DestinationIdentity: '+610433087554',
      ReferenceId: '1234567',
      OriginationIdentity: '+610412803838'
    }
  }
  const command = new SendOTPMessageCommand(params)
  let results: any
  try {
    results = await pinpointClient.send(command)
  } catch (error) {
    console.log(error)
    throw Error(`validatePhone Error: ${error}`)
  } finally {
    console.log("generateOTP results: ", results)
  }
}
