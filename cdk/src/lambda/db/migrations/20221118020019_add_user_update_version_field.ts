import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .table('users', function (table) {
      table.integer('updateVersion').defaultTo(0)
    })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema
    .table('users', function (table) {
      table.dropColumn('updateVersion')
    })
}