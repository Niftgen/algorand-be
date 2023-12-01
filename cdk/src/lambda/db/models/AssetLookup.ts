import { ModelObject, Model } from 'objection'
import Base from './Base'

export class AssetLookup extends Base {
  static tableName = 'assetLookups'

  id: number
  assetId: number
  lookupId: number

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['assetId', 'lookupId'],
      properties: {
        id:         { type: 'integer' },
        lookupId:   { type: 'integer' },
        assetId:    { type: 'integer' },
      }
    }
  }

  static get relationMappings() {
    const {Asset} = require('./Asset');
    const {Lookup} = require('./Lookup');
    return {
      asset: {
        relation: Model.BelongsToOneRelation,
        modelClass: Asset,
        join: {
          from: 'asset_lookups.asset_id',
          to: 'assets.id'
        }
      },

      lookup: {
        relation: Model.BelongsToOneRelation,
        modelClass: Lookup,
        join: {
          from: 'asset_lookups.lookup_id',
          to: 'lookups.id'
        }
      }
    }
  }

}

export type LookupType = ModelObject<AssetLookup>