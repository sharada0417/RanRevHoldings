import { Outlet } from "react-router-dom";
import VerticalNavBar from "../compoments/VerticalNavBar";
import PaymnetHorizontalBar from "../compoments/PaymnetHorizontalBar";

function PaymnetLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* LEFT (same as SecondLayout) */}
      <div className="h-full w-[56px] sm:w-[110px] flex justify-start pl-5 sm:pl-0">
        <VerticalNavBar />
      </div>

      {/* RIGHT */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        <PaymnetHorizontalBar />
        <div className="flex-1 overflow-y-auto p-4 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default PaymnetLayout;
