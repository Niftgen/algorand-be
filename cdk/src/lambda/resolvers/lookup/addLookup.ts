import {LookupType} from '../../db/models/Lookup'
import {createLookup} from "../../helpers/lookup.helper";

const addLookup = async (lookup: LookupType) => {
  return await createLookup(lookup)
}

export default addLookup