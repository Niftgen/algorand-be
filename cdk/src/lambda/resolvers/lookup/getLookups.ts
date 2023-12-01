import {Lookup} from '../../db/models/Lookup'

const getLookups = async () => {
  return await Lookup.query().where({active: true})
}

export default getLookups