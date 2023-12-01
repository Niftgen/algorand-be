import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .table('users', function (table) {
      table.text('metadata')
    })
  await knex.schema
    .table('assets', function (table) {
      table.text('metadata')
      table.integer('duration')
    })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema
    .table('users', function (table) {
      table.dropColumn('metadata')
    })
  await knex.schema
    .table('assets', function (table) {
      table.dropColumn('metadata')
      table.dropColumn('duration')
    })
}