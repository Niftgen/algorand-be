import {Knex} from "knex"
const supertest = require("supertest")
const app = require("../../app")
import {Lookup, LOOKUP_CATEGORIES} from '../src/lambda/db/models/Lookup'
import {connectDb} from "../src/lambda/db/db";
import {setupDb, stopDb} from "./testDB";
import {createLookup} from "../src/lambda/helpers/lookup.helper";

describe('Lookup Tests',() => {
  let db: Knex
  const request = supertest(app)

  beforeAll(async () => {
    db = await setupDb()
  })

  afterAll(async () => {
    await stopDb()
  })

  test("Get all lookups", async (done: any) => {
    request
      .post("/graphql")
      .send({
        query: "{ getLookups{ id, description, type } }",
      })
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(200)
      .end(function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        expect(res.body.data.getLookups.length).toBeGreaterThanOrEqual(9)
        done()
      })
  })

  test("Get all lookups for a type", async (done: any) => {
    request
      .post("/graphql")
      .send({
        query: `
          query{
            getLookupsForType(type: "UserTypes"){
              id
              description
              type
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
        expect(res.body.data.getLookupsForType.length).toEqual(2)
        expect(res.body.data.getLookupsForType).toEqual(
          expect.arrayContaining([
            expect.objectContaining({description: 'COLLECTOR'}),
            expect.objectContaining({description: 'CREATOR'})
          ])
        )
        done()
      })
  })

  test("Get all active categories", async (done: any) => {
    request
      .post("/graphql")
      .send({
        query: `
          query{
            getCategories{
              id
              description
              type
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
        expect(res.body.data.getCategories.length).toEqual(10)
        expect(res.body.data.getCategories).toEqual(
          expect.arrayContaining([
            expect.objectContaining({description: 'ART'}),
            expect.objectContaining({description: 'MUSIC'}),
            expect.objectContaining({description: 'DEFI'}),
            expect.objectContaining({description: 'INVESTMENT STRATEGY'}),
            expect.objectContaining({description: 'EDUCATION'}),
            expect.objectContaining({description: 'ENTERTAINMENT'}),
            expect.objectContaining({description: 'VLOG'}),
            expect.objectContaining({description: 'SPORT'}),
            expect.objectContaining({description: 'NFT'}),
            expect.objectContaining({description: 'MARKET ANALYSIS'})
          ])
        )
        expect(res.body.data.getCategories).toEqual(
          expect.not.arrayContaining([
            expect.objectContaining({description: 'COLLECTIBLES'}),
            expect.objectContaining({description: 'TRADING CARDS'}),
            expect.objectContaining({description: 'OTHER'})
          ])
        )
        done()
      })
  })

  test("Get all user types", async (done: any) => {
    request
      .post("/graphql")
      .send({
        query: `
          query{
            getUserTypes{
              id
              description
              type
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
        expect(res.body.data.getUserTypes.length).toEqual(2)
        expect(res.body.data.getUserTypes).toEqual(
          expect.arrayContaining([
            expect.objectContaining({description: 'COLLECTOR'}),
            expect.objectContaining({description: 'CREATOR'})
          ])
        )
        done()
      })
  })

  test("Get all sales types", async (done: any) => {
    request
      .post("/graphql")
      .send({
        query: `
          query{
            getSaleTypes{
              id
              description
              type
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
        expect(res.body.data.getSaleTypes.length).toEqual(2)
        expect(JSON.stringify(res.body.data.getSaleTypes[0]).includes('Auction')).toBeTruthy()
        expect(res.body.data.getSaleTypes).toEqual(
          expect.arrayContaining([
            expect.objectContaining({description: 'Auction'}),
            expect.objectContaining({description: 'Fixed Price'})
          ])
        )
        done()
      })
  })

  test("Create new lookup", async (done: any) => {
    request
      .post("/graphql")
      .send({
        query: `
          mutation{
            addLookup(type: "Categories", description: "Lookup Test") {
              id
              active
              description
              type
              createdAt
              updatedAt
            }
          }
        `
      })
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        const lookup = await Lookup.query().findById(res.body.data.addLookup.id)
        expect(JSON.stringify(res.body.data.addLookup)).toEqual(JSON.stringify(lookup))
        expect(res.body.data.addLookup.description).toEqual('Lookup Test')
        expect(res.body.data.addLookup.type).toEqual('Categories')
        done()
      })
  })

  test("Delete existing lookup", async (done: any) => {
    const lookup: Lookup = await createLookup({
      description: 'Test Lookup',
      type: LOOKUP_CATEGORIES
    })
    request
      .post("/graphql")
      .send({
        query: `
            mutation {
              deleteLookup(id: ${lookup instanceof Lookup ? lookup.id : 0})
            }
          `,
      })
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(200)
      .end(async function (err: any, res: any) {
        if (err) return done(err)
        expect(res.body).toBeInstanceOf(Object)
        const record = await Lookup.query().findById(lookup instanceof Lookup ? lookup.id : 0)
        expect(record).toBeUndefined()
        done()
      })
  })

})