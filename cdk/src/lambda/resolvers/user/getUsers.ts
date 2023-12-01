import {User} from '../../db/models/User'

const getUsers = async () => {
  return await User.query()
    .withGraphJoined('[interests, types]')
}

export default getUsers