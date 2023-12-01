import {getExpiredSubscriptions, getSubscribers} from "../src/lambda/services/algorand";
import {Knex} from "knex";
import {setupDb, stopDb} from "./testDB";
import {User} from "../src/lambda/db/models/User";
import {createUser} from "../src/lambda/helpers/user.helper";
import {sendSubscriptionNotifications} from "../src/lambda/helpers/subscription.helper";
import {userFragment} from "./graphql_fragments";
import {TRANSACTION_TYPES} from "../src/lambda/db/models/Transaction";
import {NOTIFICATION_TYPES} from "../src/lambda/db/models/Notification";
const supertest = require("supertest")
const app = require("../../app")

describe('Subscription Tests',() => {
  let db: Knex
  const request = supertest(app)

  beforeAll(async () => {
    jest.setTimeout(150000)
    db = await setupDb()
  })

  afterAll(async () => {
    await stopDb()
  })

  test("Send notifications if a subscription is about to expire", async (done: any) => {
    done()
    //const [expiredSubscriptions, subscriptions] =
    //  await getExpiredSubscriptions('TWA3NOW4PVPFACDBFQBAM5II76IX7KDW3STDZPVUIHEN6JBBHL6MQFI2Z4', 0)
    //done()

    // *** IF TEST FAILS UPDATE THE WALLET ADDRESSES BELOW TO VALID SUBSCRIPTIONS ****

    /*
    await User.query().delete()
    const creator: any = await createUser({
      avatarPath: "test avatar",
      dateOfBirth: '1963-01-27',
      email: 'testvt@gmail.com',
      userName: 'test',
      walletAddress: process.env.TEST_WALLET_ADDRESS4,
      kyc: true
    })
    const user: any = await createUser({
      avatarPath: "lacey avatar",
      dateOfBirth: '2001-11-02',
      email: 'evt@cascadia.com.au',
      userName: 'lacey',
      walletAddress: 'LNEJJS7DGRYLHWX2BDVB4W5MFVCEYLXJET4JGE7QV2XDVK3H43FQ4KY65A',
      kyc: false
    })
    const user2: any = await createUser({
      avatarPath: "ollie avatar",
      dateOfBirth: '2002-11-02',
      email: 'testvt@gmail.com',
      userName: 'ollie',
      walletAddress: 'LV3URAPNAGQCIK2OFXMOZDZBJTRPHO4ACGSMV2CW6FWJSAD6ADZHJFABQ4',
      kyc: false
    })
    request
      .post("/graphql")
      .send({
        query: `
          mutation {
            addCreatorApp(
              walletAddress: "${creator?.walletAddress}",
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
        expect(res.body.data.addCreatorApp.walletAddress).toEqual(creator?.walletAddress)
        expect(res.body.data.addCreatorApp.creatorAppTransactionId).not.toBeNull()
        expect(res.body.data.addCreatorApp.creatorApp.txIds).toEqual('MHRER4WERJ7SEKJ25XLVQ3Q3RG4LUD4D4SG3JSBAFWUFSEAHTISQ')
        expect(res.body.data.addCreatorApp.creatorApp.type).toEqual(TRANSACTION_TYPES.APP_CREATE)
        expect(res.body.data.addCreatorApp.creatorApp.userId).toEqual(creator?.id)
        expect(res.body.data.addCreatorApp.creatorApp.appId).toEqual(156804583)
        expect(res.body.data.addCreatorApp.creatorApp.txIds).toEqual('MHRER4WERJ7SEKJ25XLVQ3Q3RG4LUD4D4SG3JSBAFWUFSEAHTISQ')
        expect(res.body.data.addCreatorApp.creatorApp.appAddress).toEqual('M5OF2HOKIDQ33PQC3VP2S6MRNMUYDQGTE67WLOM7AIHAQQ4DICUFQKGQKU')
        await sendSubscriptionNotifications()
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
            console.log("res.body: ", JSON.stringify(res.body, undefined, 2))
            expect(res.body.data.getUser.walletAddress).toEqual(user2?.walletAddress)
            expect(res.body.data.getUser.email).toEqual(user2?.email)
            expect(res.body.data.getUser.userName).toEqual(user2?.userName)
            expect(res.body.data.getUser.avatarPath).toEqual(user2?.avatarPath)
            expect(res.body.data.getUser.notifications[0].notificationType).toEqual(NOTIFICATION_TYPES.EXPIRED_SUBSCRIPTION)
            expect(res.body.data.getUser.notifications[0].notification).toEqual(`Your subscription to ${creator.userName} is set to expire soon, please renew to continue to have access to their content`)
            expect(res.body.data.getUser.notifications[0].userId).toEqual(user2?.id)
            expect(res.body.data.getUser.notifications[0].originatorId).toEqual(creator?.id)
            done()
          })
      })

     */

  })

})