import {LOOKUP_USER_TYPES} from '../../db/models/Lookup'
import {findByType} from "../../helpers/lookup.helper";

const getUserTypes = async () => {
  return  await findByType(LOOKUP_USER_TYPES)
}

export default getUserTypes