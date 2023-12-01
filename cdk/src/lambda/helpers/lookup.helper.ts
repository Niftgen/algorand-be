import {Knex} from "knex";
import {Lookup} from "../db/models/Lookup";

export const findByType = async (type: string) => {
  return await Lookup.query()
    .where({ type: type, active: true })
    .orderBy('description', 'asc')
}

export const createLookup = async (lookup: any) => {
  if (!lookup.hasOwnProperty('active')) lookup.active = true
  return await Lookup.query()
    .insert(lookup)
    .returning('*')
  //console.log("query: ", query.toKnexQuery().toQuery())
}

export const updateLookup =  async (lookup: any) => {
  return await Lookup.query()
    .patch({
      description: lookup.description,
      type: lookup.type,
      active: lookup.active
    })
    .where('id', lookup.id)
    .returning('*')
    .first()
}

export const createInitialRecords = async (knex: Knex) => {
  await knex("lookups").insert([
    {description: "Auction",      type: "SaleTypes"},
    {description: "Fixed Price",  type: "SaleTypes"},
    {description: "COLLECTOR",    type: "UserTypes"},
    {description: "CREATOR",      type: "UserTypes"},
    {description: "ART",          type: "Categories"},
    {description: "MUSIC",        type: "Categories"},
    {description: "COLLECTIBLES", type: "Categories"},
    {description: "TRADING CARDS",type: "Categories"},
    {description: "OTHER",        type: "Categories"},
  ])

}