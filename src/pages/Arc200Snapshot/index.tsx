import { FC } from "react";
import { Grid } from "@tremor/react";
import NavbarSidebarLayout from "../../layouts/navbar-sidebar";
import Arc200SnapshotComponent from "./components/Arc200SnapshotComponent";



const Arc200SnapshotPage: FC = function () {

  return (
    <NavbarSidebarLayout>
      <Grid numItemsSm={1} numItemsLg={1} className="gap-6  m-6"> 
          <Arc200SnapshotComponent/>
      </Grid>
    </NavbarSidebarLayout>
  );
};

export default Arc200SnapshotPage;