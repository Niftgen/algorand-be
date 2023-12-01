import { Knex } from "knex";
import CreateTableBuilder = Knex.CreateTableBuilder;

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable('users', function (table: CreateTableBuilder) {
      table.increments()
      table.string('avatarPath')
      table.date('dateOfBirth')
      table.string('email').notNullable()
      table.string('userName').notNullable()
      table.string('walletAddress').notNullable().unique()
      table.timestamps(true, true)
    })
    .createTable('auth', function (table: CreateTableBuilder) {
      table.increments()
      table.datetime('expiry').notNullable()
      table.boolean('verified').notNullable().defaultTo(false)
      table.string('walletAddress').notNullable()
      table.timestamps(true, true)
    })
    .createTable('lookups', function (table: CreateTableBuilder) {
      table.increments()
      table.boolean('active').notNullable().defaultTo(true)
      table.string('description').notNullable()
      table.string('type').notNullable()
      table.unique(['description', 'type']);
      table.timestamps(true, true)
    })
    .createTable('userLookups', function (table: CreateTableBuilder) {
      table.increments()
      table.integer('userId').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.integer('lookupId').notNullable().references('id').inTable('lookups').onDelete('CASCADE')
      table.timestamps(true, true)
    })
    .createTable('assets', function (table: CreateTableBuilder) {
      table.increments()
      table.string('name').notNullable()
      table.string('description')
      table.integer('asaId')
      table.string('ipfsPath')
      table.string('txId')
      table.string('listingTxId')
      table.string('buyTxId')
      table.integer('price')
      table.string('currency')
      table.integer('sellType').references('id').inTable('lookups').onDelete('CASCADE')
      table.integer('minterId').references('id').inTable('users').onDelete('CASCADE')
      table.integer('userId').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.timestamps(true, true)
    })
    .createTable('assetLookups', function (table: CreateTableBuilder) {
      table.increments()
      table.integer('assetId').notNullable().references('id').inTable('assets').onDelete('CASCADE')
      table.integer('lookupId').notNullable().references('id').inTable('lookups').onDelete('CASCADE')
      table.timestamps(true, true)
    })
    .createTable('ratings', function (table: CreateTableBuilder) {
      table.increments()
      table.integer('rating')
      table.integer('assetId').notNullable().references('id').inTable('assets').onDelete('CASCADE')
      table.integer('userId').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.timestamps(true, true)
    })
    .createTable('comments', function (table: CreateTableBuilder) {
      table.increments()
      table.text('content').notNullable()
      table.datetime('messageRead')
      table.integer('messageType').notNullable()
      table.integer('assetId').references('id').inTable('assets').onDelete('CASCADE')
      table.integer('userId').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.integer('addresseeId').references('id').inTable('users').onDelete('CASCADE')
      table.timestamps(true, true)
    })
  // Add lookups
  return await knex("lookups").insert([
    {description: "Auction",      type: "SaleTypes"},
    {description: "Fixed Price",  type: "SaleTypes"},
    {description: "COLLECTOR",    type: "UserTypes"},
    {description: "CREATOR",      type: "UserTypes"},
    {description: "ART",          type: "Categories"},
    {description: "MUSIC",        type: "Categories"},
    {description: "COLLECTIBLES", type: "Categories"},
    {description: "TRADING CARDS",type: "Categories"},
    {description: "OTHER",        type: "Categories"}
  ])
}

export async function down(knex: Knex): Promise<void> {
  return await knex.schema
    .dropTableIfExists('ratings')
    .dropTableIfExists('comments')
    .dropTableIfExists('assetLookups')
    .dropTableIfExists('userLookups')
    .dropTableIfExists('assets')
    .dropTableIfExists('users')
    .dropTableIfExists('auth')
    .dropTableIfExists('lookups')
}

