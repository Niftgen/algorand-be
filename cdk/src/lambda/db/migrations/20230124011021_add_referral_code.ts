import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .table('users', function (table) {
      table.string('referralCode')
    })
  await knex.raw("UPDATE users SET referral_code=encode(concat(substring(wallet_address, 1, 3), substring(wallet_address, length(wallet_address)-2, 3), '-', id::text)::bytea, 'base64') WHERE kyc=true");
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema
    .table('users', function (table) {
      table.dropColumn('referralCode')
    })
}