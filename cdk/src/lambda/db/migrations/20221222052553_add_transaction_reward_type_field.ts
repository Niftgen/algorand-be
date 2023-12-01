import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .table('transactions', function (table) {
      table.string('rewardType')
    })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema
    .table('transactions', function (table) {
      table.dropColumn('rewardType')
    })
}