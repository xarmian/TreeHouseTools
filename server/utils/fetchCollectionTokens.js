import axios from "axios"

export const fetchTokensAndOwners = async (collectionId) => {
  const response = await axios.get(`https://arc72-idx.nftnavigator.xyz/nft-indexer/v1/tokens?contractId=${collectionId}`);
  const data = response.data;
  return data.tokens;
};


