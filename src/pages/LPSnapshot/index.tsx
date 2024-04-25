import { FC } from "react";
import { Grid } from "@tremor/react";
import NavbarSidebarLayout from "../../layouts/navbar-sidebar";
import LPSnapshotComponent from "./components/LPSnapshotComponent";



const LPSnapshotPage: FC = function () {

  return (
    <NavbarSidebarLayout>
      <Grid numItemsSm={1} numItemsLg={1} className="gap-6  m-6"> 
          <LPSnapshotComponent/>
      </Grid>
    </NavbarSidebarLayout>
  );
};

export default LPSnapshotPage;