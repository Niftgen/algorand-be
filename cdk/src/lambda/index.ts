import {AppSyncResolverEvent, APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import { LambdaDataSource } from "@aws-cdk/aws-appsync-alpha"
import {connectDb} from "./db/db"
import {Knex} from "knex"
import addLookup from "./resolvers/lookup/addLookup";
import editLookup from "./resolvers/lookup/editLookup";
import deleteLookup from "./resolvers/lookup/deleteLookup";
import getLookups from "./resolvers/lookup/getLookups"
import getLookupsForType from "./resolvers/lookup/getLookupsForType"
import getSaleTypes from "./resolvers/lookup/getSalesTypes";
import getUserTypes from "./resolvers/lookup/getUserTypes";
import getCategories from "./resolvers/lookup/getCategories";
import getUsers from "./resolvers/user/getUsers"
import getUser from "./resolvers/user/getUser"
import addUser from "./resolvers/user/addUser"
import editUser from "./resolvers/user/editUser";
import deleteUser from "./resolvers/user/deleteUser";
import authenticate from "./resolvers/auth/authenticate"
import addAsset from "./resolvers/asset/addAsset"
import mintAsset from "./resolvers/asset/mintAsset";
import listAsset from "./resolvers/asset/listAsset";
import delistAsset from "./resolvers/asset/delistAsset";
import bidOnAsset from "./resolvers/asset/bidOnAsset";
import buyAsset from "./resolvers/asset/buyAsset";
import deleteAsset from "./resolvers/asset/deleteAsset";
import addRating from "./resolvers/rating/addRating";
import getAsset from "./resolvers/asset/getAsset";
import getAssets from "./resolvers/asset/getAssets";
import addNftMessage from "./resolvers/comment/addNftMessage";
import addNftComment from "./resolvers/comment/addNftComment";
import addPrivateMessage from "./resolvers/comment/addPrivateMessage";
import messageRead from "./resolvers/comment/messageRead";
import deleteComment from "./resolvers/comment/deleteComment";
import getNftMessages from "./resolvers/comment/getNftMessages";
import getNftComments from "./resolvers/comment/getNftComments";
import getPrivateMessages from "./resolvers/comment/getPrivateMessages";
import {verifyJwt} from "./services/auth";
import deleteNotification from "./resolvers/notification/deleteNotification";
import getNotifications from "./resolvers/notification/getNotifications";
import triggerNotification from "./resolvers/notification/triggerNotification";
import transak from "./resolvers/transak/transak";
import {endAuctions} from "./helpers/asset.helper";
import createAuction from "./resolvers/asset/createAuction";
import startAuction from "./resolvers/asset/startAuction";
import endAuction from "./resolvers/asset/endAuction";
import messagesRead from "./resolvers/comment/messagesRead";
import createApp from "./resolvers/asset/createApp";
import optinApp from "./resolvers/asset/optinApp";
import optinAsset from "./resolvers/asset/optinAsset";
import getAssetOptin from "./resolvers/asset/getAssetOptin";
//import addVideo from "./resolvers/asset/addVideo";
import viewedAsset from "./resolvers/asset/viewedAsset";
import getAssetsCount from "./resolvers/asset/getAssetsCount";
import addCreatorApp from "./resolvers/user/addCreatorApp";
import updateAssetIpfs from "./resolvers/asset/updateAssetIpfs";
import {sendSubscriptionNotifications} from "./helpers/subscription.helper";
import updateAsset from "./resolvers/asset/updateAsset";

// DB connection
let connection: Knex

// Define all the resolvers
const resolvers: { [key: string]: { [key: string]: Function } } = {
  Query: {
    getAsset,
    getAssets,
    getAssetsCount,
    getAssetOptin,

    getLookups,
    getLookupsForType,
    getSaleTypes,
    getUserTypes,
    getCategories,

    getNftComments,
    getNftMessages,
    getPrivateMessages,

    getNotifications,

    getUsers,
    getUser
  },
  Mutation: {
    addAsset,
    //addVideo,
    bidOnAsset,
    buyAsset,
    deleteAsset,
    delistAsset,
    listAsset,
    mintAsset,
    createAuction,
    startAuction,
    endAuction,
    updateAsset,
    viewedAsset,
    updateAssetIpfs,

    createApp,
    optinApp,
    optinAsset,

    authenticate,

    addLookup,
    editLookup,
    deleteLookup,

    deleteNotification,

    addNftComment,
    addNftMessage,
    addPrivateMessage,
    deleteComment,
    messageRead,
    messagesRead,

    addRating,

    addUser,
    editUser,
    deleteUser,

    addCreatorApp,

    triggerNotification,
    transak
  },
}

// Resolvers used in Express app
export const expressResolvers = () => {
  let resolverArray: any = {}
  Object.entries(resolvers).forEach(([key, value]) => {
    resolverArray = Object.assign({}, resolverArray, value)
  })
  return resolverArray
}

// Attach resolvers to the datasource
export const setupResolvers = (datasource: LambdaDataSource) => {
  Object.keys(resolvers).forEach(key => {
    Object.keys(resolvers[key]).forEach(key2 => {
      const typeName = key
      const fieldName = resolvers[key][key2].name
      datasource.createResolver({ typeName, fieldName })
    })
  })
}

const getJwt = (headers: any) => {
  let jwt: any | undefined = undefined
  console.log("getJwt: headers: ", headers)
  if (headers.authorization && headers.authorization.split(' ')[0] === 'Bearer')
    jwt = headers.authorization.split(' ')[1]
  return jwt
}

// Lambda handler
export const handler = async (event: AppSyncResolverEvent<{ [key: string]: string | number }>) => {
  console.log("handler -> incoming event: ", JSON.stringify(event, null, 2))

  connection = await connectDb()

  const {
    arguments: args,
    info: { parentTypeName: typeName, fieldName },
    request: { headers }
  } = event

  console.log(`handler -> typeName: ${typeName} fieldName: ${fieldName}`)
  console.log("headers: ", headers)

  if(fieldName == "triggerNotification") {
    console.log("index -> triggerNotification args: ", args)
    return await triggerNotification(args)
  } else if(fieldName == "transak") {
    console.log("index -> transak args: ", args)
    return await transak(args)
  } else {
    let token: string | undefined = undefined
    if (fieldName != 'authenticate') {
      token = getJwt(headers)
      console.log("verifyToken token: ", token)
      if (token) {
        const verified = await verifyJwt(token)
        console.log("call verifyJwt verified: ", verified)
        if (!verified) throw Error("Not authorised - invalid token")
      } else {
        throw Error("Not authorised")
      }
    }

    const type = resolvers[typeName]
    if (type) {
      const operation = type[fieldName]
      if (operation) {
        return await operation(args, {jwt: token, headers: headers})
      }
    }
    throw new Error('unknow operation')
  }
}

// Scheduled task lambda handler
export const tasks = async (event: AppSyncResolverEvent<{ [key: string]: string | number }>) => {
  console.log("tasks -> incoming event: ", JSON.stringify(event, null, 2))

  connection = await connectDb()

  await endAuctions()
}

// Scheduled task lambda handler for subscription notifications
export const subscriptionNotifications = async (event: AppSyncResolverEvent<{ [key: string]: string | number }>) => {
  console.log("subscriptionNotifications -> incoming event: ", JSON.stringify(event, null, 2))

  connection = await connectDb()

  await sendSubscriptionNotifications()
}