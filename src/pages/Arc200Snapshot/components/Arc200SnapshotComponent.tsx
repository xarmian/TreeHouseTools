import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Grid,
  Metric,
  Divider,
  // Switch,
  SearchSelect,
  SearchSelectItem,
  Text,
  DatePicker,
  TextInput,
} from "@tremor/react";
import "./spinner.css";
import hammer from "../../../assets/hammer.png";
import confetti from "canvas-confetti";
import { scheduleArc200HolderSnapshot } from "../../../utils/api";

const Arc200SnapshotComponent: React.FC = () => {
  const [tokenInfo, setTokenInfo] = useState({
    id: "",
    decimals: 6,
    name: "",
  });
  const [tokenOptions, setTokenOptions] = useState<
    { name: string; id: string; decimals: number }[]
  >([]);
  const [SnapshotData, setSnapshotData] = useState([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [
    isScheduled,
    //, setIsScheduled
  ] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [email, setEmail] = useState("");
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);
  const [currentLocalTime, setCurrentLocalTime] = useState(
    new Date().toLocaleString()
  );
  const [currentUTCTime, setCurrentUTCTime] = useState(
    new Date().toUTCString()
  );
  const todayUTC = new Date(
    Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate()
    )
  );
  const [timeOptions, setTimeOptions] = useState([]);

  // Fetch ARC-200 tokens from Nautilus API
  useEffect(() => {
    const fetchTokens = async () => {
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

          setTokenOptions(formattedTokens);

          // Set default token if available
          if (formattedTokens.length > 0) {
            setTokenInfo(formattedTokens[0]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch ARC-200 tokens:", error);
        setTokenOptions([]);
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

  const fetchSnapshotData = async () => {
    const launchConfetti = () => {
      confetti({
        zIndex: 999,
        particleCount: 1000,
        spread: 250,
        origin: { y: 0.6 },
      });
    };

    setLoading(true);
    try {
      let allBalances = [];
      let nextToken = null;

      do {
        const url = new URL(
          "https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/balances"
        );
        url.searchParams.append("contractId", tokenInfo.id);
        if (nextToken) {
          url.searchParams.append("next", nextToken);
        }

        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const data = await response.json();

        // Filter out zero balances and format the data
        const validBalances = data.balances
          .filter((holder) => Number(holder.balance) > 0)
          .map((holder) => ({
            account: holder.accountId,
            amount: Number(holder.balance) / Math.pow(10, tokenInfo.decimals),
          }));

        allBalances = [...allBalances, ...validBalances];
        nextToken = data.next;
      } while (nextToken);

      setSnapshotData(allBalances);
      launchConfetti();
    } catch (error) {
      console.error("Error fetching snapshot data:", error);
      alert("Failed to fetch snapshot data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (SnapshotData.length > 0) {
      generateCSVAndDownload();
    }
  }, [SnapshotData]);

  useEffect(() => {
    const timer = setInterval(() => {
      const localFormatter = new Intl.DateTimeFormat("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        hourCycle: "h23",
      });

      // Setting local time
      setCurrentLocalTime(localFormatter.format(new Date()));

      const utcFormatter = new Intl.DateTimeFormat("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        hourCycle: "h23",
        timeZone: "UTC",
      });

      // Setting UTC time
      setCurrentUTCTime(utcFormatter.format(new Date()));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkButtonDisabled = () => {
      //const hasValidToken = !!token;
      const isNotScheduled = !isScheduled;
      const hasValidEmail = !!email;
      const hasValidTime = !!selectedTime;
      const hasValidDate = selectedDate !== undefined;
      const isFutureTime = (() => {
        if (!selectedDate || !selectedTime) return false;

        const offset = selectedDate.getTimezoneOffset() * 60000;
        const localDateTime = new Date(selectedDate.getTime() - offset);
        const formattedDate = localDateTime.toISOString().split("T")[0];
        const utcDateTimeString = `${formattedDate}T${selectedTime}:00Z`;
        const utcDateTime = new Date(utcDateTimeString);
        return utcDateTime.getTime() > Date.now();
      })();

      setIsButtonDisabled(
        !(
          isNotScheduled ||
          (hasValidEmail && hasValidTime && hasValidDate && isFutureTime)
        )
      );
    };

    checkButtonDisabled();
  }, [email, selectedTime, selectedDate, isScheduled, loading]);

  // const handleScheduledToggle = (value: boolean) => {
  //   setIsScheduled(value);
  // };

  const generateCSVAndDownload = () => {
    const csvHeader = "Address,Balance\n";
    const csvRows = [];

    for (const holder of SnapshotData) {
      if (!holder.account || holder.amount === undefined) {
        console.error("Missing account or amount in holder:", holder);
        continue;
      }
      csvRows.push(`${holder.account},${holder.amount}`);
    }

    const csvContent = csvHeader + csvRows.join("\n");

    try {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      link.download = `${tokenInfo.name}_${tokenInfo.id}_holders_${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Error generating or downloading CSV:", error);
      alert(
        "An error occurred while generating the CSV file. Please check the console for details."
      );
    }
  };

  const handleSubmit = () => {
    const launchConfetti = () => {
      confetti({
        zIndex: 999,
        particleCount: 1000,
        spread: 250,
        origin: { y: 0.6 },
      });
    };

    if (isScheduled && selectedDate && selectedTime && email) {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth() + 1;
      const day = selectedDate.getDate();
      const dateString = `${year}-${month.toString().padStart(2, "0")}-${day
        .toString()
        .padStart(2, "0")}T${selectedTime}:00Z`;
      const utcDate = new Date(dateString).toISOString();
      const network = "mainnet";

      scheduleArc200HolderSnapshot(network, tokenInfo.id, utcDate, email)
        .then((response) => {
          console.log("Snapshot scheduled successfully:", response);
          launchConfetti();
          const scheduledApiData = {
            network: "mainnet",
            kind: "scheduled",
            tokenId: tokenInfo.id,
          };

          fetch("/api/record-arc200-snapshot", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(scheduledApiData),
          })
            .then((response) => response.json())
            .then((data) =>
              console.log("Scheduled arc200 snapshot record response:", data)
            )
            .catch((error) => {
              console.error("Error recording snapshot:", error);
            });
        })
        .catch((error) => {
          console.error("Error scheduling snapshot:", error);
        });
    } else {
      fetchSnapshotData();
      const instantApiData = {
        network: "mainnet",
        kind: "instant",
        tokenId: tokenInfo.id,
      };

      fetch("/api/record-arc200-snapshot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(instantApiData),
      })
        .then((response) => response.json())
        .then((data) => console.log("Arc200 snapshot record response:", data))
        .catch((error) => {
          console.error("Error recording snapshot:", error);
        });
    }
  };

  useEffect(() => {
    const currentUTCHour = new Date().getUTCHours();
    const currentUTCMinute = new Date().getUTCMinutes();
    const isTodaySelected = selectedDate
      ? selectedDate.toDateString() === todayUTC.toDateString()
      : false;

    const filteredTimeOptions = Array.from({ length: 24 * 12 }, (_, i) => {
      const hour = Math.floor(i / 12);
      const minute = (i % 12) * 5;
      // Include all times for future dates, or past current time for today
      if (
        !isTodaySelected ||
        hour > currentUTCHour ||
        (hour === currentUTCHour && minute > currentUTCMinute)
      ) {
        return {
          label: `${hour.toString().padStart(2, "0")}:${minute
            .toString()
            .padStart(2, "0")}`,
          value: `${hour.toString().padStart(2, "0")}:${minute
            .toString()
            .padStart(2, "0")}`,
        };
      }
      return null;
    }).filter((option) => option !== null);

    setTimeOptions(filteredTimeOptions);
  }, [selectedDate, currentUTCTime]);

  return (
    <>
      <Grid numItemsSm={1} numItemsLg={1} className="flex justify-center">
        <Card className="flex max-w-screen-lg flex-col items-center">
          <div className="flex items-center">
            <Metric className="ml-16 grow text-center font-pixel">
              ARC - 200 Holders Snapshot
            </Metric>
            <img src={hammer} alt="Hammer" className="mb-2 ml-4 size-10" />
          </div>
          <Divider className="font-bold">Step 1: Select ARC 200 token</Divider>
          <SearchSelect
            placeholder="Select Token"
            className=""
            onValueChange={handleTokenChange}
            value={tokenInfo.id}
            disabled={loading}
          >
            {tokenOptions.map((token) => (
              <SearchSelectItem key={token.id} value={token.id}>
                {token.name} ({token.id})
              </SearchSelectItem>
            ))}
          </SearchSelect>
          {/* 
          <Divider className="mt-10 font-bold">
              Step 2: Choose instant or scheduled time{" "}
            </Divider>
            <div className="flex items-center space-x-3">
              <Text>Take instant snapshot</Text>
              <Switch onChange={handleScheduledToggle} />
              <Text>Take scheduled snapshot</Text>
              </div>
          */}
          {isScheduled && (
            <>
              <Divider className="mt-10 font-bold">
                Step 3: Select UTC date and time
              </Divider>
              <div className="mb-4 flex w-full items-center justify-center space-x-4">
                <Text>Local: {currentLocalTime}</Text>
                <Text>UTC: {currentUTCTime}</Text>
              </div>
              <div className="flex w-full items-center space-x-4">
                <DatePicker
                  className="mx-auto max-w-full"
                  onValueChange={(value) => setSelectedDate(value)}
                  minDate={todayUTC}
                />{" "}
                <SearchSelect
                  className=""
                  placeholder="Select UTC Time"
                  onValueChange={setSelectedTime}
                  value={selectedTime}
                >
                  {timeOptions.map((option, index) => (
                    <SearchSelectItem key={index} value={option.value}>
                      {option.label}
                    </SearchSelectItem>
                  ))}
                </SearchSelect>
              </div>
              <Divider className="mt-10 font-bold">
                Step 4: Specify email address{" "}
              </Divider>
              <TextInput
                onChange={(e) => setEmail(e.target.value)}
                value={email}
                placeholder="Enter email address"
              ></TextInput>
            </>
          )}
          <Divider className="mt-10 font-bold">
            {isScheduled ? "Step 5: Schedule" : "Step 2: Download"} ARC-200 CSV
          </Divider>
          <Button
            size="xl"
            className="mb-2 w-40"
            type="button"
            loading={loading}
            disabled={isButtonDisabled}
            onClick={handleSubmit}
          >
            {isScheduled ? "Schedule" : "Download"}
          </Button>
        </Card>
      </Grid>
    </>
  );
};

export default Arc200SnapshotComponent;
