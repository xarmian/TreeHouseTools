import { FC } from "react";
import { Grid } from "@tremor/react";
import NavbarSidebarLayout from "../../layouts/navbar-sidebar";
import AirdropLPComponent from "./components/AirdropLPComponent";


const AirdropLPPage: FC = function () {

  return (
    <NavbarSidebarLayout>
      <Grid numItemsSm={1} numItemsLg={1} className="gap-6  m-6"> 
          <AirdropLPComponent/>
      </Grid>
    </NavbarSidebarLayout>
  );
};

export default AirdropLPPage;