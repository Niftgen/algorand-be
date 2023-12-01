import { Knex } from "knex";
import {createInitialRecords} from "../../helpers/lookup.helper";

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex("lookups").del();

  // Inserts seed entries
  await createInitialRecords(knex)

}
