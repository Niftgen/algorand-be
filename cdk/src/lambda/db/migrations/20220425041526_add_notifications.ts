import { Knex } from "knex";
import CreateTableBuilder = Knex.CreateTableBuilder;

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable('notifications', function (table: CreateTableBuilder) {
      table.increments()
      table.string('notificationType').notNullable()
      table.string('notification')
      table.integer('userId').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.integer('originatorId').references('id').inTable('users').onDelete('CASCADE')
      table.integer('assetId').references('id').inTable('assets').onDelete('CASCADE')
      table.integer('commentId').references('id').inTable('comments').onDelete('CASCADE')
      table.integer('ratingId').references('id').inTable('ratings').onDelete('CASCADE')
      table.timestamps(true, true)
    })
  await knex.schema
    .table('transactions', function (table) {
      table.datetime('auctionClosedTime')
    })
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema
    .table('transactions', function (table) {
      table.dropColumn('auctionClosedTime')
    })
  await knex.schema
    .dropTableIfExists('notifications')
}

