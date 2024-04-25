import { FC } from "react";
import { Navbar } from "flowbite-react";
import { HiMenu } from "react-icons/hi";
import { useWallet } from "@txnlab/use-wallet";
import { Button } from "@tremor/react";
import headerImage from "./assets/logo_header.png"

interface ExampleNavbarProps {
  onToggleSidebar: () => void;
}

const ExampleNavbar: FC<ExampleNavbarProps> = function ({ onToggleSidebar }) {
  const { providers } = useWallet();
  const kibisisProvider = providers && providers[0];

  return (
    <Navbar fluid>
      <div className="w-full p-1 lg:px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={onToggleSidebar} className="lg:hidden text-2xl mr-2">
              <HiMenu />
            </button>
            <Navbar.Brand href="/">
            <img alt="headerimage" src={headerImage} className="mr-3 h-14 p-1"/>
            </Navbar.Brand>
          </div>
          <div className="font-pixel flex items-center gap-3">
            <Button onClick={kibisisProvider?.isConnected ? kibisisProvider.disconnect : kibisisProvider?.connect} disabled={!kibisisProvider}>
              {kibisisProvider && kibisisProvider.isConnected ? 'Disconnect Wallet' : 'Connect Kibisis Wallet'}
            </Button>
            
          </div>
        </div>
      </div>
    </Navbar>
  );
};

export default ExampleNavbar;

