import { Knex } from "knex";
import CreateTableBuilder = Knex.CreateTableBuilder;

export async function up(knex: Knex): Promise<void> {
  // Add Categories
  await knex("lookups").insert([
    {description: "DEFI",                 type: "Categories"},
    {description: "INVESTMENT STRATEGY",  type: "Categories"},
    {description: "MARKET ANALYSIS",      type: "Categories"},
    {description: "NFT",                  type: "Categories"},
    {description: "EDUCATION",            type: "Categories"},
    {description: "ENTERTAINMENT",        type: "Categories"},
    {description: "VLOG",                 type: "Categories"},
    {description: "SPORT",                type: "Categories"}
  ])
  await knex("lookups").update({active: false}).where({description: 'COLLECTIBLES'})
  await knex("lookups").update({active: false}).where({description: 'TRADING CARDS'})
  await knex("lookups").update({active: false}).where({description: 'OTHER'})
}

export async function down(knex: Knex): Promise<void> {
}

