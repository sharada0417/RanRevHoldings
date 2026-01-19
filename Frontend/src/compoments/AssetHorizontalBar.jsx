import React from "react";
import { NavLink } from "react-router-dom";

const AssetHorizontalBar = () => {
  const menuItems = [
    { label: "Assets", to: "/assets" },
    { label: "View Assets", to: "/assets/viewassets" },
  ];

  return (
    <div className="px-3 pt-3 sm:px-6 sm:pt-6">
      <div
        className="mx-auto w-full max-w-md sm:max-w-2xl md:max-w-3xl rounded-xl sm:rounded-2xl shadow-md"
        style={{ backgroundColor: "#D9D9D9" }}
      >
        <nav className="flex items-center justify-evenly px-3 py-3 sm:px-6 sm:py-6">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/assets"} // ✅ IMPORTANT
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

export default AssetHorizontalBar;
