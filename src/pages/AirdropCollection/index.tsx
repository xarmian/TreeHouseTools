import { FC } from "react";
import { Grid } from "@tremor/react";
import NavbarSidebarLayout from "../../layouts/navbar-sidebar";
import SendAlgoComponent from "./components/AirdropComponent";


const AirdropPage: FC = function () {

  return (
    <NavbarSidebarLayout>
      <Grid numItemsSm={1} numItemsLg={1} className="gap-6  m-6"> 
          <SendAlgoComponent/>
      </Grid>
    </NavbarSidebarLayout>
  );
};

export default AirdropPage;