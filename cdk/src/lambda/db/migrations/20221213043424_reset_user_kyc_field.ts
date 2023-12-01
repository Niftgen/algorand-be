import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.raw('UPDATE users SET kyc=FALSE, kyc_date=NULL, kyc_token=NULL');
}


export async function down(knex: Knex): Promise<void> {
}

