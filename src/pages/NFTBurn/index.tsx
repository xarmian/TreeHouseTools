import { FC } from "react";
import { Grid } from "@tremor/react";
import NavbarSidebarLayout from "../../layouts/navbar-sidebar";
import NFTBurnComponent from "./Components/ NFTBurnComponent";


const NFTBurnPage: FC = function () {

  return (
    <NavbarSidebarLayout>
      <Grid numItemsSm={1} numItemsLg={1} className="gap-6  m-6"> 
          <NFTBurnComponent/>
      </Grid>
    </NavbarSidebarLayout>
  );
};

export default NFTBurnPage;