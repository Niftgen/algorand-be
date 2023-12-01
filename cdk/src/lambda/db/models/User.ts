import { ModelObject, Model } from 'objection'
import Base from './Base'
import {LOOKUP_CATEGORIES, LOOKUP_USER_TYPES} from "./Lookup";
import addFormats from "ajv-formats"
import {getMessageReceivedTotals} from "../../helpers/user.helper";
import {MessageType} from "./Comment";
import {Transaction, TRANSACTION_TYPES} from "./Transaction";

export class User extends Base {
  static tableName = 'users'

  id: number
  avatarPath: string
  dateOfBirth: Date
  email: string
  userName: string
  walletAddress: string
  bio: string
  twitterUrl: string
  instagramUrl: string
  discordUrl: string
  facebookUrl: string
  messageReceivedTotals: any
  phone: string
  videoCreator: boolean
  kycToken: string
  kyc: boolean
  kycDate: Date | null | string
  avatarUpdated: boolean
  metadata: string
  creatorAppTransactionId:  number | null
  unsignedTxn: string
  updateVersion: number
  rewardCount: number
  rewards: any
  referralCode: string | null | undefined
  creatorReferralCode: string | null | undefined

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['walletAddress', 'userName', 'email'],
      properties: {
        id:             { type: 'integer' },
        avatarPath:     { type: ["string", "null"] },
        dateOfBirth:    { type: ["string", "null"], format: "date" },
        email:          { type: "string", format: "email" },
        userName:       { type: "string" },
        walletAddress:  { type: "string" },
        bio:            { type: ["string", "null"] },
        twitterUrl:     { type: ["string", "null"] },
        instagramUrl:   { type: ["string", "null"] },
        discordUrl:     { type: ["string", "null"] },
        facebookUrl:    { type: ["string", "null"] },
        phone:          { type: ["string", "null"] },
        videoCreator:   { type: 'boolean' },
        kyc:            { type: 'boolean' },
        kycToken:       { type: ["string", "null"] },
        kycDate:        { type: ["string", "null"], format: "date-time" },
        referralCode:   { type: ["string", "null"] },
        creatorReferralCode:    { type: ["string", "null"] },
        creatorAppTransactionId:{ type: ['integer', 'null'] },
      }
    }
  }

  async $afterFind(context: any) {
    const result = await super.$afterFind(context);
    if (this?.id) this.messageReceivedTotals = await getMessageReceivedTotals(this.id)
    return result
  }

  $creatorAppCreated() {
    return this.creatorAppTransactionId
  }

  static get relationMappings() {
    const {Lookup} = require('./Lookup');
    const {Rating} = require('./Rating');
    const {Notification} = require('./Notification');
    const {Comment} = require('./Comment');
    const {Transaction} = require('./Transaction');
    return {
      interests: {
        relation: Model.ManyToManyRelation,
        modelClass: Lookup,
        join: {
          from: 'users.id',
          through: {
            from: 'user_lookups.user_id',
            to: 'user_lookups.lookup_id'
          },
          to: 'lookups.id'
        },
        filter(builder: any) {
          builder.where('lookups.type', LOOKUP_CATEGORIES).where('lookups.active', true)
        }
      },

      creatorApp: {
        relation: Model.BelongsToOneRelation,
        modelClass: Transaction,
        join: {
          from: 'users.creatorAppTransactionId',
          to: 'transactions.id'
        }
      },

      types: {
        relation: Model.ManyToManyRelation,
        modelClass: Lookup,
        join: {
          from: 'users.id',
          through: {
            from: 'user_lookups.user_id',
            to: 'user_lookups.lookup_id'
          },
          to: 'lookups.id'
        },
        filter(builder: any) {
          builder.where('lookups.type', LOOKUP_USER_TYPES)
        }
      },

      notifications: {
        relation: Model.HasManyRelation,
        modelClass: Notification,
        join: {
          from: 'users.id',
          to: 'notifications.user_id'
        }
      },

      nftMessages: {
        relation: Model.HasManyRelation,
        modelClass: Comment,
        join: {
          from: 'users.id',
          to: 'comments.addressee_id'
        },
        filter(builder: any) {
          builder.where('nft_messages.message_type', MessageType.ASSET_MESSAGE)
        }
      },

      privateMessages: {
        relation: Model.HasManyRelation,
        modelClass: Comment,
        join: {
          from: 'users.id',
          to: 'comments.addressee_id'
        },
        filter(builder: any) {
          builder.where('private_messages.message_type', MessageType.PRIVATE_MESSAGE)
        }
      },

      ratings: {
        relation: Model.HasManyRelation,
        modelClass: Rating,
        join: {
          from: 'users.id',
          to: 'ratings.user_id'
        }
      },

      rewards: {
        relation: Model.HasManyRelation,
        modelClass: Transaction,
        as: 'rewards',
        join: {
          from: 'users.id',
          to: 'transactions.user_id'
        },
        filter(builder: any) {
          builder.where('type', TRANSACTION_TYPES.REWARD)
        }
      },

    };
  }
}


// See https://dev.to/tylerlwsmith/using-a-typescript-interface-to-define-model-properties-in-objection-js-1231
export type UserType = ModelObject<User>


