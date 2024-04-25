import { FC } from "react";
import { Grid } from "@tremor/react";
import NavbarSidebarLayout from "../../layouts/navbar-sidebar";
import AirdropArc200HoldersComponent from "./components/AirdropARC200HoldersComponent";


const AirdropArc200HoldersPage: FC = function () {

  return (
    <NavbarSidebarLayout>
      <Grid numItemsSm={1} numItemsLg={1} className="gap-6  m-6"> 
          <AirdropArc200HoldersComponent/>
      </Grid>
    </NavbarSidebarLayout>
  );
};

export default AirdropArc200HoldersPage;