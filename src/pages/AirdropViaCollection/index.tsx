import { FC } from "react";
import { Grid } from "@tremor/react";
import NavbarSidebarLayout from "../../layouts/navbar-sidebar";
import SendViaComponent from "./components/AirdropViaComponent";


const AirdropViaPage: FC = function () {

  return (
    <NavbarSidebarLayout>
      <Grid numItemsSm={1} numItemsLg={1} className="gap-6  m-6"> 
          <SendViaComponent/>
      </Grid>
    </NavbarSidebarLayout>
  );
};

export default AirdropViaPage;