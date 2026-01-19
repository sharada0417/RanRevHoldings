import React from "react";
import { NavLink } from "react-router-dom";

const CustomerHorizontalBar = () => {
  const menuItems = [
    { label: "Customers", to: "/customers" },
    { label: "View Customers", to: "/customers/viewcustomers" },
  ];

  return (
    <div className="px-3 pt-3 sm:px-6 sm:pt-6">
      {/* ✅ reduced width + centered */}
      <div
        className="
          mx-auto
          w-full
          max-w-md sm:max-w-2xl md:max-w-3xl
          rounded-xl sm:rounded-2xl
          shadow-md
        "
        style={{ backgroundColor: "#D9D9D9" }}
      >
        <nav className="flex items-center justify-evenly px-3 py-3 sm:px-6 sm:py-6">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/customers"}
              className={({ isActive }) =>
                `font-bold transition text-sm sm:text-lg md:text-xl ${
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

export default CustomerHorizontalBar;
