import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .table('assets', function (table) {
      table.integer('appTransactionId').references('id').inTable('transactions').onDelete('CASCADE')
    })
  await knex.schema
    .table('transactions', function (table) {
      table.string('appAddress')
    })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema
    .table('assets', function (table) {
      table.dropColumn('appTransactionId')
    })
  await knex.schema
    .table('transactions', function (table) {
      table.dropColumn('appAddress')
    })
}

