import { createRoot } from "react-dom/client";
import "./theme/index.css";
import theme from "./theme/flowbite-theme";
import { Flowbite } from "flowbite-react";
import {NextUIProvider} from '@nextui-org/react'
import { Routes, Route, BrowserRouter } from "react-router-dom";
import SendNFTPage from "./pages/SendNFT";
import algosdk from "algosdk";
import { WalletProvider, useInitializeProviders, PROVIDER_ID } from '@txnlab/use-wallet';
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

const App = () => {
  const providers = useInitializeProviders({
    providers: [{ id: PROVIDER_ID.KIBISIS }],
    nodeConfig: {
      network: 'testnet',
      nodeServer: 'https://testnet-api.voi.nodly.io',
      nodeToken: '',
      nodePort: 443
    },
    algosdkStatic: algosdk
  });

  return (
    <WalletProvider value={providers}>
     <Flowbite theme={{ theme }}>
     <NextUIProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SendNFTPage />}/>
          <Route path="/collection-airdrop" element={<AirdropPage />}/>
          <Route path="/lp-airdrop" element={<AirdropLPPage />}/>
          <Route path="/token-airdrop" element={<AirdropArc200HoldersPage />}/>
          <Route path="/csv-airdrop" element={<AirdropCSVPage />}/>
          <Route path="/arc-200-csv-airdrop" element={<AirdropViaCSVListPage />}/>
          <Route path="/arc200-collection-airdrop" element={<AirdropViaPage />}/>
          <Route path="/arc200-token-airdrop" element={<AirdropViaArc200HolderPage />}/>
          <Route path="/arc200-lp-airdrop" element={<AirdropViaLPHolderPage />}/>
          <Route path="/collection-snapshot" element={<NFTSnapshotPage />}/>
          <Route path="/arc200-snapshot" element={<Arc200SnapshotPage />}/>
          <Route path="/lp-snapshot" element={<LPSnapshotPage />}/>
          <Route path="/burn-nft" element={<NFTBurnPage />}/>
        </Routes>
      </BrowserRouter>
      </NextUIProvider>
     </Flowbite>
    </WalletProvider>
  );
};

const container = document.getElementById("root");
if (!container) {
  throw new Error("React root element doesn't exist!");
}
const root = createRoot(container);
root.render(<App />);
