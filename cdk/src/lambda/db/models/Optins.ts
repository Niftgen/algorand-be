import { ModelObject, Model } from 'objection'
import Base from './Base'
import {Asset} from "./Asset";

export class Optin extends Base {
  static tableName = 'optins'

  id: number
  userId: number
  assetId: number
  transactionId: number

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['userId', 'assetId', 'transactionId'],
      properties: {
        id:             { type: 'integer' },
        assetId:        { type: 'integer' },
        userId:         { type: 'integer' },
        transactionId:  { type: 'integer' },
      }
    }
  }

  static get relationMappings() {
    const {User} = require('./User')
    const {Asset} = require('./Asset')
    const {Transaction} = require('./Transaction')
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'optins.user_id',
          to: 'users.id'
        }
      },

      asset: {
        relation: Model.BelongsToOneRelation,
        modelClass: Asset,
        join: {
          from: 'optins.asset_id',
          to: 'assets.id'
        }
      },

      transaction: {
        relation: Model.BelongsToOneRelation,
        modelClass: Transaction,
        join: {
          from: 'optins.transaction_id',
          to: 'transactions.id'
        }
      }

    }
  }

}

export type OptinType = ModelObject<Optin>