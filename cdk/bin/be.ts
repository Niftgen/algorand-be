#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Tags } from 'aws-cdk-lib';
import { BeStack } from '../lib/be-stack';
import { BuildConfig } from '../lib/build-configs'

const app = new cdk.App();

function ensureString(object: { [name: string]: any }, propName: string ): string
{
  if(!object || !object.hasOwnProperty(propName) ) //|| object[propName].trim().length === 0)
    throw new Error(propName +" does not exist or is empty")
  console.log(`env var: ${propName}: ${object[propName]}`)
  return object[propName]
}

const getConfig = () => {
  let env = app.node.tryGetContext('config')
  if (!env)
    throw new Error("Context variable missing on CDK command. Pass in as `-c config=XXX`")

  let unparsedEnv = app.node.tryGetContext(env)

  let buildConfig: BuildConfig = {
    AWSAccountID: ensureString(unparsedEnv, 'AWSAccountID'),
    AWSProfileName: ensureString(unparsedEnv, 'AWSProfileName'),
    AWSProfileRegion: ensureString(unparsedEnv, 'AWSProfileRegion'),

    App: ensureString(unparsedEnv, 'App'),
    Version: ensureString(unparsedEnv, 'Version'),
    Environment: ensureString(unparsedEnv, 'Environment'),
    Build: ensureString(unparsedEnv, 'Build'),

    Parameters: {
      ALGOD_URI:  ensureString(unparsedEnv.Parameters, 'ALGOD_URI'),
      ALGO_INDEXER_URI:  ensureString(unparsedEnv.Parameters, 'ALGO_INDEXER_URI'),
      ALGO_API_TOKEN:  ensureString(unparsedEnv.Parameters, 'ALGO_API_TOKEN'),
      ALGOD_PORT:  ensureString(unparsedEnv.Parameters, 'ALGOD_PORT'),
      PLATFORM_ADDRESS:  ensureString(unparsedEnv.Parameters, 'PLATFORM_ADDRESS'),
      JWT_SECRET:  ensureString(unparsedEnv.Parameters, 'JWT_SECRET'),
      USE_WHITELIST:  ensureString(unparsedEnv.Parameters, 'USE_WHITELIST'),
      USE_CREATOR_WHITELIST:  ensureString(unparsedEnv.Parameters, 'USE_CREATOR_WHITELIST'),
      TXNAPISTACK_URI:  ensureString(unparsedEnv.Parameters, 'TXNAPISTACK_URI'),
      PINATA_API_KEY:  ensureString(unparsedEnv.Parameters, 'PINATA_API_KEY'),
      PINATA_API_SECRET:  ensureString(unparsedEnv.Parameters, 'PINATA_API_SECRET'),
      PINATA_API_URI:  ensureString(unparsedEnv.Parameters, 'PINATA_API_URI'),
      IPFS_URI:  ensureString(unparsedEnv.Parameters, 'IPFS_URI'),
      IPFS_UID:  ensureString(unparsedEnv.Parameters, 'IPFS_UID'),
      IPFS_PWD:  ensureString(unparsedEnv.Parameters, 'IPFS_PWD'),
      MIXPANEL_TOKEN:  ensureString(unparsedEnv.Parameters, 'MIXPANEL_TOKEN'),
      ADMIN_ID:  ensureString(unparsedEnv.Parameters, 'ADMIN_ID'),
      REWARD_MODULE_ID:  ensureString(unparsedEnv.Parameters, 'REWARD_MODULE_ID'),
      SUBSCRIPTION_MODULE_ID:  ensureString(unparsedEnv.Parameters, 'SUBSCRIPTION_MODULE_ID'),
      NIFTGEN_ADDRESS:  ensureString(unparsedEnv.Parameters, 'NIFTGEN_ADDRESS'),
      NIFTGEN_ASSET_ID:  ensureString(unparsedEnv.Parameters, 'NIFTGEN_ASSET_ID')
    }
  }

  return buildConfig
}

const Main = async () => {
  const buildConfig: BuildConfig = getConfig()
  console.log("Using buildConfig: ", buildConfig)

  Tags.of(app).add('App', buildConfig.App)
  Tags.of(app).add('Environment', buildConfig.Environment)

  const mainStackName = buildConfig.App + buildConfig.Environment.charAt(0).toUpperCase() + buildConfig.Environment.slice(1)
  console.log("Building app: ", mainStackName)
  const mainStack = new BeStack(app, mainStackName,
    {
      env:
        {
          region: buildConfig.AWSProfileRegion,
          account: buildConfig.AWSAccountID
        }
    }, buildConfig)
}

Main()