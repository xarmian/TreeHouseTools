import { useState, useEffect } from "react";
import {
  Card,
  Button,
  Grid,
  Text,
  Metric,
  Divider,
  DialogPanel,
  Dialog,
  Title,
  SearchSelect,
  SearchSelectItem,
} from "@tremor/react";
import { arc72 } from "ulujs";
import "./spinner.css";
import confetti from "canvas-confetti";
import { useWallet } from "@txnlab/use-wallet-react";
import { algodClient, algodIndexer } from "../../../utils/algod";
import brush from "../../../assets/brush.png";

if (typeof window !== "undefined" && !window.global) {
  window.global = window;
}

const formatAddress = (address: string): string =>
  address && address.length > 8
    ? `${address.substring(0, 4)}...${address.substring(address.length - 4)}`
    : address;

const NFTBurnComponent: React.FC = () => {
  const { activeAccount, signTransactions } = useWallet();
  const [nftId, setNftId] = useState<string>("");
  const [nfts, setNfts] = useState<
    { contractId: number; tokenId: number; metadata: string }[]
  >([]);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [txIdState, setTxIdState] = useState<string>("");
  const [voiBalance, setVoiBalance] = useState<number>(0);

  const receiverAddress =
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";

  const formatAmount = (amount: number): string => {
    let formattedAmount = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    }).format(amount);

    formattedAmount = formattedAmount.replace(/(\.\d*?[1-9])0+$/, "$1");
    formattedAmount = formattedAmount.replace(/\.$/, "");

    return formattedAmount;
  };

  useEffect(() => {
    const fetchNFTs = async () => {
      if (!activeAccount) return;
      setLoading(true);
      try {
        const response = await fetch(
          `https://arc72-voi-mainnet.nftnavigator.xyz/nft-indexer/v1/tokens?owner=${activeAccount.address}`
        );
        const data = await response.json();
        setNfts(data.tokens);
      } catch (error) {
        console.error("Failed to fetch NFTs:", error);
        alert("Failed to fetch NFTs.");
      } finally {
        setLoading(false);
      }
    };
    fetchNFTs();
  }, [activeAccount]);

  useEffect(() => {
    if (activeAccount && activeAccount.address) {
      const fetchAccountInfo = async () => {
        try {
          const accountInfo = await algodClient
            .accountInformation(activeAccount.address)
            .do();
          console.log(accountInfo);

          if (accountInfo && accountInfo["amount"]) {
            console.log(`Account Balance: ${accountInfo["amount"]}`);
            setVoiBalance(accountInfo["amount"]);
          }
        } catch (error) {
          console.error("Failed to fetch account information:", error);
        }
      };

      fetchAccountInfo();
    }
  }, [activeAccount, algodClient]);

  const handleSendNFT = async () => {
    if (!activeAccount || !receiverAddress || !nftId) {
      alert(
        "Please connect your wallet, enter the receiver's address and select an NFT."
      );
      return;
    }
    setLoading(true);
    try {
      const selectedNFT = nfts.find(
        (nft) => `${nft.contractId}-${nft.tokenId}` === nftId
      );
      if (!selectedNFT) {
        alert("Selected NFT not found.");
        setLoading(false);
        return;
      }
      const contractId = selectedNFT.contractId;
      const tokenid = BigInt(selectedNFT.tokenId);
      const ci = new arc72(contractId, algodClient, algodIndexer, {
        acc: { addr: activeAccount.address || "", sk: new Uint8Array(0) },
      });
      const arc72_transferFromR = await ci.arc72_transferFrom(
        activeAccount.address,
        receiverAddress,
        tokenid,
        true,
        false
      );

      if (!arc72_transferFromR.success) {
        alert("Failed to prepare NFT transfer. Please try again.");
        setLoading(false);
        return;
      }

      const signedTxns = await signTransactions(
        arc72_transferFromR.txns.map((txn) =>
          Uint8Array.from(atob(txn), (c) => c.charCodeAt(0))
        )
      );

      if (!signedTxns || signedTxns.length === 0) {
        throw new Error(
          "Signing transactions failed or no signed transactions were returned."
        );
      }

      const sendTxnResponse = await algodClient
        .sendRawTransaction(signedTxns)
        .do();
      const txId = sendTxnResponse.txId;

      setTxIdState(txId);
      confetti({
        zIndex: 999,
        particleCount: 1000,
        spread: 250,
        origin: { y: 0.6 },
      });
      setDialogOpen(true);
      fetch("/api/record-send-arc72", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          network: "mainnet",
          sender: activeAccount.address,
          collection: contractId.toString(),
          tokenId: tokenid.toString(),
          receiver: receiverAddress,
        }),
      })
        .then((response) => response.json())
        .then((data) => console.log("Record Send response:", data))
        .catch((error) => {
          console.error("Error recording send:", error);
        });
    } catch (error) {
      console.error("NFT transfer failed:", error);
      alert(`Failed to send NFT. Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSelectChange = (value: string) => {
    setNftId(value);
  };

  return (
    <>
      <Grid numItemsSm={1} numItemsLg={1} className="flex justify-center">
        <Card className="flex max-w-screen-lg flex-col items-center">
          <div className="flex items-center">
            <Metric className="mb-4 ml-16 grow text-center font-pixel">
              ARC-72 NFT Burner
            </Metric>
            <img src={brush} alt="brush" className="mb-4 ml-4 size-10" />
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
                {formatAmount(
                  isNaN(voiBalance) ? 0 : Math.round(voiBalance / 1000000)
                )}
              </Text>
            </div>
          )}
          <Divider className="mt-8 font-bold">Step 1: Select NFT</Divider>
          <SearchSelect
            placeholder="Select NFT"
            className=""
            onValueChange={handleSearchSelectChange}
          >
            {nfts.map((nft) => {
              const metadata = JSON.parse(nft.metadata);
              const tokenName = metadata.name;

              return (
                <SearchSelectItem
                  key={`${nft.contractId}-${nft.tokenId}`}
                  value={`${nft.contractId}-${nft.tokenId}`}
                >
                  {tokenName}
                </SearchSelectItem>
              );
            })}
          </SearchSelect>
          <Button
            size="lg"
            className="mt-6"
            onClick={handleSendNFT}
            type="button"
            loading={loading}
            disabled={loading || nfts.length === 0}
          >
            Burn NFT
          </Button>
        </Card>
      </Grid>
      {dialogOpen && (
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
          <DialogPanel className="ml-56 border-2 border-gray-300 p-6">
            <Title className="mb-3">NFT Sent Successfully!</Title>
            <Text className="mt-2">Transaction ID: {txIdState}</Text>
            <Button
              variant="light"
              onClick={() => setDialogOpen(false)}
              className="mt-3"
            >
              Got it!
            </Button>
          </DialogPanel>
        </Dialog>
      )}
    </>
  );
};

export default NFTBurnComponent;
