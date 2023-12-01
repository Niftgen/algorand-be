import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .table('assets', function (table) {
      table.string('cover')
      table.string('kind').notNullable().defaultTo('NFT_IMAGE')
    })
  // Update current records
  await knex("assets")
    .update({kind: 'NFT_VIDEO'})
    .whereNotNull('filePath')
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema
    .table('assets', function (table) {
      table.dropColumn('cover')
      table.dropColumn('kind')
    })
}

