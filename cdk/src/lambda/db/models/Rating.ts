import { ModelObject, Model, ref } from 'objection'
import Base from './Base'

export class Rating extends Base {
  static tableName = 'ratings'

  id: number
  userId: number
  assetId: number
  rating: number
  walletAddress: string
  user: any
  asset: any

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['userId', 'assetId', 'rating'],
      properties: {
        id:         { type: 'integer' },
        userId:     { type: 'integer' },
        assetId:    { type: 'integer' },
        rating:     { type: ["integer", "null"] }
      }
    }
  }

  static get relationMappings() {
    const {User} = require('./User')
    const {Asset} = require('./Asset')
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'ratings.user_id',
          to: 'users.id'
        }
      },

      asset: {
        relation: Model.BelongsToOneRelation,
        modelClass: Asset,
        join: {
          from: 'ratings.asset_id',
          to: 'assets.id'
        }
      }
    }
  }

}

export type RatingType = ModelObject<Rating>


