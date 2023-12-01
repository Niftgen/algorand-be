import * as algosdk from 'algosdk'
import {
  decodeSignedTransaction,
  decodeUnsignedTransaction,
  encodeUnsignedTransaction,
  OnApplicationComplete
} from 'algosdk'
import algodClient from './algod'
import {TextDecoder, TextEncoder} from 'util'
import algoIndexer from "./algoIndexer";
import {retrieveSecret} from "./secretsManager";
import axios from "axios";

const subscriptionModuleStateDefault = {
  subscriptionModuleId: 0,
  subscriptionAppId: 0,
  optin: false,
}

export const buildSecurityTransaction = async (walletAddress: string, jwt: string) => {
  //console.log(`buildSecurityTransaction - walletAddress: ${walletAddress} jwt: ${jwt}`)
  const platform = process.env.PLATFORM_ADDRESS!
  const transactionParams = await algodClient.getTransactionParams().do()
  const enc = new TextEncoder()
  const encJwt = enc.encode(jwt)
  //console.log("makePaymentTxnWithSuggestedParams")
  const securityTransaction = algosdk.makePaymentTxnWithSuggestedParams(
    walletAddress,
    platform,
    0,
    undefined,
    encJwt,
    transactionParams);
  //console.log("securityTransaction: ", securityTransaction)
  const encodedTransaction = await encodeUnsignedTransaction(securityTransaction)
  return Buffer.from(encodedTransaction).toString('base64')
}

export const getJwtFromSignedTransaction = async (txn: string) => {
  const dec = new TextDecoder("utf-8");
  let decodedJwt
  if (process.env.NODE_ENV == 'test') {
    const decodedTxn = await decodeUnsignedTransaction(Buffer.from(txn, 'base64'))
    decodedJwt = JSON.parse(dec.decode(decodedTxn.note))
  } else {
    const decodedTxn = await decodeSignedTransaction(Buffer.from(txn, 'base64'))
    //console.log("decodedTxn: ", decodedTxn)
    decodedJwt = JSON.parse(dec.decode(decodedTxn.txn.note))
    //console.log("getJwtFromSignedTransaction jwt: ", decodedJwt)
  }
  return decodedJwt
}

export const sendTxn = async (signedTxn: string) => {
  if (process.env.NODE_ENV == 'test') {
    return {
      txnId: ['test_algo_txn_id','test_algo_txn_id_2'],
      txnResponse: {
        'asset-index': 123456,
        'application-index': 12344321
      }
    }
  }
  //console.log("sendTxn signedTxn: ", signedTxn)
  //const txn = JSON.parse(signedTxn)
  //console.log("sendTxn txn: ", signedTxn)
  let rawTransaction: any
  let txIds = []
  let decodedTx: any
  if (Array.isArray(signedTxn)) {
    rawTransaction = signedTxn.map(signedTxn => Buffer.from(signedTxn, 'base64'))
    rawTransaction.forEach((value: any) => {
      decodedTx = decodeSignedTransaction(value)
      if (decodedTx && decodedTx.txn) txIds.push(decodedTx.txn.txID())
    })
  } else {
    rawTransaction = Buffer.from(signedTxn, 'base64')
    decodedTx = decodeSignedTransaction(rawTransaction)
    if (decodedTx && decodedTx.txn) txIds.push(decodedTx.txn.txID())
  }
  //console.log("sendTxn txIds: ", txIds)
  const pendingTxn = await algodClient.sendRawTransaction(rawTransaction).do();
  const txnResponse = await waitForConfirmation(pendingTxn.txId);
  //console.log("sendTxn pendingTxn: ", pendingTxn)
  //console.log("sendTxn txnResponse: ", txnResponse)
  return {
    txnId: txIds,
    txnResponse
  };
}

/*
export async function sendTxnLambda(signedTxn: string) {
  //console.log("sendTx process.env.TXNAPISTACK_URI: ", process.env.TXNAPISTACK_URI)
  //console.log("sendTxn signedTxn: ", signedTxn)
  try {
    const sendTxnResponse = await axios.post(
      `${process.env.TXNAPISTACK_URI}/sendTxn`,
      {txn: signedTxn},
      {
        headers: {
          "content-type": "application/json",
        }
      }
    )
    //console.log("sendTxn response: ", sendTxnResponse.data);
    return sendTxnResponse.data
  } catch (error: any) {
    console.log("sendTx Error: ", error)
    let msg
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      msg = 'Data: ' + JSON.stringify(error.response.data) + ' Status: ' + JSON.stringify(error.response.status) + ' Headers: ' + JSON.stringify(error.response.headers)
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      msg = "Request: " + JSON.stringify(error.request)
    } else {
      // Something happened in setting up the request that triggered an Error
      msg = "Message: " + JSON.stringify(error.message)
    }
    throw new Error(`sendTx error: ${msg}`)
  }
}
*/

const waitForConfirmation = async (txId: string) => {
  let lastround = (await algodClient.status().do())['last-round'];
  while (true) {
    const pendingInfo = await algodClient.pendingTransactionInformation(txId).do();
    if (pendingInfo['confirmed-round'] !== null && pendingInfo['confirmed-round'] > 0) {
      //console.log('Transaction confirmed in round ' + pendingInfo['confirmed-round']);
      return pendingInfo;
    }
    lastround++;
    await algodClient.statusAfterBlock(lastround).do();
  }
}

export const AppAddress = async (txId: string) => {
  if (process.env.NODE_ENV == 'test') {
    let rawTransaction: any
    let txIds :any = []
    let decodedTx: any
    const signedTxn = [
      'gqNzaWfEQLuoM4+4VAUX/jJKjk3t8FpSqZHhEEaPMCuQD9w98jjqx9N+we62NL8G2BLYLahSWgQEqJb4Bwfu3XaCGe8xYQSjdHhuiqNhbXTOABDI4KNmZWXNA+iiZnbOAXzgOKNnZW6sdGVzdG5ldC12MS4womdoxCBIY7UYpLPITsgQ8i1PEIHLD3HwWaesIN7GL39w5Qk6IqNncnDEIKEIHP4lFf7v8CR2QygHe9IzPTUdeY8APAHytqJtRbdjomx2zgF85CCjcmN2xCA4oTIpCdDR7W0iCl/6NsaY8IMGRzDgXhKMW8WPGlbMgKNzbmTEIJ2BtrrcfV5QCGEsAgZ1CP+Rf6h23KY8vrRByN8kITr8pHR5cGWjcGF5',
      'gqNzaWfEQLPav9u+kb+EJvtKtKckEwefvQ/5Bo1TojoIpEhXwN0zqPdgeWLm9DYMlhN3Czro80grVdE7CCxJStmfvLzj6Q2jdHhui6RhcGFhksQQQ1JFQVRFX0FTU0VUX0FQUMQIAAAAAAAAAAKkYXBhc5LOBv93Sc4GY/d8pGFwaWTOBmP5GKNmZWXNC7iiZnbOAXzgOKNnZW6sdGVzdG5ldC12MS4womdoxCBIY7UYpLPITsgQ8i1PEIHLD3HwWaesIN7GL39w5Qk6IqNncnDEIKEIHP4lFf7v8CR2QygHe9IzPTUdeY8APAHytqJtRbdjomx2zgF85CCjc25kxCCdgba63H1eUAhhLAIGdQj/kX+odtymPL60QcjfJCE6/KR0eXBlpGFwcGw='
    ]
    rawTransaction = signedTxn.map(signedTxn => Buffer.from(signedTxn, 'base64'))
    rawTransaction.forEach((value: any) => {
      decodedTx = decodeSignedTransaction(value)
      if (decodedTx && decodedTx.txn) txIds.push(decodedTx.txn.txID())
    })
    txId = txIds[1]
  }
  const txn = await algoIndexer.lookupTransactionByID(txId).do()
  const log = txn.transaction.logs[0]
  const appIdBuffer = Buffer.from(log, 'base64')
  const appId = Number(appIdBuffer.readBigInt64BE())
  const appAddress = algosdk.getApplicationAddress(appId)
  return {
    appId: appId,
    appAddress: appAddress
  }
}

export const creatorAppAddress = async (response: any) => {
  if (process.env.NODE_ENV == 'test') {
    response = {
      txnId: [ 'MHRER4WERJ7SEKJ25XLVQ3Q3RG4LUD4D4SG3JSBAFWUFSEAHTISQ' ],
      txnResponse: {
        'application-index': 156804583
      }
    }
  }
  const {'application-index': creatorAppId} = response.txnResponse
  const creatorAppAddress = algosdk.getApplicationAddress(creatorAppId)
  //console.log("creatorAppAddress: ", {creatorAppId, creatorAppAddress})
  return {
    appId: creatorAppId,
    appAddress: creatorAppAddress,
    txnIds: response.txnId
  }
}

export const giveRewards = async (walletAddress: string, amount: number) => {
  let res: any = null
  try {
    console.log(`giveRewards walletAddress: ${walletAddress} amount: ${amount}`)
    const secret = await retrieveWalletSecret()
    //console.log(`NIFTGEN_ADDRESS: ${secret.NIFTGEN_ADDRESS}`)
    const enc = new TextEncoder()
    const unsignedTransaction = algosdk.makeApplicationNoOpTxnFromObject({
      suggestedParams: Object.assign(await algodClient.getTransactionParams().do(), {fee: 1000, flatFee: true}),
      appIndex: parseInt(process.env.REWARD_MODULE_ID || '', 10),
      from: secret.NIFTGEN_ADDRESS,
      appArgs: [enc.encode('INCREASE_REWARDS'), algosdk.encodeUint64(amount)],
      accounts: [walletAddress],
      foreignApps: [parseInt(process.env.ADMIN_ID || '', 10)]
    })
    const txn = Buffer.from(algosdk.encodeUnsignedTransaction(unsignedTransaction)).toString('base64')
    const signedTxn = signTxns([txn], secret.NIFTGEN_MNEMONIC)
    res = await sendTxn(JSON.stringify(signedTxn))
  } catch (err: any) {
    console.log("giveRewards Error: ", err)
    res = null
  }
  return res
}

export const signTxns = (unsignedTxn: string[], mnemonic: string) => {
  return unsignedTxn
    .map(txn => algosdk.decodeUnsignedTransaction(Buffer.from(txn, 'base64')))
    .map(txn => txn.signTxn(algosdk.mnemonicToSecretKey(mnemonic).sk))
    .map(txn => Buffer.from(txn).toString('base64'));
}

export const createAccount = (index = 0) => {
  try {
    return require('./accounts.json')[index];
  } catch (e) {
    const algosdk = require('algosdk');
    const {addr, sk} = algosdk.generateAccount();
    return {addr, mnemonic: algosdk.secretKeyToMnemonic(sk)};
  }
}

export const getAccount = (mnemonic: string) => {
  const account = algosdk.mnemonicToSecretKey(mnemonic)
  return {
    addr: account.addr,
    mnemonic: mnemonic
  }
}

export const fundAccount = async (walletAddress: string, amount: number) => {
  const {['amount-without-pending-rewards']: amountWithoutRewards, ['min-balance']: minBalance} = await algodClient
      .accountInformation(walletAddress)
      .do();
  const balance = amountWithoutRewards - minBalance;
  if (balance > algosdk.algosToMicroalgos(amount)) {
    return
  }
  const secret = await retrieveWalletSecret()
  if (!secret) throw Error("Unable to retrieve secret")
  const rootAccount = algosdk.mnemonicToSecretKey(secret.NIFTGEN_MNEMONIC);
  const suggestedParams = await algodClient.getTransactionParams().do();
  const unsignedTransaction = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    suggestedParams,
    to: walletAddress,
    from: rootAccount.addr,
    amount: algosdk.algosToMicroalgos(amount)
  });
  const signedTransaction = await unsignedTransaction.signTxn(rootAccount.sk);
  const pendingTransaction = await algodClient.sendRawTransaction(signedTransaction).do();
  const res = await waitForConfirmation(pendingTransaction.txId)
  return res
}

export const fundAccountWithNFTG = async (account: any, amount: number) => {
  let res = await optInToNFTG(account)
  console.log("fundAccountWithNFTG optIn res: ", res)
  res = await getNFTGTokens(account)
  console.log("fundAccountWithNFTG getNFTGTokens res: ", res)
  res = await optInRewards(account)
  console.log("fundAccountWithNFTG optInRewards res: ", res)
  return res
}

export const optInRewards = async (account: any) => {
  const unsignedTransaction = algosdk.makeApplicationOptInTxnFromObject({
    suggestedParams: Object.assign(await algodClient.getTransactionParams().do(), {fee: 1000, flatFee: true}),
    appIndex: parseInt(process.env.REWARD_MODULE_ID || '', 10),
    from: account.addr
  });
  const txn = Buffer.from(algosdk.encodeUnsignedTransaction(unsignedTransaction)).toString('base64');
  const signedTxn = signTxns([txn], account.mnemonic)
  return await sendTxn(JSON.stringify(signedTxn))
}

export const optInToNFTG = async (account: any) => {
  const NIFTGEN_ASSET_ID = parseInt(process.env.NIFTGEN_ASSET_ID || '', 10)
  const {assets} = await algodClient.accountInformation(account.addr).do();
  const isOptin = assets.some(({['asset-id']: assetId}: any) => assetId === NIFTGEN_ASSET_ID);
  console.log(`isOptin`, isOptin);
  if (isOptin) {
    return
  }
  const unsignedTransaction = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      suggestedParams: Object.assign(await algodClient.getTransactionParams().do(), {fee: 1000, flatFee: true}),
      to: account.addr,
      from: account.addr,
      amount: 0,
      assetIndex: NIFTGEN_ASSET_ID
    })
  const txn = Buffer.from(algosdk.encodeUnsignedTransaction(unsignedTransaction)).toString('base64')
  const signedTxn = signTxns([txn], account.mnemonic)
  return await sendTxn(JSON.stringify(signedTxn))
}

const getNFTGTokens = async (account: any) => {
  const NIFTGEN_ASSET_ID = parseInt(process.env.NIFTGEN_ASSET_ID || '', 10)
  const {assets} = await algodClient.accountInformation(account.addr).do();
  const nftg = assets.find(({['asset-id']: assetId}: any) => assetId === NIFTGEN_ASSET_ID);
  if (nftg?.amount >= algosdk.algosToMicroalgos(10)) {
    return
  }
  const enc = new TextEncoder()
  const suggestedParams = await algodClient.getTransactionParams().do();
  const unsignedTransaction = algosdk.makeApplicationCallTxnFromObject({
    suggestedParams: Object.assign(await algodClient.getTransactionParams().do(), {fee: 2000, flatFee: true}),
    appIndex: parseInt(process.env.ADMIN_ID || '', 10),
    appArgs: [enc.encode('GET_TOKENS')],
    foreignAssets: [NIFTGEN_ASSET_ID],
    from: account.addr,
    onComplete: OnApplicationComplete.NoOpOC
  })
  const txn = Buffer.from(algosdk.encodeUnsignedTransaction(unsignedTransaction)).toString('base64')
  const signedTxn = signTxns([txn], account.mnemonic)
  return await sendTxn(JSON.stringify(signedTxn))
}

const retrieveWalletSecret = async () => {
  const environment = process.env.NODE_ENV || 'development'
  const secretId = `niftgen-wallet-${environment == 'test' ? 'staging' : environment}`
  console.log("retrieveWalletSecret secretId: ", secretId)
  const secret = JSON.parse(await retrieveSecret(secretId))
  //console.log(`NIFTGEN_ADDRESS: ${secret.NIFTGEN_ADDRESS}`)
  return secret
}

export const getAssets = async (account: any) => {
  const accountDetails = await algodClient.accountInformation(account.addr).do()
  return Object.fromEntries(
    await Promise.all(
      accountDetails.assets.map(async (asset: { [x: string]: any; amount: number; }) => {
        const assetId = asset['asset-id'];
        const info = await algodClient.getAssetByID(assetId).do();
        return [
          assetId,
          {
            id: assetId,
            amount: parseFloat((asset.amount / Math.pow(10, info.params.decimals)).toFixed(info.params.decimals)),
            unit: info.params['unit-name'],
            name: info.params.name
          }
        ];
      })
    )
  );
}


function decodeKey(key: any) {
  return Buffer.from(key, 'base64').toString();
}

function decodeValue(bytes: any) {
  const maybeAddress = algosdk.encodeAddress(new Uint8Array(Buffer.from(bytes, 'base64')));
  return algosdk.isValidAddress(maybeAddress) ? maybeAddress : Buffer.from(bytes, 'base64').toString();
}

function decodeAppState(appState: any) {
  return Object.fromEntries(
    appState.map(({key, value} : {key:any, value:any}) => {
      const decodedKey = decodeKey(key);
      if (typeof value === 'object') {
        if ('type' in value && value.type === 1) {
          return [decodedKey, decodeValue(value.bytes)];
        }
        if ('type' in value && value.type === 2) {
          return [decodedKey, value.uint];
        }
        if ('uint' in value) {
          return [decodedKey, value.uint];
        }
        return decodeValue(value);
      }
      return undefined;
    })
  );
}

function getCreatedApps(account: any) {
  return account['created-apps'].map((app: { id: any; params: { [x: string]: any; }; }) => ({
    id: app.id,
    ...decodeAppState(app.params['global-state']),
  }));
}

function findCreatorApp(account: any) {
  if (!account) {
    return undefined;
  }
  return getCreatedApps(account)
    .reverse()
    .find((app: { MODULE_NAME: string; })  => app.MODULE_NAME === 'CREATOR_APP');
}

function getOptinApp(account: { [x: string]: any[]; }, appId: number) {
  console.log("getOptinApp: appId: ", appId)
  if (!account) {
    return undefined;
  }
  if (!appId) {
    return undefined;
  }
  const app = account['apps-local-state'].find((app: { id: any; }) => app.id === Number(appId))
  if (!app) {
    return undefined;
  }
  return {
    id: app.id,
    optinRound: app['opted-in-at-round'],
    ...decodeAppState(app['key-value']),
  };
}


function getOptinAppState(account: { [x: string]: any[]; }, appId: number) {
  const optinApp: any = getOptinApp(account, appId)
  return {
    optin: Boolean(optinApp),
    subscribed: optinApp?.SUBSCRIPTION_STATUS === 1,
    expiryDate:
      optinApp?.SUBSCRIPTION_EXPIRES_DATE > 0
        ? new Date(optinApp?.SUBSCRIPTION_EXPIRES_DATE * 1000)
        : null,
    amount: optinApp?.SUBSCRIPTION_AMOUNT_PAID,
    duration: optinApp?.SUBSCRIPTION_DURATION,
    address: String(account.address)
  }
}

const getSubscriptionModuleState = (subscriptionModuleId: any, creatorAlgoAccount: any) => {
  console.log("getSubscriptionModuleState subscriptionModuleId: ", subscriptionModuleId)
  if (!subscriptionModuleId || !creatorAlgoAccount) {
    return subscriptionModuleStateDefault
  }
  const state = getOptinApp(creatorAlgoAccount, Number(subscriptionModuleId))
  console.log("getSubscriptionModuleState state: ", JSON.stringify(state, null, 2))
  return state ? transformSubscriptionModuleState(state) : subscriptionModuleStateDefault;
}

const transformSubscriptionModuleState = (state: any) => {
  return {
    ...subscriptionModuleStateDefault,
    subscriptionModuleId: state.id,
    subscriptionAppId: state.SUBSCRIPTION_APP_ID ?? 0,
    optin: Boolean(state.id),
  };
}

const fetchSubscriptionTransactions = async (subscriptionAppId: any, next: any) => {
  console.log("fetchSubscriptionTransactions subscriptionAppId: ", subscriptionAppId)
  console.log("fetchSubscriptionTransactions next: ", next)
  const url = new URL(`${process.env.ALGO_INDEXER_URI}/v2/transactions`)
  console.log("fetchSubscriptionTransactions url: ", url.toString())
  url.searchParams.append('note-prefix', 'Uw=='); // "S", "Subscribe"
  url.searchParams.append('address', process.env.NIFTGEN_ADDRESS || '');
  url.searchParams.append('application-id', subscriptionAppId);
  if (next) {
    url.searchParams.append('next', next);
  }
  try {
    const response = await axios.get(
      url.toString(),
      {
        responseType: 'json',
        headers: {'x-api-key': process.env.ALGO_API_TOKEN || ''}
      })
    return response.data
  } catch (error: any) {
    console.log("fetchSubscriptionTransactions Error: ", error)
    let msg
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      msg = 'Data: ' + JSON.stringify(error.response.data) + ' Status: ' + JSON.stringify(error.response.status) + ' Headers: ' + JSON.stringify(error.response.headers)
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      msg = "Request: " + JSON.stringify(error.request)
    } else {
      // Something happened in setting up the request that triggered an Error
      msg = "Message: " + JSON.stringify(error.message)
    }
    throw new Error(`fetchSubscriptionTransactions error: ${msg}`)
  }
}

export const getExpiredSubscriptions = async (creatorAddress: string, daysBeforeExpiry: number) => {
  let expiredSubscriptions = []
  let subscriptions = []
  console.log(`getExpiredSubscriptions creatorAddress: ${creatorAddress} daysBeforeExpiry: ${daysBeforeExpiry}`)
  const creatorAlgoAccount = await algodClient.accountInformation(creatorAddress).do()
  //console.log("getExpiredSubscriptions creatorAlgoAccount: ", JSON.stringify(creatorAlgoAccount, null, 2))
  const subscriptionModuleState = getSubscriptionModuleState(process.env.SUBSCRIPTION_MODULE_ID, creatorAlgoAccount);
  console.log("getExpiredSubscriptions subscriptionModuleState: ", JSON.stringify(subscriptionModuleState, null, 2))
  const subscriptionAppId = subscriptionModuleState.subscriptionAppId;
  console.log("getExpiredSubscriptions subscriptionAppId: ", subscriptionAppId)
  if (subscriptionAppId && subscriptionModuleState.optin) {
    // Find all accounts that have optin to the creator app
    const optinAppAccounts = await algoIndexer.searchAccounts()
      .applicationID(subscriptionAppId).do();
    console.log("optinAppAccounts: ", JSON.stringify(optinAppAccounts, undefined, 2))
    if (optinAppAccounts) {
      const accounts = optinAppAccounts['accounts']
      console.log("accounts: ", JSON.stringify(accounts, undefined, 2))
      const numAccounts = accounts.length;
      console.log("numAccounts: ", numAccounts)
      for (let i = 0; i < numAccounts; i++) {
        const optinAppState = getOptinAppState(accounts[i], Number(subscriptionAppId))
        console.log("optinAppState: ", JSON.stringify(optinAppState, undefined, 2))
        if (optinAppState.subscribed) {
          // Check if sub expires within x days
          const now = new Date()
          const expiryDate = new Date(optinAppState.expiryDate || '')
          let notificationStartDate = new Date(optinAppState.expiryDate || '')
          notificationStartDate.setDate(notificationStartDate.getDate() - daysBeforeExpiry)
          console.log("notificationStartDate: ", notificationStartDate)
          console.log("expiryDate: ", expiryDate)
          console.log("now: ", now)
          console.log("now.getTime() > notificationStartDate.getTime(): ", now.getTime() > notificationStartDate.getTime())
          console.log("now.getTime() <= expiryDate.getTime(): ", now.getTime() <= expiryDate.getTime())
          if (optinAppState.subscribed)
            if (now.getTime() > notificationStartDate.getTime() &&
              now.getTime() <= expiryDate.getTime()) {
              expiredSubscriptions.push(optinAppState)
            } else if (now.getTime() < expiryDate.getTime()) {
              subscriptions.push(optinAppState)
            }
        }
      }
    }
    console.log("expiredSubscriptions: ", JSON.stringify(expiredSubscriptions, undefined, 2))
    console.log("subscriptions: ", JSON.stringify(subscriptions, undefined, 2))  }
  return [expiredSubscriptions, subscriptions]
}

export const getSubscribers = async (creatorAddress: string) => {
  let subscribers: any[] = []
  let next = undefined;
  let data: any
  console.log(`getSubscribers creatorAddress: ${creatorAddress}`)
  const creatorAlgoAccount = await algodClient.accountInformation(creatorAddress).do();
  //console.log("getSubscribers accountInfo: ", JSON.stringify(creatorAlgoAccount, null, 2))
  const subscriptionModuleState = getSubscriptionModuleState(process.env.SUBSCRIPTION_MODULE_ID, creatorAlgoAccount);
  console.log("getSubscribers subscriptionModuleState: ", JSON.stringify(subscriptionModuleState, null, 2))
  const subscriptionAppId = subscriptionModuleState.subscriptionAppId;
  console.log("getSubscribers subscriptionAppId: ", subscriptionAppId)
  if (subscriptionAppId && subscriptionModuleState.optin) {
    do {
      data = await fetchSubscriptionTransactions(subscriptionAppId, next)
      console.log("getSubscribers data: ", data)
      if (data.transactions.length > 0) {
        next = data['next-token'];
      } else {
        next = undefined;
      }
      subscribers.push(...data.transactions);
    } while (next)
  }
  console.log("getSubscribers subscribers: ", subscribers)
  return subscribers
}
