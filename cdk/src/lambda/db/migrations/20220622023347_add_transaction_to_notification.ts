import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .table('notifications', function (table) {
      table.integer('transactionId').references('id').inTable('transactions').onDelete('CASCADE')
    })
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema
    .table('notifications', function (table) {
      table.dropColumn('transactionId')
    })
}

