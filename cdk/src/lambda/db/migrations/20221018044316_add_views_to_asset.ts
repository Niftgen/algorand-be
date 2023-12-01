import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .table('assets', function (table) {
      table.integer('views')
      table.string('ipfsPathOld')
    })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema
    .table('assets', function (table) {
      table.dropColumn('views')
      table.dropColumn('ipfsPathOld')
    })
}