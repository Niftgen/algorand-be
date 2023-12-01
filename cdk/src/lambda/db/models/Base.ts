import {AjvValidator, Model} from 'objection'
const addFormats = require("ajv-formats")

export default class Base extends Model {
  createdAt: Date
  updatedAt: Date

  // NOT USING THIS METHOD AS IT CAUSES ISSUES WITH AWS
  // Prevent https://vincit.github.io/objection.js/guide/relations.html#require-loops
  // Define all relationship modelClass: 'Lookup' with quotes
  //static get modelPaths() {
  //  return [__dirname];
  //}

  static createValidator() {
    return new AjvValidator({
      onCreateAjv: ajv => {
        // Here you can modify the `Ajv` instance.
        addFormats(ajv)
      },
    })
  }

  $beforeInsert() {
    this.createdAt = new Date()
  }

  $beforeUpdate() {
    if (!this.updatedAt) this.updatedAt = new Date()
  }

  // Convert string dates to dates
  // See https://github.com/Vincit/objection.js/issues/663
  $parseDatabaseJson(json: any) {
    json = super.$parseDatabaseJson(json)
    Object.keys(json).forEach(prop => {
      const value = json[prop]
      if (value instanceof Date) {
        json[prop] = value.toISOString()
      }
    })
    return json
  }
}
