import { ModelObject, Model } from 'objection'
import Base from './Base'
import {CURRENCIES} from "../../services/const";

export const TRANSACTION_TYPES = Object.freeze({
  ADD :           'ADD',
  MINT:           'MINT',
  LIST:           'LIST',
  DELIST:         'DELIST',
  BUY:            'BUY',
  BID:            'BID',
  AUCTION:        'AUCTION',
  AUCTION_NO_SALE:'AUCTION_NO_SALE',
  APP_CREATE:     'APP_CREATE',
  APP_OPTIN:      'APP_OPTIN',
  ASSET_OPTIN:    'ASSET_OPTIN',
  REWARD:         'REWARD'
})

export class Transaction extends Base {
  static tableName = 'transactions'

  id: number
  type: string
  amount: number
  platformFee: number
  initFee: number
  royaltyFee: number
  currency: string
  txIds: string
  sellType: number
  buyerId: number
  userId: number
  assetId: number
  auctionId: number
  appId: number
  startTime: string
  endTime: string
  auctionClosedTime: string
  appAddress: string
  rewardType: string
  createdAt: Date

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['type', 'userId'],
      properties: {
        id:           { type: 'integer' },
        type:         { enum: [...Object.values(TRANSACTION_TYPES), null] },
        txIds:        { type: ["string", "null"] },
        amount:       { type: ["number", "null"] },
        platformFee:  { type: ["number", "null"] },
        initFee:      { type: ["number", "null"] },
        royaltyFee:   { type: ["number", "null"] },
        currency:     { enum: [...Object.values(CURRENCIES), null] },
        userId:       { type: 'integer' },
        buyerId:      { type: ['integer', 'null'] },
        auctionId:    { type: ['integer', 'null'] },
        assetId:      { type: ['integer', 'null'] },
        sellType:     { type: ['integer', 'null'] },
        appId:        { type: ['integer', 'null'] },
        startTime:    { type: ["string", "null"], format: "date-time" },
        endTime:      { type: ["string", "null"], format: "date-time" },
        auctionClosedTime: { type: ["string", "null"], format: "date-time" },
        appAddress:   { type: ["string", "null"] },
      }
    }
  }

  static get relationMappings() {
    const {User} = require('./User');
    const {Lookup} = require('./Lookup');
    const {Transaction} = require('./Transaction');
    const {Asset} = require('./Asset')
    return {
      owner: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'transactions.user_id',
          to: 'users.id'
        }
      },

      buyer: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'transactions.buyer_id',
          to: 'users.id'
        }
      },

      asset: {
        relation: Model.BelongsToOneRelation,
        modelClass: Asset,
        join: {
          from: 'transactions.asset_id',
          to: 'assets.id'
        }
      },

      auction: {
        relation: Model.BelongsToOneRelation,
        modelClass: Transaction,
        join: {
          from: 'transactions.auction_id',
          to: 'transactions.id'
        }
      },

      saleType: {
        relation: Model.BelongsToOneRelation,
        modelClass: Lookup,
        join: {
          from: 'transactions.sell_type',
          to: 'lookups.id'
        }
      },

      bids: {
        relation: Model.HasManyRelation,
        modelClass: Transaction,
        join: {
          from: 'transactions.id',
          to: 'transactions.auction_id'
        }
      },

    }

  }
}

// See https://dev.to/tylerlwsmith/using-a-typescript-interface-to-define-model-properties-in-objection-js-1231
export type TransactionType = ModelObject<Transaction>

