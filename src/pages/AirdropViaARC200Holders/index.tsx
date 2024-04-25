import { FC } from "react";
import { Grid } from "@tremor/react";
import NavbarSidebarLayout from "../../layouts/navbar-sidebar";
import SendViaArc200Component from "./components/AirdropViaArc200HolderComponent";


const AirdropViaArc200HolderPage: FC = function () {

  return (
    <NavbarSidebarLayout>
      <Grid numItemsSm={1} numItemsLg={1} className="gap-6 m-6"> 
          <SendViaArc200Component/>
      </Grid>
    </NavbarSidebarLayout>
  );
};

export default AirdropViaArc200HolderPage;