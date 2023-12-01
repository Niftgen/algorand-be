
export const userFragment = () => {
  return `
    fragment user on User {
      id
      avatarPath
      dateOfBirth
      email
      userName
      walletAddress
      createdAt
      updatedAt
      bio
      twitterUrl
      instagramUrl
      discordUrl
      facebookUrl
      videoCreator
      kyc
      kycToken
      kycDate
      metadata
      creatorAppTransactionId
      referralCode
      creatorReferralCode
      creatorApp {
        id
        type
        txIds
        userId
        createdAt
        updatedAt
        appId
        appAddress
      }
      interests{
        id
        active
        description
        type
        createdAt
        updatedAt
      }
      types{
        id
        active
        description
        type
        createdAt
        updatedAt
      }
      notifications{
        id
      }
      messageReceivedTotals {
        nftMessageTotal
        nftMessageRead                
        privateMessageTotal
        privateMessageRead
      }
    }    
  `
}

export const transactionFragment = () => {
  return `
    fragment transaction on Transaction {
      id
      type
      txIds
      amount
      currency
      userId
      buyerId
      assetId
      auctionId
      sellType
      owner {
        ...user
      }
      buyer {
        ...user
      }
      saleType {
        id
        description
      }
      royaltyFee
      createdAt
      updatedAt
      appId
      appAddress
      startTime
      endTime
      asset {
        id
        name
        description        
      }
    }
  `
}

