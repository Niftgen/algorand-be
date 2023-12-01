import { Knex } from "knex";
import CreateTableBuilder = Knex.CreateTableBuilder;

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable('optins', function (table: CreateTableBuilder) {
      table.increments()
      table.integer('transactionId').notNullable()
      table.integer('userId').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.integer('assetId').references('id').inTable('assets').onDelete('CASCADE')
      table.timestamps(true, true)
    })
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema
    .dropTableIfExists('optins')
}

