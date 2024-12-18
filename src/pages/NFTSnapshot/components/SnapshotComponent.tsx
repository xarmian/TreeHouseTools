import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Grid,
  Metric,
  Divider,
  SearchSelect,
  SearchSelectItem,
  Switch,
  Text,
  DatePicker,
  TextInput,
} from "@tremor/react";
import "./spinner.css";
import hammer from "../../../assets/hammer.png";
import {
  fetchTokensAndOwners,
  fetchProjects,
  scheduleCollectionHolderSnapshot,
} from "../../../utils/api";
import confetti from "canvas-confetti";

const NFTSnapshotComponent: React.FC = () => {
  const [collectionId, setCollectionId] = useState<string>("");
  const [collections, setCollections] = useState<
    { contractId: number; name: string }[]
  >([]);
  const [tokensData, setTokensData] = useState([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isScheduled, setIsScheduled] = useState<boolean>(false);
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

      setCurrentUTCTime(utcFormatter.format(new Date()));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadTokensAndOwners = async () => {
      if (!collectionId) return;
      setLoading(true);
      try {
        const tokens = await fetchTokensAndOwners(collectionId);
        setTokensData(tokens);
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
    const checkButtonDisabled = () => {
      const hasValidCollection = !!collectionId;
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

      // The button is enabled if a collection is selected and either scheduling is not enabled or all conditions for scheduling are met.
      setIsButtonDisabled(
        !(
          hasValidCollection &&
          (isNotScheduled ||
            (hasValidEmail && hasValidTime && hasValidDate && isFutureTime))
        )
      );
    };

    checkButtonDisabled();
  }, [collectionId, email, selectedTime, selectedDate, isScheduled, loading]);

  const handleScheduledToggle = (value: boolean) => {
    setIsScheduled(value);
  };

  const generateCSVAndDownload = () => {
    if (!Array.isArray(tokensData)) {
      console.error("tokensData is not an array:", tokensData);
      return;
    }

    const csvHeader = "Owner Address,Token ID\n";
    const csvRows = tokensData
      .map((token) => `${token.owner},${token.tokenId}`)
      .join("\n");
    const csvContent = csvHeader + csvRows;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `collection_${collectionId}_snapshot.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
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

      scheduleCollectionHolderSnapshot(network, collectionId, utcDate, email)
        .then((response) => {
          console.log("Snapshot scheduled successfully:", response);
          launchConfetti();

          const scheduledApiData = {
            network: "mainnet",
            kind: "scheduled",
            collection: collectionId,
          };

          fetch("/api/record-collection-snapshot", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(scheduledApiData),
          })
            .then((response) => response.json())
            .then((data) =>
              console.log(
                "Scheduled collection snapshot record response:",
                data
              )
            )
            .catch((error) => {
              console.error("Error recording snapshot:", error);
            });
        })
        .catch((error) => {
          console.error("Error scheduling snapshot:", error);
        });
    } else {
      generateCSVAndDownload();
      launchConfetti();
      const instantApiData = {
        network: "mainnet",
        kind: "instant",
        collection: collectionId,
      };

      fetch("/api/record-collection-snapshot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(instantApiData),
      })
        .then((response) => response.json())
        .then((data) =>
          console.log("Instant collection snapshot record response:", data)
        )
        .catch((error) => {
          console.error("Error recording snapshot:", error);
        });
    }
  };

  useEffect(() => {
    const currentUTCHour = new Date().getUTCHours();
    const currentUTCMinute = new Date().getUTCMinutes();
    const isTodaySelected =
      selectedDate.toDateString() === todayUTC.toDateString();

    const filteredTimeOptions = Array.from({ length: 24 * 12 }, (_, i) => {
      const hour = Math.floor(i / 12);
      const minute = (i % 12) * 5;
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
              Collection Holders Snapshot
            </Metric>
            <img src={hammer} alt="Hammer" className="mb-4 ml-4 size-10" />
          </div>
          <Divider className="font-bold">
            Step 1: Select any ARC-72 Collection
          </Divider>
          <SearchSelect
            placeholder="Select Collection"
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
          <Divider className="mt-10 font-bold">
            Step 2: Choose instant or scheduled time{" "}
          </Divider>
          <div className="flex items-center space-x-3">
            <Text>Take instant snapshot</Text>
            <Switch onChange={handleScheduledToggle} />
            <Text>Take scheduled snapshot</Text>
          </div>
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
            {isScheduled ? "Step 5: Schedule" : "Step 3: Download"} Holders CSV
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

export default NFTSnapshotComponent;
