import { ModelObject, Model } from 'objection'
import Base from './Base'
import {getRatingTotal} from "../../helpers/rating.helper";
import {ASSETKIND, CURRENCIES} from "../../services/const";
import {Rating} from "./Rating";
import {Transaction} from "./Transaction";
import {getCommentTotal} from "../../helpers/comment.helper";

export class Asset extends Base {
  static tableName = 'assets'

  id: number
  name: string
  description: string
  asaId: number
  ipfsPath: string
  filePath: string
  txId: string
  listingTxId: string | null
  buyTxId: string | null
  deListTxId: string | null
  price: number
  currency: string
  sellType: number
  saleType: string
  ownerAddress: string
  minterAddress: string
  buyerAddress: string
  walletAddress: string
  ratingTotals: any
  auctionTransactionId: number | null
  listTransactionId: number | null
  mintTransactionId: number
  buyTransactionId: number | null
  winBidTransactionId: number | null
  deListTransactionId: number | null
  appTransactionId: number | null
  optinTransactionId: number | null
  minterId: number | null
  signedTxn: string
  userId: number
  amount: number
  startTime: string
  endTime: string
  reservePrice: number
  totalComments: any
  winningBid: any
  deList: any
  owner: any
  kind: string
  cover: string
  ipfsPathOld: string
  views: number
  metadata: string
  duration: number

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'userId', 'kind'],
      properties: {
        id:                 { type: 'integer' },
        name:               { type: 'string' },
        description:        { type: ['string', 'null'] },
        asaId:              { type: ['integer', 'null'] },
        ipfsPath:           { type: ["string", "null"] },
        filePath:           { type: ["string", "null"] },
        txId:               { type: ["string", "null"] },
        listingTxId:        { type: ["string", "null"] },
        buyTxId:            { type: ["string", "null"] },
        deListTxId:         { type: ["string", "null"] },
        price:              { type: ["number", "null"] },
        currency:           { enum: [...Object.values(CURRENCIES), null] },
        userId:             { type: 'integer' },
        minterId:           { type: ['integer', 'null'] },
        auctionTransactionId:{ type: ['integer', 'null'] },
        listTransactionId:  { type: ['integer', 'null'] },
        mintTransactionId:  { type: ['integer', 'null'] },
        buyTransactionId:   { type: ['integer', 'null'] },
        winBidTransactionId:{ type: ['integer', 'null'] },
        deListTransactionId:{ type: ['integer', 'null'] },
        appTransactionId:   { type: ['integer', 'null'] },
        optinTransactionId: { type: ['integer', 'null'] },
        sellType:           { type: ['integer', 'null'] },
        views:              { type: ['integer', 'null'] },
        kind:               { enum: [...Object.values(ASSETKIND), null] },
        cover:              { type: ["string", "null"] },
        duration:           { type: ['integer', 'null'] },
      }
    }
  }

  async $afterFind(context: any) {
    const result = await super.$afterFind(context);
    if (this?.id) {
      this.ratingTotals = await getRatingTotal(this.id, 'assetId')
      this.totalComments = await getCommentTotal(this.id, 'assetId')
    }
    return result
  }

  $auction() {
    return (this.auctionTransactionId)
  }

  $listed() {
    return (this.listTransactionId || this.listingTxId)
  }

  $minted() {
    return (this.mintTransactionId || this.txId)
  }

  $bought() {
    return (this.buyTransactionId || this.buyTxId)
  }

  $appCreated() {
    return this.appTransactionId
  }

  static get relationMappings() {
    const {User} = require('./User');
    const {Lookup} = require('./Lookup');
    const {Rating} = require('./Rating');
    const {Comment} = require('./Comment');
    const {Transaction} = require("./Transaction")
    return {

      categories: {
        relation: Model.ManyToManyRelation,
        modelClass: Lookup,
        join: {
          from: 'assets.id',
          through: {
            from: 'asset_lookups.asset_id',
            to: 'asset_lookups.lookup_id'
          },
          to: 'lookups.id'
        }
      },

      ratings: {
        relation: Model.HasManyRelation,
        modelClass: Rating,
        join: {
          from: 'assets.id',
          to: 'ratings.asset_id'
        }
      },

      comments: {
        relation: Model.HasManyRelation,
        modelClass: Comment,
        join: {
          from: 'assets.id',
          to: 'comments.asset_id'
        }
      },

      transactions: {
        relation: Model.HasManyRelation,
        modelClass: Transaction,
        join: {
          from: 'assets.id',
          to: 'transactions.asset_id'
        }
      },

      owner: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'assets.user_id',
          to: 'users.id'
        }
      },

      minter: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'assets.minter_id',
          to: 'users.id'
        }
      },

      saleType: {
        relation: Model.BelongsToOneRelation,
        modelClass: Lookup,
        join: {
          from: 'assets.sell_type',
          to: 'lookups.id'
        }
      },

      mint: {
        relation: Model.BelongsToOneRelation,
        modelClass: Transaction,
        join: {
          from: 'assets.mintTransactionId',
          to: 'transactions.id'
        }
      },

      app: {
        relation: Model.BelongsToOneRelation,
        modelClass: Transaction,
        join: {
          from: 'assets.appTransactionId',
          to: 'transactions.id'
        }
      },

      optin: {
        relation: Model.BelongsToOneRelation,
        modelClass: Transaction,
        join: {
          from: 'assets.optinTransactionId',
          to: 'transactions.id'
        }
      },

      auction: {
        relation: Model.BelongsToOneRelation,
        modelClass: Transaction,
        join: {
          from: 'assets.auctionTransactionId',
          to: 'transactions.id'
        }
      },

      list: {
        relation: Model.BelongsToOneRelation,
        modelClass: Transaction,
        join: {
          from: 'assets.listTransactionId',
          to: 'transactions.id'
        }
      },

      buy: {
        relation: Model.BelongsToOneRelation,
        modelClass: Transaction,
        join: {
          from: 'assets.buyTransactionId',
          to: 'transactions.id'
        }
      },

      winningBid: {
        relation: Model.BelongsToOneRelation,
        modelClass: Transaction,
        join: {
          from: 'assets.winBidTransactionId',
          to: 'transactions.id'
        }
      },

      delist: {
        relation: Model.BelongsToOneRelation,
        modelClass: Transaction,
        join: {
          from: 'assets.deListTransactionId',
          to: 'transactions.id'
        }
      },

      /*
      myOptin: {
        relation: Model.HasOneThroughRelation,
        modelClass: Transaction,
        join: {
          from: 'assets.id',
          through: {
            // persons_movies is the join table.
            from: 'optins.assetId',
            to: 'optins.transactionId'
          },
          to: 'transactions.id'
        }
      }
      */


    }

  }
}

// See https://dev.to/tylerlwsmith/using-a-typescript-interface-to-define-model-properties-in-objection-js-1231
export type AssetType = ModelObject<Asset>

