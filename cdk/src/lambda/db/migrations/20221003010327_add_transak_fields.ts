import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .table('users', function (table) {
      table.json('kycToken')
      table.boolean('kyc').defaultTo(false)
      table.datetime('kycDate')
    })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema
    .table('users', function (table) {
      table.dropColumn('kycToken')
      table.dropColumn('kyc')
      table.dropColumn('kycDate')
    })
}

