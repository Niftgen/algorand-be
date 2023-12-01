import {Notification, NOTIFICATION_TYPES} from "../db/models/Notification";
import axios from "axios";
import {ASSET_FIND_RELATIONSHIPS} from "./asset.helper";
const jwt = require('jsonwebtoken');


export interface NotificationParams {
  notificationType: string
  notification: string
  userId: number
  assetId?: number
  ratingId?: number
  commentId?: number
  transactionId?: number
  originatorId?: number
  deletedCommentId?: number
}

const notificationFindRelationships = () => {
  return `[asset.${ASSET_FIND_RELATIONSHIPS}, owner, rating.[user, asset], comment.[addressee, owner, asset], originator, transaction.[buyer, owner, asset, saleType]]`
}

export const createNotification = async (args: NotificationParams) => {
  let notification = new Notification()
  notification.notificationType = args.notificationType
  notification.notification = args.notification
  notification.userId = args.userId
  if (args.hasOwnProperty('originatorId')) notification.originatorId = args.originatorId as number
  if (args.hasOwnProperty('assetId')) notification.assetId = args.assetId as number
  if (args.hasOwnProperty('ratingId')) notification.ratingId = args.ratingId as number
  if (args.hasOwnProperty('commentId')) notification.commentId = args.commentId as number
  if (args.hasOwnProperty('transactionId')) notification.transactionId = args.transactionId as number
  if (args.hasOwnProperty('deletedCommentId')) notification.deletedCommentId = args.deletedCommentId as number
  //console.log("createNotification: ", notification)
  const record = await Notification.query()
    .insert(notification)
    .returning('*')
  const securityJwt = await jwt.sign({
    id: record.id
  }, process.env.JWT_SECRET, {expiresIn: `5m`})
  await triggerNotification(securityJwt)
  return record
}

export const findNotification = async (id: number) => {
  return await Notification.query()
    .withGraphJoined(notificationFindRelationships())
    .findOne('notifications.id', id)
}

export const findNotifications = async (args: any)  => {
  let query = Notification.query()
    .where('notifications.userId', args.userId)
  if (args.hasOwnProperty('notificationType') && args.notificationType)
    query.where({
      notificationType: args.notificationType
    })
  if (args.hasOwnProperty('limit')) query.limit(args.limit)
  if (args.hasOwnProperty('offset')) query.offset(args.offset)
  return await query
    .withGraphJoined(notificationFindRelationships())
    .orderBy('createdAt', 'desc')
}

const triggerNotification = async (token: string) => {
  if (!process.env?.GRAPHQL_URI) return
  const body = {
    query: `
      mutation {
        triggerNotification(token: "${token}") {
          id
          assetId
          userId
          deletedCommentId
          notification
          notificationType
          createdAt
          originatorId
          comment {
            ...comment
          }
          asset {
            ...asset
          }
          rating {
            ...rating
          }
          transaction {
            ...transaction
          }
          owner {
            ...user
          }
          originator {
            ...user
          }
        }
      }
      fragment rating on Rating {
        id
        userId
        assetId
        rating
      }
      fragment user on User {
        id
        walletAddress
        avatarPath
        userName
        creatorApp {
          id
          type
          txIds
          userId
          createdAt
          updatedAt
          appId
          appAddress
        }
        messageReceivedTotals {
          nftMessageTotal
          nftMessageRead                
          privateMessageTotal
          privateMessageRead
        }
      }      
      fragment comment on Comment {
        id
        content
        asset {
          id
        }
        addressee {
          ...user
        }
        owner {
          ...user
        }
        createdAt
      }
      fragment asset on Asset {
        id
        asaId
        name
        description
        ipfsPath
        filePath
        createdAt
        price
        currency
        kind
        cover
        views
        duration
        metadata
        saleType {
          id
          description
        }
        owner {
          ...user
        }
        minter {
          ...user
        }
        categories {
          id
          description
        }
      
        ratingTotals {
          ratingCount
          averageRating
        }
        myRating
        totalComments
      
        mint {
          ...transaction
        }
        list {
          ...transaction
        }
        auction {
          ...transaction
        }
        buy {
          ...transaction
        }
        winningBid {
          ...transaction
        }
        delist {
          ...transaction
        }
        app {
          ...transaction
        }
        optin {
          ...transaction
        }
      }
      fragment transaction on Transaction {
        id
        type
        txIds
        amount
        currency
        userId
        buyerId
        assetId
        auctionId
        sellType
        owner {
          ...user
        }
        buyer {
          ...user
        }
        saleType {
          id
          description
        }
        royaltyFee
        createdAt
        updatedAt
        appId
        startTime
        endTime
      }      
      `
  }
  console.log(`triggerNotification GRAPHQL_URI: ${process.env.GRAPHQL_URI} API_KEY: ${process.env.GRAPHQL_API_KEY}`)
  console.log("triggerNotification body: ", body)
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
    console.log("triggerNotification response: ", resp.data)
    console.log("triggerNotification response asset: ", resp.data.data.triggerNotification.asset)
    console.log("triggerNotification response comment: ", resp.data.data.triggerNotification.comment)
  } catch (error: any) {
    console.log("triggerNotification Error: ", error)
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
    throw new Error(`triggerNotification error: ${msg}`)
  }
}
