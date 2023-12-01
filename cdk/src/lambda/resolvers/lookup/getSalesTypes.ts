import {LOOKUP_SALE_TYPES} from '../../db/models/Lookup'
import {findByType} from "../../helpers/lookup.helper";

const getSaleTypes = async () => {
  return  await findByType(LOOKUP_SALE_TYPES)
}

export default getSaleTypes