import {Knex} from "knex"
import {connectDb} from "../src/lambda/db/db";
const supertest = require("supertest")
const app = require("../../app")
import {LOOKUP_CATEGORIES, LOOKUP_SALE_TYPES, LOOKUP_USER_TYPES} from "../src/lambda/db/models/Lookup";
import {setupDb, stopDb} from "./testDB";
import {findByType} from "../src/lambda/helpers/lookup.helper";
import {
  createUser,
  decodeReferralCode,
  findUser, findUserByReferral,
  getCreatorReferralCode,
  getReferralCode
} from "../src/lambda/helpers/user.helper";
import {User} from "../src/lambda/db/models/User";
import {transactionFragment, userFragment} from "./graphql_fragments";
import {Comment, MessageType} from "../src/lambda/db/models/Comment";
import {createComment} from "../src/lambda/helpers/comment.helper";
import {NOTIFICATION_TYPES} from "../src/lambda/db/models/Notification";
import {Asset} from "../src/lambda/db/models/Asset";
import {createAsset} from "../src/lambda/helpers/asset.helper";
import {retrieveSecret} from "../src/lambda/services/secretsManager";
import {ASSETKIND} from "../src/lambda/services/const";
import {TRANSACTION_TYPES} from "../src/lambda/db/models/Transaction";
import {decodeJwt} from "../src/lambda/services/auth";
const jwt = require('jsonwebtoken');

describe('User Tests',() => {
  let db: Knex
  const request = supertest(app)
  let user: User | undefined
  let user2: User | undefined
  let addressee: User | undefined
  let asset: Asset | undefined
  let asset2: Asset | undefined

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
    addressee = await createUser({
      avatarPath: "ollie avatar",
      dateOfBirth: '2014-05-10',
      email: 'ollie@isp.com',
      userName: 'ollie',
      walletAddress: 'QZTVGMUZVEY23475LEMTOVKAP36K4GYNFPB5WAK2RSRTEHLNPYZBLCCSV4'
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

  test("Get all users", async (done: any) => {
    request
      .post("/graphql")
      .send({
        query: "{ getUsers{ id, avatarPath, dateOfBirth, email, userName, walletAddress} }",
      })
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(200)
      .end(function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getUsers.length).toEqual(3)
        expect(
          Object.keys(res.body.data.getUsers[0]).sort()
        ).toEqual([
          'avatarPath',
          'dateOfBirth',
          'email',
          'id',
          'userName',
          'walletAddress'
        ].sort());
        done()
      })
  })

  test("Add new user", async (done: any) => {
    const userTypes = await findByType(LOOKUP_USER_TYPES)
    const categories = await findByType(LOOKUP_CATEGORIES)
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            addUser(
              walletAddress: "testuserwallet", 
              email: "email@isp.com", 
              userName: "username", 
              dateOfBirth: "1976-02-27", 
              avatarPath: "image/path", 
              interests: [${categories[0].id},${categories[1].id}], 
              types: [${userTypes[0].id}],
              bio: "This is a bio",
              twitterUrl: "twitterUrl",
              instagramUrl: "instagramUrl",
              discordUrl: "discordUrl",
              facebookUrl: "facebookUrl",
              videoCreator: true,
              metadata: {walletAddress: "CHIK3AEDSYPCHTUGVYZMBT3FT3L3LFWJVQKP6NWXJDXU5OY3A55LKSWDPY"} 
            ) {
              ...user
            }
          }
          ${userFragment()}
        `,
      })
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.addUser.walletAddress).toEqual('testuserwallet')
        expect(res.body.data.addUser.email).toEqual('email@isp.com')
        expect(res.body.data.addUser.userName).toEqual('username')
        expect(res.body.data.addUser.avatarPath).toEqual('image/path')
        expect(res.body.data.addUser.bio).toEqual('This is a bio')
        expect(res.body.data.addUser.twitterUrl).toEqual('twitterUrl')
        expect(res.body.data.addUser.instagramUrl).toEqual('instagramUrl')
        expect(res.body.data.addUser.discordUrl).toEqual('discordUrl')
        expect(res.body.data.addUser.facebookUrl).toEqual('facebookUrl')
        expect(res.body.data.addUser.dateOfBirth).toEqual('1976-02-27')
        expect(res.body.data.addUser.kyc).toEqual(false)
        expect(res.body.data.addUser.metadata).toEqual({walletAddress: "CHIK3AEDSYPCHTUGVYZMBT3FT3L3LFWJVQKP6NWXJDXU5OY3A55LKSWDPY"} )
        const newUser = await findUser('testuserwallet')
        expect(newUser).not.toBeNull()
        if (newUser) {
          expect(res.body.data.addUser.referralCode).toEqual(getReferralCode('testuserwallet', newUser.id))
          expect(res.body.data.addUser.creatorReferralCode).toEqual(getCreatorReferralCode('testuserwallet', newUser.id))
          const [id, startWallet, endWallet] = decodeReferralCode(res.body.data.addUser.referralCode)
          expect(id).toEqual(newUser.id)
          expect(startWallet).toEqual('tes')
          expect(endWallet).toEqual('let')
          const [id2, startWallet2, endWallet2] = decodeReferralCode(res.body.data.addUser.creatorReferralCode)
          expect(id2).toEqual(newUser.id)
          expect(startWallet2).toEqual('tes')
          expect(endWallet2).toEqual('let')
          let testUser = await findUserByReferral(res.body.data.addUser.referralCode)
          expect(testUser).not.toBeNull()
          testUser = await findUserByReferral(res.body.data.addUser.creatorReferralCode)
          expect(testUser).not.toBeNull()
        }
        //expect(res.body.data.addUser.phone).toEqual('04330999123')
        expect(res.body.data.addUser.videoCreator).toBeTruthy()
        expect(res.body.data.addUser.interests).toEqual(
          expect.arrayContaining([
            expect.objectContaining({id: categories[0].id}),
            expect.objectContaining({id: categories[1].id})
          ])
        )
        expect(res.body.data.addUser.types).toEqual(
          expect.arrayContaining([
            expect.objectContaining({id: userTypes[0].id})
          ])
        )
        done()
      })
  })

  /*
  test("When creator whitelist active set kyc to true when adding new user in whitelist", async (done: any) => {
    process.env.USE_CREATOR_WHITELIST = "true"
    const userTypes = await findByType(LOOKUP_USER_TYPES)
    const categories = await findByType(LOOKUP_CATEGORIES)
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            authenticate(walletAddress: "${process.env.TEST_WALLET_ADDRESS4}"){
              data
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
        const decodedJwt: any = await decodeJwt(res.body.data.authenticate.data.jwt)
        request
          .post("/graphql")
          .send({
            query: `
              mutation {
                authenticate(transaction: "${res.body.data.authenticate.data.txn}"){
                  data
                }
              }
        `   ,
          })
          .set("Accept", "application/json")
          .set({ 'Authorization': `Bearer ${res.body.data.authenticate.data.jwt}` })
          .expect("Content-Type", /json/)
          .expect(200)
          .end(async function (err: any, res: any) {
            if (err) return done(err)
            expect(res.body).toBeInstanceOf(Object)
            expect(res.body.data.authenticate.data.jwt).not.toBeNull()
            const decodedJwt: any = await decodeJwt(res.body.data.authenticate.data.jwt)
            expect(decodedJwt.walletAddress).toEqual(process.env.TEST_WALLET_ADDRESS4)
            expect(decodedJwt.kyc).toEqual(true)
            expect(res.body.data.authenticate.data.pinata).not.toBeNull()
            request
              .post("/graphql")
              .send({
                query: `
                  mutation {
                    addUser(
                      walletAddress: "${process.env.TEST_WALLET_ADDRESS4}", 
                      email: "creator@isp.com", 
                      userName: "creator", 
                      dateOfBirth: "1976-02-27", 
                      avatarPath: "image/path", 
                      interests: [${categories[0].id},${categories[1].id}], 
                      types: [${userTypes[0].id}],
                      bio: "This is a bio",
                      twitterUrl: "twitterUrl",
                      instagramUrl: "instagramUrl",
                      discordUrl: "discordUrl",
                      facebookUrl: "facebookUrl",
                      videoCreator: true,
                      metadata: {walletAddress: "${process.env.TEST_WALLET_ADDRESS4}"}
                    ) {
                      ...user
                    }
                  }
                  ${userFragment()}
                `,
              })
              .set("Accept", "application/json")
              .set({ 'Authorization': `Bearer ${res.body.data.authenticate.data.jwt}` })
              .expect("Content-Type", /json/)
              .expect(200)
              .end(async function (err: any, res: any) {
                if (err) return done(err)
                console.log("addUser: ", JSON.stringify(res.body.data.addUser, undefined, 2))
                expect(res.body).toBeInstanceOf(Object)
                expect(res.body.data.addUser.walletAddress).toEqual(process.env.TEST_WALLET_ADDRESS4)
                expect(res.body.data.addUser.email).toEqual('creator@isp.com')
                expect(res.body.data.addUser.userName).toEqual('creator')
                expect(res.body.data.addUser.avatarPath).toEqual('image/path')
                expect(res.body.data.addUser.bio).toEqual('This is a bio')
                expect(res.body.data.addUser.twitterUrl).toEqual('twitterUrl')
                expect(res.body.data.addUser.instagramUrl).toEqual('instagramUrl')
                expect(res.body.data.addUser.discordUrl).toEqual('discordUrl')
                expect(res.body.data.addUser.facebookUrl).toEqual('facebookUrl')
                expect(res.body.data.addUser.dateOfBirth).toEqual('1976-02-27')
                expect(res.body.data.addUser.metadata).toEqual({walletAddress: process.env.TEST_WALLET_ADDRESS4})
                expect(res.body.data.addUser.kyc).toEqual(true)
                const newUser = await findUser(process.env.TEST_WALLET_ADDRESS4 || '')
                if (newUser) expect(res.body.data.addUser.referralCode).toEqual(getReferralCode(newUser.walletAddress, newUser.id))
                //expect(res.body.data.addUser.phone).toEqual('04330999123')
                expect(res.body.data.addUser.videoCreator).toBeTruthy()
                expect(res.body.data.addUser.interests).toEqual(
                  expect.arrayContaining([
                    expect.objectContaining({id: categories[0].id}),
                    expect.objectContaining({id: categories[1].id})
                  ])
                )
                expect(res.body.data.addUser.types).toEqual(
                  expect.arrayContaining([
                    expect.objectContaining({id: userTypes[0].id})
                  ])
                )
                done()
              })
          })
      })
  })

  test("When creator whitelist active set kyc to false when adding new user not in whitelist", async (done: any) => {
    process.env.USE_CREATOR_WHITELIST = "true"
    const userTypes = await findByType(LOOKUP_USER_TYPES)
    const categories = await findByType(LOOKUP_CATEGORIES)
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            authenticate(walletAddress: "EZ6MBEP7LX53YTYBAW2JSPWKJ5JDCEMMZ76AGCACT7MK5G2446FV7G7FG4"){
              data
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
        const decodedJwt: any = await decodeJwt(res.body.data.authenticate.data.jwt)
        expect(decodedJwt.walletAddress).toEqual("EZ6MBEP7LX53YTYBAW2JSPWKJ5JDCEMMZ76AGCACT7MK5G2446FV7G7FG4")
        request
          .post("/graphql")
          .send({
            query: `
              mutation {
                authenticate(transaction: "${res.body.data.authenticate.data.txn}"){
                  data
                }
              }
        `   ,
          })
          .set("Accept", "application/json")
          .set({ 'Authorization': `Bearer ${res.body.data.authenticate.data.jwt}` })
          .expect("Content-Type", /json/)
          .expect(200)
          .end(async function (err: any, res: any) {
            if (err) return done(err)
            expect(res.body).toBeInstanceOf(Object)
            expect(res.body.data.authenticate.data.jwt).not.toBeNull()
            const decodedJwt: any = await decodeJwt(res.body.data.authenticate.data.jwt)
            expect(decodedJwt.walletAddress).toEqual("EZ6MBEP7LX53YTYBAW2JSPWKJ5JDCEMMZ76AGCACT7MK5G2446FV7G7FG4")
            expect(decodedJwt.kyc).toEqual(false)
            expect(res.body.data.authenticate.data.pinata).not.toBeNull()
            request
              .post("/graphql")
              .send({
                query: `
                  mutation {
                    addUser(
                      walletAddress: "EZ6MBEP7LX53YTYBAW2JSPWKJ5JDCEMMZ76AGCACT7MK5G2446FV7G7FG4", 
                      email: "creator2@isp.com", 
                      userName: "creator2", 
                      dateOfBirth: "1976-02-27", 
                      avatarPath: "image/path", 
                      interests: [${categories[0].id},${categories[1].id}], 
                      types: [${userTypes[0].id}],
                      bio: "This is a bio",
                      twitterUrl: "twitterUrl",
                      instagramUrl: "instagramUrl",
                      discordUrl: "discordUrl",
                      facebookUrl: "facebookUrl",
                      videoCreator: true,
                      metadata: {walletAddress: "EZ6MBEP7LX53YTYBAW2JSPWKJ5JDCEMMZ76AGCACT7MK5G2446FV7G7FG4"}
                    ) {
                      ...user
                    }
                  }
                  ${userFragment()}
                `,
              })
              .set("Accept", "application/json")
              .set({ 'Authorization': `Bearer ${res.body.data.authenticate.data.jwt}` })
              .expect("Content-Type", /json/)
              .expect(200)
              .end(async function (err: any, res: any) {
                if (err) return done(err)
                expect(res.body).toBeInstanceOf(Object)
                expect(res.body.data.addUser.walletAddress).toEqual("EZ6MBEP7LX53YTYBAW2JSPWKJ5JDCEMMZ76AGCACT7MK5G2446FV7G7FG4")
                expect(res.body.data.addUser.email).toEqual('creator2@isp.com')
                expect(res.body.data.addUser.userName).toEqual('creator2')
                expect(res.body.data.addUser.avatarPath).toEqual('image/path')
                expect(res.body.data.addUser.bio).toEqual('This is a bio')
                expect(res.body.data.addUser.twitterUrl).toEqual('twitterUrl')
                expect(res.body.data.addUser.instagramUrl).toEqual('instagramUrl')
                expect(res.body.data.addUser.discordUrl).toEqual('discordUrl')
                expect(res.body.data.addUser.facebookUrl).toEqual('facebookUrl')
                expect(res.body.data.addUser.dateOfBirth).toEqual('1976-02-27')
                expect(res.body.data.addUser.metadata).toEqual({walletAddress: "EZ6MBEP7LX53YTYBAW2JSPWKJ5JDCEMMZ76AGCACT7MK5G2446FV7G7FG4"})
                expect(res.body.data.addUser.kyc).toEqual(false)
                //expect(res.body.data.addUser.phone).toEqual('04330999123')
                expect(res.body.data.addUser.videoCreator).toBeTruthy()
                expect(res.body.data.addUser.interests).toEqual(
                  expect.arrayContaining([
                    expect.objectContaining({id: categories[0].id}),
                    expect.objectContaining({id: categories[1].id})
                  ])
                )
                expect(res.body.data.addUser.types).toEqual(
                  expect.arrayContaining([
                    expect.objectContaining({id: userTypes[0].id})
                  ])
                )
                done()
              })
          })
      })
  })

   */

  test("Ensure new user is older than 14 years old", async (done: any) => {
    const userTypes = await findByType(LOOKUP_USER_TYPES)
    const categories = await findByType(LOOKUP_CATEGORIES)
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            addUser(
              walletAddress: "testdobwallet", 
              email: "email@isp.com", 
              userName: "username", 
              dateOfBirth: "2016-12-20", 
              avatarPath: "image/path", 
              interests: [${categories[0].id},${categories[1].id}], 
              types: [${userTypes[0].id}],
              bio: "This is a bio",
              twitterUrl: "twitterUrl",
              instagramUrl: "instagramUrl",
              discordUrl: "discordUrl",
              facebookUrl: "facebookUrl",
            ) {
              ...user
            }
          }
          ${userFragment()}
        `,
      })
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toEqual('User is too young to join, must be over 14 years old')
        done()
      })
  })

  test("Ensure updated user is older than 14 years old", async (done: any) => {
    const userTypes = await findByType(LOOKUP_USER_TYPES)
    const categories = await findByType(LOOKUP_CATEGORIES)
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            editUser(
              walletAddress: "${user?.walletAddress}", 
              avatarPath: "new/image/path", 
              interests: [${categories[3].id}], 
              types: [${userTypes[1].id}],
              bio: "This is a bio",
              twitterUrl: "twitterUrl",
              instagramUrl: "instagramUrl",
              discordUrl: "discordUrl",
              facebookUrl: "facebookUrl",
              dateOfBirth: "2015-02-27"
            ) {
              ...user
            }
          }
          ${userFragment()}
        `,
      })
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toEqual('User is too young to join, must be over 14 years old')
        done()
      })
  })

  test("Get a user using wallet address", async (done: any) => {
    const user = await createUser({
      walletAddress: 'getuseraddress',
      avatarPath: 'path/avatar',
      email: 'getuseraddress@ips.com',
      userName: 'getuseraddress'
    })
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getUser(walletAddress: "${user?.walletAddress}") {
              ...user
            }
          }
          ${userFragment()}
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
        done()
      })
  })

  test("Update existing user", async (done: any) => {
    const userTypes = await findByType(LOOKUP_USER_TYPES)
    const categories = await findByType(LOOKUP_CATEGORIES)
    const user = await createUser({
      walletAddress: 'updateuseraddress',
      avatarPath: 'path/avatar',
      email: 'updateuseraddress@ips.com',
      userName: 'updateuseraddress',
      videoCreator: true
    })
    request
      .post("/graphql")
      .send({
        query: `
            mutation {
              editUser(
                walletAddress: "${user?.walletAddress}", 
                avatarPath: "new/image/path", 
                interests: [${categories[3].id}], 
                types: [${userTypes[1].id}],
                bio: "This is a bio",
                twitterUrl: "twitterUrl",
                instagramUrl: "instagramUrl",
                discordUrl: "discordUrl",
                facebookUrl: "facebookUrl",
                dateOfBirth: "1976-02-27",
                videoCreator: false,
              ) {
                ...user
              }
            }
          ${userFragment()}
          `,
      })
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.editUser.walletAddress).toEqual(user?.walletAddress)
        expect(res.body.data.editUser.email).toEqual(user?.email)
        expect(res.body.data.editUser.userName).toEqual(user?.userName)
        expect(res.body.data.editUser.avatarPath).toEqual('new/image/path')
        expect(res.body.data.editUser.bio).toEqual('This is a bio')
        expect(res.body.data.editUser.twitterUrl).toEqual('twitterUrl')
        expect(res.body.data.editUser.instagramUrl).toEqual('instagramUrl')
        expect(res.body.data.editUser.discordUrl).toEqual('discordUrl')
        expect(res.body.data.editUser.facebookUrl).toEqual('facebookUrl')
        expect(res.body.data.editUser.dateOfBirth).toEqual('1976-02-27')
        //expect(res.body.data.editUser.phone).toEqual('04330999124')
        expect(res.body.data.editUser.videoCreator).not.toBeTruthy()
        expect(res.body.data.editUser.interests).toEqual(
          expect.arrayContaining([
            expect.objectContaining({id: categories[3].id})
          ])
        )
        expect(res.body.data.editUser.types).toEqual(
          expect.arrayContaining([
            expect.objectContaining({id: userTypes[1].id})
          ])
        )
        done()
      })
  })

  test("Delete existing user", async (done: any) => {
    const user = await createUser({
      walletAddress: 'testdeletewallet',
      avatarPath: 'path/avatar',
      email: 'testdeletewallet@ips.com',
      userName: 'testdeletewallet'
    })
    request
      .post("/graphql")
      .send({
        query: `
            mutation {
              deleteUser(walletAddress: "testdeletewallet")
            }
          `,
      })
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        const user = await findUser('testdeletewallet')
        expect(user).toBeUndefined()
        done()
      })
  })

  test("When finding a User it should return message totals", async (done: any) => {
    await Comment.query().delete()
    if (user && addressee && asset) {
      const comment = await createComment({
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
      await comment?.$query().patch({messageRead: new Date()})
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
      const pm = await createComment({
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
      await pm?.$query().patch({messageRead: new Date()})
    }
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getUser(walletAddress: "${addressee?.walletAddress}") {
              ...user
            }
          }
          ${userFragment()}
        `,
      })
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getUser.walletAddress).toEqual(addressee?.walletAddress)
        expect(res.body.data.getUser.email).toEqual(addressee?.email)
        expect(res.body.data.getUser.userName).toEqual(addressee?.userName)
        expect(res.body.data.getUser.avatarPath).toEqual(addressee?.avatarPath)
        expect(res.body.data.getUser.messageReceivedTotals.nftMessageTotal).toEqual(2)
        expect(res.body.data.getUser.messageReceivedTotals.nftMessageRead).toEqual(1)
        expect(res.body.data.getUser.messageReceivedTotals.privateMessageTotal).toEqual(1)
        expect(res.body.data.getUser.messageReceivedTotals.privateMessageRead).toEqual(1)
        done()
      })
  })

  test("KYC using transak", async (done: any) => {
    const secret = await retrieveSecret("transak-staging-access-key")
    const data = {
      webhookData: {
        id: 'e459e9d5-2c3f-495a-828b-57dc6cf4b1a8',
        walletAddress: `${user?.walletAddress}`,
        createdAt: '2022-09-30T07:58:03.068Z',
        status: 'AWAITING_PAYMENT_FROM_USER',
        fiatCurrency: 'AUD',
        userId: '5b1ea0c5-1ffa-45e5-9a0d-ce940ab34a59',
        cryptoCurrency: 'ALGO',
        isBuyOrSell: 'BUY',
        fiatAmount: 100,
        amountPaid: 0,
        paymentOptionId: 'google_pay',
        walletLink: false,
        addressAdditionalData: false,
        network: 'mainnet',
        conversionPrice: 1.8192796671440519,
        cryptoAmount: 171.92,
        totalFeeInFiat: 5.5,
        fiatAmountInUsd: 65.05,
        partnerCustomerId: `${user?.id}`,
        cardPaymentData: 'Apple Pay',
        partnerFeeInLocalCurrency: 0
      },
      eventID: 'ORDER_CREATED',
      createdAt: '2022-09-30T07:58:03.355Z'
    }
    const transakJwt = await jwt.sign(data, secret, {expiresIn: '1d'})
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            transak(
              data: "${transakJwt}" 
            )
          }
        `,
      })
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        const updatedUser = await findUser(user?.walletAddress || '')
        if (updatedUser instanceof User) {
          expect(updatedUser.kyc).toBeTruthy()
        }
        done()
      })
  })

  test("Create a creator app", async (done: any) => {
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            addCreatorApp(
              walletAddress: "${user?.walletAddress}",
              unsignedTxn: "signed_transaction_123",
            ) {
              ...user
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
        expect(res.body.data.addCreatorApp.walletAddress).toEqual(user?.walletAddress)
        expect(res.body.data.addCreatorApp.creatorAppTransactionId).not.toBeNull()
        expect(res.body.data.addCreatorApp.creatorApp.txIds).toEqual('MHRER4WERJ7SEKJ25XLVQ3Q3RG4LUD4D4SG3JSBAFWUFSEAHTISQ')
        expect(res.body.data.addCreatorApp.creatorApp.type).toEqual(TRANSACTION_TYPES.APP_CREATE)
        expect(res.body.data.addCreatorApp.creatorApp.userId).toEqual(user?.id)
        expect(res.body.data.addCreatorApp.creatorApp.appId).toEqual(156804583)
        expect(res.body.data.addCreatorApp.creatorApp.txIds).toEqual('MHRER4WERJ7SEKJ25XLVQ3Q3RG4LUD4D4SG3JSBAFWUFSEAHTISQ')
        expect(res.body.data.addCreatorApp.creatorApp.appAddress).toEqual('M5OF2HOKIDQ33PQC3VP2S6MRNMUYDQGTE67WLOM7AIHAQQ4DICUFQKGQKU')
        done()
      })
  })

})