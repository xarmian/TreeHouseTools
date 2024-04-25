import { FC } from "react";
import { Grid } from "@tremor/react";
import NavbarSidebarLayout from "../../layouts/navbar-sidebar";
import SendViaLPHolderComponent from "./components/AirdropViaLPHolderComponent";


const AirdropViaLPHolderPage: FC = function () {

  return (
    <NavbarSidebarLayout>
      <Grid numItemsSm={1} numItemsLg={1} className="gap-6 m-6"> 
          <SendViaLPHolderComponent/>
      </Grid>
    </NavbarSidebarLayout>
  );
};

export default AirdropViaLPHolderPage;