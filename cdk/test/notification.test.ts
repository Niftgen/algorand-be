import {Knex} from "knex"
import {connectDb} from "../src/lambda/db/db";
const supertest = require("supertest")
const app = require("../../app")
import {setupDb, stopDb} from "./testDB";
import {createUser} from "../src/lambda/helpers/user.helper";
import {User} from "../src/lambda/db/models/User";
import {
  createAsset,
  createAssetAuction,
  endAuctions, startAssetAuction,
  updateAssetList,
  updateAssetMint
} from "../src/lambda/helpers/asset.helper";
import {Rating} from "../src/lambda/db/models/Rating";
import {Asset} from "../src/lambda/db/models/Asset";
import {Notification, NOTIFICATION_TYPES} from "../src/lambda/db/models/Notification";
import {Lookup, LOOKUP_SALE_TYPES} from "../src/lambda/db/models/Lookup";
import {MessageType} from "../src/lambda/db/models/Comment";
import {createComment} from "../src/lambda/helpers/comment.helper";
import {TRANSACTION_TYPES} from "../src/lambda/db/models/Transaction";
import {Transaction} from "../src/lambda/db/models/Transaction";
import {ASSETKIND, CURRENCIES} from "../src/lambda/services/const";

describe('Notification Tests',() => {
  let db: Knex
  let user: User | undefined, user2: User | undefined, user3: User | undefined
  let asset: Asset | undefined, asset2: Asset | undefined
  const request = supertest(app)

  beforeAll(async () => {
    db = await setupDb()
    await User.query().delete()
    user = await createUser({
      avatarPath: "test avatar",
      dateOfBirth: '1963-01-27',
      email: 'test@isp.com',
      userName: 'test',
      walletAddress: 'MAUDQAJVCNLOTUTMB5MEML7CV7MLVWXRLKZNI5HS7RLA6TYLGCIMTMYIT4'
    })
    user2 = await createUser({
      avatarPath: "kath avatar",
      dateOfBirth: '1967-01-27',
      email: 'kath@isp.com',
      userName: 'kath',
      walletAddress: 'OIYLZAZ6VDTLX7BGFIA56HYYQJC5BQOQ7TBW6ZDNQRVZ7LTPBIOT5SNQRQ'
    })
    user3 = await createUser({
      avatarPath: "ollie avatar",
      dateOfBirth: '2014-05-10',
      email: 'ollie@isp.com',
      userName: 'ollie',
      walletAddress: 'QZTVGMUZVEY23475LEMTOVKAP36K4GYNFPB5WAK2RSRTEHLNPYZBLCCSV4'
    })
    if (user && user2 && user3) {
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

  test("A notification should be created when a rating is added to an NFT", async (done: any) => {
    await Notification.query().delete()
    await Rating.query().delete()
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            addRating(walletAddress: "${user?.walletAddress}", assetId: ${asset2?.id}, rating: 3) {
              id
            }
          }
        `,
      })
      .set("Accept", "application/json")
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        request
          .post("/graphql")
          .send({
            query: `
          query {
            getUser(walletAddress: "${user2?.walletAddress}") {
              avatarPath
              email
              userName
              walletAddress
              notifications{
                id
                notification
                ratingId
                assetId
                userId
                notificationType
                originatorId
              }
            }
          }
        `,
          })
          .set("Accept", "application/json")
          .expect("Content-Type", /json/)
          .expect(200)
          .end(async function (err: any, res: any) {
            if (err) return done(err)
            expect(res.body).toBeInstanceOf(Object)
            expect(res.body.data.getUser.walletAddress).toEqual(user2?.walletAddress)
            expect(res.body.data.getUser.email).toEqual(user2?.email)
            expect(res.body.data.getUser.userName).toEqual(user2?.userName)
            expect(res.body.data.getUser.avatarPath).toEqual(user2?.avatarPath)
            expect(res.body.data.getUser.notifications[0].notificationType).toEqual(NOTIFICATION_TYPES.RATING)
            expect(res.body.data.getUser.notifications[0].notification).toEqual(`${user?.userName} rated your NFT`)
            expect(res.body.data.getUser.notifications[0].assetId).toEqual(asset2?.id)
            expect(res.body.data.getUser.notifications[0].userId).toEqual(user2?.id)
            expect(res.body.data.getUser.notifications[0].originatorId).toEqual(user?.id)
            done()
          })
      }
    )
  })

  test("A notification should be created for an NFT private message", async (done: any) => {
    await Notification.query().delete()
    request
      .post("/graphql")
      .send({
        query: `
         mutation {
            addPrivateMessage(walletAddress: "${user?.walletAddress}", 
              addresseeId: ${user2?.id}
              content: "This is a private message"
            ) { 
              id
            }
          }        
        `,
      })
      .set("Accept", "application/json")
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        request
          .post("/graphql")
          .send({
            query: `
          query {
            getUser(walletAddress: "${user2?.walletAddress}") {
              avatarPath
              email
              userName
              walletAddress
              notifications{
                id
                notification
                ratingId
                assetId
                userId
                originatorId
                notificationType
              }
            }
          }
        `,
          })
          .set("Accept", "application/json")
          .expect("Content-Type", /json/)
          .expect(200)
          .end(async function (err: any, res: any) {
            if (err) return done(err)
            expect(res.body).toBeInstanceOf(Object)
            expect(res.body.data.getUser.walletAddress).toEqual(user2?.walletAddress)
            expect(res.body.data.getUser.email).toEqual(user2?.email)
            expect(res.body.data.getUser.userName).toEqual(user2?.userName)
            expect(res.body.data.getUser.avatarPath).toEqual(user2?.avatarPath)
            expect(res.body.data.getUser.notifications[0].notificationType).toEqual(NOTIFICATION_TYPES.MESSAGE)
            expect(res.body.data.getUser.notifications[0].notification).toEqual(`${user?.userName} sent you a private message`)
            expect(res.body.data.getUser.notifications[0].assetId).toBeNull()
            expect(res.body.data.getUser.notifications[0].userId).toEqual(user2?.id)
            done()
          })

      })
  })

  test("A notification should be created for an NFT message", async (done: any) => {
    await Notification.query().delete()
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            addNftMessage(walletAddress: "${user?.walletAddress}", 
              assetId: ${asset2?.id}, 
              addresseeId: ${user2?.id}
              content: "This is a test NFT message"
            ) { 
              id
            }
          }
        `,
      })
      .set("Accept", "application/json")
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        request
          .post("/graphql")
          .send({
            query: `
          query {
            getUser(walletAddress: "${user2?.walletAddress}") {
              avatarPath
              email
              userName
              walletAddress
              notifications{
                id
                notification
                ratingId
                assetId
                userId
                originatorId
                notificationType
              }
            }
          }
        `,
          })
          .set("Accept", "application/json")
          .expect("Content-Type", /json/)
          .expect(200)
          .end(async function (err: any, res: any) {
            if (err) return done(err)
            expect(res.body).toBeInstanceOf(Object)
            expect(res.body.data.getUser.walletAddress).toEqual(user2?.walletAddress)
            expect(res.body.data.getUser.email).toEqual(user2?.email)
            expect(res.body.data.getUser.userName).toEqual(user2?.userName)
            expect(res.body.data.getUser.avatarPath).toEqual(user2?.avatarPath)
            expect(res.body.data.getUser.notifications[0].notificationType).toEqual(NOTIFICATION_TYPES.MESSAGE)
            expect(res.body.data.getUser.notifications[0].notification).toEqual(`${user?.userName} messaged you about your NFT`)
            expect(res.body.data.getUser.notifications[0].assetId).toEqual(asset2?.id)
            expect(res.body.data.getUser.notifications[0].userId).toEqual(user2?.id)
            done()
          })

      })
  })

  test("A notification should be created for an NFT comment", async (done: any) => {
    await Notification.query().delete()
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            addNftComment(walletAddress: "${user?.walletAddress}", 
              assetId: ${asset2?.id}, 
              content: "This is a test NFT comment"
            ) { 
              id
            }
          }
        `,
      })
      .set("Accept", "application/json")
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        request
          .post("/graphql")
          .send({
            query: `
          query {
            getUser(walletAddress: "${user2?.walletAddress}") {
              avatarPath
              email
              userName
              walletAddress
              notifications{
                id
                notification
                ratingId
                assetId
                userId
                originatorId
                notificationType
              }
            }
          }
        `,
          })
          .set("Accept", "application/json")
          .expect("Content-Type", /json/)
          .expect(200)
          .end(async function (err: any, res: any) {
            if (err) return done(err)
            expect(res.body).toBeInstanceOf(Object)
            expect(res.body.data.getUser.walletAddress).toEqual(user2?.walletAddress)
            expect(res.body.data.getUser.email).toEqual(user2?.email)
            expect(res.body.data.getUser.userName).toEqual(user2?.userName)
            expect(res.body.data.getUser.avatarPath).toEqual(user2?.avatarPath)
            expect(res.body.data.getUser.notifications[0].notificationType).toEqual(NOTIFICATION_TYPES.COMMENT)
            expect(res.body.data.getUser.notifications[0].notification).toEqual(`${user?.userName} commented on your NFT`)
            expect(res.body.data.getUser.notifications[0].assetId).toEqual(asset2?.id)
            expect(res.body.data.getUser.notifications[0].userId).toEqual(user2?.id)
            done()
          })

      })
  })

  test("A notification should be created when an NFT comment is deleted", async (done: any) => {
    await Notification.query().delete()
    let comment: any = null
    if (user && user2 && asset && asset2) {
      comment = await createComment({
          userId: user?.id,
          content: "NFT comment from user",
          messageType: MessageType.ASSET_COMMENT,
          assetId: asset2?.id
        },
        {
          notification: `${user.userName} commented on your NFT`,
          notificationType: NOTIFICATION_TYPES.COMMENT,
          userId: asset2?.userId,
          assetId: asset2?.id,
          originatorId: user.id
        }
      )
    }
    await Notification.query().delete()
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            deleteComment(walletAddress: "${user?.walletAddress}", 
              id: ${comment?.id}
            )
          }
        `,
      })
      .set("Accept", "application/json")
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        request
          .post("/graphql")
          .send({
            query: `
          query {
            getUser(walletAddress: "${user2?.walletAddress}") {
              id
              avatarPath
              email
              userName
              walletAddress
              notifications{
                id
                notification
                ratingId
                assetId
                userId
                originatorId
                commentId
                deletedCommentId
                notificationType
              }
            }
          }
        `,
          })
          .set("Accept", "application/json")
          .expect("Content-Type", /json/)
          .expect(200)
          .end(async function (err: any, res: any) {
            if (err) return done(err)
            expect(res.body).toBeInstanceOf(Object)
            expect(res.body.data.getUser.walletAddress).toEqual(user2?.walletAddress)
            expect(res.body.data.getUser.email).toEqual(user2?.email)
            expect(res.body.data.getUser.userName).toEqual(user2?.userName)
            expect(res.body.data.getUser.avatarPath).toEqual(user2?.avatarPath)
            expect(res.body.data.getUser.notifications[0].notificationType).toEqual(NOTIFICATION_TYPES.COMMENT)
            expect(res.body.data.getUser.notifications[0].notification).toEqual(`${user?.userName} has deleted the comment they made on your NFT`)
            expect(res.body.data.getUser.notifications[0].assetId).toEqual(asset2?.id)
            expect(res.body.data.getUser.notifications[0].userId).toEqual(user2?.id)
            expect(res.body.data.getUser.notifications[0].commentId).toBeNull()
            expect(res.body.data.getUser.notifications[0].deletedCommentId).toEqual(comment?.id)
            expect(res.body.data.getUser.notifications[0].originatorId).toEqual(user?.id)
            done()
          })

      })
  })

  test("Notifications should be created when an NFT message is deleted", async (done: any) => {
    let comment: any = null
    if (user && user2 && asset && asset2) {
      comment = await createComment({
          userId: user?.id,
          content: "NFT message from user",
          messageType: MessageType.ASSET_MESSAGE,
          assetId: asset2?.id
        },
        {
          notification: `${user.userName} messaged you about your NFT`,
          notificationType: NOTIFICATION_TYPES.MESSAGE,
          userId: asset2?.userId,
          assetId: asset2?.id,
          originatorId: user.id
        }
      )
    }
    await Notification.query().delete()
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            deleteComment(walletAddress: "${user?.walletAddress}", 
              id: ${comment?.id}
            )
          }
        `,
      })
      .set("Accept", "application/json")
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        request
          .post("/graphql")
          .send({
            query: `
          query {
            getUser(walletAddress: "${user2?.walletAddress}") {
              avatarPath
              email
              userName
              walletAddress
              notifications{
                id
                notification
                ratingId
                assetId
                userId
                originatorId
                commentId
                deletedCommentId
                notificationType
              }
            }
          }
        `,
          })
          .set("Accept", "application/json")
          .expect("Content-Type", /json/)
          .expect(200)
          .end(async function (err: any, res: any) {
            if (err) return done(err)
            expect(res.body).toBeInstanceOf(Object)
            expect(res.body.data.getUser.walletAddress).toEqual(user2?.walletAddress)
            expect(res.body.data.getUser.email).toEqual(user2?.email)
            expect(res.body.data.getUser.userName).toEqual(user2?.userName)
            expect(res.body.data.getUser.avatarPath).toEqual(user2?.avatarPath)
            expect(res.body.data.getUser.notifications[0].notificationType).toEqual(NOTIFICATION_TYPES.MESSAGE)
            expect(res.body.data.getUser.notifications[0].notification).toContain(`has deleted an NFT message`)
            expect(res.body.data.getUser.notifications[0].assetId).toEqual(asset2?.id)
            expect(res.body.data.getUser.notifications[0].userId).toEqual(user2?.id)
            expect(res.body.data.getUser.notifications[0].commentId).toBeNull()
            expect(res.body.data.getUser.notifications[0].deletedCommentId).toEqual(comment?.id)
            expect(res.body.data.getUser.notifications[0].originatorId).toEqual(user?.id)
            request
              .post("/graphql")
              .send({
                query: `
                  query {
                    getUser(walletAddress: "${user?.walletAddress}") {
                      avatarPath
                      email
                      userName
                      walletAddress
                      notifications{
                        id
                        notification
                        ratingId
                        assetId
                        userId
                        originatorId
                        commentId
                        deletedCommentId
                        notificationType
                      }
                    }
                  }
                `,
              })
              .set("Accept", "application/json")
              .expect("Content-Type", /json/)
              .expect(200)
              .end(async function (err: any, res: any) {
                if (err) return done(err)
                expect(res.body).toBeInstanceOf(Object)
                expect(res.body.data.getUser.walletAddress).toEqual(user?.walletAddress)
                expect(res.body.data.getUser.email).toEqual(user?.email)
                expect(res.body.data.getUser.userName).toEqual(user?.userName)
                expect(res.body.data.getUser.avatarPath).toEqual(user?.avatarPath)
                expect(res.body.data.getUser.notifications[0].notificationType).toEqual(NOTIFICATION_TYPES.MESSAGE)
                expect(res.body.data.getUser.notifications[0].notification).toContain(`has deleted an NFT message`)
                expect(res.body.data.getUser.notifications[0].assetId).toEqual(asset2?.id)
                expect(res.body.data.getUser.notifications[0].userId).toEqual(user?.id)
                expect(res.body.data.getUser.notifications[0].commentId).toBeNull()
                expect(res.body.data.getUser.notifications[0].deletedCommentId).toEqual(comment?.id)
                expect(res.body.data.getUser.notifications[0].originatorId).toEqual(user2?.id)
                done()
              })

          })

      })
  })

  test("Notifications should be created when a Private Message is deleted", async (done: any) => {
    let comment: any = null
    if (user && user2 && asset && asset2) {
      comment = await createComment({
          userId: user?.id,
          content: "PM from user",
          messageType: MessageType.PRIVATE_MESSAGE,
          addresseeId: user2?.id
        },
        {
          notification: `${user.userName} send you a PM`,
          notificationType: NOTIFICATION_TYPES.MESSAGE,
          userId: user2?.id,
          originatorId: user.id
        }
      )
    }
    await Notification.query().delete()
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            deleteComment(walletAddress: "${user?.walletAddress}", 
              id: ${comment?.id}
            )
          }
        `,
      })
      .set("Accept", "application/json")
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        request
          .post("/graphql")
          .send({
            query: `
          query {
            getUser(walletAddress: "${user2?.walletAddress}") {
              avatarPath
              email
              userName
              walletAddress
              notifications{
                id
                notification
                ratingId
                assetId
                userId
                originatorId
                commentId
                deletedCommentId
                notificationType
              }
            }
          }
        `,
          })
          .set("Accept", "application/json")
          .expect("Content-Type", /json/)
          .expect(200)
          .end(async function (err: any, res: any) {
            if (err) return done(err)
            expect(res.body).toBeInstanceOf(Object)
            expect(res.body.data.getUser.walletAddress).toEqual(user2?.walletAddress)
            expect(res.body.data.getUser.email).toEqual(user2?.email)
            expect(res.body.data.getUser.userName).toEqual(user2?.userName)
            expect(res.body.data.getUser.avatarPath).toEqual(user2?.avatarPath)
            expect(res.body.data.getUser.notifications[0].notificationType).toEqual(NOTIFICATION_TYPES.MESSAGE)
            expect(res.body.data.getUser.notifications[0].notification).toEqual(`${user?.userName} has deleted a private message`)
            expect(res.body.data.getUser.notifications[0].assetId).toBeNull()
            expect(res.body.data.getUser.notifications[0].userId).toEqual(user2?.id)
            expect(res.body.data.getUser.notifications[0].commentId).toBeNull()
            expect(res.body.data.getUser.notifications[0].deletedCommentId).toEqual(comment?.id)
            expect(res.body.data.getUser.notifications[0].originatorId).toEqual(user?.id)
            request
              .post("/graphql")
              .send({
                query: `
                  query {
                    getUser(walletAddress: "${user?.walletAddress}") {
                      avatarPath
                      email
                      userName
                      walletAddress
                      notifications{
                        id
                        notification
                        ratingId
                        assetId
                        userId
                        originatorId
                        commentId
                        deletedCommentId
                        notificationType
                      }
                    }
                  }
                `,
              })
              .set("Accept", "application/json")
              .expect("Content-Type", /json/)
              .expect(200)
              .end(async function (err: any, res: any) {
                if (err) return done(err)
                expect(res.body).toBeInstanceOf(Object)
                expect(res.body.data.getUser.walletAddress).toEqual(user?.walletAddress)
                expect(res.body.data.getUser.email).toEqual(user?.email)
                expect(res.body.data.getUser.userName).toEqual(user?.userName)
                expect(res.body.data.getUser.avatarPath).toEqual(user?.avatarPath)
                expect(res.body.data.getUser.notifications[0].notificationType).toEqual(NOTIFICATION_TYPES.MESSAGE)
                expect(res.body.data.getUser.notifications[0].notification).toContain(`has deleted a private message`)
                expect(res.body.data.getUser.notifications[0].assetId).toBeNull()
                expect(res.body.data.getUser.notifications[0].userId).toEqual(user?.id)
                expect(res.body.data.getUser.notifications[0].commentId).toBeNull()
                expect(res.body.data.getUser.notifications[0].deletedCommentId).toEqual(comment?.id)
                expect(res.body.data.getUser.notifications[0].originatorId).toEqual(user2?.id)
                done()
              })

          })

      })
  })

  test("A notification should be created for the seller & buyer on the sale of an asset", async (done: any) => {
    await Notification.query().delete()
    let asset: any
    const fixed = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Fixed Price'
      }).first()
    if (user) {
      asset = await createAsset(
        {
          name: "NFT",
          description: "Buy an asset",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, user)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: user?.walletAddress,
      signedTxn: "signed_transaction_123",
    })
    asset = await updateAssetList(asset, {
      id: asset?.id,
      price: 2,
      signedTxn: "signed_transaction_123",
      currency: 'ALGO'
    })
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            buyAsset(
              id: ${asset?.id}, 
              buyerAddress: "${user2?.walletAddress}",
              signedTxn: "signed_transaction_123",
            ) { 
              id
            }
          }
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT2}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        request
          .post("/graphql")
          .send({
            query: `
              query {
                getUser(walletAddress: "${user?.walletAddress}") {
                  avatarPath
                  email
                  userName
                  walletAddress
                  notifications{
                    id
                    notification
                    ratingId
                    assetId
                    userId
                    originatorId
                    notificationType
                    transactionId
                    transaction {
                      type
                      amount
                      currency
                      buyerId
                      buyer {
                        walletAddress
                        userName
                      }                      
                    }
                  }
                }
              }
            `,
          })
          .set("Accept", "application/json")
          .expect("Content-Type", /json/)
          .expect(200)
          .end(async function (err: any, res: any) {
            if (err) return done(err)
            expect(res.body).toBeInstanceOf(Object)
            expect(res.body.data.getUser.walletAddress).toEqual(user?.walletAddress)
            expect(res.body.data.getUser.email).toEqual(user?.email)
            expect(res.body.data.getUser.userName).toEqual(user?.userName)
            expect(res.body.data.getUser.avatarPath).toEqual(user?.avatarPath)
            expect(res.body.data.getUser.notifications[0].notificationType).toEqual(NOTIFICATION_TYPES.SALE)
            expect(res.body.data.getUser.notifications[0].notification).toEqual(`Your NFT was sold for ALGO: 2 to ${user2?.userName}.`)
            expect(res.body.data.getUser.notifications[0].assetId).toEqual(asset?.id)
            expect(res.body.data.getUser.notifications[0].userId).toEqual(user?.id)
            expect(res.body.data.getUser.notifications[0].transactionId).not.toBeNull()
            expect(res.body.data.getUser.notifications[0].transaction.type).toEqual(TRANSACTION_TYPES.BUY)
            expect(res.body.data.getUser.notifications[0].transaction.amount).toEqual(2)
            expect(res.body.data.getUser.notifications[0].transaction.currency).toEqual(CURRENCIES.ALGO)
          })
          request
            .post("/graphql")
            .send({
              query: `
                query {
                  getUser(walletAddress: "${user2?.walletAddress}") {
                    avatarPath
                    email
                    userName
                    walletAddress
                    notifications{
                      id
                      notification
                      ratingId
                      assetId
                      userId
                      originatorId
                      notificationType
                      transactionId
                      transaction {
                        type
                        amount
                        currency
                        buyerId
                        buyer {
                          walletAddress
                          userName
                        }                      
                      }
                    }
                  }
                }
              `,
            })
            .set("Accept", "application/json")
            .expect("Content-Type", /json/)
            .expect(200)
            .end(async function (err: any, res: any) {
              if (err) return done(err)
              expect(res.body).toBeInstanceOf(Object)
              expect(res.body.data.getUser.walletAddress).toEqual(user2?.walletAddress)
              expect(res.body.data.getUser.email).toEqual(user2?.email)
              expect(res.body.data.getUser.userName).toEqual(user2?.userName)
              expect(res.body.data.getUser.avatarPath).toEqual(user2?.avatarPath)
              expect(res.body.data.getUser.notifications[0].notificationType).toEqual(NOTIFICATION_TYPES.PURCHASE)
              expect(res.body.data.getUser.notifications[0].notification).toEqual(`You have purchased the NFT from ${asset?.owner?.userName} for ALGO: 2`)
              expect(res.body.data.getUser.notifications[0].assetId).toEqual(asset?.id)
              expect(res.body.data.getUser.notifications[0].userId).toEqual(user2?.id)
              expect(res.body.data.getUser.notifications[0].transactionId).not.toBeNull()
              expect(res.body.data.getUser.notifications[0].transaction.type).toEqual(TRANSACTION_TYPES.BUY)
              expect(res.body.data.getUser.notifications[0].transaction.amount).toEqual(2)
              expect(res.body.data.getUser.notifications[0].transaction.currency).toEqual(CURRENCIES.ALGO)
              done()
            })

      })
  })

  test("Get notifications for a user", async (done: any) => {
    await Notification.query().delete()
    if (user && user2 && asset && asset2) {
      await createComment({
          userId: user?.id,
          content: "NFT comment from user",
          messageType: MessageType.ASSET_COMMENT,
          assetId: asset2?.id
        },
        {
          notification: `${user.userName} commented on your NFT`,
          notificationType: NOTIFICATION_TYPES.COMMENT,
          userId: asset2?.userId,
          assetId: asset2?.id,
          originatorId: user.id
        }
      )
      await createComment({
          userId: user?.id,
          content: "2nd NFT message from addressee",
          messageType: MessageType.ASSET_MESSAGE,
          addresseeId: asset2?.userId,
          assetId: asset2?.id
        },
        {
          notification: `${user.userName} sent you a message about your NFT`,
          notificationType: NOTIFICATION_TYPES.MESSAGE,
          userId: asset2?.userId,
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
            getNotifications(
              walletAddress: "${user2?.walletAddress}"
            ) { 
              id
              notification
              ratingId
              assetId
              userId
              originatorId
              notificationType
            }
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
        expect(res.body.data.getNotifications.length).toEqual(2)
        expect(res.body.data.getNotifications).toEqual(
          expect.arrayContaining([
            expect.objectContaining({notification: 'test commented on your NFT'}),
            expect.objectContaining({notification: 'test sent you a message about your NFT'})
          ])
        )
        done()
      })
  })

  test("Delete a notification for a user", async (done: any) => {
    await Notification.query().delete()
    if (user && user2 && asset && asset2) {
      await createComment({
          userId: user?.id,
          content: "NFT comment from user",
          messageType: MessageType.ASSET_COMMENT,
          assetId: asset2?.id
        },
        {
          notification: `${user.userName} commented on your NFT`,
          notificationType: NOTIFICATION_TYPES.COMMENT,
          userId: asset2?.userId,
          assetId: asset2?.id,
          originatorId: user.id
        }
      )
    }
    const notification = await Notification.query().first()
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            deleteNotification(
              walletAddress: "${user2?.walletAddress}",
              id: ${notification?.id}
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
        const deleted = await Notification.query()
          .findById(notification instanceof Notification ? notification.id : 0)
        expect(deleted).toBeUndefined()
        done()
      })
  })

  test("Should only be able to delete your own notifications", async (done: any) => {
    await Notification.query().delete()
    if (user && user2 && asset && asset2) {
      await createComment({
          userId: user?.id,
          content: "NFT comment from user",
          messageType: MessageType.ASSET_COMMENT,
          assetId: asset2?.id
        },
        {
          notification: `${user.userName} commented on your NFT`,
          notificationType: NOTIFICATION_TYPES.COMMENT,
          userId: asset2?.userId,
          assetId: asset2?.id,
          originatorId: user.id
        }
      )
    }
    const notification = await Notification.query().first()
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            deleteNotification(
              walletAddress: "${user?.walletAddress}",
              id: ${notification?.id}
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
        expect(res.body.errors[0].message).toEqual('Unable to delete as owner wallet address does not match notification owner wallet address')
        done()
      })
  })

  test("Notifications should be created for seller and buyer at the end of an auction", async (done: any) => {
    await Notification.query().delete()
    let asset: any
    const auction = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Auction'
      }).first()
    if (user) {
      asset = await createAsset(
        {
          name: "Bid NFT",
          description: "Bid on an asset listed for auction",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, user)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: user?.walletAddress,
      signedTxn: "signed_transaction_123",
    })
    let endDate = new Date()
    endDate.setDate(endDate.getDate() + 1)
    let startDate = new Date()
    startDate.setDate(startDate.getDate() - 3)
    asset = await createAssetAuction(asset, {
      id: asset?.id,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      reservePrice: 2,
      signedTxn: "signed_transaction_123",
      currency: 'ALGO'
    })
    asset = await startAssetAuction(asset, {
      id: asset?.id,
      signedTxn: "signed_transaction_123",
    })
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            bidOnAsset(
              id: ${asset?.id}, 
              buyerAddress: "${user2?.walletAddress}",
              amount: 3,
              signedTxn: "signed_transaction_123",
            ) { 
              id
              name
              description
              listTransactionId                
              list{
                id
                type
                txIds
                amount
                currency
                assetId
                userId
                sellType               
                royaltyFee
                startTime
                endTime
                owner{
                  id
                  userName        
                }
                saleType{
                  id
                  description
                }
                asset{
                  id
                  name
                  description        
                }  
              }
            }
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
        // Make sure auction has ended
        endDate.setDate(endDate.getDate() - 1)
        const trans = await Transaction.query()
          .patch({endTime: endDate.toISOString()})
          .findById(asset.listTransactionId)
        await endAuctions()
        request
          .post("/graphql")
          .send({
            query: `
              query {
                getNotifications(
                  walletAddress: "${user2?.walletAddress}"
                ) { 
                  id
                  notification
                  ratingId
                  assetId
                  userId
                  originatorId
                  notificationType
                  transactionId
                  transaction {
                    type
                    amount
                    currency
                  }
                }
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
            expect(res.body.data.getNotifications.length).toEqual(2)
            expect(res.body.data.getNotifications[0].notificationType).toEqual(NOTIFICATION_TYPES.WON)
            expect(res.body.data.getNotifications[0].notification).toEqual(`You have the winning bid of ALGO: 3 for the NFT from test`)
            expect(res.body.data.getNotifications[0].assetId).toEqual(asset?.id)
            expect(res.body.data.getNotifications[0].userId).toEqual(user2?.id)
            expect(res.body.data.getNotifications[0].originatorId).toEqual(user?.id)
            expect(res.body.data.getNotifications[0].transactionId).not.toBeNull()
            expect(res.body.data.getNotifications[0].transaction.type).toEqual(TRANSACTION_TYPES.BID)
            expect(res.body.data.getNotifications[0].transaction.amount).toEqual(3)
            expect(res.body.data.getNotifications[0].transaction.currency).toEqual(CURRENCIES.ALGO)
            expect(res.body.data.getNotifications[1].notificationType).toEqual(NOTIFICATION_TYPES.BID)
            expect(res.body.data.getNotifications[1].notification).toEqual(`You have placed a bid for ALGO: 3`)
            expect(res.body.data.getNotifications[1].assetId).toEqual(asset?.id)
            expect(res.body.data.getNotifications[1].userId).toEqual(user2?.id)
            expect(res.body.data.getNotifications[1].originatorId).toEqual(user?.id)
            expect(res.body.data.getNotifications[1].transactionId).not.toBeNull()
            expect(res.body.data.getNotifications[1].transaction.type).toEqual(TRANSACTION_TYPES.BID)
            expect(res.body.data.getNotifications[1].transaction.amount).toEqual(3)
            expect(res.body.data.getNotifications[1].transaction.currency).toEqual(CURRENCIES.ALGO)
            request
              .post("/graphql")
              .send({
                query: `
                query {
                  getNotifications(
                    walletAddress: "${user?.walletAddress}"
                  ) { 
                    id
                    notification
                    ratingId
                    assetId
                    userId
                    originatorId
                    notificationType
                    transactionId
                    transaction {
                      type
                      amount
                      currency
                    }                    
                  }
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
                expect(res.body.data.getNotifications.length).toEqual(2)
                expect(res.body.data.getNotifications[0].notificationType).toEqual(NOTIFICATION_TYPES.SALE)
                expect(res.body.data.getNotifications[0].assetId).toEqual(asset?.id)
                expect(res.body.data.getNotifications[0].userId).toEqual(user?.id)
                expect(res.body.data.getNotifications[0].originatorId).toEqual(user2?.id)
                expect(res.body.data.getNotifications[0].notification).toEqual(`Your NFT was sold for ALGO: 3 to kath`)
                expect(res.body.data.getNotifications[0].transactionId).not.toBeNull()
                expect(res.body.data.getNotifications[0].transaction.type).toEqual(TRANSACTION_TYPES.BID)
                expect(res.body.data.getNotifications[0].transaction.amount).toEqual(3)
                expect(res.body.data.getNotifications[0].transaction.currency).toEqual(CURRENCIES.ALGO)
                expect(res.body.data.getNotifications[1].notificationType).toEqual(NOTIFICATION_TYPES.BID)
                expect(res.body.data.getNotifications[1].notification).toEqual(`A bid has been placed for ALGO: 3`)
                expect(res.body.data.getNotifications[1].assetId).toEqual(asset?.id)
                expect(res.body.data.getNotifications[1].userId).toEqual(user?.id)
                expect(res.body.data.getNotifications[1].originatorId).toEqual(user2?.id)
                expect(res.body.data.getNotifications[1].transactionId).not.toBeNull()
                expect(res.body.data.getNotifications[1].transaction.type).toEqual(TRANSACTION_TYPES.BID)
                expect(res.body.data.getNotifications[1].transaction.amount).toEqual(3)
                expect(res.body.data.getNotifications[1].transaction.currency).toEqual(CURRENCIES.ALGO)
                done()
              })

          })
      })
  })

})