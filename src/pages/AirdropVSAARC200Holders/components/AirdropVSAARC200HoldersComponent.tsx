import type { ChangeEvent } from "react";
import React, { useState, useEffect } from "react";
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
import {
  formatAddress,
  formatVoiAmount,
  truncateTxId,
} from "../../../utils/formatting";

const handleTxIdClick = (txId) => {
  window.open(
    `https://block.voi.network/explorer/transaction/${txId}`,
    "_blank"
  );
};

const AirdropVSAARC200HoldersComponent: React.FC = () => {
  const { activeAccount, signTransactions } = useWallet();
  const [arc200TokenId, setArc200TokenId] = useState<string>("");
  const [arc200TokenOptions, setArc200TokenOptions] = useState<
    { name: string; id: string; decimals: number }[]
  >([]);
  const [arc200TokenInfo, setArc200TokenInfo] = useState({
    id: "",
    decimals: 6,
    name: "",
  });
  const [amount, setAmount] = useState<string>("");
  const [minBalance, setMinBalance] = useState<string>("");
  const [perHolderAmount, setPerHolderAmount] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [txIds, setTxIds] = useState<string[]>([]);
  const [totalGroups, setTotalGroups] = useState<number>(0);
  const [signedGroups, setSignedGroups] = useState<number>(0);
  const [totalTransactions, setTotalTransactions] = useState<number>(0);
  const [signedTransactions, setSignedTransactions] = useState<number>(0);
  const [voiBalance, setVoiBalance] = useState<number>(0);
  const [tokenOptions, setTokenOptions] = useState<
    { name: string; id: string; decimals: number; balance: number }[]
  >([]);
  const [tokenInfo, setTokenInfo] = useState({
    id: "",
    decimals: 6,
    name: "",
  });
  const [balance, setBalance] = useState(0);
  const [optedInAddresses, setOptedInAddresses] = useState<string[]>([]);
  const [notOptedInAddresses, setNotOptedInAddresses] = useState<string[]>([]);
  const [showOptedInList, setShowOptedInList] = useState<boolean>(false);
  const [showNotOptedInList, setShowNotOptedInList] = useState<boolean>(false);

  // Fetch ARC200 tokens
  useEffect(() => {
    const fetchTokens = async () => {
      if (!activeAccount) return;

      try {
        const response = await fetch(
          "https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/tokens?verified=true"
        );
        const data = await response.json();

        if (data && data.tokens) {
          const formattedTokens = data.tokens.map((token) => ({
            name: token.name,
            id: token.contractId.toString(),
            decimals: token.decimals,
          }));

          setArc200TokenOptions(formattedTokens);
        }
      } catch (error) {
        console.error("Failed to fetch ARC-200 tokens:", error);
      }
    };
    fetchTokens();
  }, [activeAccount]);

  // Fetch VSA tokens
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

  // Handle ARC200 token selection
  const handleArc200TokenChange = (selectedTokenId) => {
    const selectedToken = arc200TokenOptions.find(
      (token) => token.id === selectedTokenId
    );
    if (selectedToken) {
      setArc200TokenInfo(selectedToken);
      setArc200TokenId(selectedTokenId);
    }
  };

  // Handle VSA token selection
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

  // Load ARC200 token holders
  useEffect(() => {
    const loadArc200Holders = async () => {
      if (!arc200TokenId) return;
      setLoading(true);
      try {
        const response = await fetch(
          `https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/balances?contractId=${arc200TokenId}&limit=1000`
        );
        const data = await response.json();
        const validHolders = new Map<string, number>();

        if (data && data.balances) {
          data.balances.forEach((holder) => {
            const amount = Number(holder.balance);
            const normalizedAmount = amount / 10 ** arc200TokenInfo.decimals;
            const minBalanceNum = parseFloat(minBalance) || 0;
            if (amount > 0 && normalizedAmount >= minBalanceNum) {
              validHolders.set(holder.accountId, amount);
            }
          });
        }

        // Check opt-in status for all holders
        if (tokenInfo.id) {
          const optedIn: string[] = [];
          const notOptedIn: string[] = [];

          for (const address of validHolders.keys()) {
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
              console.error(
                `Error checking opt-in status for ${address}:`,
                error
              );
              notOptedIn.push(address);
            }
          }

          setOptedInAddresses(optedIn);
          setNotOptedInAddresses(notOptedIn);
        }
      } catch (error) {
        console.error("Failed to fetch token holders:", error);
      } finally {
        setLoading(false);
      }
    };

    loadArc200Holders();
  }, [arc200TokenId, minBalance, tokenInfo.id]);

  const handleInputChange =
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setter(event.target.value);
    };

  // Calculate amounts
  const actualTotalCost = perHolderAmount
    ? parseInt(amount || "0", 10) * optedInAddresses.length
    : parseInt(amount || "0", 10);

  const amountPerHolder = perHolderAmount
    ? parseInt(amount || "0", 10)
    : optedInAddresses.length > 0
    ? Math.floor(parseInt(amount || "0", 10) / optedInAddresses.length)
    : 0;

  const handleSendVSA = async () => {
    if (!activeAccount || !tokenInfo.id || !amount || !arc200TokenId) {
      alert(
        "Please connect your wallet, select both tokens, and specify an amount."
      );
      return;
    }

    setLoading(true);
    setTxIds([]);
    setTotalGroups(0);
    setSignedGroups(0);
    setTotalTransactions(0);
    setSignedTransactions(0);

    try {
      const suggestedParams = await algodClient.getTransactionParams().do();
      const txnGroups = [];

      for (let i = 0; i < optedInAddresses.length; i += 16) {
        const txnChunk = optedInAddresses.slice(i, i + 16).map((receiver) => {
          const txnAmount = perHolderAmount
            ? parseInt(amount, 10) * Math.pow(10, tokenInfo.decimals)
            : Math.floor(
                (parseInt(amount, 10) * Math.pow(10, tokenInfo.decimals)) /
                  optedInAddresses.length
              );

          return algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            from: activeAccount.address,
            to: receiver,
            amount: txnAmount,
            assetIndex: parseInt(tokenInfo.id),
            suggestedParams,
          });
        });

        txnGroups.push(txnChunk);
      }

      setTotalGroups(txnGroups.length);
      setTotalTransactions(optedInAddresses.length);

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
          collection: arc200TokenId,
          receivers: optedInAddresses,
          amounts: optedInAddresses.map(() =>
            perHolderAmount
              ? parseInt(amount, 10) * Math.pow(10, tokenInfo.decimals)
              : Math.floor(
                  (parseInt(amount, 10) * Math.pow(10, tokenInfo.decimals)) /
                    optedInAddresses.length
                )
          ),
          totalAmount: actualTotalCost * Math.pow(10, tokenInfo.decimals),
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

  // Load VOI balance
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

  return (
    <>
      <Grid numItemsSm={1} numItemsLg={1} className="flex justify-center">
        <Card className="flex max-w-screen-lg flex-col items-center">
          <div className="flex items-center">
            <Metric className="mb-4 ml-16 grow text-center font-pixel">
              VSA Token Holder Airdropper
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
          <Divider className="font-bold">
            Step 1: Select an ARC-200 Token
          </Divider>
          <SearchSelect
            placeholder="Select ARC-200 Token"
            className=""
            onValueChange={handleArc200TokenChange}
            disabled={!activeAccount}
          >
            {arc200TokenOptions.map((token) => (
              <SearchSelectItem key={token.id} value={token.id}>
                {token.name} (ID: {token.id})
              </SearchSelectItem>
            ))}
          </SearchSelect>
          <TextInput
            placeholder={`Minimum ${
              arc200TokenInfo.name || "Token"
            } Balance to Include (optional)`}
            onChange={handleInputChange(setMinBalance)}
            className="mt-4"
          />
          <Text className="mt-2 text-sm text-gray-600">
            Only include holders with at least this many tokens in the airdrop
          </Text>
          <Divider className="mt-12 font-bold">
            Step 2: Select VSA Token and Amount
          </Divider>
          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
            <SearchSelect
              placeholder="Select VSA Token"
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
            <Text>Amount per Holder</Text>
          </div>
          <Divider className="mt-12 font-bold">Step 3: Check details</Divider>
          <div className="mb-2 flex flex-col items-center justify-center space-y-2 md:flex-row md:space-x-4 md:space-y-0">
            <Text className="text-center">
              <span className="font-bold">Total Cost:</span> {actualTotalCost}{" "}
              {tokenInfo.name}
            </Text>
            <Text className="text-center">
              <span className="font-bold">Unique Holders:</span>{" "}
              {optedInAddresses.length + notOptedInAddresses.length}
            </Text>
            <Text className="text-center">
              <span className="font-bold">Amount per Holder:</span>{" "}
              {amountPerHolder} {tokenInfo.name}
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
            onClick={handleSendVSA}
            type="button"
            loading={loading}
            disabled={
              loading ||
              !activeAccount ||
              !amount ||
              amountPerHolder === 0 ||
              arc200TokenOptions.length === 0 ||
              !arc200TokenId ||
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

export default AirdropVSAARC200HoldersComponent;
