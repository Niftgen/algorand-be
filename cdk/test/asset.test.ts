import {Knex} from "knex"
const supertest = require("supertest")
const app = require("../../app")
import {Asset} from '../src/lambda/db/models/Asset'
import {User} from '../src/lambda/db/models/User'
import {Lookup, LOOKUP_CATEGORIES, LOOKUP_SALE_TYPES} from "../src/lambda/db/models/Lookup";
import {setupDb, stopDb} from "./testDB";
import {
  createAsset, createAssetApp, createAssetAuction,
  findAsset, optinAssetUser, processAssetBid, startAssetAuction,
  updateAssetBuy,
  updateAssetList,
  updateAssetMint
} from "../src/lambda/helpers/asset.helper";
import {findByType} from "../src/lambda/helpers/lookup.helper";
import {createUser} from "../src/lambda/helpers/user.helper";
import {Transaction, TRANSACTION_TYPES} from "../src/lambda/db/models/Transaction";
import axios from "axios";
import {createComment} from "../src/lambda/helpers/comment.helper";
import {Comment, MessageType} from "../src/lambda/db/models/Comment";
import {NOTIFICATION_TYPES} from "../src/lambda/db/models/Notification";
import {transactionFragment, userFragment} from "./graphql_fragments";
import {ASSETKIND} from "../src/lambda/services/const";
import {Rating} from "../src/lambda/db/models/Rating";

describe('Asset Tests',() => {
  let db: Knex
  let owner: User | undefined
  let minter: User | undefined
  let buyer: User | undefined
  const request = supertest(app)

  const result_fields = () => {
    return `
              id
              name
              description
              asaId
              ipfsPath
              filePath
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
              cover
              kind
              duration
              metadata
              views
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
              listTransactionId                
              list{
                ...transaction
              }
              auctionTransactionId                
              auction{
                ...transaction
              }
              appTransactionId                
              app{
                ...transaction
              }
              optinTransactionId                
              optin{
                ...transaction
              }
              mintTransactionId                
              mint{
                ...transaction
              }
              buyTransactionId                
              buy{
                ...transaction
              }
              winBidTransactionId                
              winningBid{
                ...transaction
              }
              deListTxId
              deListTransactionId                
              delist{
                ...transaction
              }
   `
  }

  const createTestData = async () => {
    await Asset.query().delete()
    if (owner &&  minter && buyer) {
      const fixed = await Lookup.query()
        .where({
          type: LOOKUP_SALE_TYPES,
          description: 'Fixed Price'
        }).first()
      const categories = await findByType(LOOKUP_CATEGORIES)
      let asset = await createAsset(
        {
          name: "Owner NFT",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[0].id, categories[3].id],
          kind: ASSETKIND.NFT_IMAGE,
          views: 1
        }, owner)
      asset = await updateAssetMint(asset, {
        id: asset?.id,
        minterAddress: owner?.walletAddress,
        signedTxn: "signed_transaction_123",
      })
      asset = await updateAssetList(asset, {
        id: asset?.id,
        price: 1,
        signedTxn: "signed_transaction_123",
        currency: 'ALGO'
      })
      asset = await createAsset(
        {
          name: "Owner NFT 2",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[0].id, categories[1].id],
          kind: ASSETKIND.NFT_VIDEO,
          views: 5
        }, owner)
      asset = await updateAssetMint(asset, {
        id: asset?.id,
        minterAddress: owner?.walletAddress,
        signedTxn: "signed_transaction_123",
      })
      asset = await updateAssetList(asset, {
        id: asset?.id,
        price: 100,
        signedTxn: "signed_transaction_123",
        currency: 'ALGO'
      })
      asset = await createAsset(
        {
          name: "Owner NFT 3",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[2].id],
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
      asset = await updateAssetMint(asset, {
        id: asset?.id,
        minterAddress: owner?.walletAddress,
        signedTxn: "signed_transaction_123",
      })
      asset = await updateAssetList(asset, {
        id: asset?.id,
        price: 2,
        signedTxn: "signed_transaction_123",
        currency: 'ALGO'
      })
      asset = await createAsset(
        {
          name: "Owner NFT 4",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[3].id],
          kind: ASSETKIND.NFT_VIDEO,
          views: 21
        }, owner)
      asset = await updateAssetMint(asset, {
        id: asset?.id,
        minterAddress: owner?.walletAddress,
        signedTxn: "signed_transaction_123",
      })
      asset = await updateAssetList(asset, {
        id: asset?.id,
        price: 50,
        signedTxn: "signed_transaction_123",
        currency: 'ALGO'
      })
      asset = await createAsset(
        {
          name: "Minter NFT",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[0].id, categories[3].id],
          kind: ASSETKIND.NFT_IMAGE,
          views: 12
        }, minter)
      asset = await updateAssetMint(asset, {
        id: asset?.id,
        minterAddress: minter?.walletAddress,
        signedTxn: "signed_transaction_123",
      })
      asset = await updateAssetList(asset, {
        id: asset?.id,
        price: 2,
        signedTxn: "signed_transaction_123",
        currency: 'ALGO'
      })
      asset = await createAsset(
        {
          name: "Minter NFT 2",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[0].id, categories[3].id],
          kind: ASSETKIND.NFT_IMAGE,
        }, minter)
      asset = await createAsset(
        {
          name: "Buyer NFT",
          description: "NFT with most views",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[2].id, categories[4].id],
          kind: ASSETKIND.NFT_IMAGE,
          views: 35
        }, buyer)
      asset = await updateAssetMint(asset, {
        id: asset?.id,
        minterAddress: buyer?.walletAddress,
        signedTxn: "signed_transaction_123",
      })
      asset = await updateAssetList(asset, {
        id: asset?.id,
        price: 100,
        signedTxn: "signed_transaction_123",
        currency: 'ALGO'
      })
      asset = await createAsset(
        {
          name: "Buyer NFT 2",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[2].id, categories[4].id],
          kind: ASSETKIND.NFT_IMAGE,
          views: 1
        }, buyer)
      asset = await createAsset(
        {
          name: "Buyer NFT 3",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[2].id, categories[4].id],
          kind: ASSETKIND.NFT_IMAGE,
        }, buyer)
    }
  }

  beforeAll(async () => {
    jest.setTimeout(30000)
    db = await setupDb()
    await User.query().delete()
    owner = await createUser({
      walletAddress: process.env.TEST_WALLET_ADDRESS,
      avatarPath: 'path/avatar',
      email: 'owner@ips.com',
      userName: 'owner'
    })
    minter = await createUser({
      walletAddress: process.env.TEST_WALLET_ADDRESS2,
      avatarPath: 'path/avatar',
      email: 'minter@ips.com',
      userName: 'minter'
    })
    buyer = await createUser({
      walletAddress: process.env.TEST_WALLET_ADDRESS3,
      avatarPath: 'path/avatar',
      email: 'buyer@ips.com',
      userName: 'buyer'
    })
  })

  afterAll(async () => {
    await stopDb()
  })

  beforeEach(async() => {
    await Transaction.query().delete()
  })

  afterEach(async () => {
  })

  /*
  test("Update ipfs from pinata to storj", async (done: any) => {
    const categories = await findByType(LOOKUP_CATEGORIES)
    let asset: any
    if (owner) {
      asset = await createAsset(
        {
          name: "NFT",
          description: "Test ipfs 1",
          ipfsPath: process.env.PINATA_TEST_FILE,
          categories: [categories[0].id, categories[3].id],
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
      asset = await createAsset(
        {
          name: "NFT",
          description: "Test ipfs 2",
          ipfsPath: process.env.PINATA_TEST_FILE2,
          categories: [categories[0].id, categories[3].id],
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            updateAssetIpfs
          }
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT2}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        console.log(res.body)
        if (err) return done(err)
        done()
      })
  })
   */

  test("Add new asset with required fields only", async (done: any) => {
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            addAsset(
              ownerAddress: "${owner?.walletAddress}",
              name: "minter test2",
              ipfsPath: "${process.env.IPFS_TEST_FILE}",
              kind: NFT_IMAGE,
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.addAsset.owner.walletAddress).toEqual(owner?.walletAddress)
        expect(res.body.data.addAsset.name).toEqual('minter test2')
        expect(res.body.data.addAsset.ipfsPath).toEqual(process.env.IPFS_TEST_FILE)
        expect(res.body.data.addAsset.kind).toEqual(ASSETKIND.NFT_IMAGE)
        done()
      })
  })

  test("Add new asset", async (done: any) => {
    const categories = await findByType(LOOKUP_CATEGORIES)
    const obj = {field: '4343', desc: 'test'}
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            addAsset(
              ownerAddress: "${owner?.walletAddress}",
              name: "minter test2",
              ipfsPath: "${process.env.IPFS_TEST_FILE}",
              description: "Test minter2",
              metadata: {walletAddress: "CHIK3AEDSYPCHTUGVYZMBT3FT3L3LFWJVQKP6NWXJDXU5OY3A55LKSWDPY"},
              categories: [${categories[0].id},${categories[1].id}],
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.addAsset.owner.walletAddress).toEqual(owner?.walletAddress)
        expect(res.body.data.addAsset.name).toEqual('minter test2')
        expect(res.body.data.addAsset.ipfsPath).toEqual(process.env.IPFS_TEST_FILE)
        expect(res.body.data.addAsset.categories[0].id).toEqual(categories[0].id)
        expect(res.body.data.addAsset.kind).toEqual(ASSETKIND.NFT_IMAGE)
        expect(res.body.data.addAsset.metadata).toEqual({walletAddress: "CHIK3AEDSYPCHTUGVYZMBT3FT3L3LFWJVQKP6NWXJDXU5OY3A55LKSWDPY"})
        done()
      })
  })

  test("Add new video", async (done: any) => {
    const categories = await findByType(LOOKUP_CATEGORIES)
    const obj = {id: 1, name: 'test'}
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            addAsset(
              ownerAddress: "${owner?.walletAddress}",
              name: "minter test2",
              filePath: "/CHIK3AEDSYPCHTUGVYZMBT3FT3L3LFWJVQKP6NWXJDXU5OY3A55LKSWDPY/5d6e082d-4995-400e-97de-5b05e842d09d.qt",
              description: "Test minter2",
              categories: [${categories[0].id},${categories[1].id}],
              duration: 123,
              metadata: {walletAddress: "CHIK3AEDSYPCHTUGVYZMBT3FT3L3LFWJVQKP6NWXJDXU5OY3A55LKSWDPY"} ,
              kind: NFT_VIDEO                   
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.addAsset.owner.walletAddress).toEqual(owner?.walletAddress)
        expect(res.body.data.addAsset.name).toEqual('minter test2')
        expect(res.body.data.addAsset.filePath).toEqual('/CHIK3AEDSYPCHTUGVYZMBT3FT3L3LFWJVQKP6NWXJDXU5OY3A55LKSWDPY/5d6e082d-4995-400e-97de-5b05e842d09d.qt')
        expect(res.body.data.addAsset.categories[0].id).toEqual(categories[0].id)
        expect(res.body.data.addAsset.kind).toEqual(ASSETKIND.NFT_VIDEO)
        expect(res.body.data.addAsset.duration).toEqual(123)
        expect(res.body.data.addAsset.metadata).toEqual({walletAddress: "CHIK3AEDSYPCHTUGVYZMBT3FT3L3LFWJVQKP6NWXJDXU5OY3A55LKSWDPY"} )
        done()
      })
  })

  test("Update an existing asset", async (done: any) => {
    const categories = await findByType(LOOKUP_CATEGORIES)
    let asset: any
    if (owner) {
      asset = await createAsset(
        {
          name: "NFT",
          description: "Test ipfs 1",
          ipfsPath: process.env.PINATA_TEST_FILE,
          categories: [categories[0].id, categories[3].id],
          kind: ASSETKIND.FREE_VIDEO,
        }, owner)
    }
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            updateAsset(
              id: ${asset?.id},
              ownerAddress: "${owner?.walletAddress}",
              kind: NFT_VIDEO                   
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.updateAsset.owner.walletAddress).toEqual(owner?.walletAddress)
        expect(res.body.data.updateAsset.id).toEqual(asset?.id)
        expect(res.body.data.updateAsset.kind).toEqual(ASSETKIND.NFT_VIDEO)
        done()
      })
  })

  test("Should reject an asset if it has nudity or hate symbols", async (done: any) => {
    const categories = await findByType(LOOKUP_CATEGORIES)
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            addAsset(
              ownerAddress: "${owner?.walletAddress}",
              name: "minter test2",
              ipfsPath: "${process.env.IPFS_TEST_NUDE_FILE}",
              description: "Test minter2",
              categories: [${categories[0].id},${categories[1].id}],
              kind: NFT_IMAGE,
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toContain('Image moderation failure due to')
        done()
      })
  })

  test("Should not allow asset to be added if user not valid", async (done: any) => {
    const categories = await findByType(LOOKUP_CATEGORIES)
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            addAsset(
              ownerAddress: "nonexistantuser",
              name: "minter test2",
              ipfsPath: "${process.env.IPFS_TEST_FILE}",
              description: "Test minter2",
              categories: [${categories[0].id},${categories[1].id}],
              kind: NFT_IMAGE,
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
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

  test("Should only be allowed to mint your own assets", async (done: any) => {
    const categories = await findByType(LOOKUP_CATEGORIES)
    let asset: any
    if (owner)
      asset = await createAsset(
        {
          name: "NFT",
          description: "Should only be allowed to mint your own assets",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[0].id, categories[3].id],
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            mintAsset(
              id: ${asset?.id},
              minterAddress: "${minter?.walletAddress}",
              signedTxn: "signed_transaction_123"
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT2}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toEqual('Unable to mint as minter wallet address does not match asset owner wallet address')
        done()
      })
  })

  test("Mint an asset", async (done: any) => {
    let asset: Asset | undefined
    const lookups = await findByType(LOOKUP_SALE_TYPES)
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "Added NFT",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            mintAsset(
              id: ${asset?.id}, 
              minterAddress: "${owner?.walletAddress}",
              signedTxn: ${JSON.stringify(["signed_transaction_123"])}
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        const tran = await Transaction.query().findById(res.body.data.mintAsset.mintTransactionId)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.mintAsset.minter.walletAddress).toEqual(owner?.walletAddress)
        expect(res.body.data.mintAsset.asaId).toEqual(123456)
        expect(res.body.data.mintAsset.txId).toEqual('test_algo_txn_id')
        expect(res.body.data.mintAsset.mint.txIds).toEqual('test_algo_txn_id')
        expect(res.body.data.mintAsset.mint.type).toEqual(TRANSACTION_TYPES.MINT)
        expect(res.body.data.mintAsset.mint.assetId).toEqual(asset?.id)
        expect(res.body.data.mintAsset.mint.userId).toEqual(owner?.id)
        expect(res.body.data.mintAsset.mintTransactionId).toEqual(res.body.data.mintAsset.mint.id)
        done()
      })
  })

  test("Should not allow an asset to minted if already minted", async (done: any) => {
    let asset: Asset | undefined
    const lookups = await findByType(LOOKUP_SALE_TYPES)
    if (owner) {
      asset = await createAsset(
        {
          name: "NFT",
          description: "Should not allow an asset to minted if already minted",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      signedTxn: "signed_transaction_123",
    })
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            mintAsset(
              id: ${asset?.id}, 
              minterAddress: "${owner?.walletAddress}",
              signedTxn: ${JSON.stringify(["signed_transaction_123"])},
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toEqual('Already minted unable to mint again')
        done()
      })
  })

  test("Update views when someone views an asset", async (done: any) => {
    let asset: Asset | undefined
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "Added NFT",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE
        }, owner)
    }
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            viewedAsset(
              id: ${asset?.id}, 
              walletAddress: "${minter?.walletAddress}"
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT2}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.viewedAsset.owner.walletAddress).toEqual(owner?.walletAddress)
        expect(res.body.data.viewedAsset.views).toEqual(1)
        done()
      })
  })

  test("Create an app for a asset", async (done: any) => {
    let asset: Asset | undefined
    const fixedPrice = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Fixed Price'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "NFT",
          description: "Create an app for a asset",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      signedTxn: "signed_transaction_123",
    })
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            createApp(
              id: ${asset?.id}, 
              ownerAddress: "${owner?.walletAddress}",
              royaltyFee: 10,
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.createApp.owner.walletAddress).toEqual(owner?.walletAddress)
        expect(res.body.data.createApp.buyTxId).toBeNull()
        expect(res.body.data.createApp.buyTransactionId).toBeNull()
        expect(res.body.data.createApp.winBidTransactionId).toBeNull()
        expect(res.body.data.createApp.deListTransactionId).toBeNull()
        expect(res.body.data.createApp.deListTxId).toBeNull()
        expect(res.body.data.createApp.auctionTransactionId).toBeNull()
        expect(res.body.data.createApp.app.amount).toBeNull()
        expect(res.body.data.createApp.app.txIds).toEqual('test_algo_txn_id_2')
        expect(res.body.data.createApp.app.type).toEqual(TRANSACTION_TYPES.APP_CREATE)
        expect(res.body.data.createApp.app.assetId).toEqual(asset?.id)
        expect(res.body.data.createApp.app.userId).toEqual(owner?.id)
        expect(res.body.data.createApp.app.royaltyFee).toEqual(10)
        expect(res.body.data.createApp.app.appId).toEqual(117405601)
        expect(res.body.data.createApp.app.appAddress).toEqual('YQZRS5BGM24LRFON7IOML63EQYJY2UUTXYE734SVPDGGNQR77JSYJJNDYQ')
        done()
      })
  })

  test("Reject app optin if no app created", async (done: any) => {
    let asset: Asset | undefined
    const fixedPrice = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Fixed Price'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "NFT",
          description: "Create an app for a asset",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      signedTxn: "signed_transaction_123",
    })
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            optinApp(
              id: ${asset?.id}, 
              ownerAddress: "${owner?.walletAddress}",
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toEqual('Can not optin to app as no app has been created')
        done()
      })
  })

  test("Optin to an app for a asset", async (done: any) => {
    let asset: Asset | undefined
    const fixedPrice = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Fixed Price'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "NFT",
          description: "Optin to an app for a asset",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      signedTxn: "signed_transaction_123",
    })
    asset = await createAssetApp(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      signedTxn: "signed_transaction_123",
      royaltyFee: 10
    })
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            optinApp(
              id: ${asset?.id}, 
              ownerAddress: "${owner?.walletAddress}",
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.optinApp.owner.walletAddress).toEqual(owner?.walletAddress)
        expect(res.body.data.optinApp.buyTxId).toBeNull()
        expect(res.body.data.optinApp.buyTransactionId).toBeNull()
        expect(res.body.data.optinApp.winBidTransactionId).toBeNull()
        expect(res.body.data.optinApp.deListTransactionId).toBeNull()
        expect(res.body.data.optinApp.deListTxId).toBeNull()
        expect(res.body.data.optinApp.auctionTransactionId).toBeNull()
        expect(res.body.data.optinApp.optin.amount).toBeNull()
        expect(res.body.data.optinApp.optin.txIds).toEqual('test_algo_txn_id')
        expect(res.body.data.optinApp.optin.type).toEqual(TRANSACTION_TYPES.APP_OPTIN)
        expect(res.body.data.optinApp.optin.assetId).toEqual(asset?.id)
        expect(res.body.data.optinApp.optin.userId).toEqual(owner?.id)
        done()
      })
  })

  test("User optin to an asset", async (done: any) => {
    let asset: Asset | undefined
    const fixedPrice = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Fixed Price'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "NFT",
          description: "User optin to an asset",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      signedTxn: "signed_transaction_123",
    })
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            optinAsset(
              id: ${asset?.id}, 
              ownerAddress: "${owner?.walletAddress}",
              signedTxn: "signed_transaction_123",
            ) { 
              ...transaction
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.optinAsset.owner.walletAddress).toEqual(owner?.walletAddress)
        expect(res.body.data.optinAsset.txIds).toEqual('test_algo_txn_id')
        expect(res.body.data.optinAsset.type).toEqual(TRANSACTION_TYPES.ASSET_OPTIN)
        expect(res.body.data.optinAsset.assetId).toEqual(asset?.id)
        expect(res.body.data.optinAsset.userId).toEqual(owner?.id)
        done()
      })
  })

  test("Retrieve the optin transaction for a specific user and asset", async (done: any) => {
    let asset: Asset | undefined
    const fixedPrice = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Fixed Price'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "NFT",
          description: "User optin to an asset",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      signedTxn: "signed_transaction_123",
    })
    if (minter instanceof User && buyer instanceof User) {
      await optinAssetUser(asset,
        minter?.id,
        "signed_transaction_123"
      )
      await optinAssetUser(asset,
        buyer?.id,
        "signed_transaction_123"
      )
    }
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssetOptin(
              id: ${asset?.id}, 
              walletAddress: "${minter?.walletAddress}"
            ) { 
              ...transaction
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT2}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssetOptin.owner.walletAddress).toEqual(owner?.walletAddress)
        expect(res.body.data.getAssetOptin.txIds).toEqual('test_algo_txn_id')
        expect(res.body.data.getAssetOptin.type).toEqual(TRANSACTION_TYPES.ASSET_OPTIN)
        expect(res.body.data.getAssetOptin.assetId).toEqual(asset?.id)
        expect(res.body.data.getAssetOptin.userId).toEqual(owner?.id)
        done()
      })
  })

  test("List an asset for a fixed price", async (done: any) => {
    let asset: Asset | undefined
    const fixedPrice = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Fixed Price'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "NFT",
          description: "List an asset for a fixed price",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      signedTxn: "signed_transaction_123",
    })
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            listAsset(
              id: ${asset?.id}, 
              ownerAddress: "${owner?.walletAddress}",
              currency: ALGO,
              price: 1,
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.listAsset.owner.walletAddress).toEqual(owner?.walletAddress)
        expect(res.body.data.listAsset.buyTxId).toBeNull()
        expect(res.body.data.listAsset.buyTransactionId).toBeNull()
        expect(res.body.data.listAsset.winBidTransactionId).toBeNull()
        expect(res.body.data.listAsset.deListTransactionId).toBeNull()
        expect(res.body.data.listAsset.deListTxId).toBeNull()
        expect(res.body.data.listAsset.listingTxId).toEqual('test_algo_txn_id')
        expect(res.body.data.listAsset.auctionTransactionId).toBeNull()
        expect(res.body.data.listAsset.list.amount).toEqual(1)
        expect(res.body.data.listAsset.list.currency).toEqual('ALGO')
        expect(res.body.data.listAsset.list.saleType.id).toEqual(fixedPrice?.id)
        expect(res.body.data.listAsset.list.txIds).toEqual('test_algo_txn_id')
        expect(res.body.data.listAsset.list.type).toEqual(TRANSACTION_TYPES.LIST)
        expect(res.body.data.listAsset.list.assetId).toEqual(asset?.id)
        expect(res.body.data.listAsset.list.userId).toEqual(owner?.id)
        expect(res.body.data.listAsset.listTransactionId).toEqual(res.body.data.listAsset.list.id)
        done()
      })
  })

  test("Create an auction for an asset", async (done: any) => {
    let asset: Asset | undefined
    const auction = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Auction'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "NFT",
          description: "Create an auction for an asset",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      signedTxn: "signed_transaction_123",
    })
    let endDate = new Date()
    endDate.setDate(endDate.getDate() + 5)
    let startDate = new Date()
    startDate.setDate(startDate.getDate() + 1)
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            createAuction(
              id: ${asset?.id}, 
              ownerAddress: "${owner?.walletAddress}",
              currency: ALGO,
              reservePrice: 2,
              signedTxn: "signed_transaction_123",
              startTime: "${startDate.toISOString()}",
              endTime: "${endDate.toISOString()}"              
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.createAuction.owner.walletAddress).toEqual(owner?.walletAddress)
        expect(res.body.data.createAuction.buyTxId).toBeNull()
        expect(res.body.data.createAuction.buyTransactionId).toBeNull()
        expect(res.body.data.createAuction.winBidTransactionId).toBeNull()
        expect(res.body.data.createAuction.deListTransactionId).toBeNull()
        expect(res.body.data.createAuction.deListTxId).toBeNull()
        expect(res.body.data.createAuction.listingTxId).toBeNull()
        expect(res.body.data.createAuction.auction.amount).toEqual(2)
        expect(res.body.data.createAuction.auction.currency).toEqual('ALGO')
        expect(res.body.data.createAuction.auction.saleType.id).toEqual(auction?.id)
        expect(res.body.data.createAuction.auction.txIds).toEqual('test_algo_txn_id')
        expect(res.body.data.createAuction.auction.type).toEqual(TRANSACTION_TYPES.AUCTION)
        expect(res.body.data.createAuction.auction.assetId).toEqual(asset?.id)
        expect(res.body.data.createAuction.auction.userId).toEqual(owner?.id)
        expect(res.body.data.createAuction.auction.appId).toEqual(12344321)
        expect(res.body.data.createAuction.listTransactionId).toBeNull()
        expect(res.body.data.createAuction.auctionTransactionId).toEqual(res.body.data.createAuction.auction.id)
        done()
      })
  })

  test("Start an auction for an asset", async (done: any) => {
    let asset: Asset | undefined
    const auction = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Auction'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "NFT",
          description: "Start an auction for an asset",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      signedTxn: "signed_transaction_123",
    })
    let endDate = new Date()
    endDate.setDate(endDate.getDate() + 5)
    let startDate = new Date()
    startDate.setDate(startDate.getDate() - 1)
    asset = await createAssetAuction(asset, {
      id: asset?.id,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      reservePrice: 2,
      signedTxn: "signed_transaction_123",
      currency: 'ALGO'
    })
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            startAuction(
              id: ${asset?.id}, 
              ownerAddress: "${owner?.walletAddress}",
              signedTxn: "signed_transaction_123"
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.startAuction.owner.walletAddress).toEqual(owner?.walletAddress)
        expect(res.body.data.startAuction.buyTxId).toBeNull()
        expect(res.body.data.startAuction.buyTransactionId).toBeNull()
        expect(res.body.data.startAuction.winBidTransactionId).toBeNull()
        expect(res.body.data.startAuction.deListTransactionId).toBeNull()
        expect(res.body.data.startAuction.deListTxId).toBeNull()
        expect(res.body.data.startAuction.listingTxId).toEqual('test_algo_txn_id')
        expect(res.body.data.startAuction.list.amount).toEqual(2)
        expect(res.body.data.startAuction.list.currency).toEqual('ALGO')
        expect(res.body.data.startAuction.list.saleType.id).toEqual(auction?.id)
        expect(res.body.data.startAuction.list.txIds).toEqual('test_algo_txn_id')
        expect(res.body.data.startAuction.list.type).toEqual(TRANSACTION_TYPES.LIST)
        expect(res.body.data.startAuction.list.assetId).toEqual(asset?.id)
        expect(res.body.data.startAuction.list.userId).toEqual(owner?.id)
        expect(res.body.data.startAuction.listTransactionId).toEqual(res.body.data.startAuction.list.id)
        done()
      })
  })

  test("Reject an auction start if auction not created", async (done: any) => {
    let asset: Asset | undefined
    const auction = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Auction'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "NFT",
          description: "Reject an auction create if start time is greater than end time",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      signedTxn: "signed_transaction_123",
    })
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            startAuction(
              id: ${asset?.id}, 
              ownerAddress: "${owner?.walletAddress}",
              signedTxn: "signed_transaction_123"
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toEqual('Auction not yet created')
        done()
      })
  })

  test("Reject an auction create if start time is greater than end time", async (done: any) => {
    let asset: Asset | undefined
    const auction = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Auction'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "NFT",
          description: "Reject an auction create if start time is greater than end time",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      signedTxn: "signed_transaction_123",
    })
    let endDate = new Date()
    endDate.setDate(endDate.getDate() + 1)
    let startDate = new Date()
    startDate.setDate(startDate.getDate() + 5)
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            createAuction(
              id: ${asset?.id}, 
              ownerAddress: "${owner?.walletAddress}",
              currency: ALGO,
              reservePrice: 2,
              signedTxn: "signed_transaction_123",
              startTime: "${startDate.toISOString()}",
              endTime: "${endDate.toISOString()}"              
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toEqual('Start time must be less than end time for auction listing')
        done()
      })
  })

  test("Reject a auction create if start time is in the past", async (done: any) => {
    let asset: Asset | undefined
    const auction = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Auction'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "NFT",
          description: "Reject a auction create if start time is in the past",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      signedTxn: "signed_transaction_123",
    })
    let endDate = new Date()
    endDate.setDate(endDate.getDate() + 2)
    let startDate = new Date()
    startDate.setDate(startDate.getDate() - 2)
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            createAuction(
              id: ${asset?.id}, 
              ownerAddress: "${owner?.walletAddress}",
              currency: ALGO,
              reservePrice: 2,
              signedTxn: "signed_transaction_123",
              startTime: "${startDate.toISOString()}",
              endTime: "${endDate.toISOString()}"              
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toEqual('Start time can not be in the past for auction listing')
        done()
      })
  })

  test("Reject a auction create if auction duration is less than 24 hours", async (done: any) => {
    let asset: Asset | undefined
    const auction = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Auction'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "NFT",
          description: "Reject a auction create if auction duration is less than 24 hours",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      signedTxn: "signed_transaction_123",
    })
    let startDate = new Date()
    startDate.setDate(startDate.getDate() + 1)
    await new Promise((r) => setTimeout(r, 2000))
    let endDate = new Date()
    endDate.setDate(endDate.getDate() + 1)
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            createAuction(
              id: ${asset?.id}, 
              ownerAddress: "${owner?.walletAddress}",
              currency: ALGO,
              reservePrice: 2,
              signedTxn: "signed_transaction_123",
              startTime: "${startDate.toISOString()}",
              endTime: "${endDate.toISOString()}"              
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toEqual('End time less than a day after start time, auctions need to run for at least 24 hours')
        done()
      })
  })

  test("Should not allow an asset to be listed if not minted", async (done: any) => {
    let asset: Asset | undefined
    const fixedPrice = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Fixed Price'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "NFT",
          description: "Should not allow an asset to be listed if not minted",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            listAsset(
              id: ${asset?.id}, 
              ownerAddress: "${owner?.walletAddress}",
              currency: ALGO,
              price: 1,
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toEqual('Can not list an unminted asset')
        done()
      })
  })

  test("Should not allow an asset to be listed if already listed", async (done: any) => {
    let asset: any
    const fixed = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Fixed Price'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "NFT",
          description: "Should not allow an asset to be listed if already listed",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
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
            listAsset(
              id: ${asset?.id}, 
              ownerAddress: "${owner?.walletAddress}",
              currency: ALGO,
              price: 1,
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toEqual('Already listed unable to list again')
        done()
      })
  })

  test("Should only allow listing of assets you own", async (done: any) => {
    let asset: any
    const fixed = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Fixed Price'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "NFT",
          description: "Should only allow listing of assets you own",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      signedTxn: "signed_transaction_123",
    })
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            listAsset(
              id: ${asset?.id}, 
              ownerAddress: "${minter?.walletAddress}",
              currency: ALGO,
              price: 1,
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT2}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toEqual('Unable to list as wallet address does not match asset owner wallet address')
        done()
      })
  })

  test("Delist an asset", async (done: any) => {
    let asset: any
    const fixed = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Fixed Price'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "NFT",
          description: "Delist an asset",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
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
            delistAsset(
              id: ${asset?.id},
              ownerAddress: "${owner?.walletAddress}",
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.delistAsset.owner.walletAddress).toEqual(owner?.walletAddress)
        expect(res.body.data.delistAsset.currency).toBeNull()
        expect(res.body.data.delistAsset.sellType).toBeNull()
        expect(res.body.data.delistAsset.price).toBeNull()
        expect(res.body.data.delistAsset.listingTxId).toBeNull()
        expect(res.body.data.delistAsset.listTransactionId).toBeNull()
        expect(res.body.data.delistAsset.winBidTransactionId).toBeNull()
        expect(res.body.data.delistAsset.deListTxId).toEqual('test_algo_txn_id')
        expect(res.body.data.delistAsset.delist.txIds).toEqual('test_algo_txn_id')
        expect(res.body.data.delistAsset.delist.type).toEqual(TRANSACTION_TYPES.DELIST)
        expect(res.body.data.delistAsset.delist.assetId).toEqual(asset?.id)
        expect(res.body.data.delistAsset.delist.userId).toEqual(owner?.id)
        expect(res.body.data.delistAsset.deListTransactionId).toEqual(res.body.data.delistAsset.delist.id)
        done()
      })
  })

  test("Should not be able to buy an unlisted asset", async (done: any) => {
    let asset: any
    const fixed = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Fixed Price'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "NFT",
          description: "Should not be able to buy an unlisted asset",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      signedTxn: "signed_transaction_123",
    })
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            buyAsset(
              id: ${asset?.id}, 
              buyerAddress: "${owner?.walletAddress}",
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toEqual('Can not buy an unlisted asset')
        done()
      })
  })

  test("Buy a fixed price asset", async (done: any) => {
    let asset: any
    const fixed = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Fixed Price'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "NFT",
          description: "Buy an asset",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
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
              buyerAddress: "${minter?.walletAddress}",
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT2}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.buyAsset.owner.walletAddress).toEqual(minter?.walletAddress)
        expect(res.body.data.buyAsset.listingTxId).toBeNull()
        expect(res.body.data.buyAsset.listTransactionId).toBeNull()
        expect(res.body.data.buyAsset.price).toBeNull()
        expect(res.body.data.buyAsset.buyTxId).toEqual('test_algo_txn_id')
        expect(res.body.data.buyAsset.buy.amount).toEqual(2)
        expect(res.body.data.buyAsset.buy.currency).toEqual('ALGO')
        expect(res.body.data.buyAsset.buy.saleType.id).toEqual(fixed?.id)
        expect(res.body.data.buyAsset.buy.txIds).toEqual('test_algo_txn_id')
        expect(res.body.data.buyAsset.buy.type).toEqual(TRANSACTION_TYPES.BUY)
        expect(res.body.data.buyAsset.buy.assetId).toEqual(asset?.id)
        expect(res.body.data.buyAsset.buy.buyerId).toEqual(minter?.id)
        expect(res.body.data.buyAsset.buy.userId).toEqual(owner?.id)
        expect(res.body.data.buyAsset.buyTransactionId).toEqual(res.body.data.buyAsset.buy.id)
        done()
      })
  })

  test("Should not be able to delist an unlisted asset", async (done: any) => {
    let asset: any
    const fixed = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Fixed Price'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "NFT",
          description: "Should not be able to delist an unlisted asset",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      signedTxn: "signed_transaction_123",
    })
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            delistAsset(
              id: ${asset?.id},
              ownerAddress: "${owner?.walletAddress}",
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toEqual('Not listed can not delist')
        done()
      })
  })

  test("Should only be allowed to delist assets you own", async (done: any) => {
    let asset: any
    const fixed = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Fixed Price'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "NFT",
          description: "Should not be able to delist an unlisted asset",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
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
            delistAsset(
              id: ${asset?.id},
              ownerAddress: "${minter?.walletAddress}",
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT2}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toEqual('Unable to delist as owner wallet address does not match asset owner wallet address')
        done()
      })
  })

  test("Delete an asset", async (done: any) => {
    let asset: Asset | undefined
    const lookups = await findByType(LOOKUP_SALE_TYPES)
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "Added NFT",
          description: "Delete an asset",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            deleteAsset(
              id: ${asset?.id},
              ownerAddress: "${owner?.walletAddress}"
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
        asset = await findAsset(asset instanceof Asset ? asset.id : 0)
        expect(asset).toBeUndefined()
        done()
      })
  })

  test("Should only be allowed to delete an asset you own", async (done: any) => {
    let asset: Asset | undefined
    const lookups = await findByType(LOOKUP_SALE_TYPES)
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "Added NFT",
          description: "Should only be allowed to delete an asset you own",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            deleteAsset(
              id: ${asset?.id},
              ownerAddress: "${minter?.walletAddress}"
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
        expect(res.body.errors[0].message).toEqual('Unable to delete as owner wallet address does not match asset owner wallet address')
        done()
      })
  })

  test("Get an asset", async (done: any) => {
    let asset: Asset | undefined
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "Added NFT",
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
            getAsset(
              id: ${asset?.id}, 
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAsset.owner.walletAddress).toEqual(owner?.walletAddress)
        expect(res.body.data.getAsset.owner.id).toEqual(owner?.id)
        expect(res.body.data.getAsset.name).toEqual('Added NFT')
        expect(res.body.data.getAsset.ipfsPath).toEqual(process.env.IPFS_TEST_FILE)
        done()
      })
  })

  test("GetAssets should raise an error if the walletAddress is not valid", async (done: any) => {
    await createTestData()
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "dummywalletaddress", 
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
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

  test("Get ALL assets for current owner", async (done: any) => {
    await createTestData()
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${owner?.walletAddress}", 
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets.length).toEqual(6)
        done()
      })
  })

  test("Get all VIDEO assets for current user and VIDEO assets listed by other users", async (done: any) => {
    await createTestData()
    const categories = await findByType(LOOKUP_CATEGORIES)
    if (minter) {
      let asset = await createAsset(
        {
          name: "Minter NFT",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[0].id, categories[3].id],
          kind: ASSETKIND.NFT_VIDEO,
          views: 12
        }, minter)
      asset = await updateAssetMint(asset, {
        id: asset?.id,
        minterAddress: minter?.walletAddress,
        signedTxn: "signed_transaction_123",
      })
      asset = await updateAssetList(asset, {
        id: asset?.id,
        price: 2,
        signedTxn: "signed_transaction_123",
        currency: 'ALGO'
      })
    }
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${owner?.walletAddress}", 
              kind: NFT_VIDEO
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets.length).toEqual(3)
        done()
      })
  })

  test("Get all NFT IMAGE assets for current user and NFT IMAGE assets listed by other users", async (done: any) => {
    await createTestData()
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${owner?.walletAddress}", 
              kind: NFT_IMAGE
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets.length).toEqual(4)
        done()
      })
  })

  test("Get all VIDEO & NFT IMAGE assets for current user and VIDEO & NFT IMAGE assets listed by other users", async (done: any) => {
    await createTestData()
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${owner?.walletAddress}", 
              kind: [NFT_VIDEO, NFT_IMAGE]
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets.length).toEqual(6)
        done()
      })
  })

  test("Get all AUDIO assets for current user and AUDIO assets listed by other users", async (done: any) => {
    await createTestData()
    const categories = await findByType(LOOKUP_CATEGORIES)
    if (owner && buyer) {
      let asset = await createAsset(
        {
          name: "Owner NFT 2",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[0].id, categories[1].id],
          kind: ASSETKIND.NFT_AUDIO,
          views: 5
        }, owner)
      asset = await updateAssetMint(asset, {
        id: asset?.id,
        minterAddress: owner?.walletAddress,
        signedTxn: "signed_transaction_123",
      })
      asset = await updateAssetList(asset, {
        id: asset?.id,
        price: 100,
        signedTxn: "signed_transaction_123",
        currency: 'ALGO'
      })
      asset = await createAsset(
        {
          name: "Owner NFT 2",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[0].id, categories[1].id],
          kind: ASSETKIND.AUDIO,
          views: 5
        }, owner)
      asset = await updateAssetMint(asset, {
        id: asset?.id,
        minterAddress: owner?.walletAddress,
        signedTxn: "signed_transaction_123",
      })
      asset = await updateAssetList(asset, {
        id: asset?.id,
        price: 100,
        signedTxn: "signed_transaction_123",
        currency: 'ALGO'
      })
    }
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${owner?.walletAddress}", 
              kind: [NFT_AUDIO, AUDIO]
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets.length).toEqual(2)
        done()
      })
  })

  test("Get all assets with UNMINTED status for current user", async (done: any) => {
    await createTestData()
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${buyer?.walletAddress}", 
              status: UNMINTED
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT3}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets.length).toEqual(2)
        done()
      })
  })

  test("Get all assets with MINTED status for current user", async (done: any) => {
    await createTestData()
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${owner?.walletAddress}", 
              status: MINTED
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets.length).toEqual(4)
        done()
      })
  })

  test("Get all assets with LISTED status for current user", async (done: any) => {
    await createTestData()
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${owner?.walletAddress}", 
              status: LISTED
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets.length).toEqual(4)
        done()
      })
  })

  test("Get all assets with HIDDEN (not listed) status for current user", async (done: any) => {
    await createTestData()
    const categories = await findByType(LOOKUP_CATEGORIES)
    if (owner) {
      let asset = await createAsset(
        {
          name: "Owner NFT 4",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[3].id],
          kind: ASSETKIND.NFT_VIDEO,
        }, owner)
      asset = await createAsset(
        {
          name: "Owner NFT 4",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[3].id],
          kind: ASSETKIND.NFT_VIDEO,
        }, owner)
      asset = await createAsset(
        {
          name: "Owner NFT",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[0].id, categories[3].id],
          kind: ASSETKIND.NFT_IMAGE,
          views: 1
        }, owner)
      asset = await updateAssetMint(asset, {
        id: asset?.id,
        minterAddress: owner?.walletAddress,
        signedTxn: "signed_transaction_123",
      })
    }
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${owner?.walletAddress}", 
              status: HIDDEN
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets.length).toEqual(3)
        done()
      })
  })

  test("Get all assets with HIDDEN (not listed) status for current user should not include AUDIO & VIDEO", async (done: any) => {
    await createTestData()
    const categories = await findByType(LOOKUP_CATEGORIES)
    if (owner) {
      let asset = await createAsset(
        {
          name: "Owner NFT 4",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[3].id],
          kind: ASSETKIND.VIDEO,
        }, owner)
      asset = await createAsset(
        {
          name: "Owner NFT 4",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[3].id],
          kind: ASSETKIND.AUDIO,
        }, owner)
      asset = await createAsset(
        {
          name: "Owner NFT",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[0].id, categories[3].id],
          kind: ASSETKIND.NFT_IMAGE,
          views: 1
        }, owner)
      asset = await updateAssetMint(asset, {
        id: asset?.id,
        minterAddress: owner?.walletAddress,
        signedTxn: "signed_transaction_123",
      })
    }
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${owner?.walletAddress}", 
              status: HIDDEN
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets.length).toEqual(1)
        done()
      })
  })

  test("Get all assets with VISIBLE (only listed) status for all users", async (done: any) => {
    await createTestData()
    const categories = await findByType(LOOKUP_CATEGORIES)
    if (owner) {
      let asset = await createAsset(
        {
          name: "Owner NFT 4",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[3].id],
          kind: ASSETKIND.NFT_VIDEO,
        }, owner)
      asset = await createAsset(
        {
          name: "Owner NFT 4",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[3].id],
          kind: ASSETKIND.NFT_VIDEO,
        }, owner)
      asset = await createAsset(
        {
          name: "Owner NFT",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[0].id, categories[3].id],
          kind: ASSETKIND.NFT_IMAGE,
          views: 1
        }, owner)
      asset = await updateAssetMint(asset, {
        id: asset?.id,
        minterAddress: owner?.walletAddress,
        signedTxn: "signed_transaction_123",
      })
    }
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${owner?.walletAddress}", 
              status: VISIBLE
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets.length).toEqual(6)
        done()
      })
  })

  test("Get all VISIBLE (only listed) status for all users should include AUDIO, FREE VIDEO & VIDEO", async (done: any) => {
    await createTestData()
    const categories = await findByType(LOOKUP_CATEGORIES)
    if (owner) {
      let asset = await createAsset(
        {
          name: "Owner NFT 4",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[3].id],
          kind: ASSETKIND.VIDEO,
        }, owner)
      asset = await createAsset(
        {
          name: "Owner NFT 4",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[3].id],
          kind: ASSETKIND.AUDIO,
        }, owner)
      asset = await createAsset(
        {
          name: "Owner NFT 4",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[3].id],
          kind: ASSETKIND.FREE_VIDEO,
        }, owner)
      asset = await createAsset(
        {
          name: "Owner NFT",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[0].id, categories[3].id],
          kind: ASSETKIND.NFT_IMAGE,
          views: 1
        }, owner)
      asset = await updateAssetMint(asset, {
        id: asset?.id,
        minterAddress: owner?.walletAddress,
        signedTxn: "signed_transaction_123",
      })
    }
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${owner?.walletAddress}", 
              status: VISIBLE
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets.length).toEqual(9)
        done()
      })
  })

  test("Get all assets with VISIBLE (only listed) status for all users & HIDDEN assets for current user", async (done: any) => {
    await createTestData()
    const categories = await findByType(LOOKUP_CATEGORIES)
    if (owner) {
      let asset = await createAsset(
        {
          name: "Owner NFT 4",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[3].id],
          kind: ASSETKIND.NFT_VIDEO,
        }, owner)
      asset = await createAsset(
        {
          name: "Owner NFT 4",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[3].id],
          kind: ASSETKIND.NFT_VIDEO,
        }, owner)
      asset = await createAsset(
        {
          name: "Owner NFT",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[0].id, categories[3].id],
          kind: ASSETKIND.NFT_IMAGE,
          views: 1
        }, owner)
      asset = await updateAssetMint(asset, {
        id: asset?.id,
        minterAddress: owner?.walletAddress,
        signedTxn: "signed_transaction_123",
      })
    }
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${owner?.walletAddress}", 
              status: [VISIBLE, HIDDEN]
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets.length).toEqual(9)
        done()
      })
  })

  test("Get all VISIBLE for the specified user", async (done: any) => {
    await createTestData()
    const categories = await findByType(LOOKUP_CATEGORIES)
    if (owner) {
      let asset = await createAsset(
        {
          name: "Owner NFT 4",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[3].id],
          kind: ASSETKIND.NFT_VIDEO,
        }, owner)
      asset = await createAsset(
        {
          name: "Owner NFT 4",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[3].id],
          kind: ASSETKIND.NFT_VIDEO,
        }, owner)
      asset = await createAsset(
        {
          name: "Owner NFT",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[0].id, categories[3].id],
          kind: ASSETKIND.NFT_IMAGE,
          views: 1
        }, owner)
      asset = await updateAssetMint(asset, {
        id: asset?.id,
        minterAddress: owner?.walletAddress,
        signedTxn: "signed_transaction_123",
      })
    }
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${minter?.walletAddress}", 
              ownedByWalletAddress: "${owner?.walletAddress}"
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT2}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets.length).toEqual(4)
        done()
      })
  })

  test("Get all VISIBLE for the specified user should include non-nft assets AUDIO & VIDEO", async (done: any) => {
    await createTestData()
    const categories = await findByType(LOOKUP_CATEGORIES)
    if (owner) {
      let asset = await createAsset(
        {
          name: "Owner NFT 4",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[3].id],
          kind: ASSETKIND.VIDEO,
        }, owner)
      asset = await createAsset(
        {
          name: "Owner NFT 4",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[3].id],
          kind: ASSETKIND.AUDIO,
        }, owner)
      asset = await createAsset(
        {
          name: "Owner NFT",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[0].id, categories[3].id],
          kind: ASSETKIND.NFT_IMAGE,
          views: 1
        }, owner)
      asset = await updateAssetMint(asset, {
        id: asset?.id,
        minterAddress: owner?.walletAddress,
        signedTxn: "signed_transaction_123",
      })
    }
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${minter?.walletAddress}", 
              ownedByWalletAddress: "${owner?.walletAddress}"
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT2}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets.length).toEqual(6)
        done()
      })
  })

  test("Get all listed assets using both LISTED status & onlyListed", async (done: any) => {
    await createTestData()
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${owner?.walletAddress}", 
              status: LISTED,
              onlyListed: true
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets.length).toEqual(4)
        done()
      })
  })

  test("Get all assets with SOLD status for current user", async (done: any) => {
    await createTestData()
    const categories = await findByType(LOOKUP_CATEGORIES)
    if (owner && buyer) {
      let asset = await createAsset(
        {
          name: "Owner NFT 2",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[0].id, categories[1].id],
          kind: ASSETKIND.NFT_VIDEO,
          views: 5
        }, owner)
      asset = await updateAssetMint(asset, {
        id: asset?.id,
        minterAddress: owner?.walletAddress,
        signedTxn: "signed_transaction_123",
      })
      asset = await updateAssetList(asset, {
        id: asset?.id,
        price: 100,
        signedTxn: "signed_transaction_123",
        currency: 'ALGO'
      })
      asset = await updateAssetBuy(asset, {
        id: asset?.id,
        signedTxn: "signed_transaction_123",
        buyerAddress: buyer?.walletAddress,
        userId: buyer.id
      })
    }
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${buyer?.walletAddress}", 
              status: SOLD
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT3}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets.length).toEqual(1)
        done()
      })
  })

  test("Get all listed assets using onlyListed", async (done: any) => {
    await createTestData()
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${minter?.walletAddress}", 
              onlyListed: true
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT2}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets.length).toEqual(6)
        done()
      })
  })

  test("Get all assets owned by me using ownedByCurrentUser", async (done: any) => {
    await createTestData()
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${minter?.walletAddress}", 
              ownedByCurrentUser: true
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT2}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets.length).toEqual(2)
        done()
      })
  })

  test("Get all assets owned by me that are listed using ownedByCurrentUser & onlyListed", async (done: any) => {
    await createTestData()
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${minter?.walletAddress}", 
              ownedByCurrentUser: true,
              onlyListed: true
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT2}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets.length).toEqual(1)
        done()
      })
  })

  test("Get all assets should return all my assets", async (done: any) => {
    await createTestData()
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${buyer?.walletAddress}", 
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT3}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets.length).toEqual(8)
        done()
      })
  })

  test("Get all assets filtered by category", async (done: any) => {
    await createTestData()
    const categories = await findByType(LOOKUP_CATEGORIES)
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${owner?.walletAddress}",
              categories: [${categories[0].id}, ${categories[2].id}]
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets.length).toEqual(5)
        done()
      })
  })

  test("Get count of all video assets", async (done: any) => {
    await createTestData()
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssetsCount(
              walletAddress: "${owner?.walletAddress}",
              kind: NFT_VIDEO
            ) { 
              totalCount
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
        expect(res.body.data.getAssetsCount.totalCount).toEqual(2)
        done()
      })
  })

  test("Get count of all assets returned with no filters", async (done: any) => {
    await createTestData()
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssetsCount(
              walletAddress: "${owner?.walletAddress}"
            ) { 
              totalCount
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
        expect(res.body.data.getAssetsCount.totalCount).toEqual(6)
        done()
      })
  })

  test("Ignore categories if empty array passed in", async (done: any) => {
    await createTestData()
    const categories = await findByType(LOOKUP_CATEGORIES)
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${owner?.walletAddress}",
              categories: []
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets.length).toEqual(6)
        done()
      })
  })

  test("Get all assets sorted by price H-L", async (done: any) => {
    await createTestData()
    const categories = await findByType(LOOKUP_CATEGORIES)
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${owner?.walletAddress}",
              sort: PRICE_HL
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets.length).toEqual(6)
        expect(res.body.data.getAssets[0].price).toEqual(100)
        expect(res.body.data.getAssets[res.body.data.getAssets.length-1].price).toEqual(1)
        done()
      })
  })

  test("Get all assets sorted by price L-H", async (done: any) => {
    await createTestData()
    const categories = await findByType(LOOKUP_CATEGORIES)
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${owner?.walletAddress}",
              sort: PRICE_LH
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets.length).toEqual(6)
        expect(res.body.data.getAssets[0].price).toEqual(1)
        expect(res.body.data.getAssets[res.body.data.getAssets.length-1].price).toEqual(100)
        done()
      })
  })

  test("Get all assets sorted by most viewed", async (done: any) => {
    await createTestData()
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${owner?.walletAddress}",
              sort: MOST_VIEWED
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets[0].views).toEqual(35)
        expect(res.body.data.getAssets[res.body.data.getAssets.length-1].views).toEqual(0)
        done()
      })
  })

  test("Get all assets sorted by top rated", async (done: any) => {
    await createTestData()
    const categories = await findByType(LOOKUP_CATEGORIES)
    if (owner && minter && buyer) {
      let asset = await createAsset(
        {
          name: "Top rated",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[0].id, categories[3].id],
          kind: ASSETKIND.NFT_IMAGE,
          views: 1
        }, owner)
      if (asset) {
        await Rating.query()
          .insert({
            assetId: asset.id,
            userId: buyer.id,
            rating: 5
          })
        await Rating.query()
          .insert({
            assetId: asset.id,
            userId: minter.id,
            rating: 5
          })
      }
      asset = await createAsset(
        {
          name: "Not top rated",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[0].id, categories[3].id],
          kind: ASSETKIND.NFT_IMAGE,
          views: 1
        }, owner)
      if (asset) {
        await Rating.query()
          .insert({
            assetId: asset.id,
            userId: buyer.id,
            rating: 2
          })
        await Rating.query()
          .insert({
            assetId: asset.id,
            userId: minter.id,
            rating: 1
          })
      }
    }
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${owner?.walletAddress}",
              sort: TOP_RATED
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets[0].name).toEqual('Top rated')
        expect(res.body.data.getAssets[1].name).toEqual('Not top rated')
        done()
      })
  })

  test("Get all assets sorted by latest added", async (done: any) => {
    await createTestData()
    const categories = await findByType(LOOKUP_CATEGORIES)
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${owner?.walletAddress}",
              sort: LATEST_ADDED
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets.length).toEqual(6)
        expect(res.body.data.getAssets[0].name).toEqual('Buyer NFT')
        expect(res.body.data.getAssets[res.body.data.getAssets.length-1].name).toEqual('Owner NFT')
        done()
      })
  })

  test("Get all assets for owned by specified user", async (done: any) => {
    await createTestData()
    const categories = await findByType(LOOKUP_CATEGORIES)
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${owner?.walletAddress}",
              ownedByCurrentUser: true
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAssets.length).toEqual(4)
        expect(res.body.data.getAssets[0].name).toContain('Owner NFT')
        done()
      })
  })

  test("Get all assets limit to 2", async (done: any) => {
    await createTestData()
    const categories = await findByType(LOOKUP_CATEGORIES)
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAssets(
              walletAddress: "${owner?.walletAddress}",
              limit: 3
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        //expect(res.body.data.getAssets.length).toEqual(3)
        done()
      })
  })

  test("Return the assets comment count", async (done: any) => {
    await Comment.query().delete()
    let asset: Asset | undefined
    let asset2: Asset | undefined
    if (owner instanceof User && minter instanceof User) {
      asset = await createAsset(
        {
          name: "List NFT",
          description: "Return the assets comment count",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
      asset2 = await createAsset(
        {
          name: "2nd NFT",
          description: "Return the assets comment count",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, minter)
    }
    if (asset && owner && minter) {
      await createComment({
          userId: minter?.id,
          content: "NFT comment",
          messageType: MessageType.ASSET_COMMENT,
          assetId: asset?.id
        },
        {
          notification: `${owner.userName} commented on your NFT`,
          notificationType: NOTIFICATION_TYPES.COMMENT,
          userId: minter?.id,
          assetId: asset?.id,
          originatorId: owner.id
        }
      )
      await createComment({
          userId: minter?.id,
          content: "2nd NFT comment",
          messageType: MessageType.ASSET_COMMENT,
          assetId: asset?.id
        },
        {
          notification: `${owner.userName} commented on your NFT`,
          notificationType: NOTIFICATION_TYPES.COMMENT,
          userId: minter?.id,
          assetId: asset?.id,
          originatorId: owner.id
        }
      )
      await createComment({
          userId: minter?.id,
          content: "3rd NFT comment",
          messageType: MessageType.ASSET_COMMENT,
          assetId: asset?.id
        },
        {
          notification: `${owner.userName} commented on your NFT`,
          notificationType: NOTIFICATION_TYPES.COMMENT,
          userId: minter?.id,
          assetId: asset?.id,
          originatorId: owner.id
        }
      )
      await createComment({
          userId: owner?.id,
          content: "1st NFT comment",
          messageType: MessageType.ASSET_COMMENT,
          assetId: asset2?.id
        },
        {
          notification: `${minter.userName} commented on your NFT`,
          notificationType: NOTIFICATION_TYPES.COMMENT,
          userId: owner?.id,
          assetId: asset?.id,
          originatorId: minter.id
        }
      )
    }
    request
      .post("/graphql")
      .send({
        query: `
          query {
            getAsset(
              id: ${asset?.id}, 
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getAsset.owner.walletAddress).toEqual(owner?.walletAddress)
        expect(res.body.data.getAsset.owner.id).toEqual(owner?.id)
        expect(res.body.data.getAsset.name).toEqual('List NFT')
        expect(res.body.data.getAsset.ipfsPath).toEqual(process.env.IPFS_TEST_FILE)
        expect(res.body.data.getAsset.totalComments).toEqual(3)
        done()
      })
  })

  test("Bid on an asset listed for auction", async (done: any) => {
    let asset: any
    const auction = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Auction'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "Bid NFT",
          description: "Bid on an asset listed for auction",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      signedTxn: "signed_transaction_123",
    })
    let endDate = new Date()
    endDate.setDate(endDate.getDate() + 5)
    let startDate = new Date()
    startDate.setDate(startDate.getDate() - 1)
    asset = await createAssetAuction(asset, {
      id: asset?.id,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      reservePrice: 2,
      signedTxn: "signed_transaction_123",
      currency: 'ALGO'
    })
    /*
    asset = await startAssetAuction(asset, {
      id: asset?.id,
      signedTxn: "signed_transaction_123",
    })
     */
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            bidOnAsset(
              id: ${asset?.id}, 
              buyerAddress: "${minter?.walletAddress}",
              amount: 3,
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT2}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        const updatedAsset = await Asset.query().findById(asset?.id)
        expect(res.body.data.bidOnAsset.owner.walletAddress).toEqual(owner?.walletAddress)
        expect(res.body.data.bidOnAsset.winningBid.amount).toEqual(3)
        expect(res.body.data.bidOnAsset.winningBid.currency).toEqual('ALGO')
        expect(res.body.data.bidOnAsset.winningBid.saleType.id).toEqual(auction?.id)
        expect(res.body.data.bidOnAsset.winningBid.txIds).toEqual('test_algo_txn_id')
        expect(res.body.data.bidOnAsset.winningBid.type).toEqual(TRANSACTION_TYPES.BID)
        expect(res.body.data.bidOnAsset.winningBid.assetId).toEqual(asset?.id)
        expect(res.body.data.bidOnAsset.winningBid.userId).toEqual(minter?.id)
        expect(res.body.data.bidOnAsset.winningBid.auctionId).toEqual(updatedAsset?.auctionTransactionId)
        expect(res.body.data.bidOnAsset.winBidTransactionId).toEqual(res.body.data.bidOnAsset.winningBid.id)
        done()
      })
  })

  test("Should reject bids below reserve", async (done: any) => {
    let asset: any
    const auction = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Auction'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "Bid NFT",
          description: "Bid on an asset listed for auction",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    let txId = "bid_transaction_id_1234567890"
    let result = {
      txnId: txId
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      asaId: 123456,
      signedTxn: "signed_transaction_123",
      royaltyFee: 1
    })
    let endDate = new Date()
    endDate.setDate(endDate.getDate() + 5)
    let startDate = new Date()
    startDate.setDate(startDate.getDate() - 1)
    asset = await createAssetAuction(asset, {
      id: asset?.id,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      reservePrice: 2,
      appId: 918923,
      signedTxn: "signed_transaction_123",
      currency: 'ALGO'
    })
    /*
    asset = await startAssetAuction(asset, {
      id: asset?.id,
      signedTxn: "signed_transaction_123",
    })
     */
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            bidOnAsset(
              id: ${asset?.id}, 
              buyerAddress: "${minter?.walletAddress}",
              amount: 1,
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT2}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toEqual('Bid must be greater than reserve price')
        done()
      })
  })

  test("Should reject bids below current highest bid", async (done: any) => {
    let asset: any
    const auction = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Auction'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "Bid NFT",
          description: "Bid on an asset listed for auction",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    let txId = "bid_transaction_id_1234567890"
    let result = {
      txnId: txId
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      asaId: 123456,
      signedTxn: "signed_transaction_123",
      royaltyFee: 1
    })
    let endDate = new Date()
    endDate.setDate(endDate.getDate() + 5)
    let startDate = new Date()
    startDate.setDate(startDate.getDate() - 1)
    asset = await createAssetAuction(asset, {
      id: asset?.id,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      reservePrice: 2,
      appId: 918923,
      signedTxn: "signed_transaction_123",
      currency: 'ALGO'
    })
    /*
    asset = await startAssetAuction(asset, {
      id: asset?.id,
      signedTxn: "signed_transaction_123",
    })
     */
    asset = await processAssetBid(asset, {
      id: asset?.id,
      userId: minter?.id,
      buyerAddress: minter?.walletAddress,
      amount: 5,
      signedTxn: "signed_transaction_123"
    })
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            bidOnAsset(
              id: ${asset?.id}, 
              buyerAddress: "${minter?.walletAddress}",
              amount: 4,
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT2}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toEqual('Bid must be greater than the current highest bid')
        done()
      })
  })

  test("Should reject bid from person with current highest bid", async (done: any) => {
    let asset: any
    const auction = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Auction'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "Bid NFT",
          description: "Bid on an asset listed for auction",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    let txId = "bid_transaction_id_1234567890"
    let result = {
      txnId: txId
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      asaId: 123456,
      signedTxn: "signed_transaction_123",
      royaltyFee: 1
    })
    let endDate = new Date()
    endDate.setDate(endDate.getDate() + 5)
    let startDate = new Date()
    startDate.setDate(startDate.getDate() - 1)
    asset = await createAssetAuction(asset, {
      id: asset?.id,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      reservePrice: 2,
      appId: 918923,
      signedTxn: "signed_transaction_123",
      currency: 'ALGO'
    })
    /*
    asset = await startAssetAuction(asset, {
      id: asset?.id,
      signedTxn: "signed_transaction_123",
    })
    */
    asset = await processAssetBid(asset, {
      id: asset?.id,
      userId: minter?.id,
      buyerAddress: minter?.walletAddress,
      amount: 5,
      signedTxn: "signed_transaction_123"
    })
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            bidOnAsset(
              id: ${asset?.id}, 
              buyerAddress: "${minter?.walletAddress}",
              amount: 6,
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT2}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toEqual('Your last bid is currently the highest bid')
        done()
      })
  })

  test("Should update winningBid when a higher bid is made", async (done: any) => {
    let asset: any
    const auction = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Auction'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "Bid NFT",
          description: "Bid on an asset listed for auction",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    let txId = "bid_transaction_id_1234567890"
    let result = {
      txnId: txId
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      asaId: 123456,
      signedTxn: "signed_transaction_123",
      royaltyFee: 1
    })
    let endDate = new Date()
    endDate.setDate(endDate.getDate() + 5)
    let startDate = new Date()
    startDate.setDate(startDate.getDate() - 1)
    asset = await createAssetAuction(asset, {
      id: asset?.id,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      reservePrice: 2,
      appId: 918923,
      signedTxn: "signed_transaction_123",
      currency: 'ALGO'
    })
    /*
    asset = await startAssetAuction(asset, {
      id: asset?.id,
      signedTxn: "signed_transaction_123",
    })
    */
    asset = await processAssetBid(asset, {
      id: asset?.id,
      userId: minter?.id,
      buyerAddress: minter?.walletAddress,
      amount: 5,
      signedTxn: "signed_transaction_123"
    })
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            bidOnAsset(
              id: ${asset?.id}, 
              buyerAddress: "${buyer?.walletAddress}",
              amount: 10,
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT3}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        const updatedAsset = await Asset.query().findById(asset?.id)
        expect(res.body.data.bidOnAsset.owner.walletAddress).toEqual(owner?.walletAddress)
        expect(res.body.data.bidOnAsset.winningBid.amount).toEqual(10)
        expect(res.body.data.bidOnAsset.winningBid.currency).toEqual('ALGO')
        expect(res.body.data.bidOnAsset.winningBid.saleType.id).toEqual(auction?.id)
        expect(res.body.data.bidOnAsset.winningBid.txIds).toEqual('test_algo_txn_id')
        expect(res.body.data.bidOnAsset.winningBid.type).toEqual(TRANSACTION_TYPES.BID)
        expect(res.body.data.bidOnAsset.winningBid.assetId).toEqual(asset?.id)
        expect(res.body.data.bidOnAsset.winningBid.userId).toEqual(buyer?.id)
        expect(res.body.data.bidOnAsset.winningBid.auctionId).toEqual(updatedAsset?.auctionTransactionId)
        expect(res.body.data.bidOnAsset.winBidTransactionId).toEqual(res.body.data.bidOnAsset.winningBid.id)
        done()
      })
  })

  test("Should reject bids less than or equal to 0", async (done: any) => {
    let asset: any
    const auction = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Auction'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "Bid NFT",
          description: "Bid on an asset listed for auction",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    let txId = "bid_transaction_id_1234567890"
    let result = {
      txnId: txId
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      asaId: 123456,
      signedTxn: "signed_transaction_123",
      royaltyFee: 1
    })
    let endDate = new Date()
    endDate.setDate(endDate.getDate() + 5)
    let startDate = new Date()
    startDate.setDate(startDate.getDate() - 1)
    asset = await createAssetAuction(asset, {
      id: asset?.id,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      reservePrice: 2,
      appId: 918923,
      signedTxn: "signed_transaction_123",
      currency: 'ALGO'
    })
    /*
    asset = await startAssetAuction(asset, {
      id: asset?.id,
      signedTxn: "signed_transaction_123",
    })
    */
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            bidOnAsset(
              id: ${asset?.id}, 
              buyerAddress: "${minter?.walletAddress}",
              amount: 0,
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT2}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toEqual('Bid must be greater than 0')
        done()
      })
  })

  test("Should reject bids after auction ends", async (done: any) => {
    let asset: any
    const auction = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Auction'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "Bid NFT",
          description: "Bid on an asset listed for auction",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    let txId = "bid_transaction_id_1234567890"
    let result = {
      txnId: txId
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      asaId: 123456,
      signedTxn: "signed_transaction_123",
      royaltyFee: 1
    })
    let endDate = new Date()
    endDate.setDate(endDate.getDate() - 2)
    let startDate = new Date()
    startDate.setDate(startDate.getDate() - 5)
    asset = await createAssetAuction(asset, {
      id: asset?.id,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      reservePrice: 2,
      appId: 918923,
      signedTxn: "signed_transaction_123",
      currency: 'ALGO'
    })
    /*
    asset = await startAssetAuction(asset, {
      id: asset?.id,
      signedTxn: "signed_transaction_123",
    })
    */
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            bidOnAsset(
              id: ${asset?.id}, 
              buyerAddress: "${minter?.walletAddress}",
              amount: 4,
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT2}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toEqual('Auction has ended')
        done()
      })
  })

  test("Should reject bids before auction starts", async (done: any) => {
    let asset: any
    const auction = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Auction'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "Bid NFT",
          description: "Bid on an asset listed for auction",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    let txId = "bid_transaction_id_1234567890"
    let result = {
      txnId: txId
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      asaId: 123456,
      signedTxn: "signed_transaction_123",
      royaltyFee: 1
    })
    let endDate = new Date()
    endDate.setDate(endDate.getDate() + 5)
    let startDate = new Date()
    startDate.setDate(startDate.getDate() + 1)
    asset = await createAssetAuction(asset, {
      id: asset?.id,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      reservePrice: 2,
      appId: 918923,
      signedTxn: "signed_transaction_123",
      currency: 'ALGO'
    })
    /*
    asset = await startAssetAuction(asset, {
      id: asset?.id,
      signedTxn: "signed_transaction_123",
    })
     */
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            bidOnAsset(
              id: ${asset?.id}, 
              buyerAddress: "${minter?.walletAddress}",
              amount: 4,
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT2}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toEqual('Auction has not started')
        done()
      })
  })

  test("Should not allow an auction to end if NFT not being auctioned", async (done: any) => {
    let txId = "end_auction_transaction_id_1234567890"
    let result = {
      txnId: txId
    }
    let asset: any
    const fixed = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Fixed Price'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "NFT",
          description: "Should reject end auction if NFT not being auctioned",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
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
            endAuction(
              id: ${asset?.id}, 
              walletAddress: "${minter?.walletAddress}",
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT2}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toEqual('This asset is not currently being auctioned')
        done()
      })
  })

  test("Should not allow an auction to end if wallet address is not NFT owner", async (done: any) => {
    let asset: any
    const auction = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Auction'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "Bid NFT",
          description: "Should reject end of unsuccessful auction if wallet address is not NFT owner",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      signedTxn: "signed_transaction_123",
    })
    let endDate = new Date()
    endDate.setDate(endDate.getDate() + 5)
    let startDate = new Date()
    startDate.setDate(startDate.getDate() - 1)
    asset = await createAssetAuction(asset, {
      id: asset?.id,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      reservePrice: 2,
      signedTxn: "signed_transaction_123",
      currency: 'ALGO'
    })
    /*
    asset = await startAssetAuction(asset, {
      id: asset?.id,
      signedTxn: "signed_transaction_123",
    })
    */
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            endAuction(
              id: ${asset?.id}, 
              walletAddress: "${minter?.walletAddress}",
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT2}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toEqual('Unable to end auction as wallet address does not match asset owner or winning bidder wallet address')
        done()
      })
  })

  test("Should not allow an auction to end if wallet address is not winning bidder or NFT owner", async (done: any) => {
    let asset: any
    const auction = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Auction'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "Bid NFT",
          description: "Should reject end of unsuccessful auction if wallet address is not NFT owner",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      signedTxn: "signed_transaction_123",
    })
    let endDate = new Date()
    endDate.setDate(endDate.getDate() + 5)
    let startDate = new Date()
    startDate.setDate(startDate.getDate() - 1)
    asset = await createAssetAuction(asset, {
      id: asset?.id,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      reservePrice: 2,
      signedTxn: "signed_transaction_123",
      currency: 'ALGO'
    })
    /*
    asset = await startAssetAuction(asset, {
      id: asset?.id,
      signedTxn: "signed_transaction_123",
    })
     */
    asset = await processAssetBid(asset, {
      userId: buyer?.id,
      amount: 4,
      id: asset?.id,
      signedTxn: "signed_transaction_123",
    })
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            endAuction(
              id: ${asset?.id}, 
              walletAddress: "${minter?.walletAddress}",
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT2}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toEqual('Unable to end auction as wallet address does not match asset owner or winning bidder wallet address')
        done()
      })
  })

  test("The owner of the NFT should be able to end an auction that have no bids", async (done: any) => {
    let asset: any
    const auction = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Auction'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "Bid NFT",
          description: "Should reject end of unsuccessful auction if wallet address is not NFT owner",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      signedTxn: "signed_transaction_123",
    })
    let endDate = new Date()
    endDate.setDate(endDate.getDate() + 5)
    let startDate = new Date()
    startDate.setDate(startDate.getDate() + 1)
    asset = await createAssetAuction(asset, {
      id: asset?.id,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      reservePrice: 2,
      signedTxn: "signed_transaction_123",
      currency: 'ALGO'
    })
    /*
    asset = await startAssetAuction(asset, {
      id: asset?.id,
      signedTxn: "signed_transaction_123",
    })
     */
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            endAuction(
              id: ${asset?.id}, 
              walletAddress: "${owner?.walletAddress}",
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.endAuction.owner.walletAddress).toEqual(owner?.walletAddress)
        expect(res.body.data.endAuction.buyTxId).toBeNull()
        expect(res.body.data.endAuction.buyTransactionId).toBeNull()
        expect(res.body.data.endAuction.winBidTransactionId).toBeNull()
        expect(res.body.data.endAuction.auctionTransactionId).toBeNull()
        expect(res.body.data.endAuction.deListTransactionId).toBeNull()
        expect(res.body.data.endAuction.deListTxId).toBeNull()
        expect(res.body.data.endAuction.listingTxId).toBeNull()
        expect(res.body.data.endAuction.listTransactionId).toBeNull()
        expect(res.body.data.endAuction.price).toBeNull()
        expect(res.body.data.endAuction.owner.id).toEqual(owner?.id)
        done()
      })
  })

  test("Allow NFT being auctioned to be delisted if started and with no winning bids", async (done: any) => {
    let asset: any
    const auction = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Auction'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "Bid NFT",
          description: "Should reject end of unsuccessful auction if wallet address is not NFT owner",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      signedTxn: "signed_transaction_123",
    })
    let endDate = new Date()
    endDate.setDate(endDate.getDate() + 5)
    let startDate = new Date()
    startDate.setDate(startDate.getDate() + 1)
    asset = await createAssetAuction(asset, {
      id: asset?.id,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      reservePrice: 2,
      signedTxn: "signed_transaction_123",
      currency: 'ALGO'
    })
    /*
    asset = await startAssetAuction(asset, {
      id: asset?.id,
      signedTxn: "signed_transaction_123",
    })
     */
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            delistAsset(
              id: ${asset?.id},
              ownerAddress: "${owner?.walletAddress}",
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.delistAsset.owner.walletAddress).toEqual(owner?.walletAddress)
        expect(res.body.data.delistAsset.currency).toBeNull()
        expect(res.body.data.delistAsset.sellType).toBeNull()
        expect(res.body.data.delistAsset.price).toBeNull()
        expect(res.body.data.delistAsset.listingTxId).toBeNull()
        expect(res.body.data.delistAsset.listTransactionId).toBeNull()
        expect(res.body.data.delistAsset.winBidTransactionId).toBeNull()
        expect(res.body.data.delistAsset.deListTxId).toEqual('test_algo_txn_id')
        expect(res.body.data.delistAsset.delist.txIds).toEqual('test_algo_txn_id')
        expect(res.body.data.delistAsset.delist.type).toEqual(TRANSACTION_TYPES.DELIST)
        expect(res.body.data.delistAsset.delist.assetId).toEqual(asset?.id)
        expect(res.body.data.delistAsset.delist.userId).toEqual(owner?.id)
        expect(res.body.data.delistAsset.deListTransactionId).toEqual(res.body.data.delistAsset.delist.id)
        done()
      })
  })

  test("Allow NFT being auctioned to be delisted if auction not started", async (done: any) => {
    let asset: any
    const auction = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Auction'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "Bid NFT",
          description: "Should reject end of unsuccessful auction if wallet address is not NFT owner",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      signedTxn: "signed_transaction_123",
    })
    let endDate = new Date()
    endDate.setDate(endDate.getDate() + 5)
    let startDate = new Date()
    startDate.setDate(startDate.getDate() + 1)
    asset = await createAssetAuction(asset, {
      id: asset?.id,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      reservePrice: 2,
      signedTxn: "signed_transaction_123",
      currency: 'ALGO'
    })
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            delistAsset(
              id: ${asset?.id},
              ownerAddress: "${owner?.walletAddress}",
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.delistAsset.owner.walletAddress).toEqual(owner?.walletAddress)
        expect(res.body.data.delistAsset.currency).toBeNull()
        expect(res.body.data.delistAsset.sellType).toBeNull()
        expect(res.body.data.delistAsset.price).toBeNull()
        expect(res.body.data.delistAsset.listingTxId).toBeNull()
        expect(res.body.data.delistAsset.listTransactionId).toBeNull()
        expect(res.body.data.delistAsset.winBidTransactionId).toBeNull()
        expect(res.body.data.delistAsset.deListTxId).toEqual('test_algo_txn_id')
        expect(res.body.data.delistAsset.delist.txIds).toEqual('test_algo_txn_id')
        expect(res.body.data.delistAsset.delist.type).toEqual(TRANSACTION_TYPES.DELIST)
        expect(res.body.data.delistAsset.delist.assetId).toEqual(asset?.id)
        expect(res.body.data.delistAsset.delist.userId).toEqual(owner?.id)
        expect(res.body.data.delistAsset.deListTransactionId).toEqual(res.body.data.delistAsset.delist.id)
        done()
      })
  })

  test("Should not allow NFT being auctioned to be delisted if is has a winning bid", async (done: any) => {
    let asset: any
    const auction = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Auction'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "Bid NFT",
          description: "Should reject end of unsuccessful auction if wallet address is not NFT owner",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      signedTxn: "signed_transaction_123",
    })
    let endDate = new Date()
    endDate.setDate(endDate.getDate() + 5)
    let startDate = new Date()
    startDate.setDate(startDate.getDate() + 1)
    asset = await createAssetAuction(asset, {
      id: asset?.id,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      reservePrice: 2,
      signedTxn: "signed_transaction_123",
      currency: 'ALGO'
    })
    /*
    asset = await startAssetAuction(asset, {
      id: asset?.id,
      signedTxn: "signed_transaction_123",
    })
     */
    asset = await processAssetBid(asset, {
      userId: minter?.id,
      amount: 4,
      id: asset?.id,
      signedTxn: "signed_transaction_123",
    })
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            delistAsset(
              id: ${asset?.id},
              ownerAddress: "${owner?.walletAddress}",
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.errors[0].message).toEqual('Auction has a winning bid, unable to delist')
        done()
      })
  })

  test("The winning bidder should be able to end an auction", async (done: any) => {
    let asset: any
    const auction = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Auction'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "Bid NFT",
          description: "Should reject end of unsuccessful auction if wallet address is not NFT owner",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      signedTxn: "signed_transaction_123",
    })
    let endDate = new Date()
    endDate.setDate(endDate.getDate() + 5)
    let startDate = new Date()
    startDate.setDate(startDate.getDate() - 1)
    asset = await createAssetAuction(asset, {
      id: asset?.id,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      reservePrice: 2,
      signedTxn: "signed_transaction_123",
      currency: 'ALGO'
    })
    /*
    asset = await startAssetAuction(asset, {
      id: asset?.id,
      signedTxn: "signed_transaction_123",
    })
     */
    asset = await processAssetBid(asset, {
      userId: minter?.id,
      amount: 4,
      id: asset?.id,
      signedTxn: "signed_transaction_123",
    })
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            endAuction(
              id: ${asset?.id}, 
              walletAddress: "${minter?.walletAddress}",
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT2}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.endAuction.owner.walletAddress).toEqual(minter?.walletAddress)
        expect(res.body.data.endAuction.winBidTransactionId).toBeNull()
        expect(res.body.data.endAuction.auctionTransactionId).toBeNull()
        expect(res.body.data.endAuction.deListTransactionId).toBeNull()
        expect(res.body.data.endAuction.deListTxId).toBeNull()
        expect(res.body.data.endAuction.listingTxId).toBeNull()
        expect(res.body.data.endAuction.listTransactionId).toBeNull()
        expect(res.body.data.endAuction.price).toBeNull()
        expect(res.body.data.endAuction.buyTxId).toEqual('test_algo_txn_id')
        expect(res.body.data.endAuction.buy.amount).toEqual(4)
        expect(res.body.data.endAuction.buy.currency).toEqual('ALGO')
        expect(res.body.data.endAuction.buy.saleType.id).toEqual(auction?.id)
        expect(res.body.data.endAuction.buy.txIds).toEqual('test_algo_txn_id')
        expect(res.body.data.endAuction.buy.type).toEqual(TRANSACTION_TYPES.BUY)
        expect(res.body.data.endAuction.buy.assetId).toEqual(asset?.id)
        expect(res.body.data.endAuction.buy.userId).toEqual(owner?.id)
        expect(res.body.data.endAuction.buy.buyerId).toEqual(minter?.id)
        expect(res.body.data.endAuction.buyTransactionId).toEqual(res.body.data.endAuction.buy.id)
        expect(res.body.data.endAuction.owner.id).toEqual(minter?.id)
        done()
      })
  })

  test("The owner should be able to end an auction with a winning bid", async (done: any) => {
    let asset: any
    const auction = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Auction'
      }).first()
    if (owner instanceof User) {
      asset = await createAsset(
        {
          name: "Bid NFT",
          description: "Should reject end of unsuccessful auction if wallet address is not NFT owner",
          ipfsPath: process.env.IPFS_TEST_FILE,
          kind: ASSETKIND.NFT_IMAGE,
        }, owner)
    }
    asset = await updateAssetMint(asset, {
      id: asset?.id,
      minterAddress: owner?.walletAddress,
      signedTxn: "signed_transaction_123",
    })
    let endDate = new Date()
    endDate.setDate(endDate.getDate() + 5)
    let startDate = new Date()
    startDate.setDate(startDate.getDate() - 1)
    asset = await createAssetAuction(asset, {
      id: asset?.id,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      reservePrice: 2,
      signedTxn: "signed_transaction_123",
      currency: 'ALGO'
    })
    /*
    asset = await startAssetAuction(asset, {
      id: asset?.id,
      signedTxn: "signed_transaction_123",
    })
     */
    asset = await processAssetBid(asset, {
      userId: minter?.id,
      amount: 4,
      id: asset?.id,
      signedTxn: "signed_transaction_123",
    })
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            endAuction(
              id: ${asset?.id}, 
              walletAddress: "${owner?.walletAddress}",
              signedTxn: "signed_transaction_123",
            ) { 
              ${result_fields()}
            }
          }
          ${userFragment()}
          ${transactionFragment()}
        `,
      })
      .set("Accept", "application/json")
      .set({ 'Authorization': `Bearer ${process.env.TEST_JWT}` })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.endAuction.owner.walletAddress).toEqual(minter?.walletAddress)
        expect(res.body.data.endAuction.winBidTransactionId).toBeNull()
        expect(res.body.data.endAuction.auctionTransactionId).toBeNull()
        expect(res.body.data.endAuction.deListTransactionId).toBeNull()
        expect(res.body.data.endAuction.deListTxId).toBeNull()
        expect(res.body.data.endAuction.listingTxId).toBeNull()
        expect(res.body.data.endAuction.listTransactionId).toBeNull()
        expect(res.body.data.endAuction.price).toBeNull()
        expect(res.body.data.endAuction.buyTxId).toEqual('test_algo_txn_id')
        expect(res.body.data.endAuction.buy.amount).toEqual(4)
        expect(res.body.data.endAuction.buy.currency).toEqual('ALGO')
        expect(res.body.data.endAuction.buy.saleType.id).toEqual(auction?.id)
        expect(res.body.data.endAuction.buy.txIds).toEqual('test_algo_txn_id')
        expect(res.body.data.endAuction.buy.type).toEqual(TRANSACTION_TYPES.BUY)
        expect(res.body.data.endAuction.buy.assetId).toEqual(asset?.id)
        expect(res.body.data.endAuction.buy.userId).toEqual(owner?.id)
        expect(res.body.data.endAuction.buy.buyerId).toEqual(minter?.id)
        expect(res.body.data.endAuction.buyTransactionId).toEqual(res.body.data.endAuction.buy.id)
        expect(res.body.data.endAuction.owner.id).toEqual(minter?.id)
        done()
      })
  })

})