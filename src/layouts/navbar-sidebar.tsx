
import type { FC, PropsWithChildren} from "react";
import { useState, useEffect } from "react";
import Navbar from "./navbar";
import Sidebar from "./sidebar";


interface NavbarSidebarLayoutProps {
  isFooter?: boolean;
}

const NavbarSidebarLayout: FC<PropsWithChildren<NavbarSidebarLayoutProps>> = function ({ children, isFooter = true }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth > 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <>
      <Navbar onToggleSidebar={toggleSidebar} />
      <div className="flex items-start pt-20">
        <Sidebar isSidebarOpen={isSidebarOpen} />
          <MainContent isFooter={isFooter}>{children}</MainContent>
        </div>
      </>
    );
  };

const MainContent: FC<PropsWithChildren<NavbarSidebarLayoutProps>> = function ({
  children,
  //isFooter,
}) {
  return (
    <main className="relative min-h-full w-full lg:ml-56">
      {children}
      
    </main>
  );
};


export default NavbarSidebarLayout;