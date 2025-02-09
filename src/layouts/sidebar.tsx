import { Sidebar } from "flowbite-react";
import type { FC } from "react";
import { useEffect, useState } from "react";
import { Text } from "@tremor/react";
import { Link, useLocation } from "react-router-dom";
import {
  HiCamera,
  HiFire,
  HiOutlinePaperAirplane,
  HiPaperAirplane,
} from "react-icons/hi";
//import kittysleep from '../assets/kitty_sleep.gif'

interface ExampleSidebarProps {
  isSidebarOpen: boolean;
}

const ExampleSidebar: FC<ExampleSidebarProps> = function ({ isSidebarOpen }) {
  const [currentPage, setCurrentPage] = useState("");
  const location = useLocation();

  useEffect(() => {
    setCurrentPage(location.pathname);
  }, [location]);

  // Dynamic style for the sidebar container
  const sidebarStyle = {
    width: isSidebarOpen ? "auto" : "0",
    overflow: isSidebarOpen ? "visible" : "hidden",
    border: isSidebarOpen ? "" : "none",
  };

  return (
    <Sidebar
      aria-label="Sidebar with multi-level dropdown example"
      collapsed={!isSidebarOpen}
      style={sidebarStyle}
    >
      <div className=" flex h-full flex-col justify-between py-1 font-pixel">
        {isSidebarOpen && (
          <div>
            <Sidebar.Items>
              <Sidebar.ItemGroup>
                <Text className="mb-2 ml-1 mt-1">ARC - 72:</Text>
                <Sidebar.Item
                  as={Link}
                  to="/"
                  icon={HiOutlinePaperAirplane}
                  className={"/" === currentPage ? "bg-gray-700" : ""}
                >
                  Send NFT
                </Sidebar.Item>
              </Sidebar.ItemGroup>
              <Sidebar.ItemGroup>
                <Text className="mb-2 ml-1">Airdrop Collections:</Text>
                <Sidebar.Item
                  as={Link}
                  to="/collection-airdrop"
                  icon={HiPaperAirplane}
                  className={
                    "/collection-airdrop" === currentPage ? "bg-gray-700" : ""
                  }
                >
                  Send VOI
                </Sidebar.Item>
                <Sidebar.Item
                  as={Link}
                  to="/vsa-airdrop"
                  icon={HiPaperAirplane}
                  className={
                    "/vsa-airdrop" === currentPage ? "bg-gray-700" : ""
                  }
                >
                  Send VSA
                </Sidebar.Item>
                <Sidebar.Item
                  as={Link}
                  to="/arc200-collection-airdrop"
                  icon={HiPaperAirplane}
                  className={
                    "/arc200-collection-airdrop" === currentPage
                      ? "bg-gray-700"
                      : ""
                  }
                >
                  Send ARC - 200
                </Sidebar.Item>
              </Sidebar.ItemGroup>
              <Sidebar.ItemGroup className="hidden">
                <Text className="mb-2 ml-1">Airdrop LP Holders:</Text>
                <Sidebar.Item
                  as={Link}
                  to="/lp-airdrop"
                  icon={HiPaperAirplane}
                  className={"/lp-airdrop" === currentPage ? "bg-gray-700" : ""}
                >
                  Send VOI
                </Sidebar.Item>
                <Sidebar.Item
                  as={Link}
                  to="/arc200-lp-airdrop"
                  icon={HiPaperAirplane}
                  className={
                    "/arc200-lp-airdrop" === currentPage ? "bg-gray-700" : ""
                  }
                >
                  Send ARC - 200
                </Sidebar.Item>
              </Sidebar.ItemGroup>
              <Sidebar.ItemGroup>
                <Text className="mb-2 ml-1">Airdrop Token Holders:</Text>
                <Sidebar.Item
                  as={Link}
                  to="/token-airdrop"
                  icon={HiPaperAirplane}
                  className={
                    "/token-airdrop" === currentPage ? "bg-gray-700" : ""
                  }
                >
                  Send VOI
                </Sidebar.Item>
                <Sidebar.Item
                  as={Link}
                  to="/vsa-arc200-holders-airdrop"
                  icon={HiPaperAirplane}
                  className={
                    "/vsa-arc200-holders-airdrop" === currentPage
                      ? "bg-gray-700"
                      : ""
                  }
                >
                  Send VSA
                </Sidebar.Item>
                <Sidebar.Item
                  as={Link}
                  to="/arc200-token-airdrop"
                  icon={HiPaperAirplane}
                  className={
                    "/arc200-token-airdrop" === currentPage ? "bg-gray-700" : ""
                  }
                >
                  Send ARC - 200
                </Sidebar.Item>
              </Sidebar.ItemGroup>
              <Sidebar.ItemGroup>
                <Text className="mb-2 ml-1">Airdrop CSV List:</Text>
                <Sidebar.Item
                  as={Link}
                  to="/csv-airdrop"
                  icon={HiPaperAirplane}
                  className={
                    "/csv-airdrop" === currentPage ? "bg-gray-700" : ""
                  }
                >
                  Send VOI
                </Sidebar.Item>
                <Sidebar.Item
                  as={Link}
                  to="/vsa-csv-airdrop"
                  icon={HiPaperAirplane}
                  className={
                    "/vsa-csv-airdrop" === currentPage ? "bg-gray-700" : ""
                  }
                >
                  Send VSA
                </Sidebar.Item>
                <Sidebar.Item
                  as={Link}
                  to="/arc-200-csv-airdrop"
                  icon={HiPaperAirplane}
                  className={
                    "/arc-200-csv-airdrop" === currentPage ? "bg-gray-700" : ""
                  }
                >
                  Send ARC - 200
                </Sidebar.Item>
              </Sidebar.ItemGroup>
              <Sidebar.ItemGroup>
                <Text className="mb-2 ml-1">Snapshots:</Text>
                <Sidebar.Item
                  as={Link}
                  to="/collection-snapshot"
                  icon={HiCamera}
                  className={
                    "/collection-snapshot" === currentPage ? "bg-gray-700" : ""
                  }
                >
                  Collection
                </Sidebar.Item>
                <Sidebar.Item
                  as={Link}
                  to="/arc200-snapshot"
                  icon={HiCamera}
                  className={
                    "/arc200-snapshot" === currentPage ? "bg-gray-700" : ""
                  }
                >
                  ARC - 200
                </Sidebar.Item>
                <Sidebar.Item
                  as={Link}
                  to="/lp-snapshot"
                  icon={HiCamera}
                  className={
                    "/lp-snapshot" === currentPage ? "bg-gray-700" : "hidden"
                  }
                >
                  LP Token
                </Sidebar.Item>
              </Sidebar.ItemGroup>
              <Sidebar.ItemGroup>
                <Text className="mb-2 ml-1">Burning:</Text>
                <Sidebar.Item
                  as={Link}
                  to="/burn-nft"
                  icon={HiFire}
                  className={"/burn-nft" === currentPage ? "bg-gray-700" : ""}
                >
                  Burn NFT
                </Sidebar.Item>
              </Sidebar.ItemGroup>
            </Sidebar.Items>
          </div>
        )}
      </div>
    </Sidebar>
  );
};

export default ExampleSidebar;
