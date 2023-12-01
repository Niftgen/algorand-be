import {Transaction} from "../db/models/Transaction";
import {TransactionOrKnex} from "objection";

export interface TransactionParams {
  type: string
  amount?: number
  currency?: string
  txIds?: string
  sellType?: number
  buyerId?: number
  userId: number
  assetId?: number
  platformFee?: number
  initFee?: number
  royaltyFee?: number
  auctionId?: number
  appId?: number
  startTime?: string
  endTime?: string
  appAddress?: string
  rewardType?: string
}

export const createTransaction = async (args: TransactionParams, trx: TransactionOrKnex) => {
  let transaction = new Transaction()
  transaction.type = args.type
  if (args.hasOwnProperty('amount')) transaction.amount = args.amount as number
  if (args.hasOwnProperty('currency')) transaction.currency = args.currency as string
  if (args.hasOwnProperty('txIds')) transaction.txIds = args.txIds as string
  if (args.hasOwnProperty('sellType')) transaction.sellType = args.sellType as number
  if (args.hasOwnProperty('buyerId')) transaction.buyerId = args.buyerId as number
  if (args.hasOwnProperty('platformFee')) transaction.platformFee = args.platformFee as number
  if (args.hasOwnProperty('initFee')) transaction.initFee = args.initFee as number
  if (args.hasOwnProperty('royaltyFee')) transaction.royaltyFee = args.royaltyFee as number
  if (args.hasOwnProperty('auctionId')) transaction.auctionId = args.auctionId as number
  if (args.hasOwnProperty('appId')) transaction.appId = args.appId as number
  if (args.hasOwnProperty('startTime')) transaction.startTime = args.startTime as string
  if (args.hasOwnProperty('endTime')) transaction.endTime = args.endTime as string
  if (args.hasOwnProperty('appAddress')) transaction.appAddress = args.appAddress as string
  if (args.hasOwnProperty('assetId')) transaction.assetId = args.assetId as number
  if (args.hasOwnProperty('rewardType')) transaction.rewardType = args.rewardType as string
  transaction.userId = args.userId
  return await Transaction.query(trx).insertAndFetch(transaction)
}
