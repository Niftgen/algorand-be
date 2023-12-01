import {
  createAccount,
  fundAccount,
  fundAccountWithNFTG,
  getAccount,
  getAssets,
  giveRewards
} from "../src/lambda/services/algorand";
import {Knex} from "knex"
const supertest = require("supertest")
const app = require("../../app")
import {User} from "../src/lambda/db/models/User";
import {setupDb, stopDb} from "./testDB";
import {createUser, findUser, giveUserRewards} from "../src/lambda/helpers/user.helper";
import {ASSETKIND, REWARDTYPE} from "../src/lambda/services/const";
import {Transaction, TRANSACTION_TYPES} from "../src/lambda/db/models/Transaction";
import {Asset} from "../src/lambda/db/models/Asset";
import {createAsset} from "../src/lambda/helpers/asset.helper";
import {Lookup, LOOKUP_CATEGORIES, LOOKUP_SALE_TYPES} from "../src/lambda/db/models/Lookup";
import {findByType} from "../src/lambda/helpers/lookup.helper";
import {decodeJwt} from "../src/lambda/services/auth";
import {userFragment} from "./graphql_fragments";

describe('Rewards Tests',() => {
  let db: Knex
  const request = supertest(app)
  let account: any
  let fixed: any
  let categories: any

  beforeAll(async () => {
    db = await setupDb()
    jest.setTimeout(150000)
    account = getAccount("someone city kiss expose left elbow drive approve news dust document harsh seed chaos cousin quick umbrella rich iron female deliver weather catalog ability disorder")
    fixed = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Fixed Price'
      }).first()
    categories = await findByType(LOOKUP_CATEGORIES)
  })

  afterAll(async () => {
    await stopDb()
  })

  /*
  test("Reward account 2 NIFTGEN tokens", async (done: any) => {
    await User.query().delete()
    let res
    //const account = createAccount()
    //console.log('createAccount account: ', account)
    //const account = getAccount("someone city kiss expose left elbow drive approve news dust document harsh seed chaos cousin quick umbrella rich iron female deliver weather catalog ability disorder")
    //console.log('getAccount account: ', account)
    //let res = await fundAccount(account.addr, 1)
    //res = await fundAccountWithNFTG(account, 10)
    let assets = await getAssets(account)
    console.log({assets})
    console.log("Start giveRewards")
    const user = await createUser({
      avatarPath: "test avatar",
      dateOfBirth: '1963-01-27',
      email: 'test@isp.com',
      userName: 'test',
      walletAddress: account.addr
    })
    if (user) {
      console.log("user?.walletAddress: ", user?.walletAddress)
      let res = await giveRewards(user?.walletAddress, 1000000)
      console.log("giveRewards res: ", res)
    }
    assets = await getAssets(account)
    console.log({assets})
    done()
  })
  */

  test("Give a reward token when a creator adds a video", async (done: any) => {
    await User.query().delete()
    await Asset.query().delete()
    const user: any = await createUser({
      avatarPath: "test avatar",
      dateOfBirth: '1963-01-27',
      email: 'test@isp.com',
      userName: 'test',
      walletAddress: process.env.TEST_WALLET_ADDRESS,
      kyc: true
    })
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            addAsset(
              ownerAddress: "${user?.walletAddress}",
              name: "minter test2",
              filePath: "/CHIK3AEDSYPCHTUGVYZMBT3FT3L3LFWJVQKP6NWXJDXU5OY3A55LKSWDPY/5d6e082d-4995-400e-97de-5b05e842d09d.qt",
              description: "Test minter2",
              categories: [${categories[0].id},${categories[1].id}],
              duration: 123,
              metadata: {walletAddress: "CHIK3AEDSYPCHTUGVYZMBT3FT3L3LFWJVQKP6NWXJDXU5OY3A55LKSWDPY"} ,
              kind: NFT_VIDEO                   
            ) { 
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
              owner {
                ...user
              }
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
        expect(res.body.data.addAsset.owner.walletAddress).toEqual(user?.walletAddress)
        expect(res.body.data.addAsset.name).toEqual('minter test2')
        expect(res.body.data.addAsset.filePath).toEqual('/CHIK3AEDSYPCHTUGVYZMBT3FT3L3LFWJVQKP6NWXJDXU5OY3A55LKSWDPY/5d6e082d-4995-400e-97de-5b05e842d09d.qt')
        expect(res.body.data.addAsset.kind).toEqual(ASSETKIND.NFT_VIDEO)
        expect(res.body.data.addAsset.duration).toEqual(123)
        expect(res.body.data.addAsset.metadata).toEqual({walletAddress: "CHIK3AEDSYPCHTUGVYZMBT3FT3L3LFWJVQKP6NWXJDXU5OY3A55LKSWDPY"} )
        const rateUser = await findUser(user?.walletAddress || '')
        if (rateUser) {
          expect(rateUser.walletAddress).toEqual(user?.walletAddress)
          expect(rateUser.rewards.length).toEqual(1)
          expect(rateUser.rewards[0].type).toEqual(TRANSACTION_TYPES.REWARD)
          expect(rateUser.rewards[0].amount).toEqual(1)
          expect(rateUser.rewards[0].rewardType).toEqual(REWARDTYPE.CONTENT)
        }
        done()
      })
  })

  test("Give a reward token when a user adds a comment", async (done: any) => {
    await User.query().delete()
    await Asset.query().delete()
    const user: any = await createUser({
      avatarPath: "test avatar",
      dateOfBirth: '1963-01-27',
      email: 'test@isp.com',
      userName: 'test',
      walletAddress: process.env.TEST_WALLET_ADDRESS
    })
    const user2: any = await createUser({
      avatarPath: "test avatar",
      dateOfBirth: '1963-01-27',
      email: 'test@isp.com',
      userName: 'test',
      walletAddress: account.addr
    })
    let asset: any
    if (user2) {
      asset = await createAsset(
        {
          name: "Owner NFT",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[0].id, categories[3].id],
          kind: ASSETKIND.NFT_IMAGE,
          views: 1
        }, user2)
    }
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
              id
              content
              messageRead
              createdAt
              updatedAt
              owner {
                ...user
              }
              asset{
                id
                name
              }
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
        const rateUser = await findUser(user?.walletAddress || '')
        if (rateUser) {
          expect(rateUser.walletAddress).toEqual(user?.walletAddress)
          expect(rateUser.rewards.length).toEqual(1)
          expect(rateUser.rewards[0].type).toEqual(TRANSACTION_TYPES.REWARD)
          expect(rateUser.rewards[0].amount).toEqual(1)
          expect(rateUser.rewards[0].rewardType).toEqual(REWARDTYPE.COMMENT)
        }
        done()
      })
  })

  test("Give a reward token when a user adds a rating", async (done: any) => {
    await User.query().delete()
    await Asset.query().delete()
    const user: any = await createUser({
      avatarPath: "test avatar",
      dateOfBirth: '1963-01-27',
      email: 'test@isp.com',
      userName: 'test',
      walletAddress: process.env.TEST_WALLET_ADDRESS
    })
    const user2: any = await createUser({
      avatarPath: "test avatar",
      dateOfBirth: '1963-01-27',
      email: 'test@isp.com',
      userName: 'test',
      walletAddress: account.addr,
      kyc: true
    })
    let asset: any
    if (user2) {
      asset = await createAsset(
        {
          name: "Owner NFT",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[0].id, categories[3].id],
          kind: ASSETKIND.NFT_IMAGE,
          views: 1
        }, user2)
    }
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            addRating(walletAddress: "${user?.walletAddress}", assetId: ${asset?.id}, rating: 4) {
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
        expect(res.body.data.addRating.asset.id).toEqual(asset?.id)
        expect(res.body.data.addRating.asset.name).toEqual(asset?.name)
        expect(res.body.data.addRating.asset.ratingTotals.averageRating).toEqual(4)
        expect(res.body.data.addRating.asset.ratingTotals.ratingCount).toEqual(1)
        expect(res.body.data.addRating.rating).toEqual(4)
        let rateUser = await findUser(user?.walletAddress || '')
        if (rateUser) {
          expect(rateUser.walletAddress).toEqual(user?.walletAddress)
          expect(rateUser.rewards.length).toEqual(1)
          expect(rateUser.rewards[0].type).toEqual(TRANSACTION_TYPES.REWARD)
          expect(rateUser.rewards[0].amount).toEqual(1)
          expect(rateUser.rewards[0].rewardType).toEqual(REWARDTYPE.RATING)
        }
        rateUser = await findUser(account.addr || '')
        if (rateUser) {
          expect(rateUser.walletAddress).toEqual(account.addr)
          expect(rateUser.rewards.length).toEqual(1)
          expect(rateUser.rewards[0].type).toEqual(TRANSACTION_TYPES.REWARD)
          expect(rateUser.rewards[0].amount).toEqual(1)
          expect(rateUser.rewards[0].rewardType).toEqual(REWARDTYPE.RATING)
        }
        done()
      })
  })

  test("Give a reward token when a user login", async (done: any) => {
    await User.query().delete()
    process.env.USE_CREATOR_WHITELIST = "false"
    process.env.USE_WHITELIST = "false"
    const user = await createUser({
      avatarPath: "test avatar",
      dateOfBirth: '1963-01-27',
      email: 'test@isp.com',
      userName: 'test',
      walletAddress: account.addr
    })
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            authenticate(walletAddress: "${account.addr}"){
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
            expect(decodedJwt.walletAddress).toEqual(account.addr)
            const user = await findUser(account.addr || '')
            if (user) {
              expect(user.walletAddress).toEqual(account.addr)
              expect(user.rewards.length).toEqual(1)
              expect(user.rewards[0].type).toEqual(TRANSACTION_TYPES.REWARD)
              expect(user.rewards[0].amount).toEqual(1)
              expect(user.rewards[0].rewardType).toEqual(REWARDTYPE.LOGIN)
            }
            done()
          })
      })
  })

  test("giveUserRewards should not give a reward for a COMMENT on an asset if another comment was made in past 24 hours", async (done: any) => {
    await User.query().delete()
    await Asset.query().delete()
    const user = await createUser({
      avatarPath: "test avatar",
      dateOfBirth: '1963-01-27',
      email: 'test@isp.com',
      userName: 'test',
      walletAddress: account.addr
    })
    if (user) {
      const asset = await createAsset(
        {
          name: "Owner NFT",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[0].id, categories[3].id],
          kind: ASSETKIND.NFT_IMAGE,
          views: 1
        }, user)
      if (asset) {
        let transaction: any = {
          type: TRANSACTION_TYPES.REWARD,
          userId: user.id,
          txIds: JSON.stringify('txid'),
          amount: 1,
          rewardType: REWARDTYPE.COMMENT,
          assetId: asset.id
        }
        await Transaction.query().insertAndFetch(transaction)
        await giveUserRewards(user.walletAddress, REWARDTYPE.COMMENT, 1, asset.id)
        const updatedUser = await findUser(user.walletAddress)
        if (updatedUser) {
          expect(updatedUser.walletAddress).toEqual(user.walletAddress)
          expect(updatedUser.rewards.length).toEqual(1)
        }
      }
    }
    done()
  })

  test("giveUserRewards should give 1 reward for a COMMENT on an asset", async (done: any) => {
    await User.query().delete()
    await Asset.query().delete()
    const user = await createUser({
      avatarPath: "test avatar",
      dateOfBirth: '1963-01-27',
      email: 'test@isp.com',
      userName: 'test',
      walletAddress: account.addr
    })
    const fixed = await Lookup.query()
      .where({
        type: LOOKUP_SALE_TYPES,
        description: 'Fixed Price'
      }).first()
    const categories = await findByType(LOOKUP_CATEGORIES)
    if (user) {
      const asset = await createAsset(
        {
          name: "Owner NFT",
          description: "NFT only added",
          ipfsPath: process.env.IPFS_TEST_FILE,
          categories: [categories[0].id, categories[3].id],
          kind: ASSETKIND.NFT_IMAGE,
          views: 1
        }, user)
      if (asset) {
        await giveUserRewards(user.walletAddress, REWARDTYPE.COMMENT, 1, asset.id)
        const updatedUser = await findUser(user.walletAddress)
        if (updatedUser) {
          expect(updatedUser.walletAddress).toEqual(user.walletAddress)
          expect(updatedUser.rewards.length).toEqual(1)
          expect(updatedUser.rewards[0].type).toEqual(TRANSACTION_TYPES.REWARD)
          expect(updatedUser.rewards[0].assetId).toEqual(asset.id)
          expect(updatedUser.rewards[0].amount).toEqual(1)
          expect(updatedUser.rewards[0].rewardType).toEqual(REWARDTYPE.COMMENT)
        }
      }
    }
    done()
  })

  test("giveUserRewards should give another reward if user has received 20 rewards more than 24 hours ago", async (done: any) => {
    await User.query().delete()
    const user = await createUser({
      avatarPath: "test avatar",
      dateOfBirth: '1963-01-27',
      email: 'test@isp.com',
      userName: 'test',
      walletAddress: account.addr
    })
    if (user) {
      let d = new Date()
      d.setDate(d.getDate() - 2)
      let transaction: any = {
        type: TRANSACTION_TYPES.REWARD,
        userId: user.id,
        txIds: JSON.stringify('txid'),
        amount: 30,
        rewardType: REWARDTYPE.LOGIN,
        updatedAt: d
      }
      await Transaction.query().insertAndFetch(transaction)
      const transactionRecord: any = await giveUserRewards(user.walletAddress, REWARDTYPE.LOGIN)
      const updatedUser = await findUser(user.walletAddress)
      if (updatedUser && transactionRecord) {
        expect(updatedUser.walletAddress).toEqual(user.walletAddress)
        expect(updatedUser.rewards.length).toEqual(2)
        expect(transactionRecord.type).toEqual(TRANSACTION_TYPES.REWARD)
        expect(transactionRecord.assetId).toBeNull()
        expect(transactionRecord.amount).toEqual(1)
        expect(transactionRecord.rewardType).toEqual(REWARDTYPE.LOGIN)
      }
    }
    done()
  })

  test("giveUserRewards should give a reward if user login more than 24 hours ago", async (done: any) => {
    await User.query().delete()
    const user = await createUser({
      avatarPath: "test avatar",
      dateOfBirth: '1963-01-27',
      email: 'test@isp.com',
      userName: 'test',
      walletAddress: account.addr
    })
    if (user) {
      let d = new Date()
      d.setDate(d.getDate() - 2)
      let transaction: any = {
        type: TRANSACTION_TYPES.REWARD,
        userId: user.id,
        txIds: JSON.stringify('txid'),
        amount: 1,
        rewardType: REWARDTYPE.LOGIN,
        updatedAt: d
      }
      await Transaction.query().insertAndFetch(transaction)
      const transactionRecord: any = await giveUserRewards(user.walletAddress, REWARDTYPE.LOGIN)
      const updatedUser = await findUser(user.walletAddress)
      if (updatedUser && transactionRecord) {
        expect(updatedUser.walletAddress).toEqual(user.walletAddress)
        expect(updatedUser.rewards.length).toEqual(2)
        expect(transactionRecord.type).toEqual(TRANSACTION_TYPES.REWARD)
        expect(transactionRecord.assetId).toBeNull()
        expect(transactionRecord.amount).toEqual(1)
        expect(transactionRecord.rewardType).toEqual(REWARDTYPE.LOGIN)
      }
    }
    done()
  })

  test("giveUserRewards should not give another reward if user has received 20 rewards for past 24 hours", async (done: any) => {
    await User.query().delete()
    const user = await createUser({
      avatarPath: "test avatar",
      dateOfBirth: '1963-01-27',
      email: 'test@isp.com',
      userName: 'test',
      walletAddress: account.addr
    })
    if (user) {
      let transaction: any = {
        type: TRANSACTION_TYPES.REWARD,
        userId: user.id,
        txIds: JSON.stringify('txid'),
        amount: 20,
        rewardType: REWARDTYPE.LOGIN
      }
      await Transaction.query().insertAndFetch(transaction)
      const res = await giveUserRewards(user.walletAddress, REWARDTYPE.LOGIN)
      const updatedUser = await findUser(user.walletAddress)
      if (updatedUser) {
        expect(updatedUser.walletAddress).toEqual(user.walletAddress)
        expect(updatedUser.rewards.length).toEqual(1)
        expect(res).toBeUndefined()
      }
    }
    done()
  })

  test("giveUserRewards should not give another reward if user already login during past 24 hours", async (done: any) => {
    await User.query().delete()
    const user = await createUser({
      avatarPath: "test avatar",
      dateOfBirth: '1963-01-27',
      email: 'test@isp.com',
      userName: 'test',
      walletAddress: account.addr
    })
    if (user) {
      let transaction: any = {
        type: TRANSACTION_TYPES.REWARD,
        userId: user.id,
        txIds: JSON.stringify('txid'),
        amount: 1,
        rewardType: REWARDTYPE.LOGIN
      }
      await Transaction.query().insertAndFetch(transaction)
      const res = await giveUserRewards(user.walletAddress, REWARDTYPE.LOGIN)
      const updatedUser = await findUser(user.walletAddress)
      if (updatedUser) {
        expect(updatedUser.walletAddress).toEqual(user.walletAddress)
        expect(updatedUser.rewards.length).toEqual(1)
        expect(res).toBeUndefined()
      }
    }
    done()
  })

  test("giveUserRewards should give 2 rewards for type LOGIN AND user has logged in for past 7 days", async (done: any) => {
    await User.query().delete()
    const user = await createUser({
      avatarPath: "test avatar",
      dateOfBirth: '1963-01-27',
      email: 'test@isp.com',
      userName: 'test',
      walletAddress: account.addr
    })
    if (user) {
      let d = new Date()
      d.setDate(d.getDate() - 1)
      let transaction: any = {
        type: TRANSACTION_TYPES.REWARD,
        userId: user.id,
        txIds: JSON.stringify('txid'),
        amount: 1,
        rewardType: REWARDTYPE.LOGIN,
        updatedAt: d
      }
      await Transaction.query().insertAndFetch(transaction)
      d = new Date()
      d.setDate(d.getDate() - 2)
      transaction.updatedAt = d
      await Transaction.query().insertAndFetch(transaction)
      d = new Date()
      d.setDate(d.getDate() - 3)
      transaction.updatedAt = d
      await Transaction.query().insertAndFetch(transaction)
      d = new Date()
      d.setDate(d.getDate() - 4)
      transaction.updatedAt = d
      await Transaction.query().insertAndFetch(transaction)
      d = new Date()
      d.setDate(d.getDate() - 5)
      transaction.updatedAt = d
      await Transaction.query().insertAndFetch(transaction)
      d = new Date()
      d.setDate(d.getDate() - 6)
      transaction.updatedAt = d
      await Transaction.query().insertAndFetch(transaction)
      const transactionRecord: any = await giveUserRewards(user.walletAddress, REWARDTYPE.LOGIN)
      const updatedUser = await findUser(user.walletAddress)
      if (updatedUser && transactionRecord) {
        expect(updatedUser.walletAddress).toEqual(user.walletAddress)
        expect(updatedUser.rewards.length).toEqual(7)
        expect(transactionRecord.type).toEqual(TRANSACTION_TYPES.REWARD)
        expect(transactionRecord.assetId).toBeNull()
        expect(transactionRecord.amount).toEqual(2)
        expect(transactionRecord.rewardType).toEqual(REWARDTYPE.LOGIN)
      }
    }
    done()
  })

  test("giveUserRewards should give 1 reward for type LOGIN", async (done: any) => {
    await User.query().delete()
    const user = await createUser({
      avatarPath: "test avatar",
      dateOfBirth: '1963-01-27',
      email: 'test@isp.com',
      userName: 'test',
      walletAddress: account.addr
    })
    if (user) {
      await giveUserRewards(user.walletAddress, REWARDTYPE.LOGIN)
      const updatedUser = await findUser(user.walletAddress)
      if (updatedUser) {
        expect(updatedUser.walletAddress).toEqual(user.walletAddress)
        expect(updatedUser.rewards.length).toEqual(1)
        expect(updatedUser.rewards[0].type).toEqual(TRANSACTION_TYPES.REWARD)
        expect(updatedUser.rewards[0].assetId).toBeNull()
        expect(updatedUser.rewards[0].amount).toEqual(1)
        expect(updatedUser.rewards[0].rewardType).toEqual(REWARDTYPE.LOGIN)
      }
    }
    done()
  })

})