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

interface LPToken {
  name: string;
  id: string;
  decimals: number;
}

interface HolderData {
  account: string;
  amount: string;
}

const handleTxIdClick = (txId) => {
  window.open(`https://voi.observer/explorer/transaction/${txId}`, "_blank");
};

const AirdropArc200HoldersComponent: React.FC = () => {
  const { activeAccount, signTransactions } = useWallet();
  const [tokenId, setTokenId] = useState<string>("");
  const [lpTokens] = useState<LPToken[]>([
    { name: "VIA", id: "6779767", decimals: 6 },
    { name: "PIX", id: "29178793", decimals: 3 },
    { name: "PIX v2", id: "40427802", decimals: 3 },
    { name: "GRVB", id: "29136823", decimals: 0 },
    { name: "GRVB v2", id: "40427797", decimals: 0 },
    { name: "ROCKET", id: "29204384", decimals: 7 },
    { name: "ROCKET v2", id: "40427805", decimals: 7 },
    { name: "JG3", id: "6795456", decimals: 8 },
    { name: "JG3 v2", id: "40427779", decimals: 8 },
    { name: "Rewards", id: "23214349", decimals: 2 },
    { name: "Tacos", id: "6795477", decimals: 0 },
    { name: "Tacos v2", id: "40427782", decimals: 0 },
    { name: "wVOI", id: "24590664", decimals: 6 },
    { name: "VRC200", id: "6778021", decimals: 8 },
    { name: "VRC200 v2", id: "40425710", decimals: 8 },
  ]);
  const [amount, setAmount] = useState<string>("");
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

  useEffect(() => {
    const loadLPandHolders = async () => {
      if (!tokenId) return;
      setLoading(true);
      try {
        const response = await fetch(`/api/arc200-snapshot/testnet/${tokenId}`);
        const data: HolderData[] = await response.json();
        const validHolders = new Map<string, number>();
        data.forEach((holder) => {
          const amount = parseFloat(holder.amount);
          if (amount > 0) validHolders.set(holder.account, amount);
        });
        setLpHolders(validHolders);
      } catch (error) {
        console.error("Failed to fetch LP holders:", error);
      } finally {
        setLoading(false);
      }
    };

    loadLPandHolders();
  }, [tokenId]);

  const handleInputChange =
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setter(event.target.value);
    };

  const totalCost = perHolderAmount
    ? parseInt(amount, 10) * 1000000 * lpHolders.size
    : parseInt(amount, 10) * 1000000;

  const perHolderCost = perHolderAmount
    ? parseInt(amount, 10) * 1000000
    : (parseInt(amount, 10) * 1000000) / lpHolders.size;

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
      const Amount = parseInt(amount, 10) * 1000000;
      const validHolders = Array.from(lpHolders.keys());

      const amountPerHolder = perHolderAmount
        ? Amount
        : Math.floor(Amount / validHolders.length);

      console.log("Total Amount:", Amount);
      console.log("Amount Per Holder:", amountPerHolder);

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
            onValueChange={setTokenId}
          >
            {lpTokens.map((token) => (
              <SearchSelectItem key={token.id} value={String(token.id)}>
                {token.name}
              </SearchSelectItem>
            ))}
          </SearchSelect>
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
              <span className="font-bold">Total Cost:</span>{" "}
              {formatVoiAmount(isNaN(totalCost) ? 0 : totalCost / 1000000)} VOI
            </Text>
            <Text className="text-center">
              <span className="font-bold">Token Holders:</span>{" "}
              {isNaN(lpHolders.size) ? 0 : lpHolders.size}
            </Text>
            <Text className="text-center">
              <span className="font-bold">Amount per Holder:</span>{" "}
              {formatVoiAmount(
                isNaN(perHolderCost) ? 0 : perHolderCost / 1000000
              )}{" "}
              VOI
            </Text>
            <Text className="text-center">
              <span className="font-bold">Transaction Fees:</span>{" "}
              {formatVoiAmount(
                isNaN(lpHolders.size) ? 0 : lpHolders.size * 0.001
              )}{" "}
              VOI
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
              lpTokens.length === 0 ||
              totalCost === 0 ||
              !amount ||
              totalCost >= voiBalance - 5000000
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
