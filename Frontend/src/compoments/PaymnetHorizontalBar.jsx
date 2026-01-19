import React from "react";
import { NavLink } from "react-router-dom";

const PaymnetHorizontalBar = () => {
  const menuItems = [
    { label: "Customer Payment", to: "/payment/customer", end: true },
    { label: "Customer Pay History", to: "/payment/customer/history" },
    { label: "Broker Payment", to: "/payment/broker", end: true },
    { label: "Broker Pay History", to: "/payment/broker/history" },
  ];

  return (
    <div className="px-3 pt-3 sm:px-6 sm:pt-6">
      <div
        className="mx-auto w-full max-w-md sm:max-w-2xl md:max-w-4xl rounded-xl sm:rounded-2xl shadow-md"
        style={{ backgroundColor: "#D9D9D9" }}
      >
        {/* ✅ wrap for mobile */}
        <nav className="flex flex-wrap items-center justify-evenly gap-2 px-3 py-3 sm:px-6 sm:py-5">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `font-bold transition rounded-lg px-2 py-1 text-[11px] sm:text-lg md:text-xl ${
                  isActive
                    ? "text-blue-800 underline underline-offset-[6px] sm:underline-offset-[10px]"
                    : "text-blue-600 hover:text-blue-800"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default PaymnetHorizontalBar;
