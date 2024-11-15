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
import {
  fetchTokensAndOwners,
  fetchProjects,
  fetchAccountInfo,
} from "../../../utils/api";
import {
  formatAddress,
  formatVoiAmount,
  truncateTxId,
} from "../../../utils/formatting";

const handleTxIdClick = (txId) => {
  window.open(`https://voi.observer/explorer/transaction/${txId}`, "_blank");
};

const SendAlgoComponent: React.FC = () => {
  const { activeAccount, signTransactions, sendTransactions } = useWallet();
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
  const [uniqueHoldersCount, setUniqueHoldersCount] = useState<number>(0);
  const [uniqueTokensCount, setUniqueTokensCount] = useState<number>(0);
  const [voiBalance, setVoiBalance] = useState<number>(0);

  const bottomSwitchText = distributeUnique
    ? "Amount per holder"
    : "Amount per NFT";

  useEffect(() => {
    const loadTokensAndOwners = async () => {
      if (!collectionId) return;
      setLoading(true);
      try {
        const tokens = await fetchTokensAndOwners(collectionId);
        console.log(tokens);
        const uniqueHolders = new Set(tokens.map((token) => token.owner));
        setUniqueHoldersCount(uniqueHolders.size);

        const uniqueTokens = new Set(tokens.map((token) => token.tokenId));
        setUniqueTokensCount(uniqueTokens.size);
        console.log(uniqueTokens);
      } catch (error) {
        console.error("Failed to fetch tokens and owners:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTokensAndOwners();
  }, [collectionId]);

  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true);
      try {
        const projectsData = await fetchProjects();
        const uniqueProjects = Array.from(
          new Map(
            projectsData.map((project) => [project.applicationID, project])
          ).values()
        );
        const formattedProjects = uniqueProjects.map((project) => ({
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

  const handleInputChange =
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setter(event.target.value);
    };

  const totalCost = perHolderAmount
    ? parseInt(amount, 10) *
      1000000 *
      (distributeUnique ? uniqueHoldersCount : uniqueTokensCount)
    : parseInt(amount, 10) * 1000000;

  const handleSendAlgo = async () => {
    if (!activeAccount || !collectionId || !amount) {
      alert(
        "Please connect your wallet, select a collection, and specify an amount."
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
      const tokens = await fetchTokensAndOwners(collectionId);
      const receivers = tokens.map((token) => token.owner);
      const uniqueReceivers = distributeUnique
        ? [...new Set(receivers)]
        : receivers;

      const txnGroups = [];
      const suggestedParams = await algodClient.getTransactionParams().do();
      const amountsPerReceiver = {};
      let totalAirdroppedAmount = 0;

      uniqueReceivers.forEach((receiver) => {
        const txnAmount = perHolderAmount
          ? parseInt(amount, 10) * 1000000
          : Math.floor(
              (parseInt(amount, 10) * 1000000) / uniqueReceivers.length
            );

        amountsPerReceiver[receiver] =
          (amountsPerReceiver[receiver] || 0) + txnAmount;
        totalAirdroppedAmount += txnAmount;
      });

      const receiverAddresses = Object.keys(amountsPerReceiver);
      for (let i = 0; i < receiverAddresses.length; i += 16) {
        const txnChunk = receiverAddresses.slice(i, i + 16).map((receiver) => {
          const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            from: activeAccount.address,
            to: receiver,
            amount: amountsPerReceiver[receiver],
            suggestedParams,
          });
          return txn;
        });

        const txns = await Promise.all(txnChunk);
        txnGroups.push(txns);
      }

      setTotalGroups(txnGroups.length);
      setTotalTransactions(receiverAddresses.length);

      for (const txns of txnGroups) {
        const groupId = algosdk.computeGroupID(txns);
        txns.forEach((txn) => (txn.group = groupId));

        const binaryTxns = txns.map((txn) => txn.toByte());

        const signedTxns = await signTransactions(binaryTxns);
        const sendTxnResponse = await sendTransactions(signedTxns);
        setTxIds((prev) => [...prev, sendTxnResponse.txId]);
        setSignedGroups((prev) => prev + 1);
        setSignedTransactions((prev) => prev + txns.length);
        console.log(
          `Group sent successfully, first transaction ID: ${sendTxnResponse.txId}`
        );
      }

      const apiData = {
        network: "testnet",
        sender: activeAccount.address,
        tokenId: 0,
        tokenName: "VOI",
        tokenDecimals: 6,
        collection: collectionId,
        receivers: Object.keys(amountsPerReceiver),
        amounts: Object.values(amountsPerReceiver),
        totalAmount: totalAirdroppedAmount,
      };

      fetch("/api/record-collection-airdrop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiData),
      })
        .then((response) => response.json())
        .then((data) => console.log("Airdrop record response:", data))
        .catch((error) => {
          console.error("Error recording airdrop:", error);
        });

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

  let amountPerHolderNFT;
  if (perHolderAmount) {
    amountPerHolderNFT = parseInt(amount, 10) * 1000000;
  } else {
    const divisor = distributeUnique ? uniqueHoldersCount : uniqueTokensCount;
    amountPerHolderNFT = (parseInt(amount, 10) * 1000000) / divisor;
  }

  return (
    <>
      <Grid numItemsSm={1} numItemsLg={1} className="flex justify-center">
        <Card className="flex max-w-screen-lg flex-col items-center">
          <div className="flex items-center">
            <Metric className="mb-4 ml-16 grow text-center font-pixel">
              VOI Collection Airdropper
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
                {collection.name}
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
            <Text>{bottomSwitchText}</Text>
          </div>
          <Divider className="mt-12 font-bold">Step 3: Check details</Divider>
          <div className="mb-2 flex flex-col items-center justify-center space-y-2 md:flex-row md:space-x-4 md:space-y-0">
            <Text className="text-center">
              <span className="font-bold">Total Cost:</span>{" "}
              {formatVoiAmount(isNaN(totalCost) ? 0 : totalCost / 1000000)} VOI
            </Text>
            <Text className="text-center">
              <span className="font-bold">
                Unique {distributeUnique ? "Holders" : "NFTs"}:
              </span>{" "}
              {distributeUnique
                ? isNaN(uniqueHoldersCount)
                  ? 0
                  : uniqueHoldersCount
                : isNaN(uniqueTokensCount)
                ? 0
                : uniqueTokensCount}
            </Text>
            <Text className="text-center">
              <span className="font-bold">
                Amount per {distributeUnique ? "Holder" : "NFT"}:
              </span>{" "}
              {formatVoiAmount(
                isNaN(amountPerHolderNFT) ? 0 : amountPerHolderNFT / 1000000
              )}{" "}
              VOI
            </Text>
            <Text className="text-center">
              <span className="font-bold">Transaction Fees:</span>{" "}
              {formatVoiAmount(
                isNaN(
                  distributeUnique ? uniqueHoldersCount : uniqueHoldersCount
                )
                  ? 0
                  : (distributeUnique
                      ? uniqueHoldersCount
                      : uniqueHoldersCount) * 0.001
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
              collections.length === 0 ||
              totalCost === 0 ||
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

export default SendAlgoComponent;
