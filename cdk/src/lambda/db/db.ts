import knex, {Knex} from 'knex'
import { knexSnakeCaseMappers } from 'objection'
import {Model} from 'objection'
import { types } from 'pg'

// Dates were being treated as date/times override to treat them as dates
// https://github.com/knex/knex/issues/3071
const parseDate = (value: any) => value;
types.setTypeParser(types.builtins.DATE, parseDate)

export const dbConfig = async () => {
  let config: any
  const environment = process.env.NODE_ENV || 'development'
  if (environment == 'staging' || environment == 'production' || environment == 'mainnet') {
    const {SecretsManager} = require('aws-sdk')
    const sm = new SecretsManager()
    // SECRET_ARN env variable set in lamba env vars
    console.log("dbConfig -> SECRET_ARN: ", process.env.SECRET_ARN)
    const dbURL = await sm.getSecretValue({
      SecretId: process.env.SECRET_ARN || '',
    }).promise()
    const secretString = JSON.parse(dbURL.SecretString || '{}')
    console.log("dbConfig -> secretString: ", secretString)
    const connectionDetails = `postgresql://${secretString.username}:${secretString.password}@${secretString.host}:${secretString.port}/${secretString.dbname}?connection_limit=1`
    console.log("dbConfig -> connectionDetails: ", connectionDetails)
    config = {
      debug: (environment == 'staging'),
      client: 'pg',
      pool: { min: 1, max: 1 },
      connection: connectionDetails,
      migrations: {
        directory: './db/migrations',
        tableName: "knex_migrations",
        loadExtensions: ['.js'],
      },
      seeds: {
        directory: './db/seeds',
        loadExtensions: ['.js'],
      },
      ...knexSnakeCaseMappers(),
    }
  } else if (environment == 'development') {
    config = {
      debug: true,
      client: 'pg',
      pool: { min: 2, max: 10 },
      connection: process.env.DEV_DATABASE_URL,
      migrations: {
        directory: './cdk/src/lambda/db/migrations',
        tableName: "knex_migrations",
        loadExtensions: ['.js'],
      },
      seeds: {
        directory: './cdk/src/lambda/db/seeds',
        loadExtensions: ['.js'],
      },
      ...knexSnakeCaseMappers(),
    }
  } else if (environment == 'test') {
    config = {
      client: 'pg',
      pool: { min: 2, max: 10 },
      connection: process.env.TEST_DATABASE_URL,
      migrations: {
        directory: './src/lambda/db/migrations',
        tableName: "knex_migrations",
        loadExtensions: ['.js'],
      },
      seeds: {
        directory: './src/lambda/db/seeds',
        loadExtensions: ['.js'],
      },
      ...knexSnakeCaseMappers(),
    }
  }
  return config
}

let connection:Knex
export const connectDb = async () => {
  //console.log("connectDb -> start connection: ", connection)
  // Return if already connected
  if (connection) {
    return connection
  }
  // Get config details
  const connectionConfig = await dbConfig()
  //console.log("connectDb -> config: ", connectionConfig)
  // Connect to DB
  connection = await knex(connectionConfig)
  // Set connection for all Models
  Model.knex(connection)
  //console.log("connectDb -> checking connection, connection: ", connection)
  //console.log("connectDb -> select 1: ", await connection.raw('SELECT 1'))
  // For now run migration at each startup
  if (process.env.NODE_ENV != 'test') await migrations(connection)
  return connection
}

export const migrations = async (connection: Knex) => {
  console.log("migrations -> start")
  await connection.migrate.latest()
    .then(function () {
      console.log("Migrations complete")
    }).catch((err: any) => {
      console.log("Error running migrations: ", err)
    })
  console.log("migrations -> end")
}
