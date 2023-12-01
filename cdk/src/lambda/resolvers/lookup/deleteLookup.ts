import {Lookup, LookupType} from '../../db/models/Lookup'

const deleteLookup = async (lookup: LookupType) => {
  await Lookup.query().deleteById(lookup.id)
  return lookup.id
}

export default deleteLookup