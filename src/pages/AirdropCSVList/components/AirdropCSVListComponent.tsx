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
import Papa from "papaparse";
import { formatVoiAmount, formatAddress } from "../../../utils/formatting";
import { fetchAccountInfo } from "../../../utils/api";

const AirdropCSVComponent: React.FC = () => {
  const { activeAccount, signTransactions, sendTransactions } = useWallet();
  const [amount, setAmount] = useState<string>("");
  const [perHolderAmount, setPerHolderAmount] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [addresses, setAddresses] = useState<string[]>([]);
  const [txIds, setTxIds] = useState<string[]>([]);
  const [totalGroups, setTotalGroups] = useState<number>(0);
  const [signedGroups, setSignedGroups] = useState<number>(0);
  const [totalTransactions, setTotalTransactions] = useState<number>(0);
  const [signedTransactions, setSignedTransactions] = useState<number>(0);
  const [voiBalance, setVoiBalance] = useState<number>(0);

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

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== "text/csv") {
      alert("Please upload a CSV file.");
      return;
    }

    Papa.parse(file, {
      complete: (results) => {
        const addresses = results.data
          .map((row) => {
            const address = row[0].trim();
            if (address && address.length === 58) {
              return address;
            } else {
              alert(
                "CSV format error: Each address must be exactly 58 characters long."
              );
              return null;
            }
          })
          .filter((address) => address);
        setAddresses(addresses);
      },
      header: false,
    });
  };

  const handleInputChange =
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setter(event.target.value);
    };

  const totalCost = perHolderAmount
    ? parseInt(amount, 10) * 1000000 * addresses.length
    : parseInt(amount, 10) * 1000000;

  const perHolderCost = perHolderAmount
    ? parseInt(amount, 10) * 1000000
    : (parseInt(amount, 10) * 1000000) / addresses.length;

  const handleSendAlgo = async () => {
    if (!activeAccount || !amount || isNaN(parseFloat(amount))) {
      alert("Please connect your wallet and specify a valid amount.");
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

      const amountPerHolder = perHolderAmount
        ? Amount
        : Math.floor(Amount / addresses.length);

      for (let i = 0; i < addresses.length; i += 16) {
        const txnChunk = addresses.slice(i, i + 16).map((address) => {
          const txnAmount = perHolderAmount ? Amount : amountPerHolder;
          const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            from: activeAccount.address,
            to: address,
            amount: txnAmount,
            suggestedParams,
          });
          return txn;
        });

        const txns = await Promise.all(txnChunk);
        txnGroups.push(txns);
      }

      setTotalGroups(txnGroups.length);
      setTotalTransactions(addresses.length);

      for (const txns of txnGroups) {
        const groupId = algosdk.computeGroupID(txns);
        txns.forEach((txn) => (txn.group = groupId));

        const binaryTxns = txns.map((txn) => txn.toByte());

        const signedTxns = await signTransactions(binaryTxns);
        const sendTxnResponse = await sendTransactions(signedTxns);
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
      console.error("Voi transfer failed:", error);
      alert(`Failed to send Voi. Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Grid numItemsSm={1} numItemsLg={1} className="flex justify-center">
        <Card className="flex max-w-screen-lg flex-col items-center">
          <div className="flex items-center">
            <Metric className="mb-4 ml-16 grow text-center font-pixel">
              CSV List Airdropper
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
          <Divider className="font-bold">Step 1: Upload Receivers CSV</Divider>
          <input type="file" onChange={handleFileUpload} className="ml-24" />
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
            <Text>Amount per Address</Text>
          </div>
          <Divider className="mt-12 font-bold">Step 3: Check details</Divider>
          <div className="mb-2 flex flex-col items-center justify-center space-y-2 md:flex-row md:space-x-4 md:space-y-0">
            <Text className="text-center">
              <span className="font-bold">Total Cost:</span>{" "}
              {formatVoiAmount(isNaN(totalCost) ? 0 : totalCost / 1000000)} VOI
            </Text>
            <Text className="text-center">
              <span className="font-bold">Address Entries:</span>{" "}
              {isNaN(addresses.length) ? 0 : addresses.length}
            </Text>
            <Text className="text-center">
              <span className="font-bold">Amount per Address:</span>{" "}
              {formatVoiAmount(
                isNaN(perHolderCost) ? 0 : perHolderCost / 1000000
              )}{" "}
              VOI
            </Text>
            <Text className="text-center">
              <span className="font-bold">Transaction Fees:</span>{" "}
              {formatVoiAmount(
                isNaN(addresses.length) ? 0 : addresses.length * 0.001
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
              addresses.length === 0 ||
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
                  <Link
                    onClick={() =>
                      window.open(
                        `https://voi.observer/explorer/transaction/${txId}`,
                        "_blank"
                      )
                    }
                    color="danger"
                  >
                    {txId}
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

export default AirdropCSVComponent;
