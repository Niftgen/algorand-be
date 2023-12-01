import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .table('assets', function (table) {
      table.integer('winBidTransactionId').references('id').inTable('transactions').onDelete('CASCADE')
    })
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema
    .table('assets', function (table) {
      table.dropColumn('winBidTransactionId')
    })
}

