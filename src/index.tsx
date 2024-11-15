import { createRoot } from "react-dom/client";
import "./theme/index.css";
import theme from "./theme/flowbite-theme";
import { Flowbite } from "flowbite-react";
import { NextUIProvider } from "@nextui-org/react";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import SendNFTPage from "./pages/SendNFT";

import {
  NetworkId,
  WalletId,
  WalletManager,
  WalletProvider,
} from "@txnlab/use-wallet-react";
import AirdropPage from "./pages/AirdropCollection";
import AirdropViaPage from "./pages/AirdropViaCollection";
import NFTSnapshotPage from "./pages/NFTSnapshot";
import Arc200SnapshotPage from "./pages/Arc200Snapshot";
import LPSnapshotPage from "./pages/LPSnapshot";
import AirdropLPPage from "./pages/AirdropLPHolders";
import AirdropArc200HoldersPage from "./pages/AirdropARC200Holders";
import AirdropViaArc200HolderPage from "./pages/AirdropViaARC200Holders";
import AirdropViaLPHolderPage from "./pages/AirdropViaLPHolders";
import AirdropCSVPage from "./pages/AirdropCSVList";
import AirdropViaCSVListPage from "./pages/AirdropViaCSVList";
import NFTBurnPage from "./pages/NFTBurn";

const walletManager = new WalletManager({
  network: NetworkId.VOIMAIN,
  wallets: [WalletId.KIBISIS],
});
walletManager.setActiveNetwork(NetworkId.VOIMAIN);

const App = () => {
  return (
    <WalletProvider manager={walletManager}>
      <Flowbite theme={{ theme }}>
        <NextUIProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<SendNFTPage />} />
              <Route path="/collection-airdrop" element={<AirdropPage />} />
              <Route path="/lp-airdrop" element={<AirdropLPPage />} />
              <Route
                path="/token-airdrop"
                element={<AirdropArc200HoldersPage />}
              />
              <Route path="/csv-airdrop" element={<AirdropCSVPage />} />
              <Route
                path="/arc-200-csv-airdrop"
                element={<AirdropViaCSVListPage />}
              />
              <Route
                path="/arc200-collection-airdrop"
                element={<AirdropViaPage />}
              />
              <Route
                path="/arc200-token-airdrop"
                element={<AirdropViaArc200HolderPage />}
              />
              <Route
                path="/arc200-lp-airdrop"
                element={<AirdropViaLPHolderPage />}
              />
              <Route
                path="/collection-snapshot"
                element={<NFTSnapshotPage />}
              />
              <Route path="/arc200-snapshot" element={<Arc200SnapshotPage />} />
              <Route path="/lp-snapshot" element={<LPSnapshotPage />} />
              <Route path="/burn-nft" element={<NFTBurnPage />} />
            </Routes>
          </BrowserRouter>
        </NextUIProvider>
      </Flowbite>
    </WalletProvider>
  );
};

createRoot(document.getElementById("root")!).render(<App />);
