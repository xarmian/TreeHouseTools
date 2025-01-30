import type { ChangeEvent } from "react";
import React, { useState, useEffect } from "react";
import {
  Card,
  Switch,
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
} from "@tremor/react";
import confetti from "canvas-confetti";
import { useWallet } from "@txnlab/use-wallet-react";
import { CONTRACT, arc200, abi } from "ulujs";
import { Buffer } from "buffer";
import { algodClient, algodIndexer } from "../../../utils/algod";
import hammer from "../../../assets/hammer.png";
import {
  formatAddress,
  truncateTxId,
  formatVoiAmount,
  formatArc200Amount,
  formatArc200BalanceAmount,
} from "../../../utils/formatting";
import { fetchProjects } from "../../../utils/api";
import { Link } from "@nextui-org/react";
import "./spinner.css";

window.Buffer = Buffer;

const handleTxIdClick = (txId) => {
  window.open(`https://voi.observer/explorer/transaction/${txId}`, "_blank");
};

const SendViaComponent: React.FC = () => {
  const { activeAccount, signTransactions } = useWallet();
  const [builder, setBuilder] = useState<{ arc200?: any }>({});
  const [collectionId, setCollectionId] = useState<string>("");
  const [distributeUnique, setDistributeUnique] = useState<boolean>(true);
  const [perHolderAmount, setPerHolderAmount] = useState<boolean>(false);
  const [collections, setCollections] = useState<
    { contractId: number; name: string }[]
  >([]);
  const [amount, setAmount] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [txIds, setTxIds] = useState<string[]>([]);
  const [totalGroups, setTotalGroups] = useState<number>(0);
  const [signedGroups, setSignedGroups] = useState<number>(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [signedTransactions, setSignedTransactions] = useState<number>(0);
  const [uniqueHoldersCount, setUniqueHoldersCount] = useState<number>(0);
  const [uniqueTokensCount, setUniqueTokensCount] = useState<number>(0);
  const [totalFees, setTotalFees] = useState<number>(0);
  const [balance, setBalance] = useState(0);
  const [voiBalance, setVoiBalance] = useState(0);
  const [tokenInfo, setTokenInfo] = useState({
    id: "6779767",
    decimals: 6,
    name: "VIA",
  });
  const [tokenOptions, setTokenOptions] = useState<
    { name: string; id: string; decimals: number }[]
  >([]);
  const [ci, setCi] = useState<any>(null);
  const bottomSwitchText = distributeUnique
    ? "Amount per holder"
    : "Amount per NFT";

  useEffect(() => {
    const fetchTokens = async () => {
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
            console.log(infoData);
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
        }
      } catch (error) {
        console.error("Failed to fetch ARC-200 tokens:", error);
      }
    };
    fetchTokens();
  }, []);

  const handleTokenChange = (selectedTokenId) => {
    const selectedToken = tokenOptions.find(
      (token) => token.id === selectedTokenId
    );
    if (selectedToken) {
      setTokenInfo(selectedToken);
    }
  };

  useEffect(() => {
    const fetchTokensAndOwners = async () => {
      if (!collectionId) return;
      setLoading(true);
      try {
        const response = await fetch(
          `https://arc72-voi-mainnet.nftnavigator.xyz/nft-indexer/v1/tokens?contractId=${collectionId}`
        );
        const { tokens } = await response.json();
        const uniqueHolders = new Set(tokens.map((token) => token.owner));
        setUniqueHoldersCount(uniqueHolders.size);

        const uniqueTokens = new Set(tokens.map((token) => token.tokenId));
        setUniqueTokensCount(uniqueTokens.size);

        const receivers = tokens.map((token) => token.owner);
        let uniqueReceivers = [...new Set(receivers)];
        let zeroBalanceAddresses = [];

        await Promise.all(
          uniqueReceivers.map(async (addr) => {
            const arc200token = Number(tokenInfo.id);
            const check = new arc200(arc200token, algodClient, algodIndexer, {
              acc: { addr: activeAccount.address, sk: new Uint8Array(0) },
            });
            const hasBalanceR = await check.hasBalance(addr as string);

            if (hasBalanceR.success) {
              const hasBalance = hasBalanceR.returnValue;
              if (!hasBalance) {
                zeroBalanceAddresses.push(addr);
              }
            }
          })
        );

        zeroBalanceAddresses = [...new Set(zeroBalanceAddresses)];
        uniqueReceivers = uniqueReceivers.filter(
          (addr) => !zeroBalanceAddresses.includes(addr)
        );

        const adjustedChunks = [];
        let currentChunkIndex = -1;
        const chunkSize = 11;

        uniqueReceivers.forEach((receiver, index) => {
          if (index % chunkSize === 0) {
            adjustedChunks.push([]);
            currentChunkIndex += 1;
            if (zeroBalanceAddresses.length > 0) {
              adjustedChunks[currentChunkIndex].push(
                zeroBalanceAddresses.shift()
              );
            }
          }
          if (adjustedChunks[currentChunkIndex].length < chunkSize) {
            adjustedChunks[currentChunkIndex].push(receiver);
          }
        });

        zeroBalanceAddresses.forEach((zeroBalanceAddress) => {
          adjustedChunks.push([zeroBalanceAddress]);
        });

        console.log("Pre-processed chunks:", adjustedChunks);

        let totalFees = 0;
        adjustedChunks.forEach((chunk) => {
          const baseFeePerAddress = 0.001;
          const baseFeePerChunk = 0.002;
          const additionalFeeForZeroBalance = 0.0285;

          const isZeroBalanceChunk = chunk.some((addr) =>
            zeroBalanceAddresses.includes(addr)
          );
          const chunkFee =
            chunk.length * baseFeePerAddress +
            baseFeePerChunk +
            (isZeroBalanceChunk ? additionalFeeForZeroBalance : 0.0000001);

          totalFees += chunkFee;
        });

        setTotalFees(totalFees);
      } catch (error) {
        console.error("Failed to fetch tokens and owners:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTokensAndOwners();
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
    if (activeAccount) {
      const spec = {
        name: "",
        description: "",
        methods: [
          {
            name: "custom",
            args: [],
            returns: {
              type: "void",
            },
          },
          {
            name: "hasBalance",
            desc: "Returns 1 if balance box exists otherwise 0",
            readonly: true,
            args: [
              {
                type: "address",
                name: "addr",
                desc: "Address of balance box check",
              },
            ],
            returns: {
              type: "byte",
              desc: "Result",
            },
          },
          {
            name: "safe_hasBalance",
            desc: "Returns 1 if balance box exists otherwise 0",
            readonly: true,
            args: [
              {
                type: "address",
                name: "addr",
                desc: "Address of balance box check",
              },
            ],
            returns: {
              type: "byte",
              desc: "Result",
            },
          },
          {
            name: "arc200_balanceOf",
            desc: "Returns the current balance of the owner of the token",
            readonly: true,
            args: [
              {
                type: "address",
                name: "owner",
                desc: "The address of the owner of the token",
              },
            ],
            returns: {
              type: "uint256",
              desc: "The current balance of the holder of the token",
            },
          },
        ],
        events: [],
      };

      const arc200token = Number(tokenInfo.id);

      const newBuilder = {
        arc200: new CONTRACT(
          arc200token,
          algodClient,
          algodIndexer,
          abi["arc200"],
          {
            addr: activeAccount.address,
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
      };

      setBuilder(newBuilder);

      const newCi = new CONTRACT(arc200token, algodClient, algodIndexer, spec, {
        addr: activeAccount.address,
        sk: new Uint8Array(0),
      });

      setCi(newCi);
    }
  }, [activeAccount, tokenInfo.id]);

  useEffect(() => {
    if (activeAccount && activeAccount.address && tokenOptions.length > 0) {
      const arc200token = Number(tokenInfo.id);
      const tokenDecimals =
        tokenOptions.find((token) => Number(token.id) === arc200token)
          .decimals || 6;
      const cid = new arc200(arc200token, algodClient, algodIndexer, {
        acc: { addr: activeAccount.address, sk: new Uint8Array(0) },
      });

      const fetchAccountInfo = async () => {
        try {
          const accountInfo = await algodClient
            .accountInformation(activeAccount.address)
            .do();

          if (accountInfo && accountInfo["amount"]) {
            setVoiBalance(accountInfo["amount"]);
          }

          cid
            .arc200_balanceOf(activeAccount.address)
            .then((res) => {
              if (res.success) {
                let formattedBalance: React.SetStateAction<number>;
                if (tokenInfo.decimals === 0) {
                  formattedBalance = Number(res.returnValue);
                } else {
                  const balanceBigInt = BigInt(res.returnValue);
                  const divisor = BigInt(10 ** tokenDecimals);
                  formattedBalance = Number(balanceBigInt) / Number(divisor);
                }

                setBalance(formattedBalance);
              }
            })
            .catch((error) => {
              console.error("Failed to fetch account information:", error);
            });
        } catch (error) {
          console.error("Failed to fetch account information:", error);
        }
      };

      fetchAccountInfo();
    }
  }, [activeAccount, algodClient, algodIndexer, signedGroups, tokenInfo.id]);

  const handleInputChange =
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setter(event.target.value);
    };

  const handleSendAlgo = async () => {
    //metric api stuff
    let uniqueReceivers = [];
    let tokenCounts = {};
    const receiverAmounts = { receivers: [], amounts: [], totalAmount: 0 };
    //end metric api stuff

    if (!activeAccount) {
      alert("Please connect your wallet.");
      return;
    }

    if (!collectionId || !amount) {
      alert("Please select a collection and specify an amount.");
      return;
    }
    setLoading(true);
    setTxIds([]);
    setTotalGroups(0);
    setSignedGroups(0);
    setTotalTransactions(0);
    setSignedTransactions(0);

    try {
      const response = await fetch(
        `https://arc72-voi-mainnet.nftnavigator.xyz/nft-indexer/v1/tokens?contractId=${collectionId}`
      );
      const { tokens } = await response.json();

      tokenCounts = tokens.reduce((acc, token) => {
        acc[token.owner] = (acc[token.owner] || 0) + 1;
        return acc;
      }, {});

      const receivers = tokens.map((token) => token.owner);
      uniqueReceivers = [...new Set(receivers)];

      let zeroBalanceAddresses = [];

      await Promise.all(
        uniqueReceivers.map(async (addr) => {
          const arc200token = Number(tokenInfo.id);
          const check = new arc200(arc200token, algodClient, algodIndexer, {
            acc: { addr: activeAccount.address, sk: new Uint8Array(0) },
          });
          const hasBalanceR = await check.hasBalance(addr as string);
          if (hasBalanceR.success && !hasBalanceR.returnValue) {
            zeroBalanceAddresses.push(addr);
          }
        })
      );

      zeroBalanceAddresses = [...new Set(zeroBalanceAddresses)];
      const originalZeroBalanceAddresses = [...zeroBalanceAddresses];
      console.log(zeroBalanceAddresses);

      uniqueReceivers = uniqueReceivers.filter(
        (addr) => !zeroBalanceAddresses.includes(addr)
      );

      const adjustedChunks = [];
      let currentChunkIndex = -1;
      const chunkSize = 11;

      uniqueReceivers.forEach((receiver, index) => {
        if (index % chunkSize === 0) {
          adjustedChunks.push([]);
          currentChunkIndex += 1;

          if (zeroBalanceAddresses.length > 0) {
            adjustedChunks[currentChunkIndex].push(
              zeroBalanceAddresses.shift()
            );
          }
        }

        if (adjustedChunks[currentChunkIndex].length < chunkSize) {
          adjustedChunks[currentChunkIndex].push(receiver);
        }
      });

      zeroBalanceAddresses.forEach((zeroBalanceAddress) => {
        adjustedChunks.push([zeroBalanceAddress]);
      });

      setTotalGroups(adjustedChunks.length);
      const BALANCE_BOX_COST = 28500;
      const txns = [];

      for (const chunk of adjustedChunks) {
        let paymentAmount = 1;

        const containsZeroBalanceAddress = chunk.some((addr) =>
          originalZeroBalanceAddresses.includes(addr)
        );

        if (containsZeroBalanceAddress) {
          paymentAmount = BALANCE_BOX_COST;
        }

        const tokenDecimals = Number(tokenInfo.decimals);
        const multiplicationFactor = 10 ** tokenDecimals;
        const parsedAmount = parseInt(amount, 10);
        const divisionResult =
          (parsedAmount * multiplicationFactor) /
          (distributeUnique ? uniqueHoldersCount : uniqueTokensCount);
        const amountNumber: number = perHolderAmount
          ? parsedAmount * multiplicationFactor
          : Math.floor(divisionResult);
        console.log("amount number:", amountNumber);

        const buildP = (
          await Promise.all(
            chunk.map((c) => {
              const tokensForAddress = distributeUnique ? 1 : tokenCounts[c];
              return builder.arc200.arc200_transfer(
                c,
                amountNumber * tokensForAddress
              );
            })
          )
        ).map(({ obj }) => obj);

        //metric api stuff
        chunk.forEach((c) => {
          const tokensForAddress = distributeUnique ? 1 : tokenCounts[c];
          const amountForReceiver = amountNumber * tokensForAddress;

          receiverAmounts.receivers.push(c);
          receiverAmounts.amounts.push(amountForReceiver);
          receiverAmounts.totalAmount += amountForReceiver;
        });
        //end metric api stuff

        ci.setEnableGroupResourceSharing(true);
        ci.setPaymentAmount(paymentAmount);
        ci.setExtraTxns(buildP);
        const customR = await ci.custom();
        if (!customR.success) return;
        txns.push(customR.txns);
        setTotalTransactions((prevTotal) => prevTotal + customR.txns.length);
      }

      for (const group of txns) {
        const binaryTxns = group.map(
          (txn) => new Uint8Array(Buffer.from(txn, "base64"))
        );
        const signedTxns = await signTransactions(binaryTxns);

        const sendTxnResponse = await algodClient
          .sendRawTransaction(signedTxns)
          .do();

        console.log(
          `Group sent successfully, Transaction ID: ${sendTxnResponse.txId}`
        );
        setTxIds((prev) => [...prev, sendTxnResponse.txId]);
        setSignedGroups((prev) => prev + 1);
        setSignedTransactions((prev) => prev + group.length);
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
          receivers: receiverAmounts.receivers,
          amounts: receiverAmounts.amounts,
          totalAmount: receiverAmounts.totalAmount,
        }),
      })
        .then((response) => response.json())
        .then((data) => console.log("Airdrop record response:", data))
        .catch((error) => {
          console.error("Error recording airdrop:", error);
        });
      //end metric api stuff
      setLoading(false);
    }
  };

  const tokenDecimals = Number(tokenInfo.decimals);
  const multiplicationFactor = 10 ** tokenDecimals;

  const totalCost = perHolderAmount
    ? parseInt(amount, 10) *
      multiplicationFactor *
      (distributeUnique ? uniqueHoldersCount : uniqueTokensCount)
    : parseInt(amount, 10) * multiplicationFactor;

  let amountPerHolderNFT;
  if (perHolderAmount) {
    amountPerHolderNFT = parseInt(amount, 10) * multiplicationFactor;
  } else {
    const divisor = distributeUnique ? uniqueHoldersCount : uniqueTokensCount;
    amountPerHolderNFT =
      (parseInt(amount, 10) * multiplicationFactor) / divisor;
  }

  return (
    <>
      <Grid numItemsSm={1} numItemsLg={1} className="flex justify-center">
        <Card className="flex max-w-screen-lg flex-col items-center">
          <div className="flex items-center">
            <Metric className="mb-4 ml-16 grow text-center font-pixel">
              ARC - 200 Collection Airdropper
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
                {formatArc200Amount(
                  isNaN(voiBalance) ? 0 : Math.round(voiBalance / 1000000),
                  tokenDecimals
                )}
              </Text>
              <Text className="text-center">
                <span className="font-bold">{tokenInfo.name} Balance: </span>
                {formatArc200BalanceAmount(balance, tokenDecimals)}
              </Text>
            </div>
          )}
          <Divider className="font-bold">Step 1: Select a Collection</Divider>
          <SearchSelect
            placeholder="Select Collection"
            className=""
            defaultValue=""
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
            Step 2: Specify amount & token to send
          </Divider>
          <div className="flex w-full items-center space-x-3">
            <TextInput
              placeholder={`Amount`}
              onChange={handleInputChange(setAmount)}
              className=""
            />
            <SearchSelect
              placeholder="Select Token"
              className=""
              defaultValue="6779767"
              enableClear={false}
              onValueChange={handleTokenChange}
            >
              {tokenOptions.map((token) => (
                <SearchSelectItem key={token.id} value={token.id}>
                  {token.name} ({token.id})
                </SearchSelectItem>
              ))}
            </SearchSelect>
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
              <span className="font-bold">Total Cost:</span>{" "}
              {formatArc200Amount(
                isNaN(totalCost) ? 0 : totalCost / multiplicationFactor,
                tokenDecimals
              )}{" "}
              {tokenInfo.name}
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
              {formatArc200Amount(
                isNaN(amountPerHolderNFT)
                  ? 0
                  : amountPerHolderNFT / multiplicationFactor,
                tokenDecimals
              )}{" "}
              {tokenInfo.name}
            </Text>
            <Text className="text-center">
              <span className="font-bold">Transaction / Box Fees:</span>{" "}
              {formatVoiAmount(isNaN(totalFees) ? 0 : totalFees)} VOI
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
              Number(formatArc200Amount(amountPerHolderNFT, tokenDecimals)) ==
                0 ||
              collections.length === 0 ||
              !collectionId ||
              totalCost === 0 ||
              totalCost / multiplicationFactor >= balance ||
              totalFees >= voiBalance / 1000000
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

export default SendViaComponent;
