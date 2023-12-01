export interface BuildConfig
{
  readonly AWSAccountID : string;
  readonly AWSProfileName : string;
  readonly AWSProfileRegion : string;

  readonly App : string;
  readonly Environment : string;
  readonly Version : string;
  readonly Build : string;

  readonly Parameters: BuildParameters;
}


export interface BuildParameters
{
  readonly ALGOD_URI: string;
  readonly ALGO_INDEXER_URI: string;
  readonly ALGO_API_TOKEN: string;
  readonly ALGOD_PORT: string;
  readonly PLATFORM_ADDRESS: string;
  readonly JWT_SECRET: string;
  readonly USE_WHITELIST: string;
  readonly USE_CREATOR_WHITELIST: string;
  readonly TXNAPISTACK_URI: string;
  readonly PINATA_API_KEY: string;
  readonly PINATA_API_SECRET: string;
  readonly PINATA_API_URI: string;
  readonly IPFS_URI: string;
  readonly IPFS_UID: string;
  readonly IPFS_PWD: string;
  readonly MIXPANEL_TOKEN: string;
  readonly ADMIN_ID: string;
  readonly REWARD_MODULE_ID: string;
  readonly SUBSCRIPTION_MODULE_ID: string;
  readonly NIFTGEN_ADDRESS: string;
  readonly NIFTGEN_ASSET_ID: string;
}