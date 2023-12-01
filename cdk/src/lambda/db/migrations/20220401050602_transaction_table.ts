import { Knex } from "knex"
import CreateTableBuilder = Knex.CreateTableBuilder;

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable('transactions', function (table: CreateTableBuilder) {
      table.increments()
      table.string('type').notNullable()
      table.integer('amount')
      table.string('currency')
      table.integer('appId')
      table.datetime('startTime')
      table.datetime('endTime')
      table.integer('platformFee')
      table.integer('initFee')
      table.integer('royaltyFee')
      table.json('txIds')
      table.integer('auctionId').references('id').inTable('transactions').onDelete('CASCADE')
      table.integer('sellType').references('id').inTable('lookups').onDelete('CASCADE')
      table.integer('buyerId').references('id').inTable('users').onDelete('CASCADE')
      table.integer('userId').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.integer('assetId').notNullable().references('id').inTable('assets').onDelete('CASCADE')
      table.timestamps(true, true)
    })
  await knex.schema
    .table('assets', function (table) {
      table.integer('listTransactionId').references('id').inTable('transactions').onDelete('CASCADE')
      table.integer('mintTransactionId').references('id').inTable('transactions').onDelete('CASCADE')
      table.integer('buyTransactionId').references('id').inTable('transactions').onDelete('CASCADE')
    })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema
    .table('assets', function (table) {
      table.dropColumn('listTransactionId')
      table.dropColumn('mintTransactionId')
      table.dropColumn('buyTransactionId')
    })
  await knex.schema
    .dropTableIfExists('transactions')
}

