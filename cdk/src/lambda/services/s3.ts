const {S3} = require('aws-sdk');

export async function s3Get(bucket: string, key: string) {
  const params = {
    Bucket: bucket,
    Key: key
  }
  const s3 = new S3();
  try {
    const response = await s3
      .getObject(params)
      .promise();
    return response.Body.toString()
  } catch (error) {
    console.log(error)
  }
}
