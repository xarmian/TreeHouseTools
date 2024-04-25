
import { algodClient } from './algod';

// Fetch tokens and owners based on collection ID
export const fetchTokensAndOwners = async (collectionId) => {
  const response = await fetch(`https://arc72-idx.nftnavigator.xyz/nft-indexer/v1/tokens?contractId=${collectionId}`);
  const data = await response.json();
  return data.tokens;
};

// Fetch projects
export const fetchProjects = async () => {
  const response = await fetch(`https://test-voi.api.highforge.io/v2/projects`);
  const data = await response.json();
  return [
    ...data.nftGamesProjects,
    ...data.recentlyCreated,
    ...data.recentlyLaunched,
    ...data.recentlyMinted,
    ...data.trending,
    ...data.upcoming,
  ];
};

// Fetch Algorand account information
export const fetchAccountInfo = async (address) => {
  const accountInfo = await algodClient.accountInformation(address).do();
  return accountInfo;
};

//schedule collection holder snapshot
export const scheduleCollectionHolderSnapshot = async ( network, contractId, snapshotTime, emailAddress) => {
  const payload = {
    network,
    contractId,
    snapshotTime,
    emailAddress
  };

  const response = await fetch('/api/schedule-collection-snapshot', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to schedule snapshot');
  }

  return await response.json();
};

//schedule collection holder snapshot
export const scheduleArc200HolderSnapshot = async ( network, tokenId, snapshotTime, emailAddress) => {
  const payload = {
    network,
    tokenId,
    snapshotTime,
    emailAddress
  };

  const response = await fetch('/api/schedule-arc200-snapshot', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to schedule snapshot');
  }

  return await response.json();
};

