import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .table('users', function (table) {
      table.integer('creatorAppTransactionId').references('id').inTable('transactions').onDelete('CASCADE')
    })
  await knex.schema
    .table('transactions', function (table) {
      table.string('txn')
    })
  await knex.raw('alter table transactions alter column asset_id drop not null;');
  await knex.schema
    .table('users', function (table) {
      table.dropColumn('metadata')
    })
  await knex.schema
    .table('assets', function (table) {
      table.dropColumn('metadata')
    })
  await knex.schema
    .table('users', function (table) {
      table.json('metadata')
    })
  await knex.schema
    .table('assets', function (table) {
      table.json('metadata')
    })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema
    .table('users', function (table) {
      table.dropColumn('creatorAppTransactionId')
    })
  await knex.schema
    .table('transactions', function (table) {
      table.dropColumn('txn')
    })
}

