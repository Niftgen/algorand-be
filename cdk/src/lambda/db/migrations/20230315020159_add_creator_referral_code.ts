import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .table('users', function (table) {
      table.string('creatorReferralCode')
    })
  await knex.raw("UPDATE users SET creator_referral_code=concat('CR-', encode(concat(id::text, '-', substring(wallet_address, 1, 3), substring(wallet_address, length(wallet_address)-2, 3))::bytea, 'base64')) WHERE creator_referral_code IS NULL");
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema
    .table('users', function (table) {
      table.dropColumn('creatorReferralCode')
    })
}