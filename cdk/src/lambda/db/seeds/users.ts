import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
    // Deletes ALL existing entries
    await knex("users").del()

    // Inserts seed entries
    await knex("users").insert([
      {
        avatarPath: "test avatar",
        dateOfBirth: '1963-01-27',
        email: 'test@isp.com',
        userName: 'test',
        walletAddress: 'MAUDQAJVCNLOTUTMB5MEML7CV7MLVWXRLKZNI5HS7RLA6TYLGCIMTMYIT4'
      },
      {
        avatarPath: "kath avatar",
        dateOfBirth: '1967-01-27',
        email: 'kath@isp.com',
        userName: 'kath',
        walletAddress: 'OIYLZAZ6VDTLX7BGFIA56HYYQJC5BQOQ7TBW6ZDNQRVZ7LTPBIOT5SNQRQ'
      },
      {
        avatarPath: "ollie avatar",
        dateOfBirth: '2014-05-10',
        email: 'ollie@isp.com',
        userName: 'ollie',
        walletAddress: 'QZTVGMUZVEY23475LEMTOVKAP36K4GYNFPB5WAK2RSRTEHLNPYZBLCCSV4'
      },
    ])
}
