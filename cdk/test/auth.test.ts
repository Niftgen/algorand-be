import {Knex} from "knex"
const supertest = require("supertest")
const app = require("../../app")
import {Auth} from '../src/lambda/db/models/Auth'
import {Asset} from '../src/lambda/db/models/Asset'
import {User} from '../src/lambda/db/models/User'
import {setupDb, stopDb} from "./testDB";
import {createUser, findUser, findUserByReferral, getReferralCode} from "../src/lambda/helpers/user.helper";
import {createAsset} from "../src/lambda/helpers/asset.helper";
import {findByType} from "../src/lambda/helpers/lookup.helper";
import {LOOKUP_CATEGORIES, LOOKUP_SALE_TYPES} from "../src/lambda/db/models/Lookup";
import {ASSETKIND} from "../src/lambda/services/const";
import {decodeJwt} from "../src/lambda/services/auth";

describe('Auth Tests',() => {
  let db: Knex
  const request = supertest(app)

  let owner: User | undefined
  let asset: Asset | undefined

  beforeAll(async () => {
    db = await setupDb()
    jest.setTimeout(150000)
  })

  afterAll(async () => {
    await stopDb()
  })

  test("Authenticate a wallet", async (done: any) => {
    const address = "MAUDQAJVCNLOTUTMB5MEML7CV7MLVWXRLKZNI5HS7RLA6TYLGCIMTMYIT4"
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            authenticate(walletAddress: "${address}"){
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
        expect(
          Object.keys(res.body.data.authenticate.data).sort()
        ).toEqual([
          'jwt',
          'txn'
        ].sort());
        const auth = await Auth.find(address)
        expect(auth).toBeInstanceOf(Auth)
        if (auth) expect(auth.verified).toEqual(false)
        done()
      })
  })

  test("White list active: Wallet not in whitelist", async (done: any) => {
    const address = "PLVKEUICNIXXDCI5WZBSDGCLCAMAC27OQR6NWB5UNYUP5SZT6JQNPIOTOX"
    process.env.USE_WHITELIST = "true"
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            authenticate(walletAddress: "${address}"){
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
        expect(JSON.stringify(res.body).includes("Wallet address not in white list")).toBeTruthy()
        done()
      })
  })

  test("White list not active: Wallet not in whitelist", async (done: any) => {
    const address = ""
    process.env.USE_WHITELIST = "false"
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            authenticate(walletAddress: "${address}"){
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
        expect(JSON.stringify(res.body).includes("Wallet address not in white list")).not.toBeTruthy()
        done()
      })
  })

  /*
  test("Creator white list active: wallet in whitelist, user exists", async (done: any) => {
    await User.query().delete()
    process.env.USE_CREATOR_WHITELIST = "true"
    process.env.USE_WHITELIST = "false"
    const creator = await createUser({
      walletAddress: process.env.TEST_WALLET_ADDRESS4,
      avatarPath: 'path/avatar',
      email: 'creator@ips.com',
      userName: 'creator_test',
    })
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
        expect(JSON.stringify(res.body).includes("Wallet address not in white list")).not.toBeTruthy()
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
          .expect("Content-Type", /json/)
          .expect(200)
          .end(async function (err: any, res: any) {
            if (err) return done(err)
            expect(res.body).toBeInstanceOf(Object)
            expect(res.body.data.authenticate.data.jwt).not.toBeNull()
            expect(res.body.data.authenticate.data.pinata).not.toBeNull()
            const decodedJwt: any = await decodeJwt(res.body.data.authenticate.data.jwt)
            expect(decodedJwt.walletAddress).toEqual(process.env.TEST_WALLET_ADDRESS4)
            expect(decodedJwt.kyc).toEqual(true)
            const user = await findUser(process.env.TEST_WALLET_ADDRESS4 || '')
            if (user) {
              expect(user.walletAddress).toEqual(process.env.TEST_WALLET_ADDRESS4)
              expect(user.kyc).toEqual(true)
              expect(user.kycDate).not.toBeNull()
              expect(user.referralCode).toEqual(getReferralCode(user.walletAddress, user.id))
              const refUser = await findUserByReferral(getReferralCode(user.walletAddress, user.id))
              if (refUser) {
                expect(user.id).toEqual(user.id)
                expect(user.walletAddress).toEqual(process.env.TEST_WALLET_ADDRESS4)
                expect(user.kyc).toEqual(true)
                expect(user.kycDate).not.toBeNull()
                expect(user.referralCode).toEqual(getReferralCode(user.walletAddress, user.id))
              }
            }


            done()
          })
      })
  })

  test("Creator white list not active: kyc should not be set", async (done: any) => {
    await User.query().delete()
    process.env.USE_CREATOR_WHITELIST = "false"
    process.env.USE_WHITELIST = "false"
    const creator = await createUser({
      walletAddress: process.env.TEST_WALLET_ADDRESS4,
      avatarPath: 'path/avatar',
      email: 'creator@ips.com',
      userName: 'creator_test',
    })
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
        expect(JSON.stringify(res.body).includes("Wallet address not in white list")).not.toBeTruthy()
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
          .expect("Content-Type", /json/)
          .expect(200)
          .end(async function (err: any, res: any) {
            if (err) return done(err)
            expect(res.body).toBeInstanceOf(Object)
            expect(res.body.data.authenticate.data.jwt).not.toBeNull()
            expect(res.body.data.authenticate.data.pinata).not.toBeNull()
            const decodedJwt: any = await decodeJwt(res.body.data.authenticate.data.jwt)
            expect(decodedJwt.walletAddress).toEqual(process.env.TEST_WALLET_ADDRESS4)
            expect(decodedJwt.kyc).toEqual(false)
            const user = await findUser(process.env.TEST_WALLET_ADDRESS4 || '')
            if (user) {
              expect(user.walletAddress).toEqual(process.env.TEST_WALLET_ADDRESS4)
              expect(user.kyc).toEqual(false)
              expect(user.kycDate).toBeNull()
              expect(user.referralCode).toBeNull()
            }
            done()
          })
      })
  })

  test("Creator white list active: wallet in whitelist, no user exists", async (done: any) => {
    await User.query().delete()
    process.env.USE_CREATOR_WHITELIST = "true"
    process.env.USE_WHITELIST = "false"
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
        expect(JSON.stringify(res.body).includes("Wallet address not in white list")).not.toBeTruthy()
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
            done()
          })
      })
  })

  test("Creator white list active: wallet not in whitelist", async (done: any) => {
    await User.query().delete()
    process.env.USE_CREATOR_WHITELIST = "true"
    process.env.USE_WHITELIST = "false"
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            authenticate(walletAddress: "${process.env.TEST_WALLET_ADDRESS}"){
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
        expect(JSON.stringify(res.body).includes("Wallet address not in white list")).not.toBeTruthy()
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
          .expect("Content-Type", /json/)
          .expect(200)
          .end(async function (err: any, res: any) {
            if (err) return done(err)
            expect(res.body).toBeInstanceOf(Object)
            expect(res.body.data.authenticate.data.jwt).not.toBeNull()
            const decodedJwt: any = await decodeJwt(res.body.data.authenticate.data.jwt)
            expect(decodedJwt.walletAddress).toEqual(process.env.TEST_WALLET_ADDRESS)
            expect(decodedJwt.kyc).toEqual(false)
            expect(res.body.data.authenticate.data.pinata).not.toBeNull()
            done()
          })
      })
  })

   */

  /*
  test("Should verify signed transaction", async (done: any) => {
    process.env.USE_CREATOR_WHITELIST = "false"
    process.env.USE_WHITELIST = "false"
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            authenticate(transaction: "${process.env.TEST_TXN}"){
              data
            }
          }
        `,
      })
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        console.log(res.body)
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.authenticate.data.jwt).not.toBeNull()
        expect(res.body.data.authenticate.data.pinata).not.toBeNull()
        done()
      })
  })
  */

  test("Should reject and invalid signed transaction", async (done: any) => {
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            authenticate(transaction: "invalid_signed_txn"){
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
        expect(res.body.errors[0].message).toEqual('Insufficient data')
        done()
      })
  })

  test("Should raise an error when no JWT is provided", async (done: any) => {
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${owner?.walletAddress}", 
            ) { 
              id
              name
              description
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
        expect(res.body.errors[0].message).toEqual('Missing JWT')
        done()
      })
  })

  test("Should raise an error if an ivalid JWT is provided", async (done: any) => {
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${owner?.walletAddress}", 
            ) { 
              id
              name
              description
            }
          }
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': 'Bearer eyJhbGciOiJIUz' })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toEqual('Invalid JWT')
        done()
      })
  })

  test("Should raise an error if wallet address in JWT does not match walletAddress param", async (done: any) => {
    await User.query().delete()
    const saleTypes = await findByType(LOOKUP_SALE_TYPES)
    const categories = await findByType(LOOKUP_CATEGORIES)
    owner = await createUser({
      walletAddress: process.env.TEST_WALLET_ADDRESS,
      avatarPath: 'path/avatar',
      email: 'authtest@ips.com',
      userName: 'authtest'
    })
    if (owner) {
      asset = await createAsset(
        {
          name: "Owner NFT",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "dummywalletaddress", 
            ) { 
              id
              name
              description
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
        expect(res.body.errors[0].message).toEqual('User wallet address in JWT does not match wallet address param')
        done()
      })
  })

})