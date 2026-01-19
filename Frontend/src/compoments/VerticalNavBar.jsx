import React from "react";
import { NavLink } from "react-router-dom";

import {
  AiOutlineHome,
  AiOutlineFund,
  AiOutlineDollarCircle,
  AiOutlineTeam,
  AiOutlineUser,
} from "react-icons/ai";

import { RiUserStarLine } from "react-icons/ri";
import { FiPackage } from "react-icons/fi";

const VerticalNavBar = () => {
  const menuItemsTop = [
    { icon: AiOutlineHome, label: "Home", path: "/home" },
    { icon: AiOutlineTeam, label: "Customers", path: "/customers", big: true },
    { icon: RiUserStarLine, label: "Broker", path: "/broker" },
    { icon: FiPackage, label: "Assets", path: "/assets" },
    { icon: AiOutlineFund, label: "Investment", path: "/investment" },
    { icon: AiOutlineDollarCircle, label: "Payment", path: "/payment/customer" },    
  ];

  // mobile = NO padding | desktop unchanged
  return (
    <div className="h-full flex items-center justify-center p-0 sm:p-6 md:p-8">
      <div className="w-[56px] sm:w-[96px] bg-gray-200 rounded-2xl shadow-md flex flex-col items-center py-3 sm:py-6 justify-between">
        <nav className="flex flex-col items-center space-y-3 sm:space-y-6 font-medium">
          {menuItemsTop.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center transition ${
                    isActive
                      ? "text-blue-600"
                      : "text-gray-700 hover:text-blue-600"
                  }`
                }
              >
                <Icon
                  className={
                    item.big
                      ? "text-xl sm:text-3xl mb-1"
                      : "text-lg sm:text-2xl mb-1"
                  }
                />
                <span className="text-[8px] sm:text-xs leading-none text-center">
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-4 sm:mt-10">
          <NavLink
            to="/user"
            className={({ isActive }) =>
              `flex flex-col items-center transition ${
                isActive
                  ? "text-blue-600"
                  : "text-gray-700 hover:text-blue-600"
              }`
            }
          >
            <AiOutlineUser className="text-lg sm:text-2xl mb-1" />
            <span className="text-[8px] sm:text-xs leading-none text-center">
              Profile
            </span>
          </NavLink>
        </div>
      </div>
    </div>
  );
};

export default VerticalNavBar;
