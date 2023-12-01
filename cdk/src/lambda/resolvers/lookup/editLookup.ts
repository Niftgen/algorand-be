import {LookupType} from '../../db/models/Lookup'
import {updateLookup} from "../../helpers/lookup.helper";

const editLookup = async (lookup: LookupType) => {
  return await updateLookup(lookup)
}

export default editLookup