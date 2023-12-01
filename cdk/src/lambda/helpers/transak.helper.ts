import {retrieveSecret} from "../services/secretsManager";
import {findUser} from "./user.helper";
import {User} from "../db/models/User";
import axios from "axios";
const AWS = require('aws-sdk');
const {SecretsManager} = require('aws-sdk')
const jwt = require('jsonwebtoken');

export interface TransakParams {
  data: string
}

export const transakKyc = async (args: TransakParams) => {
  const environment = process.env.NODE_ENV || 'development'
  const secretId = `transak-${environment == 'production' || environment == 'mainnet' ? 'production' : 'staging' }-access-key`
  //console.log("transakKyc secretId: " , secretId);
  const secret = await retrieveSecret(secretId)
  const decodedData = jwt.verify(args.data, secret);
  //console.log("transakKyc decodedData.eventID: " , decodedData.eventID);
  //console.log("transakKyc decodedData.webhookData.walletAddress: " , decodedData.webhookData.walletAddress);
  const user = await findUser(decodedData.webhookData.walletAddress)
  if (decodedData.eventID != 'ORDER_FAILED' && decodedData.eventID != 'ORDER_CREATED') throw 'KYC was not successfully completed'
  if (!user) throw `Unable to find user with walletAddress ${decodedData.webhookData.walletAddress}`
  if (user?.id != decodedData.webhookData.partnerCustomerId) throw `The user with wallet address does not have the specified record Id ${decodedData.webhookData.partnerCustomerId}`
  if (!user.kyc) {
    await User.query()
      .patch({
        kyc: true,
        kycDate: decodedData.createdAt,
        kycToken: JSON.stringify(decodedData)
      })
      .findById(user.id)
  }
}
