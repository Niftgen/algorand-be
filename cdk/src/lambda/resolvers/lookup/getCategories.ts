import {LOOKUP_CATEGORIES} from '../../db/models/Lookup'
import {findByType} from "../../helpers/lookup.helper";

const getCategories = async () => {
  return  await findByType(LOOKUP_CATEGORIES)
}

export default getCategories