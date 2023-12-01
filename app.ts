import * as path from "path"
import {verifyJwt} from "./cdk/src/lambda/services/auth";
const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { GraphQLUpload, GraphQLJSON, graphqlUploadExpress } = require('graphql-upload')
const { GraphQLDateTime } = require("graphql-iso-date")
const { expressResolvers } = require("./cdk/src/lambda/index");
const { GraphQLFileLoader } = require('@graphql-tools/graphql-file-loader');
const cors = require('cors')
const fs = require('fs')
const bodyParser = require('body-parser');
const { buildSchema } = require('graphql');
const { connectDb } = require("./cdk/src/lambda/db/db")
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const getJwt = (req: any) => {
  let jwt: any | undefined = undefined
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer')
    jwt = req.headers.authorization.split(' ')[1]
  return jwt
}

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(cors({
  origin: function(origin:any, callback:any){
    // allow requests with no origin
    // (like mobile apps or curl requests)
    if(!origin) return callback(null, true);
    if(origin.endsWith('.niftgen.com') ||
      origin.endsWith('.herokuapp.com') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')) {
      return callback(null, true)
    } else {
      var msg = 'The CORS policy for this site does not ' +
        'allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
  }, credentials: true
}))
app.use(bodyParser.json());
const loggingMiddleware = async (req: any, res: any, next: any) => {
  if (process.env.NODE_ENV == "development") await connectDb()
  if (process.env.NODE_ENV == "test") return next()
  if (req.body.hasOwnProperty('query') && req.body.query.includes('authenticate(')){
    console.log("xxx authentication request")
  } else {
    console.log("xxx not authentication request")
    const token = getJwt(req)
    console.log("verifyToken token: ", token)
    if (token) {
      let verified = false
      if (!verified) {
        const verified = await verifyJwt(token)
        console.log("call verifyJwt verified: ", verified)
        if (!verified) {
          console.log("!verified")
          res.status(403)
        } else {
          console.log("verified")
          return next()
        }
      }
    } else {
      console.log("not auth")
      res.status(401)
    }

  }
  next()
}
app.use(loggingMiddleware);
// Scalars
const root = {
  JSON: GraphQLJSON,
  Date: GraphQLDateTime,
}
// Map AWS scalars to graphql types
const scalarTypeMap = {
  'AWSJSON': 'JSON',
  'AWSDate': 'Date',
  'AWSDateTime': 'Date',
  'AWSURL': 'String',
  'AWSEmail': 'String',
}
// Read schema file and replace AWS types with scalar types
let schemaString :string = ''
const data = fs.readFileSync(path.resolve(__dirname) + '/cdk/src/graphql/schema.graphql', {encoding:'utf8', flag:'r'})
schemaString = data.toString()
// Delete subscription section
const pos = schemaString.indexOf("type Subscription")
schemaString = schemaString.substring(0, pos).replace('subscription: Subscription', '')
let regex: RegExp
let scalars: string = ''
Object.entries(scalarTypeMap).forEach(([key, value]) => {
  //console.log("key: ", key)
  //console.log("value: ", value)
  regex = new RegExp(`\\b${key}\\b`, 'gim');
  schemaString = schemaString.replace(regex, `${value}`)
  if (root.hasOwnProperty(value) && !scalars.includes(value)) scalars = scalars + `scalar ${value} \r\n`
})
schemaString = scalars + schemaString
//console.log("schemaString: ", schemaString)
// Construct schema
const schema = buildSchema(schemaString)
app.use(
  '/graphql',
  graphqlUploadExpress({ maxFileSize: 100000000, maxFiles: 10 }),
  graphqlHTTP((req:any) => {
    //console.log("req: ", req)
    return {
      schema: schema,
      rootValue: Object.assign({}, root, expressResolvers()),
      graphiql: true,
      context: {
        jwt: getJwt(req),
        headers: req.headers
      }
    }
  })
)

module.exports = app;