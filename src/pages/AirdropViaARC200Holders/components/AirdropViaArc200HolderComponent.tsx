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
import { Link } from "@nextui-org/react";
import "./spinner.css";

window.Buffer = Buffer;

const handleTxIdClick = (txId) => {
  window.open(
    `https://block.voi.network/explorer/transaction/${txId}`,
    "_blank"
  );
};

const SendViaArc200Component: React.FC = () => {
  const { activeAccount, signTransactions } = useWallet();
  const [builder, setBuilder] = useState<{ arc200?: any }>({});
  const [perHolderAmount, setPerHolderAmount] = useState<boolean>(false);
  const [amount, setAmount] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [txIds, setTxIds] = useState<string[]>([]);
  const [totalGroups, setTotalGroups] = useState<number>(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [signedTransactions, setSignedTransactions] = useState<number>(0);
  const [lpHolders, setLpHolders] = useState<Map<string, number>>(new Map());
  const [balance, setBalance] = useState(0);
  const [voiBalance, setVoiBalance] = useState(0);
  const [estimatedFees, setEstimatedFees] = useState(0);
  const [tokenInfo, setTokenInfo] = useState({
    id: "",
    decimals: 6,
    name: "",
  });
  const [ci, setCi] = useState<any>(null);
  const [tokenId, setTokenId] = useState<string>("");
  const [minBalance, setMinBalance] = useState<string>("");
  const [tokenOptions, setTokenOptions] = useState<
    { name: string; id: string; decimals: number }[]
  >([]);

  useEffect(() => {
    if (!activeAccount) {
      setTokenOptions([]);
      return;
    }

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
    if (!selectedTokenId) return;
    const selectedToken = tokenOptions.find(
      (token) => token.id === selectedTokenId
    );
    if (selectedToken) {
      setTokenInfo(selectedToken);
    }
  };

  useEffect(() => {
    const fetchTokensAndOwners = async () => {
      if (!tokenId || !activeAccount) return;
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
              validHolders.set(holder.accountId, normalizedAmount);
            }
          });
        }

        setLpHolders(validHolders);
        const holderAddresses = [...validHolders.keys()];

        let zeroBalanceAddresses = [];
        console.log("Unique Receivers:", holderAddresses);
        await Promise.all(
          holderAddresses.map(async (addr) => {
            const arc200token = Number(tokenInfo.id);
            const check = new arc200(arc200token, algodClient, algodIndexer, {
              acc: { addr: activeAccount.address, sk: new Uint8Array(0) },
            });
            const hasBalanceR = await check.hasBalance(
              addr as unknown as string
            );

            if (hasBalanceR.success) {
              const hasBalance = hasBalanceR.returnValue;
              if (!hasBalance) {
                zeroBalanceAddresses.push(addr);
              }
            }
          })
        );

        zeroBalanceAddresses = [...new Set(zeroBalanceAddresses)];
        console.log("Zero balance addresses:", zeroBalanceAddresses);
        const uniqueReceivers = holderAddresses.filter(
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

        // Calculate initial fee estimates
        const BALANCE_BOX_COST = 28500;
        let totalBoxCost = 0;
        let totalTxCount = 0;

        adjustedChunks.forEach((chunk) => {
          const containsZeroBalanceAddress = chunk.some((addr) =>
            zeroBalanceAddresses.includes(addr)
          );

          if (containsZeroBalanceAddress) {
            totalBoxCost += BALANCE_BOX_COST;
          }
          totalTxCount += chunk.length;
        });

        // Calculate and update total fees (0.001 VOI per transaction + box costs)
        const totalTxnFees = totalTxCount * 0.001;
        const estimatedTotalFees = totalTxnFees + totalBoxCost / 1_000_000;
        setEstimatedFees(estimatedTotalFees);
        setTotalGroups(adjustedChunks.length);
        setTotalTransactions(totalTxCount);
      } catch (error) {
        console.error("Failed to fetch tokens and owners:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTokensAndOwners();
  }, [tokenId, minBalance, tokenInfo.decimals, activeAccount]);

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
    if (activeAccount && activeAccount.address) {
      const arc200token = Number(tokenInfo.id);

      if (arc200token === 0) return;

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

          const balanceResponse = await cid.arc200_balanceOf(
            activeAccount.address
          );
          if (balanceResponse.success) {
            let formattedBalance: React.SetStateAction<number>;
            if (tokenInfo.decimals === 0) {
              formattedBalance = Number(balanceResponse.returnValue);
            } else {
              const balanceBigInt = BigInt(balanceResponse.returnValue);
              const divisor = BigInt(10 ** tokenDecimals);
              formattedBalance = Number(balanceBigInt) / Number(divisor);
            }

            setBalance(formattedBalance);
          }
        } catch (error) {
          console.error("Failed to fetch account information:", error);
        }
      };

      fetchAccountInfo();
    }
  }, [activeAccount, tokenInfo.id]);

  const handleInputChange =
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setter(event.target.value);
    };

  const handleSendAlgo = async () => {
    // Initialize metrics collection
    const metrics = {
      receivers: [] as string[],
      amounts: [] as number[],
      totalAmount: 0,
    };

    if (!activeAccount) {
      alert("Please connect your wallet.");
      return;
    }

    if (!tokenId || !amount || isNaN(parseFloat(amount))) {
      alert("Please select a token and specify a valid amount.");
      return;
    }

    setLoading(true);
    setTxIds([]);
    setTotalTransactions(0);
    setSignedTransactions(0);

    try {
      const validHolders = Array.from(lpHolders.keys());
      let zeroBalanceAddresses = [];

      await Promise.all(
        validHolders.map(async (addr) => {
          const arc200token = Number(tokenInfo.id);
          const check = new arc200(arc200token, algodClient, algodIndexer, {
            acc: { addr: activeAccount.address, sk: new Uint8Array(0) },
          });
          const hasBalanceR = await check.hasBalance(addr as unknown as string);

          if (hasBalanceR.success) {
            const hasBalance = hasBalanceR.returnValue;
            if (!hasBalance) {
              zeroBalanceAddresses.push(addr);
            }
          }
        })
      );

      zeroBalanceAddresses = [...new Set(zeroBalanceAddresses)];
      const holderAddresses = validHolders.filter(
        (addr) => !zeroBalanceAddresses.includes(addr)
      );

      const adjustedChunks = [];
      let currentChunkIndex = -1;
      const chunkSize = 11;

      holderAddresses.forEach((receiver, index) => {
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

      const BALANCE_BOX_COST = 28500;
      const txns = [];
      let totalBoxCost = 0;
      let totalTxCount = 0;

      for (const chunk of adjustedChunks) {
        let paymentAmount = 1;

        const containsZeroBalanceAddress = chunk.some((addr) =>
          zeroBalanceAddresses.includes(addr)
        );

        if (containsZeroBalanceAddress) {
          paymentAmount = BALANCE_BOX_COST;
          totalBoxCost += BALANCE_BOX_COST;
        }

        const amountNumber = perHolderAmount
          ? Math.round(parseFloat(amount) * 10 ** tokenInfo.decimals)
          : Math.floor(
              Math.round(parseFloat(amount) * 10 ** tokenInfo.decimals) /
                lpHolders.size
            );

        console.log("amount number:", amountNumber);

        const buildP = (
          await Promise.all(
            chunk.map((c) => {
              totalTxCount++;
              return builder.arc200.arc200_transfer(c, amountNumber);
            })
          )
        ).map(({ obj }) => obj);

        // Update metrics for this chunk
        chunk.forEach((c) => {
          metrics.receivers.push(c);
          metrics.amounts.push(amountNumber);
          metrics.totalAmount += amountNumber;
        });

        ci.setEnableGroupResourceSharing(true);
        ci.setPaymentAmount(paymentAmount);
        ci.setExtraTxns(buildP);
        const customR = await ci.custom();
        if (!customR.success) return;
        txns.push(customR.txns);
        setTotalTransactions((prevTotal) => prevTotal + customR.txns.length);
      }

      // Calculate and update total fees (0.001 VOI per transaction + box costs)
      const totalTxnFees = totalTxCount * 0.001;
      const estimatedTotalFees = totalTxnFees + totalBoxCost / 1_000_000;
      setEstimatedFees(estimatedTotalFees);
      setTotalGroups(adjustedChunks.length);

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
        setSignedTransactions((prev) => prev + group.length);
      }

      confetti({
        zIndex: 999,
        particleCount: 1000,
        spread: 250,
        origin: { y: 0.6 },
      });
      setDialogOpen(true);

      // Record the airdrop metrics
      fetch("/api/record-token-airdrop", {
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
          token: tokenId,
          receivers: metrics.receivers,
          amounts: metrics.amounts,
          totalAmount: metrics.totalAmount,
        }),
      })
        .then((response) => response.json())
        .then((data) => console.log("Airdrop record response:", data))
        .catch((error) => {
          console.error("Error recording airdrop:", error);
        });
    } catch (error) {
      console.error("Failed to send tokens:", error);
      alert(`Failed to send tokens. Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const totalCost = perHolderAmount
    ? Math.round(parseFloat(amount || "0") * 10 ** tokenInfo.decimals) *
      lpHolders.size
    : Math.round(parseFloat(amount || "0") * 10 ** tokenInfo.decimals);

  const perHolderCost = perHolderAmount
    ? Math.round(parseFloat(amount || "0") * 10 ** tokenInfo.decimals)
    : Math.floor(
        Math.round(parseFloat(amount || "0") * 10 ** tokenInfo.decimals) /
          lpHolders.size
      );

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
                {formatArc200Amount(
                  isNaN(voiBalance) ? 0 : Math.round(voiBalance / 1000000),
                  tokenInfo.decimals
                )}
              </Text>
              <Text className="text-center">
                <span className="font-bold">{tokenInfo.name} Balance: </span>
                {formatArc200BalanceAmount(balance, tokenInfo.decimals)}
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
            disabled={!activeAccount}
          >
            {tokenOptions.map((token) => (
              <SearchSelectItem key={token.id} value={String(token.id)}>
                {token.name} (ID: {token.id})
              </SearchSelectItem>
            ))}
          </SearchSelect>
          <TextInput
            placeholder={`Minimum Balance to Include (optional)`}
            onChange={handleInputChange(setMinBalance)}
            className="mt-4"
            disabled={!activeAccount || !tokenId}
          />
          <Text className="mt-2 text-sm text-gray-600">
            Only include holders with at least this many tokens in the airdrop
          </Text>
          <Divider className="mt-12 font-bold">
            Step 2: Specify amount & token to send
          </Divider>
          <div className="flex w-full items-center space-x-3">
            <TextInput
              placeholder={`Amount`}
              onChange={handleInputChange(setAmount)}
              className=""
              disabled={!activeAccount || !tokenId}
            />
            <SearchSelect
              placeholder="Select Token"
              className=""
              onValueChange={handleTokenChange}
              disabled={!activeAccount}
            >
              {tokenOptions.map((token) => (
                <SearchSelectItem key={token.id} value={token.id}>
                  {token.name} (ID: {token.id})
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
            <Text>Amount per Holder</Text>
          </div>
          <Divider className="mt-12 font-bold">Step 3: Check details</Divider>
          <div className="mb-2 flex flex-col items-center justify-center space-y-2 md:flex-row md:space-x-4 md:space-y-0">
            <Text className="text-center">
              <span className="font-bold">Total Cost:</span>{" "}
              {formatArc200Amount(
                isNaN(totalCost) ? 0 : totalCost / 10 ** tokenInfo.decimals,
                tokenInfo.decimals
              )}{" "}
              {tokenInfo.name}
            </Text>
            <Text className="text-center">
              <span className="font-bold">Token Holders:</span>{" "}
              {isNaN(lpHolders.size) ? 0 : lpHolders.size}
            </Text>
            <Text className="text-center">
              <span className="font-bold">Amount per Holder:</span>{" "}
              {formatArc200Amount(
                isNaN(perHolderCost)
                  ? 0
                  : perHolderCost / 10 ** tokenInfo.decimals,
                tokenInfo.decimals
              )}{" "}
              {tokenInfo.name}
            </Text>
            <Text className="text-center">
              <span className="font-bold">Transaction / Box Fees:</span>{" "}
              {formatVoiAmount(isNaN(estimatedFees) ? 0 : estimatedFees)} VOI
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
              Number(formatArc200Amount(perHolderCost, tokenInfo.decimals)) ==
                0 ||
              totalCost === 0 ||
              perHolderCost === 0 ||
              estimatedFees === 0 ||
              totalCost / 10 ** tokenInfo.decimals >= balance ||
              estimatedFees >= voiBalance / 1_000_000
            }
          >
            Send it!
          </Button>
          <ProgressBar
            value={(signedTransactions / totalTransactions) * 100}
            className="mt-8 w-full"
          />
          <Text className="mt-2">{`Progress: ${signedTransactions} of ${totalTransactions} Transactions Sent (${totalGroups} groups).`}</Text>
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

export default SendViaArc200Component;
