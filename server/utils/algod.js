import algosdk from "algosdk";

// Algorand node settings
const server = 'https://testnet-api.voi.nodly.io';
const port = '443';
const token = '';

// Algorand indexer settings
const indexerServer = 'https://testnet-idx.voi.nodly.io';
const indexerPort = '443';
const indexerToken = '';


export const algodClientTestnet = new algosdk.Algodv2(token, server, port);
export const algodIndexerTestnet = new algosdk.Indexer(indexerToken, indexerServer, indexerPort);

export const algodClientMainnet = new algosdk.Algodv2(token, server, port);
export const algodIndexerMainnet = new algosdk.Indexer(indexerToken, indexerServer, indexerPort);
