import React from "react";
import { useSelector } from "react-redux";
import { AiOutlineUser } from "react-icons/ai";

const UserPage = () => {
  const user = useSelector((state) => state?.user?.user);
  const token = useSelector((state) => state?.user?.token);

  const name =
    user?.name ||
    user?.username ||
    user?.fullName ||
    "Unknown";

  const email = user?.email || "Unknown";

  const notLoggedIn = !token || !user;

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center px-4 bg-white">
      {/* User Icon */}
      <div className="w-32 h-32 rounded-full bg-blue-700 flex items-center justify-center mb-6 shadow-sm">
        <AiOutlineUser className="text-white text-6xl" />
      </div>

      {/* Divider */}
      <div className="w-72 h-[2px] bg-gray-200 mb-6" />

      {/* If not logged */}
      {notLoggedIn ? (
        <div className="text-center">
          <p className="text-xl sm:text-2xl font-extrabold text-gray-900">
            Not logged in
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Please sign in to view your profile details.
          </p>
        </div>
      ) : (
        <div className="text-center space-y-3">
          <p className="text-xl sm:text-2xl font-semibold text-black">
            Name:
            <span className="ml-2 font-normal">{name}</span>
          </p>

          <p className="text-xl sm:text-2xl font-semibold text-black">
            Email:
            <span className="ml-2 font-normal">{email}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default UserPage;
