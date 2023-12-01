import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .table('users', function (table) {
      table.boolean('videoCreator').notNullable().defaultTo(false)
      table.string('phone')
      table.boolean('phoneValidated').notNullable().defaultTo(false)
    })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema
    .table('users', function (table) {
      table.dropColumn('videoCreator')
      table.dropColumn('phone')
      table.dropColumn('phoneValidated')
    })
}

