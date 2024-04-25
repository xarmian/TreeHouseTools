import { FC } from "react";
import { Grid } from "@tremor/react";
import NavbarSidebarLayout from "../../layouts/navbar-sidebar";
import AirdropCSVListComponent from "./components/AirdropCSVListComponent";


const AirdropCSVPage: FC = function () {

  return (
    <NavbarSidebarLayout>
      <Grid numItemsSm={1} numItemsLg={1} className="gap-6  m-6"> 
          <AirdropCSVListComponent/>
      </Grid>
    </NavbarSidebarLayout>
  );
};

export default AirdropCSVPage;