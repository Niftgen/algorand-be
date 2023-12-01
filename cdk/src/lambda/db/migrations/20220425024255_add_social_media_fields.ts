import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .table('users', function (table) {
      table.text('bio')
      table.string('twitterUrl')
      table.string('instagramUrl')
      table.string('discordUrl')
      table.string('facebookUrl')
    })
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema
    .table('users', function (table) {
      table.dropColumn('bio')
      table.dropColumn('twitterUrl')
      table.dropColumn('instagramUrl')
      table.dropColumn('discordUrl')
      table.dropColumn('facebookUrl')
    })
}

