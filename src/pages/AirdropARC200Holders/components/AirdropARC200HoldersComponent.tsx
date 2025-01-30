import type { ChangeEvent } from "react";
import { useState, useEffect } from "react";
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
} from "@tremor/react";
import "./spinner.css";
import confetti from "canvas-confetti";
import { useWallet } from "@txnlab/use-wallet-react";
import algosdk from "algosdk";
import { algodClient } from "../../../utils/algod";
import hammer from "../../../assets/hammer.png";
import { Link } from "@nextui-org/react";
import React from "react";
import { fetchAccountInfo } from "../../../utils/api";
import {
  formatAddress,
  formatVoiAmount,
  truncateTxId,
} from "../../../utils/formatting";

const handleTxIdClick = (txId) => {
  window.open(`https://voi.observer/explorer/transaction/${txId}`, "_blank");
};

const AirdropArc200HoldersComponent: React.FC = () => {
  const { activeAccount, signTransactions } = useWallet();
  const [tokenId, setTokenId] = useState<string>("");
  const [tokenOptions, setTokenOptions] = useState<
    { name: string; id: string; decimals: number }[]
  >([]);
  const [tokenInfo, setTokenInfo] = useState({
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
  const [lpHolders, setLpHolders] = useState<Map<string, number>>(new Map());
  const [voiBalance, setVoiBalance] = useState<number>(0);
  const [, setBalance] = useState<number>(0);

  useEffect(() => {
    const fetchTokens = async () => {
      if (!activeAccount) return;

      try {
        const response = await fetch(
          "https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/balances?accountId=" +
            activeAccount.address
        );
        const data = await response.json();
        const formattedTokens = await Promise.all(
          data.balances.map(async (token) => {
            const infoRequest = await fetch(
              "https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/tokens?contractId=" +
                token.contractId
            );
            const infoData = await infoRequest.json();
            return {
              name: infoData.tokens[0].name,
              id: token.contractId.toString(),
              decimals: infoData.tokens[0].decimals,
            };
          })
        );

        setTokenOptions(formattedTokens);
        // Set default token if available
        if (formattedTokens.length > 0) {
          setTokenInfo(formattedTokens[0]);
          setTokenId(formattedTokens[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch ARC-200 tokens:", error);
      }
    };
    fetchTokens();
  }, [activeAccount]);

  const handleTokenChange = (selectedTokenId) => {
    const selectedToken = tokenOptions.find(
      (token) => token.id === selectedTokenId
    );
    if (selectedToken) {
      setTokenInfo(selectedToken);
      setTokenId(selectedTokenId);
    }
  };

  useEffect(() => {
    const loadLPandHolders = async () => {
      if (!tokenId) return;
      setLoading(true);
      try {
        const response = await fetch(
          `https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/balances?contractId=${tokenId}&limit=1000`
        );
        const data = await response.json();
        const validHolders = new Map<string, number>();

        if (data && data.balances) {
          data.balances.forEach((holder) => {
            const amount = Number(holder.balance);
            const normalizedAmount = amount / 10 ** tokenInfo.decimals;
            const minBalanceNum = parseFloat(minBalance) || 0;
            if (amount > 0 && normalizedAmount >= minBalanceNum) {
              validHolders.set(holder.accountId, amount);
            }
          });
        }

        setLpHolders(validHolders);
      } catch (error) {
        console.error("Failed to fetch token holders:", error);
      } finally {
        setLoading(false);
      }
    };

    loadLPandHolders();
  }, [tokenId, minBalance]);

  const handleInputChange =
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setter(event.target.value);
    };

  const totalCost = perHolderAmount
    ? Math.round(parseFloat(amount || "0") * 1_000_000) * lpHolders.size
    : Math.round(parseFloat(amount || "0") * 1_000_000);

  const perHolderCost = perHolderAmount
    ? Math.round(parseFloat(amount || "0") * 1_000_000)
    : Math.floor(
        Math.round(parseFloat(amount || "0") * 1_000_000) / lpHolders.size
      );

  const handleSendAlgo = async () => {
    if (!activeAccount || !tokenId || !amount || isNaN(parseFloat(amount))) {
      alert(
        "Please connect your wallet, select an LP token, and specify a valid amount."
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
      const txnGroups = [];
      const suggestedParams = await algodClient.getTransactionParams().do();
      const Amount = Math.round(parseFloat(amount) * 1_000_000); // VOI uses 6 decimals
      const validHolders = Array.from(lpHolders.keys());

      const amountPerHolder = perHolderAmount
        ? Amount
        : Math.floor(Amount / validHolders.length);

      console.log("Total VOI Amount:", Amount);
      console.log("VOI Amount Per Holder:", amountPerHolder);

      for (let i = 0; i < validHolders.length; i += 16) {
        const txnChunk = validHolders.slice(i, i + 16).map((holder) => {
          const txnAmount = perHolderAmount ? Amount : amountPerHolder;
          const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            from: activeAccount.address,
            to: holder,
            amount: txnAmount,
            suggestedParams,
          });
          return txn;
        });

        const txns = await Promise.all(txnChunk);
        txnGroups.push(txns);
      }

      setTotalGroups(txnGroups.length);
      setTotalTransactions(validHolders.length);

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
      console.error("Voi transfer failed:", error);
      alert(`Failed to send Voi. Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadAccountInfo = async () => {
      if (activeAccount && activeAccount.address) {
        try {
          const accountInfo = await fetchAccountInfo(activeAccount.address);
          console.log(accountInfo);

          if (accountInfo && accountInfo["amount"]) {
            console.log(`Account Balance: ${accountInfo["amount"]}`);
            setVoiBalance(accountInfo["amount"]);
          }

          // Fetch ARC-200 token balance if a token is selected
          if (tokenId) {
            const response = await fetch(
              `https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/balances?contractId=${tokenId}&accountId=${activeAccount.address}`
            );
            const data = await response.json();
            setBalance(Number(data?.balance ?? 0));
          }
        } catch (error) {
          console.error("Failed to fetch account information:", error);
        }
      }
    };

    loadAccountInfo();
  }, [activeAccount, tokenId]);

  return (
    <>
      <Grid numItemsSm={1} numItemsLg={1} className="flex justify-center">
        <Card className="flex max-w-screen-lg flex-col items-center">
          <div className="flex items-center">
            <Metric className="mb-4 ml-16 grow text-center font-pixel">
              Token Holder Airdropper
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
            </div>
          )}
          <Divider className="font-bold">
            Step 1: Select an ARC-200 Token
          </Divider>
          <SearchSelect
            placeholder="Select Token"
            className=""
            onValueChange={handleTokenChange}
            disabled={!activeAccount}
          >
            {tokenOptions.map((token) => (
              <SearchSelectItem key={token.id} value={token.id}>
                {token.name}
              </SearchSelectItem>
            ))}
          </SearchSelect>
          <TextInput
            placeholder={`Minimum ${
              tokenInfo.name || "Token"
            } Balance to Include (optional)`}
            onChange={handleInputChange(setMinBalance)}
            className="mt-4"
          />
          <Text className="mt-2 text-sm text-gray-600">
            Only include holders with at least this many tokens in the airdrop
          </Text>
          <Divider className="mt-12 font-bold">
            Step 2: Specify amount to send
          </Divider>
          <TextInput
            placeholder="Amount of Voi"
            onChange={handleInputChange(setAmount)}
            className=""
          />
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
              <span className="font-bold">Total VOI Cost:</span>{" "}
              {formatVoiAmount(isNaN(totalCost) ? 0 : totalCost / 1_000_000)}
            </Text>
            <Text className="text-center">
              <span className="font-bold">{tokenInfo.name} Holders:</span>{" "}
              {isNaN(lpHolders.size) ? 0 : lpHolders.size}
            </Text>
            <Text className="text-center">
              <span className="font-bold">VOI per Holder:</span>{" "}
              {formatVoiAmount(
                isNaN(perHolderCost) ? 0 : perHolderCost / 1_000_000
              )}
            </Text>
          </div>
          <Button
            size="lg"
            className="mt-6 w-40"
            onClick={handleSendAlgo}
            type="button"
            loading={loading}
            disabled={
              loading ||
              tokenOptions.length === 0 ||
              totalCost === 0 ||
              !amount ||
              !tokenId ||
              totalCost > voiBalance
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
      {dialogOpen && (
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
          <DialogPanel className="ml-56 border-2 border-gray-300 p-6">
            <p>Voi Sent Successfully!</p>
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

export default AirdropArc200HoldersComponent;
