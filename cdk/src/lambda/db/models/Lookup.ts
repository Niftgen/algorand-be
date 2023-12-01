import { ModelObject } from 'objection'
import Base from './Base'

export const LOOKUP_CATEGORIES = 'Categories'
export const LOOKUP_USER_TYPES = 'UserTypes'
export const LOOKUP_SALE_TYPES = 'SaleTypes'

export class Lookup extends Base {
  static tableName = 'lookups'

  id: number
  active: Boolean
  description: String
  type: string

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['active', 'description', 'type'],
      properties: {
        id:         { type: 'integer' },
        active:     { type: 'boolean' },
        description:{ type: "string", minLength: 1, maxLength: 255 },
        type:       { enum: [LOOKUP_CATEGORIES, LOOKUP_USER_TYPES, LOOKUP_SALE_TYPES] }
      }
    }
  }

}

export type LookupType = ModelObject<Lookup>

