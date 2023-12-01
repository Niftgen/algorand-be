import {Knex} from "knex"
import {connectDb} from "../src/lambda/db/db";
const supertest = require("supertest")
const app = require("../../app")
import {Rating} from '../src/lambda/db/models/Rating'
import {Asset} from "../src/lambda/db/models/Asset";
import {User} from "../src/lambda/db/models/User";
import {LOOKUP_SALE_TYPES} from "../src/lambda/db/models/Lookup";
import {setupDb, stopDb} from "./testDB";
import {createUser} from "../src/lambda/helpers/user.helper";
import {createAsset} from "../src/lambda/helpers/asset.helper";
import {findByType} from "../src/lambda/helpers/lookup.helper";
import {createRating} from "../src/lambda/helpers/rating.helper";
import {ASSETKIND} from "../src/lambda/services/const";


describe('Rating Tests',() => {
  let db: Knex
  let user: User | undefined
  let user2: User | undefined
  let user3: User | undefined
  let asset: Asset | undefined
  let asset2: Asset | undefined
  const request = supertest(app)

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
    user3 = await createUser({
      walletAddress: 'user3walletrating',
      avatarPath: 'path/avatar',
      email: 'user3@ips.com',
      userName: 'user3'
    })
    const saleTypes = await findByType(LOOKUP_SALE_TYPES)
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

  beforeEach(async() => {
    await Rating.query().delete()
    await Rating.query()
      .insert({
        assetId: asset?.id,
        userId: user2?.id,
        rating: 4
      })
    await Rating.query()
      .insert({
        assetId: asset?.id,
        userId: user3?.id,
        rating: 3
      })
    await Rating.query()
      .insert({
        assetId: asset2?.id,
        userId: user?.id,
        rating: 4
      })
    await Rating.query()
      .insert({
        assetId: asset2?.id,
        userId: user2?.id,
        rating: 5
      })
  })


  test("Add rating", async (done: any) => {
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            addRating(walletAddress: "${user?.walletAddress}", assetId: ${asset2?.id}, rating: 2) {
              id
              rating
              userId
              assetId
              user {
                id
                userName
                walletAddress
              }
              asset{
                id
                name
                ratingTotals{
                  averageRating
                  ratingCount
                }
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
        expect(res.body.data.addRating.user.id).toEqual(user?.id)
        expect(res.body.data.addRating.user.walletAddress).toEqual(user?.walletAddress)
        expect(res.body.data.addRating.asset.id).toEqual(asset2?.id)
        expect(res.body.data.addRating.asset.name).toEqual(asset2?.name)
        expect(res.body.data.addRating.asset.ratingTotals.averageRating).toEqual(3.5)
        expect(res.body.data.addRating.asset.ratingTotals.ratingCount).toEqual(2)
        expect(res.body.data.addRating.rating).toEqual(2)
        done()
      })
  })

  test("Delete rating", async (done: any) => {
      request
      .post("/graphql")
      .send({
        query: `
          mutation {
            addRating(walletAddress: "${user?.walletAddress}", assetId: ${asset2?.id}, rating: null) {
              id
              rating
              userId
              assetId
              user {
                id
                userName
                walletAddress
              }
              asset{
                id
                name
                ratingTotals{
                  averageRating
                  ratingCount
                }
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
        expect(res.body.data.addRating.user.id).toEqual(user?.id)
        expect(res.body.data.addRating.user.walletAddress).toEqual(user?.walletAddress)
        expect(res.body.data.addRating.asset.id).toEqual(asset2?.id)
        expect(res.body.data.addRating.asset.name).toEqual(asset2?.name)
        expect(res.body.data.addRating.asset.ratingTotals.averageRating).toEqual(5)
        expect(res.body.data.addRating.asset.ratingTotals.ratingCount).toEqual(1)
        expect(res.body.data.addRating.rating).toEqual(0)
        done()
      })
  })

  test("Should not be able to add a rating to your own asset", async (done: any) => {
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            addRating(walletAddress: "${user?.walletAddress}", assetId: ${asset?.id}, rating: 2) {
              id
              rating
              userId
              assetId
              user {
                id
                userName
                walletAddress
              }
              asset{
                id
                name
                ratingTotals{
                  averageRating
                  ratingCount
                }
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
        expect(res.body.errors[0].message).toEqual('Unable to add rating as you can not rate an asset you own')
        done()
      })
  })

  test("Update rating", async (done: any) => {
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            addRating(walletAddress: "${user2?.walletAddress}", assetId: ${asset?.id}, rating: 2) {
              id
              rating
              userId
              assetId
              user {
                id
                userName
                walletAddress
              }
              asset{
                id
                name
                ratingTotals{
                  averageRating
                  ratingCount
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
        expect(res.body.data.addRating.user.id).toEqual(user2?.id)
        expect(res.body.data.addRating.user.walletAddress).toEqual(user2?.walletAddress)
        expect(res.body.data.addRating.asset.id).toEqual(asset?.id)
        expect(res.body.data.addRating.asset.name).toEqual(asset?.name)
        expect(res.body.data.addRating.asset.ratingTotals.averageRating).toEqual(2.5)
        expect(res.body.data.addRating.asset.ratingTotals.ratingCount).toEqual(2)
        expect(res.body.data.addRating.rating).toEqual(2)
        done()
      })
  })

})