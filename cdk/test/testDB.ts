import {connectDb} from "../src/lambda/db/db";
import {Knex} from "knex";

export const setupDb = async () => {
  const db = await connectDb()
  await unlock(db)
  await db.migrate.rollback()
  await db.migrate.latest()
  //await db.seed.run()
  return db
}

export const stopDb = async () => {
  const db = await connectDb()
  await db.destroy()
}

const unlock =  async (db: Knex) => {
  await db.schema.hasTable("knex_migrations_lock").then(async (exists: boolean) => {
    if (exists) {
      await db("knex_migrations_lock")
        .update("is_locked", '0');
    }
  });
}