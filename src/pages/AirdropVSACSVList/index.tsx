import type { FC } from "react";
import { Grid } from "@tremor/react";
import NavbarSidebarLayout from "../../layouts/navbar-sidebar";
import AirdropVSACSVListComponent from "./components/AirdropVSACSVListComponent";

const AirdropVSACSVListPage: FC = function () {
  return (
    <NavbarSidebarLayout>
      <Grid numItemsSm={1} numItemsLg={1} className="m-6  gap-6">
        <AirdropVSACSVListComponent />
      </Grid>
    </NavbarSidebarLayout>
  );
};

export default AirdropVSACSVListPage;
