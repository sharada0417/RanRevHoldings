import React from "react";
import { Link } from "react-router-dom";
import { AiOutlineHome } from "react-icons/ai";

const NotificationPage = () => {
  return (
    <div className="w-full min-h-screen p-4 sm:p-6 md:p-10">
      {/* ✅ TOP BAR */}
      <div className="relative mb-6">
        {/* Center title */}
        <h1 className="text-center text-blue-800 text-2xl sm:text-3xl md:text-4xl font-extrabold">
          Notification
        </h1>

        {/* Home icon right */}
        <Link
          to="/home"
          aria-label="Home"
          className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-gray-100 transition"
        >
          <AiOutlineHome className="text-2xl sm:text-3xl text-gray-700" />
        </Link>
      </div>


      {/* ✅ NOTIFICATION BAR */}
      <div className="bg-gray-200 rounded-2xl shadow-md px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Left */}
          <h1 className="text-blue-800 font-extrabold text-base sm:text-lg">
            Mr Perera
          </h1>

          {/* Middle */}
          <h2 className="text-blue-700 font-semibold text-sm sm:text-base sm:text-center">
            Expire Today
          </h2>

          {/* Right */}
          <div className="sm:flex sm:justify-end">
            <button
              type="button"
              className="w-full sm:w-auto bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-2 rounded-xl transition"
            >
              View Details
            </button>
          </div>
        </div>
      </div>

      {/* ✅ If you want multiple notifications, duplicate the bar like this */}
      {/* 
      <div className="mt-4 bg-gray-200 rounded-2xl shadow-md px-4 sm:px-6 py-4">
        ...
      </div> 
      */}
    </div>
  );
};

export default NotificationPage;
