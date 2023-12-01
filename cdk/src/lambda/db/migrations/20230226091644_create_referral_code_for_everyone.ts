import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw("UPDATE users SET referral_code=encode(concat(substring(wallet_address, 1, 3), substring(wallet_address, length(wallet_address)-2, 3), '-', id::text)::bytea, 'base64') WHERE referral_code IS NULL");
}

export async function down(knex: Knex): Promise<void> {
}