import type { FC } from "react";
import { Grid } from "@tremor/react";
import NavbarSidebarLayout from "../../layouts/navbar-sidebar";
import AirdropVSAComponent from "./components/AirdropVSAComponent";

const AirdropVSAPage: FC = function () {
  return (
    <NavbarSidebarLayout>
      <Grid numItemsSm={1} numItemsLg={1} className="m-6  gap-6">
        <AirdropVSAComponent />
      </Grid>
    </NavbarSidebarLayout>
  );
};

export default AirdropVSAPage;
