// Do not delete as this file is used to do migrations in
// cdk directory from be directory
import { knexSnakeCaseMappers } from 'objection'

module.exports = {
  development: {
    client: 'pg',
    connection: {
      database: 'niftgen_dev',
      user: 'niftgen',
      password: 'test_db_password',
    },
    pool: {min: 2, max: 10},
    migrations: {
      directory: './migrations',
      tableName: "knex_migrations",
      loadExtensions: ['.js'],
    },
    seeds: {
      directory: './seeds',
      loadExtensions: ['.js'],
    },
    ...knexSnakeCaseMappers(),
  }
}