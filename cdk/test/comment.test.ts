import {Knex} from "knex"
import {connectDb} from "../src/lambda/db/db";
const supertest = require("supertest")
const app = require("../../app")
import {Asset} from "../src/lambda/db/models/Asset";
import {User} from "../src/lambda/db/models/User";
import {LOOKUP_SALE_TYPES} from "../src/lambda/db/models/Lookup";
import {setupDb, stopDb} from "./testDB";
import {MessageType, Comment} from "../src/lambda/db/models/Comment";
import {findByType} from "../src/lambda/helpers/lookup.helper";
import {createUser} from "../src/lambda/helpers/user.helper";
import {createAsset} from "../src/lambda/helpers/asset.helper";
import {createComment} from "../src/lambda/helpers/comment.helper";
import {NOTIFICATION_TYPES} from "../src/lambda/db/models/Notification";
import {userFragment} from "./graphql_fragments";
import {ASSETKIND} from "../src/lambda/services/const";


describe('Comment Tests',() => {
  let db: Knex
  let user: User | undefined
  let user2: User | undefined
  let addressee: User | undefined
  let addressee2: User | undefined
  let asset: Asset | undefined
  let asset2: Asset | undefined
  const request = supertest(app)

  const result_fields = () => {
    return `
      id
      content
      messageRead
      createdAt
      updatedAt
      owner {
        ...user
      }
      addressee {
        ...user
      }
      asset{
        id
        name
        description
        asaId
        ipfsPath
        txId
        listingTxId
        buyTxId
        price
        currency
        sellType
        minterId
        userId
        createdAt
        updatedAt
        totalComments
        saleType{
          id
          active
          description
          type
          createdAt
          updatedAt
        }
        owner {
          ...user
        }
        minter {
          ...user
        }
        categories{
          id
          active
          description
          type
          createdAt
          updatedAt
        }    
        ratingTotals{
          averageRating
          ratingCount
        }  
      }                 
    `
  }

  beforeAll(async () => {
    db = await setupDb()
    const lookups = await findByType(LOOKUP_SALE_TYPES)
    user = await createUser({
      walletAddress: process.env.TEST_WALLET_ADDRESS,
      avatarPath: 'path/avatar',
      email: 'user@ips.com',
      userName: 'user'
    })
    user2 = await createUser({
      walletAddress: process.env.TEST_WALLET_ADDRESS2,
      avatarPath: 'path/avatar',
      email: 'user2@ips.com',
      userName: 'user2'
    })
    addressee = await createUser({
      walletAddress: process.env.TEST_WALLET_ADDRESS3,
      avatarPath: 'path/avatar',
      email: 'addressee@ips.com',
      userName: 'addressee'
    })
    addressee2 = await createUser({
      walletAddress: 'addressee2walletcomment',
      avatarPath: 'path/avatar',
      email: 'addressee2@ips.com',
      userName: 'addressee2'
    })
    const saleTypes = await findByType(LOOKUP_SALE_TYPES)
    if (user && user2) {
      asset = await createAsset(
        {
          name: "Asset",
          description: "Test Asset",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, user)
      asset2 = await createAsset(
        {
          name: "Asset2",
          description: "Test Asset2",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, user2)
    }
  })

  afterAll(async () => {
    await stopDb()
  })

  test("Add NFT comment", async (done: any) => {
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            addNftComment(
              walletAddress: "${user?.walletAddress}", 
              assetId: ${asset?.id}, 
              content: "This is a test NFT comment"
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.addNftComment.owner.id).toEqual(user?.id)
        expect(res.body.data.addNftComment.owner.walletAddress).toEqual(user?.walletAddress)
        expect(res.body.data.addNftComment.asset.id).toEqual(asset?.id)
        expect(res.body.data.addNftComment.asset.name).toEqual(asset?.name)
        expect(res.body.data.addNftComment.content).toEqual("This is a test NFT comment")
        done()
      })
  })

  test("Add NFT message", async (done: any) => {
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            addNftMessage(walletAddress: "${user?.walletAddress}", 
              assetId: ${asset?.id}, 
              addresseeId: ${addressee?.id}
              content: "This is a test NFT message"
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.addNftMessage.owner.id).toEqual(user?.id)
        expect(res.body.data.addNftMessage.owner.walletAddress).toEqual(user?.walletAddress)
        expect(res.body.data.addNftMessage.addressee.id).toEqual(addressee?.id)
        expect(res.body.data.addNftMessage.addressee.walletAddress).toEqual(addressee?.walletAddress)
        expect(res.body.data.addNftMessage.asset.id).toEqual(asset?.id)
        expect(res.body.data.addNftMessage.asset.name).toEqual(asset?.name)
        expect(res.body.data.addNftMessage.content).toEqual("This is a test NFT message")
        done()
      })
  })

  test("Add NFT private message", async (done: any) => {
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            addPrivateMessage(walletAddress: "${user?.walletAddress}", 
              addresseeId: ${addressee?.id}
              content: "This is a private message"
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.addPrivateMessage.owner.id).toEqual(user?.id)
        expect(res.body.data.addPrivateMessage.owner.walletAddress).toEqual(user?.walletAddress)
        expect(res.body.data.addPrivateMessage.addressee.id).toEqual(addressee?.id)
        expect(res.body.data.addPrivateMessage.addressee.walletAddress).toEqual(addressee?.walletAddress)
        expect(res.body.data.addPrivateMessage.content).toEqual("This is a private message")
        done()
      })
  })

  test("Mark a message as read", async (done: any) => {
    await Comment.query().delete()
    let message: Comment | undefined
    if (user && addressee)
      message = await createComment({
        userId: user?.id,
        content: "This is a private message to test marking a message as read",
        messageType: MessageType.PRIVATE_MESSAGE,
        addresseeId: addressee?.id
        },
        {
          notification: `${user.userName} has sent you private message`,
          notificationType: NOTIFICATION_TYPES.MESSAGE,
          userId: addressee?.id,
          originatorId: user.id
        }
      )
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            messageRead(
              walletAddress: "${addressee?.walletAddress}",
              id: ${message?.id}
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT3}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.messageRead.owner.id).toEqual(user?.id)
        expect(res.body.data.messageRead.owner.walletAddress).toEqual(user?.walletAddress)
        expect(res.body.data.messageRead.addressee.id).toEqual(addressee?.id)
        expect(res.body.data.messageRead.addressee.walletAddress).toEqual(addressee?.walletAddress)
        expect(res.body.data.messageRead.content).toEqual("This is a private message to test marking a message as read")
        expect(res.body.data.messageRead.messageRead).not.toBeNull()
        expect(res.body.data.messageRead.addressee.messageReceivedTotals.nftMessageTotal).toEqual(0)
        expect(res.body.data.messageRead.addressee.messageReceivedTotals.nftMessageRead).toEqual(0)
        expect(res.body.data.messageRead.addressee.messageReceivedTotals.privateMessageTotal).toEqual(1)
        expect(res.body.data.messageRead.addressee.messageReceivedTotals.privateMessageRead).toEqual(1)
        done()
      })
  })

  test("Mark multiple messages as read", async (done: any) => {
    await Comment.query().delete()
    let message: Comment | undefined
    let message2: Comment | undefined
    if (user && addressee) {
      message = await createComment({
          userId: user?.id,
          content: "This is a private message to test marking a message as read",
          messageType: MessageType.PRIVATE_MESSAGE,
          addresseeId: addressee?.id
        },
        {
          notification: `${user.userName} has sent you private message`,
          notificationType: NOTIFICATION_TYPES.MESSAGE,
          userId: addressee?.id,
          originatorId: user.id
        }
      )
      message2 = await createComment({
          userId: user?.id,
          content: "This is 2nd private message to test marking a message as read",
          messageType: MessageType.PRIVATE_MESSAGE,
          addresseeId: addressee?.id
        },
        {
          notification: `${user.userName} has sent you private message`,
          notificationType: NOTIFICATION_TYPES.MESSAGE,
          userId: addressee?.id,
          originatorId: user.id
        }
      )
    }
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            messagesRead(
              walletAddress: "${addressee?.walletAddress}",
              ids: [${message?.id},${message2?.id}]
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT3}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.messagesRead[0].owner.id).toEqual(user?.id)
        expect(res.body.data.messagesRead[0].owner.walletAddress).toEqual(user?.walletAddress)
        expect(res.body.data.messagesRead[0].addressee.id).toEqual(addressee?.id)
        expect(res.body.data.messagesRead[0].addressee.walletAddress).toEqual(addressee?.walletAddress)
        expect(res.body.data.messagesRead[0].content).toEqual("This is 2nd private message to test marking a message as read")
        expect(res.body.data.messagesRead[0].messageRead).not.toBeNull()
        expect(res.body.data.messagesRead[0].addressee.messageReceivedTotals.nftMessageTotal).toEqual(0)
        expect(res.body.data.messagesRead[0].addressee.messageReceivedTotals.nftMessageRead).toEqual(0)
        expect(res.body.data.messagesRead[0].addressee.messageReceivedTotals.privateMessageTotal).toEqual(2)
        expect(res.body.data.messagesRead[0].addressee.messageReceivedTotals.privateMessageRead).toEqual(2)
        done()
      })
  })

  test("Should only be able to mark your own message as read", async (done: any) => {
    let message: Comment | undefined
    if (user && addressee)
      message = await createComment({
          userId: user?.id,
          content: "This is a private message to test marking a message as read",
          messageType: MessageType.PRIVATE_MESSAGE,
          addresseeId: addressee?.id
        },
        {
          notification: `${user.userName} has sent you a private message`,
          notificationType: NOTIFICATION_TYPES.COMMENT,
          userId: addressee?.id,
          originatorId: user.id
        }
      )
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            messageRead(
              walletAddress: "${user2?.walletAddress}",
              id: ${message?.id}
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
       `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT2}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toEqual('Unable to mark comments as read as the comment does not belong to the user with the specified wallet address')
        done()
      })
  })

  test("Delete a comment", async (done: any) => {
    let message: Comment | undefined
    if (user && addressee)
      message = await createComment({
          userId: user?.id,
          content: "This is a private message to test marking a message as read",
          messageType: MessageType.PRIVATE_MESSAGE,
          addresseeId: addressee?.id
        },
        {
          notification: `${user.userName} has sent you a private message`,
          notificationType: NOTIFICATION_TYPES.COMMENT,
          userId: addressee?.id,
          originatorId: user.id
        }
      )
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            deleteComment(
              walletAddress: "${user?.walletAddress}",
              id: ${message?.id}
            ) 
          }
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        const deleted = await Comment.query()
          .findById(message instanceof Comment ? message.id : 0)
        expect(deleted).toBeUndefined()
        done()
      })
  })

  test("Addressee should be able to delete a private message", async (done: any) => {
    let message: Comment | undefined
    if (user && addressee)
      message = await createComment({
          userId: user?.id,
          content: "This is a private message to test marking a message as read",
          messageType: MessageType.PRIVATE_MESSAGE,
          addresseeId: addressee?.id
        },
        {
          notification: `${user.userName} has sent you a private message`,
          notificationType: NOTIFICATION_TYPES.MESSAGE,
          userId: addressee?.id,
          originatorId: user.id
        }
      )
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            deleteComment(
              walletAddress: "${addressee?.walletAddress}",
              id: ${message?.id}
            ) 
          }
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT3}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        const deleted = await Comment.query()
          .findById(message instanceof Comment ? message.id : 0)
        expect(deleted).toBeUndefined()
        done()
      })
  })

  test("Addressee should be able to delete a NFT private message", async (done: any) => {
    let message: Comment | undefined
    if (user && addressee)
      message = await createComment({
          userId: user?.id,
          content: "This is a private message to test marking a message as read",
          messageType: MessageType.ASSET_MESSAGE,
          addresseeId: addressee?.id,
          assetId: asset?.id
        },
        {
          notification: `${user.userName} has sent you a private message`,
          notificationType: NOTIFICATION_TYPES.MESSAGE,
          userId: addressee?.id,
          originatorId: user.id,
          assetId: asset?.id
        }
      )
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            deleteComment(
              walletAddress: "${addressee?.walletAddress}",
              id: ${message?.id}
            ) 
          }
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT3}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        const deleted = await Comment.query()
          .findById(message instanceof Comment ? message.id : 0)
        expect(deleted).toBeUndefined()
        done()
      })
  })

  test("Owner of a private message should be able to delete it", async (done: any) => {
    let message: Comment | undefined
    if (user && addressee)
      message = await createComment({
          userId: user?.id,
          content: "This is a private message to test marking a message as read",
          messageType: MessageType.PRIVATE_MESSAGE,
          addresseeId: addressee?.id
        },
        {
          notification: `${user.userName} has sent you a private message`,
          notificationType: NOTIFICATION_TYPES.MESSAGE,
          userId: addressee?.id,
          originatorId: user.id
        }
      )
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            deleteComment(
              walletAddress: "${user?.walletAddress}",
              id: ${message?.id}
            ) 
          }
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        const deleted = await Comment.query()
          .findById(message instanceof Comment ? message.id : 0)
        expect(deleted).toBeUndefined()
        done()
      })
  })

  test("Owner of an NFT private message should be able to delete it", async (done: any) => {
    let message: Comment | undefined
    if (user && addressee)
      message = await createComment({
          userId: user?.id,
          content: "This is a private message to test marking a message as read",
          messageType: MessageType.ASSET_MESSAGE,
          addresseeId: addressee?.id,
          assetId: asset?.id
        },
        {
          notification: `${user.userName} has sent you a private message`,
          notificationType: NOTIFICATION_TYPES.MESSAGE,
          userId: addressee?.id,
          originatorId: user.id,
          assetId: asset?.id
        }
      )
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            deleteComment(
              walletAddress: "${user?.walletAddress}",
              id: ${message?.id}
            ) 
          }
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        const deleted = await Comment.query()
          .findById(message instanceof Comment ? message.id : 0)
        expect(deleted).toBeUndefined()
        done()
      })
  })

  test("Delete a NFT comment", async (done: any) => {
    let message: Comment | undefined
    if (user && addressee)
      message = await createComment({
          userId: user?.id,
          assetId: asset?.id,
          content: "This is a comment on your NFT",
          messageType: MessageType.PRIVATE_MESSAGE,
          addresseeId: addressee?.id
        },
        {
          notification: `${user.userName} has sent you a private message`,
          notificationType: NOTIFICATION_TYPES.COMMENT,
          userId: addressee?.id,
          assetId: asset?.id,
          originatorId: user.id
        }
      )
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            deleteComment(
              walletAddress: "${user?.walletAddress}",
              id: ${message?.id}
            ) 
          }
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        const deleted = await Comment.query()
          .findById(message instanceof Comment ? message.id : 0)
        expect(deleted).toBeUndefined()
        done()
      })
  })

  test("Should only be able to delete your own comments", async (done: any) => {
    let message: Comment | undefined
    if (user && addressee)
      message = await createComment({
          userId: user?.id,
          content: "This is a private message to test marking a message as read",
          messageType: MessageType.PRIVATE_MESSAGE,
          addresseeId: addressee?.id
        },
        {
          notification: `${user.userName} has sent you a private message`,
          notificationType: NOTIFICATION_TYPES.COMMENT,
          userId: addressee?.id,
          originatorId: user.id
        }
      )
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            deleteComment(
              walletAddress: "${user2?.walletAddress}",
              id: ${message?.id}
            ) 
          }
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT2}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toEqual('Unable to delete comment as it is not owned or addressed to the user with specified wallet address')
        done()
      })
  })

  test("Get NFT messages", async (done: any) => {
    await Comment.query().delete()
    if (user && addressee && asset) {
      await createComment({
        userId: user?.id,
        content: "NFT message from addressee",
        messageType: MessageType.ASSET_MESSAGE,
        addresseeId: addressee?.id,
        assetId: asset?.id
        },
        {
          notification: `${user.userName} commented on your NFT`,
          notificationType: NOTIFICATION_TYPES.MESSAGE,
          userId: addressee?.id,
          assetId: asset?.id,
          originatorId: user.id
        }
      )
      await createComment({
        userId: user?.id,
        content: "2nd NFT message from addressee",
        messageType: MessageType.ASSET_MESSAGE,
        addresseeId: addressee?.id,
        assetId: asset?.id
        },
        {
          notification: `${user.userName} sent you a message about your NFT`,
          notificationType: NOTIFICATION_TYPES.MESSAGE,
          userId: addressee?.id,
          assetId: asset?.id,
          originatorId: user.id
        }
      )
      await createComment({
          userId: user?.id,
          content: "This is a private message to test marking a message as read",
          messageType: MessageType.PRIVATE_MESSAGE,
          addresseeId: addressee?.id
        },
        {
          notification: `${user.userName} has sent you a private message`,
          notificationType: NOTIFICATION_TYPES.MESSAGE,
          userId: addressee?.id,
          originatorId: user.id
        }
      )
    }
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getNftMessages(
              walletAddress: "${user?.walletAddress}"
              assetId: ${asset?.id}
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getNftMessages.length).toEqual(2)
        expect(res.body.data.getNftMessages).toEqual(
          expect.arrayContaining([
            expect.objectContaining({content: '2nd NFT message from addressee'}),
            expect.objectContaining({content: 'NFT message from addressee'})
          ])
        )
        done()
      })
  })

  test("Get NFT messages for multiple NFT's", async (done: any) => {
    await Comment.query().delete()
    if (user && addressee && asset && asset2) {
      await createComment({
          userId: user?.id,
          content: "NFT message from addressee",
          messageType: MessageType.ASSET_MESSAGE,
          addresseeId: addressee?.id,
          assetId: asset?.id
        },
        {
          notification: `${user.userName} commented on your NFT`,
          notificationType: NOTIFICATION_TYPES.MESSAGE,
          userId: addressee?.id,
          assetId: asset?.id,
          originatorId: user.id
        }
      )
      await createComment({
          userId: user?.id,
          content: "2nd NFT message from addressee",
          messageType: MessageType.ASSET_MESSAGE,
          addresseeId: addressee?.id,
          assetId: asset?.id
        },
        {
          notification: `${user.userName} sent you a message about your NFT`,
          notificationType: NOTIFICATION_TYPES.MESSAGE,
          userId: addressee?.id,
          assetId: asset?.id,
          originatorId: user.id
        }
      )
      await createComment({
          userId: user?.id,
          content: "This is a private message to test marking a message as read",
          messageType: MessageType.PRIVATE_MESSAGE,
          addresseeId: addressee?.id
        },
        {
          notification: `${user.userName} has sent you a private message`,
          notificationType: NOTIFICATION_TYPES.MESSAGE,
          userId: addressee?.id,
          originatorId: user.id
        }
      )
      await createComment({
          userId: user?.id,
          content: "NFT message from addressee for asset2",
          messageType: MessageType.ASSET_MESSAGE,
          addresseeId: addressee?.id,
          assetId: asset2?.id
        },
        {
          notification: `${user.userName} sent you a message about your NFT`,
          notificationType: NOTIFICATION_TYPES.MESSAGE,
          userId: addressee?.id,
          assetId: asset2?.id,
          originatorId: user.id
        }
      )
    }
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getNftMessages(
              walletAddress: "${user?.walletAddress}"
              assetId: [${asset?.id}, ${asset2?.id}]
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getNftMessages.length).toEqual(3)
        expect(res.body.data.getNftMessages).toEqual(
          expect.arrayContaining([
            expect.objectContaining({content: '2nd NFT message from addressee'}),
            expect.objectContaining({content: 'NFT message from addressee'})
          ])
        )
        done()
      })
  })

  test("Get NFT comments", async (done: any) => {
    await Comment.query().delete()
    if (user && addressee && asset) {
      await createComment({
          userId: user?.id,
          content: "NFT comment",
          messageType: MessageType.ASSET_COMMENT,
          assetId: asset?.id
        },
        {
          notification: `${user.userName} commented on your NFT`,
          notificationType: NOTIFICATION_TYPES.COMMENT,
          userId: asset?.userId,
          assetId: asset?.id,
          originatorId: user.id
        }
      )
      await createComment({
          userId: user?.id,
          content: "2nd NFT comment",
          messageType: MessageType.ASSET_COMMENT,
          assetId: asset?.id
        },
        {
          notification: `${user.userName} commented on your NFT`,
          notificationType: NOTIFICATION_TYPES.COMMENT,
          userId: asset?.userId,
          assetId: asset?.id,
          originatorId: user.id
        }
      )
      await createComment({
          userId: user?.id,
          content: "Private message",
          messageType: MessageType.PRIVATE_MESSAGE,
          addresseeId: addressee?.id,
          assetId: asset?.id
        },
        {
          notification: `${user.userName} sent a provate message`,
          notificationType: NOTIFICATION_TYPES.MESSAGE,
          userId: addressee?.id,
          assetId: asset?.id,
          originatorId: user.id
        }
      )
    }
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getNftComments(
              assetId: ${asset?.id}
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getNftComments.length).toEqual(2)
        expect(res.body.data.getNftComments).toEqual(
          expect.arrayContaining([
            expect.objectContaining({content: '2nd NFT comment'}),
            expect.objectContaining({content: 'NFT comment'})
          ])
        )
        done()
      })
  })

  test("Get Private messages", async (done: any) => {
    await Comment.query().delete()
    if (user && addressee && asset && addressee2) {
      await createComment({
        userId: user?.id,
        content: "Private message",
        messageType: MessageType.PRIVATE_MESSAGE,
        addresseeId: addressee?.id,
        },
        {
          notification: `${user.userName} sent a provate message`,
          notificationType: NOTIFICATION_TYPES.MESSAGE,
          userId: addressee?.id,
          assetId: asset?.id,
          originatorId: user.id
        }
      )
      await createComment({
        userId: user?.id,
        content: "2nd Private message",
        messageType: MessageType.PRIVATE_MESSAGE,
        addresseeId: addressee2?.id,
        },
        {
          notification: `${user.userName} sent a provate message`,
          notificationType: NOTIFICATION_TYPES.MESSAGE,
          userId: addressee2?.id,
          assetId: asset?.id,
          originatorId: user.id
        }
      )
      await createComment({
          userId: user?.id,
          content: "NFT comment",
          messageType: MessageType.ASSET_COMMENT,
          assetId: asset?.id
        },
        {
          notification: `${user.userName} commented on your NFT`,
          notificationType: NOTIFICATION_TYPES.COMMENT,
          userId: asset?.userId,
          assetId: asset?.id,
          originatorId: user.id
        }
      )
    }
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getPrivateMessages(
              walletAddress: "${user?.walletAddress}"
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getPrivateMessages.length).toEqual(2)
        expect(res.body.data.getPrivateMessages).toEqual(
          expect.arrayContaining([
            expect.objectContaining({content: '2nd Private message'}),
            expect.objectContaining({content: 'Private message'})
          ])
        )
        done()
      })
  })

  test("Get users NFT's with messages", async (done: any) => {
    await Comment.query().delete()
    if (user && user2 && asset) {
      await createComment({
          userId: user2?.id,
          content: "NFT Private message",
          messageType: MessageType.ASSET_MESSAGE,
          addresseeId: user?.id,
          assetId: asset?.id,
        },
        {
          notification: `${user.userName} sent a NFT PM`,
          notificationType: NOTIFICATION_TYPES.MESSAGE,
          userId: user?.id,
          assetId: asset?.id,
          originatorId: user2.id
        }
      )
      await createComment({
          userId: user2?.id,
          content: "2nd NFT Private message",
          messageType: MessageType.ASSET_MESSAGE,
          addresseeId: user?.id,
          assetId: asset?.id,
        },
        {
          notification: `${user.userName} sent a NFT PM`,
          notificationType: NOTIFICATION_TYPES.MESSAGE,
          userId: user?.id,
          assetId: asset?.id,
          originatorId: user2.id
        }
      )
      await createComment({
          userId: user?.id,
          content: "NFT comment",
          messageType: MessageType.ASSET_COMMENT,
          assetId: asset?.id
        },
        {
          notification: `${user.userName} commented on your NFT`,
          notificationType: NOTIFICATION_TYPES.COMMENT,
          userId: asset?.userId,
          assetId: asset?.id,
          originatorId: user.id
        }
      )
    }
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getNftMessages(
              walletAddress: "${user?.walletAddress}"
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getNftMessages.length).toEqual(2)
        expect(res.body.data.getNftMessages).toEqual(
          expect.arrayContaining([
            expect.objectContaining({content: '2nd NFT Private message'}),
            expect.objectContaining({content: 'NFT Private message'})
          ])
        )
        done()
      })
  })

  test("Get NFT comments limit 3", async (done: any) => {
    await Comment.query().delete()
    if (user && addressee && asset && addressee2) {
      await createComment({
        userId: user?.id,
        content: "NFT comment",
        messageType: MessageType.ASSET_COMMENT,
        assetId: asset?.id
        },
        {
          notification: `${user.userName} commented on your NFT`,
          notificationType: NOTIFICATION_TYPES.COMMENT,
          userId: asset?.userId,
          assetId: asset?.id,
          originatorId: user.id
        }
      )
      await createComment({
        userId: user?.id,
        content: "2nd NFT comment",
        messageType: MessageType.ASSET_COMMENT,
        assetId: asset?.id
        },
        {
          notification: `${user.userName} commented on your NFT`,
          notificationType: NOTIFICATION_TYPES.COMMENT,
          userId: asset?.userId,
          assetId: asset?.id,
          originatorId: user.id
        }
      )
      await createComment({
        userId: user?.id,
        content: "3rd NFT comment",
        messageType: MessageType.ASSET_COMMENT,
        assetId: asset?.id
        },
        {
          notification: `${user.userName} commented on your NFT`,
          notificationType: NOTIFICATION_TYPES.COMMENT,
          userId: asset?.userId,
          assetId: asset?.id,
          originatorId: user.id
        }
      )
      await createComment({
        userId: user?.id,
        content: "4th NFT comment",
        messageType: MessageType.ASSET_COMMENT,
        assetId: asset?.id
        },
        {
          notification: `${user.userName} commented on your NFT`,
          notificationType: NOTIFICATION_TYPES.COMMENT,
          userId: asset?.userId,
          assetId: asset?.id,
          originatorId: user.id
        }
      )
      await createComment({
        userId: user?.id,
        content: "Private message",
        messageType: MessageType.PRIVATE_MESSAGE,
        addresseeId: addressee?.id,
        assetId: asset?.id
        },
        {
          notification: `${user.userName} sent a provate message`,
          notificationType: NOTIFICATION_TYPES.MESSAGE,
          userId: addressee2?.id,
          assetId: asset?.id,
          originatorId: user.id
        }
      )
    }
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getNftComments(
              assetId: ${asset?.id}
              limit: 3
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getNftComments.length).toEqual(3)
        done()
      })
  })

  test("Get NFT comments offset 2", async (done: any) => {
    await Comment.query().delete()
    if (user && addressee && asset && addressee2) {
      await createComment({
        userId: user?.id,
        content: "NFT comment",
        messageType: MessageType.ASSET_COMMENT,
        assetId: asset?.id
        },
        {
          notification: `${user.userName} commented on your NFT`,
          notificationType: NOTIFICATION_TYPES.COMMENT,
          userId: asset?.userId,
          assetId: asset?.id,
          originatorId: user.id
        }
      )
      await createComment({
        userId: user?.id,
        content: "2nd NFT comment",
        messageType: MessageType.ASSET_COMMENT,
        assetId: asset?.id
        },
        {
          notification: `${user.userName} commented on your NFT`,
          notificationType: NOTIFICATION_TYPES.COMMENT,
          userId: asset?.userId,
          assetId: asset?.id,
          originatorId: user.id
        }
      )
      await createComment({
        userId: user?.id,
        content: "3rd NFT comment",
        messageType: MessageType.ASSET_COMMENT,
        assetId: asset?.id
        },
        {
          notification: `${user.userName} commented on your NFT`,
          notificationType: NOTIFICATION_TYPES.COMMENT,
          userId: asset?.userId,
          assetId: asset?.id,
          originatorId: user.id
        }
      )
      await createComment({
        userId: user?.id,
        content: "4th NFT comment",
        messageType: MessageType.ASSET_COMMENT,
        assetId: asset?.id
        },
        {
          notification: `${user.userName} commented on your NFT`,
          notificationType: NOTIFICATION_TYPES.COMMENT,
          userId: asset?.userId,
          assetId: asset?.id,
          originatorId: user.id
        }
      )
      await createComment({
        userId: user?.id,
        content: "Private message",
        messageType: MessageType.PRIVATE_MESSAGE,
        addresseeId: addressee?.id,
        assetId: asset?.id
        },
        {
          notification: `${user.userName} sent a provate message`,
          notificationType: NOTIFICATION_TYPES.MESSAGE,
          userId: addressee2?.id,
          assetId: asset?.id,
          originatorId: user.id
        }
      )
    }
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getNftComments(
              assetId: ${asset?.id}
              offset: 2
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getNftComments.length).toEqual(2)
        expect(res.body.data.getNftComments).toEqual(
          expect.arrayContaining([
            expect.objectContaining({content: '2nd NFT comment'}),
            expect.objectContaining({content: 'NFT comment'})
          ])
        )
        done()
      })
  })

})