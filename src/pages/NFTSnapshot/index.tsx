import { FC } from "react";
import { Grid } from "@tremor/react";
import NavbarSidebarLayout from "../../layouts/navbar-sidebar";
import NFTSnapshotComponent from "./components/SnapshotComponent";



const NFTSnapshotPage: FC = function () {

  return (
    <NavbarSidebarLayout>
      <Grid numItemsSm={1} numItemsLg={1} className="gap-6  m-6"> 
          <NFTSnapshotComponent/>
      </Grid>
    </NavbarSidebarLayout>
  );
};

export default NFTSnapshotPage;