import {LookupType} from '../../db/models/Lookup'
import {findByType} from "../../helpers/lookup.helper";

const getLookupsForType = async (lookup: LookupType) => {
  return  await findByType(lookup.type)
}

export default getLookupsForType