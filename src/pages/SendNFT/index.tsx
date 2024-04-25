import { FC } from "react";
import { Grid } from "@tremor/react";
import NavbarSidebarLayout from "../../layouts/navbar-sidebar";
import SendNFTComponent from "./Components/SendNft";


const SendNFTPage: FC = function () {

  return (
    <NavbarSidebarLayout>
      <Grid numItemsSm={1} numItemsLg={1} className="gap-6  m-6"> 
          <SendNFTComponent/>
      </Grid>
    </NavbarSidebarLayout>
  );
};

export default SendNFTPage;