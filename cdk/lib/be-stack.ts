import * as path from 'path'
import { Construct,  } from 'constructs'
import {
  aws_ec2 as ec2,
  aws_lambda as lambda,
  aws_lambda_nodejs as lambdaNode,
  aws_rds as rds,
  //aws_cognito as cognito
  aws_iam as iam,
  aws_s3 as s3,
  CfnOutput,
  Duration,
  Expiration,
  Stack,
  StackProps,
} from 'aws-cdk-lib'
// V1 higher level features = Experimental features in V2
// https://docs.aws.amazon.com/cdk/api/v2/docs/aws-appsync-alpha-readme.html?utm_campaign=CDK%20Weekly&utm_medium=email&utm_source=Revue%20newsletter
// https://aws.amazon.com/blogs/developer/experimental-construct-libraries-are-now-available-in-aws-cdk-v2/?utm_campaign=CDK%20Weekly&utm_medium=email&utm_source=Revue%20newsletter
import * as appsync from '@aws-cdk/aws-appsync-alpha'
import { setupResolvers } from '../src/lambda/index'
import { BuildConfig } from './build-configs'
import {LambdaFunction} from "aws-cdk-lib/aws-events-targets";
import {Rule, Schedule} from "aws-cdk-lib/aws-events";
import * as pinpoint from 'aws-cdk-lib/aws-pinpoint';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class BeStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps, buildConfig: BuildConfig) {
    super(scope, id, props)

    const isProd: boolean = buildConfig.Environment === "production";

    function name(name: string): string {
      const resourceName = id + name
      console.log("Resource name: ", resourceName)
      return resourceName
    }

    /*
    * grapghql
    */

    const niftgenApi = new appsync.GraphqlApi(this, name('Api'), {
      name: name('Api'),
      schema: appsync.Schema.fromAsset('src/graphql/schema.graphql'),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
          apiKeyConfig: {
            expires: Expiration.after(Duration.days(365))
          }
        },
      },
    })

    /*
    * API
     */
    const niftgenRestApi = new apigateway.RestApi(this, name('RestApi'), {})

    /*
    * VPC
    */

    // Create the VPC needed for the Aurora Serverless DB cluster
    const vpc = new ec2.Vpc(this, name('Vpc'));

    /*
    * Aurora DB cluster
    */

    const dbName = name('Db')
    const cluster = new rds.ServerlessCluster(this, name("Cluster"), {
      engine: rds.DatabaseClusterEngine.AURORA_POSTGRESQL,
      parameterGroup: rds.ParameterGroup.fromParameterGroupName(
        this,
        'ParameterGroup',
        'default.aurora-postgresql11'),
      defaultDatabaseName: dbName,
      vpc,
      enableDataApi: true,
      //scaling: { autoPause: Duration.minutes(isProd ? 0 : 10) },
      scaling: { autoPause: Duration.minutes( 0) },
      credentials: rds.Credentials.fromGeneratedSecret('serverless'),
    })

    /*
    * Env
    */

    const beEnv = {
      REGION: buildConfig.AWSProfileRegion,
      PLATFORM_ADDRESS: buildConfig.Parameters.PLATFORM_ADDRESS,
      NODE_ENV: buildConfig.Environment,
      ALGOD_URI: buildConfig.Parameters.ALGOD_URI,
      ALGO_INDEXER_URI: buildConfig.Parameters.ALGO_INDEXER_URI,
      ALGO_API_TOKEN: buildConfig.Parameters.ALGO_API_TOKEN,
      ALGOD_PORT: buildConfig.Parameters.ALGOD_PORT,
      ALGOD_AUTH_HEADER: 'X-API-Key',
      JWT_SECRET: buildConfig.Parameters.JWT_SECRET,
      USE_WHITELIST: buildConfig.Parameters.USE_WHITELIST,
      USE_CREATOR_WHITELIST: buildConfig.Parameters.USE_CREATOR_WHITELIST,
      TXNAPISTACK_URI: buildConfig.Parameters.TXNAPISTACK_URI,
      PINATA_API_KEY: buildConfig.Parameters.PINATA_API_KEY,
      PINATA_API_SECRET: buildConfig.Parameters.PINATA_API_SECRET,
      PINATA_API_URI: buildConfig.Parameters.PINATA_API_URI,
      IPFS_URI: buildConfig.Parameters.IPFS_URI,
      IPFS_UID: buildConfig.Parameters.IPFS_UID,
      IPFS_PWD: buildConfig.Parameters.IPFS_PWD,
      MIXPANEL_TOKEN: buildConfig.Parameters.MIXPANEL_TOKEN,
      ADMIN_ID: buildConfig.Parameters.ADMIN_ID,
      REWARD_MODULE_ID: buildConfig.Parameters.REWARD_MODULE_ID,
      SUBSCRIPTION_MODULE_ID: buildConfig.Parameters.SUBSCRIPTION_MODULE_ID,
      NIFTGEN_ADDRESS: buildConfig.Parameters.NIFTGEN_ADDRESS,
      NIFTGEN_ASSET_ID: buildConfig.Parameters.NIFTGEN_ASSET_ID
  }

    /*
    * Security groups
    */

    const graphqlLambdaSg = new ec2.SecurityGroup(this, name('GraphqlLambdaSg'), {
      vpc,
      allowAllOutbound: true,
    })

    /*
    * Lambdas
    */

    // The Lambda function with knex, objection, and pg bundled
    // I manually copy the migration files as they do not get automatically bundled
    const graphqlLambda = new lambdaNode.NodejsFunction(this, name('GraphqlLambda'), {
      vpc,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: path.join(__dirname, `/../src/lambda/index.ts`),
      handler: 'handler',
      timeout: Duration.minutes(5),
      //memorySize: isProd ? 1024 : 128,
      memorySize: 1024,
      securityGroups: [graphqlLambdaSg],
      environment: {
        ...beEnv,
        CLUSTER_ARN: cluster.clusterArn,
        SECRET_ARN: cluster.secret?.secretArn || '',
        GRAPHQL_URI: niftgenApi.graphqlUrl,
        GRAPHQL_API_KEY: niftgenApi.apiKey || '',
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      bundling: {
        minify: isProd,
        nodeModules: ['pg', '@types/pg', 'knex', 'objection', 'jsonwebtoken', 'algosdk', 'aws-sdk', 'axios', 'form-data', 'mixpanel'],
        commandHooks: {
          beforeBundling(_inputDir: string, _outputDir: string) {
            return [
              `pwd`,
              `ls -lt`,
              `ls -lt ${_inputDir}`,
              `ls -lt ${_inputDir}/src/lambda/db/migrations`,
              `mkdir -p ${_outputDir}/db/migrations`,
              `cp -rf ${_inputDir}/src/lambda/db/migrations/*.js ${_outputDir}/db/migrations`,
              `pwd`,
              `ls -lt ${_outputDir}`,
              `ls -lt ${_outputDir}/db/migrations`,
            ]
          },
          beforeInstall(inputDir: string, outputDir: string) {
            return []
          },
          afterBundling(_inputDir: string, outputDir: string) {
            return [
              `pwd`,
              `ls -lt`,
              `cd ${outputDir}`,
              `pwd`,
              `ls -lt`
            ]
          },
        },
      },
      depsLockFilePath: path.join(__dirname, '../yarn.lock'),
    })

    // Scheduled tasks lambda
    const tasksLambda = new lambdaNode.NodejsFunction(this, name('TasksLambda'), {
      vpc,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: path.join(__dirname, `/../src/lambda/index.ts`),
      handler: 'tasks',
      timeout: Duration.minutes(5),
      //memorySize: isProd ? 1024 : 128,
      memorySize: 1024,
      securityGroups: [graphqlLambdaSg],
      environment: {
        ...beEnv,
        CLUSTER_ARN: cluster.clusterArn,
        SECRET_ARN: cluster.secret?.secretArn || '',
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      bundling: {
        minify: isProd,
        nodeModules: ['pg', '@types/pg', 'knex', 'objection', 'jsonwebtoken', 'algosdk', 'aws-sdk', 'axios', 'form-data', 'mixpanel'],
        commandHooks: {
          beforeBundling(_inputDir: string, _outputDir: string) {
            return [
              `pwd`,
              `ls -lt`,
              `ls -lt ${_inputDir}`,
              `ls -lt ${_inputDir}/src/lambda/db/migrations`,
              `mkdir -p ${_outputDir}/db/migrations`,
              `cp -rf ${_inputDir}/src/lambda/db/migrations/*.js ${_outputDir}/db/migrations`,
              `pwd`,
              `ls -lt ${_outputDir}`,
              `ls -lt ${_outputDir}/db/migrations`,
            ]
          },
          beforeInstall(inputDir: string, outputDir: string) {
            return []
          },
          afterBundling(_inputDir: string, outputDir: string) {
            return [
              `pwd`,
              `ls -lt`,
              `cd ${outputDir}`,
              `pwd`,
              `ls -lt`
            ]
          },
        },
      },
      depsLockFilePath: path.join(__dirname, '../yarn.lock'),
    })

    // Scheduled tasks lambda
    const subscriptionNotificationsLambda = new lambdaNode.NodejsFunction(this, name('SubscriptionNotificationsLambda'), {
      vpc,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: path.join(__dirname, `/../src/lambda/index.ts`),
      handler: 'subscriptionNotifications',
      timeout: Duration.minutes(15),
      //memorySize: isProd ? 1024 : 128,
      memorySize: 1024,
      securityGroups: [graphqlLambdaSg],
      environment: {
        ...beEnv,
        CLUSTER_ARN: cluster.clusterArn,
        SECRET_ARN: cluster.secret?.secretArn || '',
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      bundling: {
        minify: isProd,
        nodeModules: ['pg', '@types/pg', 'knex', 'objection', 'jsonwebtoken', 'algosdk', 'aws-sdk', 'axios', 'form-data', 'mixpanel'],
        commandHooks: {
          beforeBundling(_inputDir: string, _outputDir: string) {
            return [
              `pwd`,
              `ls -lt`,
              `ls -lt ${_inputDir}`,
              `ls -lt ${_inputDir}/src/lambda/db/migrations`,
              `mkdir -p ${_outputDir}/db/migrations`,
              `cp -rf ${_inputDir}/src/lambda/db/migrations/*.js ${_outputDir}/db/migrations`,
              `pwd`,
              `ls -lt ${_outputDir}`,
              `ls -lt ${_outputDir}/db/migrations`,
            ]
          },
          beforeInstall(inputDir: string, outputDir: string) {
            return []
          },
          afterBundling(_inputDir: string, outputDir: string) {
            return [
              `pwd`,
              `ls -lt`,
              `cd ${outputDir}`,
              `pwd`,
              `ls -lt`
            ]
          },
        },
      },
      depsLockFilePath: path.join(__dirname, '../yarn.lock'),
    })

    /*
    const transakLambda = new lambdaNode.NodejsFunction(this, name('Transak'), {
      vpc,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: path.join(__dirname, `/../src/lambda/transak.ts`),
      handler: 'handler',
      timeout: Duration.minutes(5),
      //memorySize: isProd ? 1024 : 128,
      memorySize: 1024,
      environment: {
        GRAPHQL_URI: niftgenApi.graphqlUrl,
        GRAPHQL_API_KEY: niftgenApi.apiKey || '',
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
    })
    const transakIntegration = new apigateway.LambdaIntegration(transakLambda)
    const transak = niftgenRestApi.root.addResource('transak')
    transak.addMethod('POST', transakIntegration)
    */

    const subscribersLambda = new lambdaNode.NodejsFunction(this, name('Subscribers'), {
      vpc,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: path.join(__dirname, `/../src/lambda/api/subscribers.api.ts`),
      handler: 'handler',
      timeout: Duration.minutes(15),
      //memorySize: isProd ? 1024 : 128,
      memorySize: 1024,
      environment: {
        ...beEnv,
        CLUSTER_ARN: cluster.clusterArn,
        SECRET_ARN: cluster.secret?.secretArn || '',
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      bundling: {
        minify: isProd,
        nodeModules: ['algosdk'],
        commandHooks: {
          beforeBundling(_inputDir: string, _outputDir: string) {
            return []
          },
          beforeInstall(inputDir: string, outputDir: string) {
            return []
          },
          afterBundling(_inputDir: string, outputDir: string) {
            return []
          },
        },
      },
      depsLockFilePath: path.join(__dirname, '../yarn.lock'),
    })
    // Setup a plan for the subscription
    const plan = niftgenRestApi.addUsagePlan(name('DefaultUsage'), {
      name: name('DefaultPlan'),
      throttle: {
        burstLimit: 10,
        rateLimit: 20,
      },
      quota: {
        limit: 2000,
        period: apigateway.Period.DAY
      }
    })
    plan.addApiStage({
      stage: niftgenRestApi.deploymentStage
    })
    const normalUserKey = niftgenRestApi.addApiKey(name('DefaultKey'), {
      apiKeyName: name('DefaultApiKey')
    })
    plan.addApiKey(normalUserKey)

    const gamingPlan = niftgenRestApi.addUsagePlan(name('GamingUsage'), {
      name: name('GamingPlan'),
      throttle: {
        burstLimit: 2,
        rateLimit: 10,
      },
      quota: {
        limit: 100,
        period: apigateway.Period.DAY
      }
    })
    gamingPlan.addApiStage({
      stage: niftgenRestApi.deploymentStage
    })
    const gamingApiKey = niftgenRestApi.addApiKey(name('GamingKey'), {
      apiKeyName: name('GamingApiKey')
    })
    gamingPlan.addApiKey(gamingApiKey)

    const api = niftgenRestApi.root.addResource('api')
    const subscribers = api.addResource('subscribers');
    const subscribersWallet = subscribers.addResource('{walletaddress}');
    subscribersWallet.addMethod('GET',
      new apigateway.LambdaIntegration(subscribersLambda),
      {apiKeyRequired: true}
    )

    /*
    * S3
     */
    const niftgenBucket = s3.Bucket.fromBucketName(
      this,
      'imported-bucket-from-name',
      'niftgen-whitelist',
    )

    /*
    * Pinpoint
     */
    const pinpointProject = new pinpoint.CfnApp(this, name("Pinpoint"), {
      name: name("Pinpoint")
    })

    /*
    * Access
    */

    // Give access to RDS from lambda SG
    cluster.connections.allowFrom(graphqlLambdaSg, ec2.Port.tcp(5432), 'Give graphqlLambda access to Aurora RDS');

    // Grant access to the cluster from the Lambda function
    cluster.grantDataApiAccess(graphqlLambda)
    cluster.grantDataApiAccess(tasksLambda)
    cluster.grantDataApiAccess(subscriptionNotificationsLambda)

    // Set the new Lambda function as a data source for the AppSync API
    const lambdaDs = niftgenApi.addLambdaDataSource(name('DbLambdaDatasource'), graphqlLambda)

    // Give access to Rekognition
    const statement = new iam.PolicyStatement();
    statement.addActions("rekognition:detectModerationLabels");
    statement.addResources("*");
    graphqlLambda.addToRolePolicy(statement);

    // S3
    niftgenBucket.grantRead(graphqlLambda)
    niftgenBucket.grantRead(subscribersLambda)

    // EventBridge rule which runs every 5 minutes
    const cronRule = new Rule(this, name('CronRule'), {
      schedule: Schedule.expression(`cron(0/${isProd ? 2 : 5} * * * ? *)`)
    })
    const cronDailyRule = new Rule(this, name('CronDailyRule'), {
      schedule: Schedule.expression(`cron(0/0 0 * * ? *)`)
    })

    //Set the target as lambda function
    cronRule.addTarget(new LambdaFunction(tasksLambda));
    cronDailyRule.addTarget(new LambdaFunction(subscriptionNotificationsLambda));

    // Give access to SES to subscription notification lambda
    subscriptionNotificationsLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['SES:sendTemplatedEmail', 'SES:SendEmail', 'SES:SendRawEmail'],
      resources: ['*'],
      effect: iam.Effect.ALLOW,
    }))

    // Transak secret
    const secretId = `transak-${buildConfig.Environment == 'production' || buildConfig.Environment == 'mainnet' ? 'production' : 'staging' }-access-key`
    const transakAccessKeySecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'TransakSecretAccessKey',
      secretId
    );
    transakAccessKeySecret.grantRead(graphqlLambda)

    // Niftgen wallet secret
    const walletSecretId = `niftgen-wallet-${buildConfig.Environment}`
    const niftgenWalletSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'NiftgenWalletSecret',
      walletSecretId
    );
    niftgenWalletSecret.grantRead(graphqlLambda)

    /*
    * Resolvers
    */

    // Map the resolvers to the Lambda function
    setupResolvers(lambdaDs)

    /*
    * Outputs
    */

    // CFN Outputs
    new CfnOutput(this, 'graphqlUrl', { value: niftgenApi.graphqlUrl })
    new CfnOutput(this, 'apiKey', { value: niftgenApi.apiKey || '' })
    new CfnOutput(this, 'apiId', { value: niftgenApi.apiId || '' })
    new CfnOutput(this, 'lambda', { value: graphqlLambda.functionArn })
    new CfnOutput(this, 'region', { value: this.region })
    new CfnOutput(this, 'secretName', { value: cluster.secret?.secretName! });
    new CfnOutput(this, 'dbEndpoint', { value: cluster.clusterEndpoint.hostname });
    new CfnOutput(this, 'restApiUrl', {value: niftgenRestApi.url});
    new CfnOutput(this, 'restApiKey', { value: normalUserKey.keyId || '' })

  }
}
