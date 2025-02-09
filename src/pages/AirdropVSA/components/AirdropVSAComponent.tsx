import type { ChangeEvent } from "react";
import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Button,
  Grid,
  Text,
  Metric,
  Divider,
  TextInput,
  DialogPanel,
  Dialog,
  SearchSelect,
  SearchSelectItem,
  ProgressBar,
  Switch,
  List,
  ListItem,
} from "@tremor/react";
import "./spinner.css";
import confetti from "canvas-confetti";
import { useWallet } from "@txnlab/use-wallet-react";
import algosdk from "algosdk";
import { algodClient } from "../../../utils/algod";
import hammer from "../../../assets/hammer.png";
import { Link } from "@nextui-org/react";
import { fetchTokensAndOwners, fetchProjects } from "../../../utils/api";
import {
  formatAddress,
  formatVoiAmount,
  truncateTxId,
} from "../../../utils/formatting";

interface Token {
  owner: string;
  tokenId: string;
}

const handleTxIdClick = (txId) => {
  window.open(
    `https://block.voi.network/explorer/transaction/${txId}`,
    "_blank"
  );
};

const AirdropVSAComponent: React.FC = () => {
  const { activeAccount, signTransactions } = useWallet();
  const [collectionId, setCollectionId] = useState<string>("");
  const [collections, setCollections] = useState<
    { contractId: number; name: string }[]
  >([]);
  const [amount, setAmount] = useState<string>("");
  const [perHolderAmount, setPerHolderAmount] = useState<boolean>(false);
  const [distributeUnique, setDistributeUnique] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [txIds, setTxIds] = useState<string[]>([]);
  const [totalGroups, setTotalGroups] = useState<number>(0);
  const [signedGroups, setSignedGroups] = useState<number>(0);
  const [totalTransactions, setTotalTransactions] = useState<number>(0);
  const [signedTransactions, setSignedTransactions] = useState<number>(0);
  const [uniqueTokensCount, setUniqueTokensCount] = useState<number>(0);
  const [balance, setBalance] = useState(0);
  const [voiBalance, setVoiBalance] = useState<number>(0);
  const [tokenInfo, setTokenInfo] = useState({
    id: "",
    decimals: 6,
    name: "",
  });
  const [tokenOptions, setTokenOptions] = useState<
    { name: string; id: string; decimals: number; balance: number }[]
  >([]);
  const [optedInAddresses, setOptedInAddresses] = useState<string[]>([]);
  const [notOptedInAddresses, setNotOptedInAddresses] = useState<string[]>([]);
  const [showOptedInList, setShowOptedInList] = useState<boolean>(false);
  const [showNotOptedInList, setShowNotOptedInList] = useState<boolean>(false);

  const bottomSwitchText = distributeUnique
    ? "Amount per holder"
    : "Amount per NFT";

  useEffect(() => {
    const loadTokensAndOwners = async () => {
      if (!collectionId) return;
      setLoading(true);
      try {
        const tokens = (await fetchTokensAndOwners(collectionId)) as Token[];
        console.log(tokens);
        const uniqueHolders = new Set(tokens.map((token) => token.owner));

        const uniqueTokens = new Set(tokens.map((token) => token.tokenId));
        setUniqueTokensCount(uniqueTokens.size);
        console.log(uniqueTokens);

        // Check opt-in status for all unique holders
        if (tokenInfo.id) {
          const optedIn: string[] = [];
          const notOptedIn: string[] = [];

          for (const address of uniqueHolders) {
            try {
              const accountInfo = await algodClient
                .accountInformation(address)
                .do();
              const hasOptedIn = accountInfo["assets"]?.some(
                (asset) => asset["asset-id"].toString() === tokenInfo.id
              );
              if (hasOptedIn) {
                optedIn.push(address);
              } else {
                notOptedIn.push(address);
              }
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              console.error(
                `Error checking opt-in status for ${address}:`,
                errorMessage
              );
              notOptedIn.push(address);
            }
          }

          setOptedInAddresses(optedIn);
          setNotOptedInAddresses(notOptedIn);
        }
      } catch (error) {
        console.error("Failed to fetch tokens and owners:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTokensAndOwners();
  }, [collectionId, tokenInfo.id]);

  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true);
      try {
        const projectsData = await fetchProjects();
        const uniqueProjects = Array.from(
          new Map(
            projectsData.map((project: any) => [project.applicationID, project])
          ).values()
        );
        const formattedProjects = uniqueProjects.map((project: any) => ({
          contractId: project.applicationID,
          name: project.title,
        }));
        setCollections(formattedProjects);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
        alert("Failed to fetch projects.");
      } finally {
        setLoading(false);
      }
    };
    loadProjects();
  }, []);

  useEffect(() => {
    if (!activeAccount) {
      setTokenOptions([]);
      return;
    }

    const fetchAssets = async () => {
      try {
        const accountInfo = await algodClient
          .accountInformation(activeAccount.address)
          .do();

        const assets = accountInfo["assets"] || [];
        const formattedAssets = await Promise.all(
          assets.map(async (asset) => {
            const assetInfo = await algodClient
              .getAssetByID(asset["asset-id"])
              .do();
            return {
              name: assetInfo["params"].name,
              id: asset["asset-id"].toString(),
              decimals: assetInfo["params"].decimals,
              balance: asset.amount,
            };
          })
        );

        setTokenOptions(formattedAssets);
      } catch (error) {
        console.error("Failed to fetch VSAs:", error);
      }
    };
    fetchAssets();
  }, [activeAccount]);

  const handleTokenChange = (selectedTokenId) => {
    const selectedToken = tokenOptions.find(
      (token) => token.id === selectedTokenId
    );
    if (selectedToken) {
      setTokenInfo({
        id: selectedToken.id,
        decimals: selectedToken.decimals,
        name: selectedToken.name,
      });
      setBalance(selectedToken.balance);
    }
  };

  useEffect(() => {
    const loadAccountInfo = async () => {
      if (activeAccount && activeAccount.address) {
        try {
          const accountInfo = await algodClient
            .accountInformation(activeAccount.address)
            .do();

          if (accountInfo && accountInfo["amount"]) {
            setVoiBalance(accountInfo["amount"]);
          }
        } catch (error) {
          console.error("Failed to fetch account information:", error);
        }
      }
    };

    loadAccountInfo();
  }, [activeAccount]);

  const handleInputChange =
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setter(event.target.value);
    };

  // Calculate the number of tokens owned by opted-in addresses
  const optedInTokenCount = useMemo(() => {
    if (!collectionId || !tokenInfo.id) return 0;
    return uniqueTokensCount;
  }, [collectionId, tokenInfo.id, uniqueTokensCount]);

  let amountPerHolderNFT = 0;
  let actualTotalCost = 0;

  if (amount && !isNaN(parseInt(amount, 10))) {
    if (perHolderAmount) {
      // If amount is per holder/NFT
      if (distributeUnique) {
        // Per holder
        amountPerHolderNFT = parseInt(amount, 10);
        actualTotalCost = parseInt(amount, 10) * optedInAddresses.length;
      } else {
        // Per NFT
        amountPerHolderNFT = parseInt(amount, 10);
        actualTotalCost = parseInt(amount, 10) * optedInTokenCount;
      }
    } else {
      // If amount is total amount
      if (distributeUnique) {
        // Split among holders
        amountPerHolderNFT =
          optedInAddresses.length > 0
            ? parseInt(amount, 10) / optedInAddresses.length
            : 0;
        actualTotalCost = parseInt(amount, 10);
      } else {
        // Split among NFTs
        amountPerHolderNFT =
          optedInTokenCount > 0 ? parseInt(amount, 10) / optedInTokenCount : 0;
        actualTotalCost = parseInt(amount, 10);
      }
    }
  }

  // For display purposes only
  const totalCost = actualTotalCost;

  const handleSendAlgo = async () => {
    if (!activeAccount) {
      alert("Please connect your wallet.");
      return;
    }

    if (!collectionId || !amount || !tokenInfo.id) {
      alert("Please select a collection, token, and specify an amount.");
      return;
    }
    setLoading(true);
    setTxIds([]);
    setTotalGroups(0);
    setSignedGroups(0);
    setTotalTransactions(0);
    setSignedTransactions(0);

    const amountsPerReceiver: Record<string, number> = {};
    let totalAirdroppedAmount = 0;

    try {
      const response = await fetch(
        `https://arc72-voi-mainnet.nftnavigator.xyz/nft-indexer/v1/tokens?contractId=${collectionId}`
      );
      const { tokens } = await response.json();

      const tokenCounts = tokens.reduce((acc, token) => {
        // Only count tokens for opted-in addresses
        if (optedInAddresses.includes(token.owner)) {
          acc[token.owner] = (acc[token.owner] || 0) + 1;
        }
        return acc;
      }, {});

      const receivers = tokens
        .map((token) => token.owner)
        .filter((owner) => optedInAddresses.includes(owner));
      const uniqueReceivers = distributeUnique
        ? [...new Set(receivers)]
        : receivers;

      const suggestedParams = await algodClient.getTransactionParams().do();
      const txnGroups = [];

      uniqueReceivers.forEach((receiver) => {
        const tokensForAddress = distributeUnique ? 1 : tokenCounts[receiver];
        const txnAmount = perHolderAmount
          ? parseInt(amount, 10) *
            Math.pow(10, tokenInfo.decimals) *
            tokensForAddress
          : Math.floor(
              (parseInt(amount, 10) * Math.pow(10, tokenInfo.decimals)) /
                uniqueReceivers.length
            ) * tokensForAddress;

        amountsPerReceiver[receiver] = txnAmount;
        totalAirdroppedAmount += txnAmount;
      });

      const receiverAddresses = Object.keys(amountsPerReceiver);
      for (let i = 0; i < receiverAddresses.length; i += 16) {
        const txnChunk = receiverAddresses.slice(i, i + 16).map((receiver) => {
          return algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            from: activeAccount.address,
            to: receiver,
            amount: amountsPerReceiver[receiver],
            assetIndex: parseInt(tokenInfo.id),
            suggestedParams,
          });
        });

        txnGroups.push(txnChunk);
      }

      setTotalGroups(txnGroups.length);
      setTotalTransactions(receiverAddresses.length);

      for (const txns of txnGroups) {
        const groupId = algosdk.computeGroupID(txns);
        txns.forEach((txn) => (txn.group = groupId));

        const binaryTxns = txns.map((txn) => txn.toByte());

        const signedTxns = await signTransactions(binaryTxns);
        const sendTxnResponse = await algodClient
          .sendRawTransaction(signedTxns)
          .do();
        setTxIds((prev) => [...prev, sendTxnResponse.txId]);
        setSignedGroups((prev) => prev + 1);
        setSignedTransactions((prev) => prev + txns.length);
        console.log(
          `Group sent successfully, first transaction ID: ${sendTxnResponse.txId}`
        );
      }

      confetti({
        zIndex: 999,
        particleCount: 1000,
        spread: 250,
        origin: { y: 0.6 },
      });
      setDialogOpen(true);
    } catch (error) {
      console.error("Token transfer failed:", error);
      alert(`Failed to send tokens. Error: ${error.message}`);
    } finally {
      fetch("/api/record-collection-airdrop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: activeAccount.address,
          network: "mainnet",
          tokenId: tokenInfo.id,
          tokenName: tokenInfo.name,
          tokenDecimals: tokenInfo.decimals,
          collection: collectionId,
          receivers: Object.keys(amountsPerReceiver),
          amounts: Object.values(amountsPerReceiver),
          totalAmount: totalAirdroppedAmount,
        }),
      })
        .then((response) => response.json())
        .then((data) => console.log("Airdrop record response:", data))
        .catch((error) => {
          console.error("Error recording airdrop:", error);
        });
      setLoading(false);
    }
  };

  return (
    <>
      <Grid numItemsSm={1} numItemsLg={1} className="flex justify-center">
        <Card className="flex max-w-screen-lg flex-col items-center">
          <div className="flex items-center">
            <Metric className="mb-4 ml-16 grow text-center font-pixel">
              VSA Collection Airdropper
            </Metric>
            <img src={hammer} alt="Hammer" className="mb-4 ml-4 size-10" />
          </div>
          {!activeAccount && (
            <Text className="mt-2 text-center">
              Connect a wallet top right to get started!
            </Text>
          )}
          {activeAccount && (
            <div className="mt-2 flex flex-col items-center justify-center space-y-2 md:flex-row md:space-x-4 md:space-y-0">
              <Text className="text-center">
                {" "}
                <span className="font-bold">Connected: </span>
                {formatAddress(activeAccount.address)}
              </Text>
              <Text className="text-center">
                <span className="font-bold">VOI Balance: </span>{" "}
                {formatVoiAmount(
                  isNaN(voiBalance) ? 0 : Math.round(voiBalance / 1000000)
                )}
              </Text>
              {tokenInfo.id && (
                <Text className="text-center">
                  <span className="font-bold">
                    {tokenInfo.name || "Token"} Balance:{" "}
                  </span>{" "}
                  {balance / Math.pow(10, tokenInfo.decimals)}
                </Text>
              )}
            </div>
          )}
          <Divider className="font-bold">Step 1: Select a Collection</Divider>
          <SearchSelect
            placeholder="Select Collection"
            className=""
            onValueChange={setCollectionId}
          >
            {collections.map((collection) => (
              <SearchSelectItem
                key={collection.contractId}
                value={String(collection.contractId)}
              >
                {collection.name} ({collection.contractId})
              </SearchSelectItem>
            ))}
          </SearchSelect>
          <div className="mt-4 flex items-center space-x-3">
            <Text>Distribute per NFT</Text>
            <Switch
              checked={distributeUnique}
              onChange={() => setDistributeUnique(!distributeUnique)}
            />
            <Text>Distribute per holder</Text>
          </div>
          <Divider className="mt-12 font-bold">
            Step 2: Select Token and Amount
          </Divider>
          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
            <SearchSelect
              placeholder="Select Token"
              onValueChange={handleTokenChange}
            >
              {tokenOptions.map((token) => (
                <SearchSelectItem key={token.id} value={token.id}>
                  {token.name} ({token.id}) - Balance:{" "}
                  {token.balance / Math.pow(10, token.decimals)}
                </SearchSelectItem>
              ))}
            </SearchSelect>
            <TextInput
              placeholder="Amount of tokens"
              onChange={handleInputChange(setAmount)}
            />
          </div>
          <div className="mt-4 flex items-center space-x-3">
            <Text>Amount in Total</Text>
            <Switch
              checked={perHolderAmount}
              onChange={() => setPerHolderAmount(!perHolderAmount)}
            />
            <Text>{bottomSwitchText}</Text>
          </div>
          <Divider className="mt-12 font-bold">Step 3: Check details</Divider>
          <div className="mb-2 flex flex-col items-center justify-center space-y-2 md:flex-row md:space-x-4 md:space-y-0">
            <Text className="text-center">
              <span className="font-bold">Total Cost:</span> {totalCost}{" "}
              {tokenInfo.name}
            </Text>
            <Text className="text-center">
              <span className="font-bold">
                Unique {distributeUnique ? "Holders" : "NFTs"}:
              </span>{" "}
              {distributeUnique
                ? optedInAddresses.length + notOptedInAddresses.length
                : uniqueTokensCount}
            </Text>
            <Text className="text-center">
              <span className="font-bold">
                Amount per {distributeUnique ? "Holder" : "NFT"}:
              </span>{" "}
              {amountPerHolderNFT} {tokenInfo.name}
            </Text>
          </div>
          <div className="mt-2 flex items-center space-x-4">
            <Link
              onClick={() => setShowOptedInList(true)}
              color="success"
              className="cursor-pointer"
            >
              Opted-in Addresses: {optedInAddresses.length}
            </Link>
            <Link
              onClick={() => setShowNotOptedInList(true)}
              color="danger"
              className="cursor-pointer"
            >
              Not Opted-in Addresses: {notOptedInAddresses.length}
            </Link>
          </div>
          <Button
            size="lg"
            className="mt-6 w-40"
            onClick={handleSendAlgo}
            type="button"
            loading={loading}
            disabled={
              loading ||
              !activeAccount ||
              !amount ||
              amountPerHolderNFT === 0 ||
              collections.length === 0 ||
              !collectionId ||
              !tokenInfo.id ||
              actualTotalCost === 0 ||
              actualTotalCost * Math.pow(10, tokenInfo.decimals) > balance
            }
          >
            Send it!
          </Button>
          <ProgressBar
            value={(signedGroups / totalGroups) * 100}
            className="mt-8 w-full"
          />
          <Text className="mt-2">{`Progress: ${signedGroups} of ${totalGroups} groups signed ( ${signedTransactions} / ${totalTransactions} Transactions Sent ).`}</Text>
        </Card>
      </Grid>

      {/* Opted-in Addresses Dialog */}
      <Dialog open={showOptedInList} onClose={() => setShowOptedInList(false)}>
        <DialogPanel className="ml-56 max-h-96 overflow-y-auto border-2 border-gray-300 p-6">
          <h3 className="mb-4 text-lg font-bold">Opted-in Addresses</h3>
          <List>
            {optedInAddresses.map((address) => (
              <ListItem key={address}>
                <Link
                  href={`https://block.voi.network/explorer/account/${address}`}
                  target="_blank"
                  color="success"
                >
                  {address}
                </Link>
              </ListItem>
            ))}
          </List>
        </DialogPanel>
      </Dialog>

      {/* Not Opted-in Addresses Dialog */}
      <Dialog
        open={showNotOptedInList}
        onClose={() => setShowNotOptedInList(false)}
      >
        <DialogPanel className="ml-56 max-h-96 overflow-y-auto border-2 border-gray-300 p-6">
          <h3 className="mb-4 text-lg font-bold">Not Opted-in Addresses</h3>
          <List>
            {notOptedInAddresses.map((address) => (
              <ListItem key={address}>
                <Link
                  href={`https://block.voi.network/explorer/account/${address}`}
                  target="_blank"
                  color="danger"
                >
                  {address}
                </Link>
              </ListItem>
            ))}
          </List>
        </DialogPanel>
      </Dialog>

      {/* Success Dialog */}
      {dialogOpen && (
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
          <DialogPanel className="ml-56 border-2 border-gray-300 p-6">
            <p>{tokenInfo.name} Sent Successfully!</p>
            <p className="mt-2">
              <span className="mr-2">Transaction ID(s):</span>
              {txIds.map((txId, index) => (
                <React.Fragment key={txId}>
                  {index > 0 && ", "}
                  <Link onClick={() => handleTxIdClick(txId)} color="danger">
                    {truncateTxId(txId)}
                  </Link>
                </React.Fragment>
              ))}
            </p>
          </DialogPanel>
        </Dialog>
      )}
    </>
  );
};

export default AirdropVSAComponent;
