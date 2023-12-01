import { ModelObject, Model } from 'objection'
import Base from './Base'

export enum MessageType {
  PRIVATE_MESSAGE,
  ASSET_COMMENT,
  ASSET_MESSAGE
}

export enum CommentSortOrder {
  CREATED_DESC,
  CREATED_ASC
}

export class Comment extends Base {
  static tableName = 'comments'

  id: number
  userId: number
  assetId: number
  rating: number
  content: string
  messageRead: Date
  messageType: number
  addresseeId: number
  walletAddress: string
  totalComments: any

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['messageType', 'userId', 'content'],
      properties: {
        id:         { type: 'integer' },
        messageType:{ enum: Object.values(MessageType) },
        userId:     { type: 'integer' },
        assetId:    { type: ['integer', 'null'] },
        content:    { type: 'string', minLength: 1 }
      }
    }
  }

  static get relationMappings() {
    const {User} = require('./User');
    const {Asset} = require('./Asset');
    return {
      owner: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'comments.user_id',
          to: 'users.id'
        }
      },

      addressee: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'comments.addressee_id',
          to: 'users.id'
        }
      },

      asset: {
        relation: Model.BelongsToOneRelation,
        modelClass: Asset,
        join: {
          from: 'comments.asset_id',
          to: 'assets.id'
        }
      }
    }
  }

}

export type CommentType = ModelObject<Comment>

