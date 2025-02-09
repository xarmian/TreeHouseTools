import type { FC } from "react";
import { Grid } from "@tremor/react";
import NavbarSidebarLayout from "../../layouts/navbar-sidebar";
import AirdropVSAARC200HoldersComponent from "./components/AirdropVSAARC200HoldersComponent";

const AirdropVSAARC200HoldersPage: FC = function () {
  return (
    <NavbarSidebarLayout>
      <Grid numItemsSm={1} numItemsLg={1} className="m-6  gap-6">
        <AirdropVSAARC200HoldersComponent />
      </Grid>
    </NavbarSidebarLayout>
  );
};

export default AirdropVSAARC200HoldersPage;
