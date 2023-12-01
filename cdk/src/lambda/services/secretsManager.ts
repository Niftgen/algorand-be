const AWS = require('aws-sdk');
const {SecretsManager} = require('aws-sdk')

export const retrieveSecret = async (id: string) => {
  AWS.config.update({region: process.env.REGION});
  const sm = new SecretsManager()
  const {SecretString: secret} = await sm
    .getSecretValue({
      SecretId: id
    })
    .promise();
  if (!secret) throw Error(`Could not retrieve secret with ID ${id}`)
  return secret
}


