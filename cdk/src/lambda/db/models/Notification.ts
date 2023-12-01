import { ModelObject, Model } from 'objection'
import Base from './Base'
import {User} from "./User";
import {Comment} from "./Comment";

// **** Make sure to add any new types to schema.grapghql *****
export const NOTIFICATION_TYPES = Object.freeze({
  COMMENT : 'COMMENT',
  MESSAGE:  'MESSAGE',
  RATING:   'RATING',
  PURCHASE: 'PURCHASE',
  SALE:     'SALE',
  WON:      'WON',
  BID:      'BID',
  EXPIRED_SUBSCRIPTION: 'EXPIRED_SUBSCRIPTION'
})

export class Notification extends Base {
  static tableName = 'notifications'

  id: number
  userId: number
  assetId: number
  commentId: number
  deletedCommentId: Number
  ratingId: number
  originatorId: number
  transactionId: number
  notification: string
  notificationType: string
  ownerAddress: string

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['type', 'userId', 'notification'],
      properties: {
        id:                 { type: 'integer' },
        userId:             { type: 'integer' },
        assetId:            { type: ['integer', 'null'] },
        commentId:          { type: ['integer', 'null'] },
        deletedCommentId:   { type: ['integer', 'null'] },
        ratingId:           { type: ['integer', 'null'] },
        originatorId:       { type: ['integer', 'null'] },
        transactionId:      { type: ['integer', 'null'] },
        notificationType:   { enum: [...Object.values(NOTIFICATION_TYPES), null] },
        notification:       { type: 'string', minLength: 1 }
      }
    }
  }

  static get relationMappings() {
    const {User} = require('./User');
    const {Asset} = require('./Asset');
    const {Rating} = require('./Rating');
    const {Comment} = require('./Comment');
    const {Transaction} = require('./Transaction');
    return {
      owner: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'notifications.userId',
          to: 'users.id'
        }
      },

      originator: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'notifications.originatorId',
          to: 'users.id'
        }
      },

      asset: {
        relation: Model.BelongsToOneRelation,
        modelClass: Asset,
        join: {
          from: 'notifications.assetId',
          to: 'assets.id'
        }
      },

      rating: {
        relation: Model.BelongsToOneRelation,
        modelClass: Rating,
        join: {
          from: 'notifications.ratingId',
          to: 'ratings.id'
        }
      },

      comment: {
        relation: Model.BelongsToOneRelation,
        modelClass: Comment,
        join: {
          from: 'notifications.commentId',
          to: 'comments.id'
        }
      },

      transaction: {
        relation: Model.BelongsToOneRelation,
        modelClass: Transaction,
        join: {
          from: 'notifications.transactionId',
          to: 'transactions.id'
        }
      },

    }
  }

}

export type NotificationType = ModelObject<Notification>

