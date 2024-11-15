import algosdk from "algosdk";

// Algorand node settings
const server = "https://mainnet-api.voi.nodely.dev";
const port = "443";
const token = "";

// Algorand indexer settings
const indexerServer = "https://mainnet-idx.voi.nodely.dev";
const indexerPort = "443";
const indexerToken = "";

// Algorand Testnet node settings
const testserver = "https://testnet-api.algonode.cloud";
const testport = "443";
const testtoken = "";

// Initialize the Algodv2 client
export const algodClient = new algosdk.Algodv2(token, server, port);
export const testalgodClient = new algosdk.Algodv2(
  testtoken,
  testserver,
  testport
);
export const algodIndexer = new algosdk.Indexer(
  indexerToken,
  indexerServer,
  indexerPort
);
