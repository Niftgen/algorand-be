import { ModelObject } from 'objection'
import Base from "./Base"

export class Auth extends Base {
  static tableName = 'auth'

  id: number
  expiry: Date
  verified: boolean
  walletAddress: string

  static async find(walletAddress: string) {
    return await this.query()
      .findOne({
        walletAddress: walletAddress
      })
  }

}

export type AuthType = ModelObject<Auth>
