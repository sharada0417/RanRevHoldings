import { Outlet } from "react-router-dom";
import VerticalNavBar from "../compoments/VerticalNavBar";

function SecondLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* LEFT */}
      <div className="h-full w-[56px] sm:w-[110px] flex justify-start pl-5 sm:pl-0">
        <VerticalNavBar />
      </div>

      {/* RIGHT */}
      <div className="flex-1 min-w-0 overflow-y-auto p-4">
        <Outlet />
      </div>
    </div>
  );
}

export default SecondLayout;
