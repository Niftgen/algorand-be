import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw('ALTER TABLE assets ALTER COLUMN views SET DEFAULT 0');
}

export async function down(knex: Knex): Promise<void> {
}