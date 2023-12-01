import { ModelObject, Model } from 'objection'
import Base from './Base'

export class UserLookup extends Base {
  static tableName = 'user_lookups'

  id: number
  userId: number
  lookupId: number

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['userId', 'lookupId'],
      properties: {
        id:         { type: 'integer' },
        lookupId:   { type: 'integer' },
        userId:     { type: 'integer' },
      }
    }
  }

  static get relationMappings() {
    const {User} = require('./User')
    const {Lookup} = require('./Lookup')
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'user_lookups.user_id',
          to: 'users.id'
        }
      },

      lookup: {
        relation: Model.BelongsToOneRelation,
        modelClass: Lookup,
        join: {
          from: 'user_lookups.lookup_id',
          to: 'lookups.id'
        }
      }
    }
  }

}

export type LookupType = ModelObject<UserLookup>