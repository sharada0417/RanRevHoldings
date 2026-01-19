// src/layout/RootLayout.jsx
import { Outlet } from "react-router-dom";

function RootLayout() {
  return (
    <div className="min-h-screen w-screen">
      <Outlet />
    </div>
  );
}

export default RootLayout;
