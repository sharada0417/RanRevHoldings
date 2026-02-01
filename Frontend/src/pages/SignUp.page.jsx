// pages/SignUp.page.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Login from "../assets/Login.png";

// ✅ RTK Query
import { useSignUpMutation } from "../api/userApi";

const SignUpPage = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const [signUp, { isLoading }] = useSignUpMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }

    setLocalError("");

    try {
      const res = await signUp({
        name,
        email,
        password,
        confirmPassword,
      }).unwrap();

      // ✅ backend returns ok:true when otp sent
      if (res?.ok) {
        // ✅ your route is "/vertify" (keep same as your router)
        navigate("/vertify", { state: { email } });
      } else {
        setLocalError(res?.message || "Signup failed");
      }
    } catch (err) {
      // RTK Query error format
      const msg =
        err?.data?.message ||
        err?.error ||
        "Signup failed. Please try again.";
      setLocalError(msg);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full">
      {/* Right side image */}
      <div className="hidden md:flex w-full md:w-1/2">
        <img
          src={Login}
          alt="Login illustration"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Left side - Form */}
      <div className="flex flex-col justify-center items-center bg-white w-full md:w-1/2 p-10">
        <h2
          className="text-5xl font-bold mb-4 text-blue-800"
          style={{ fontFamily: "Fruktur, cursive" }}
        >
          SignUp
        </h2>

        <form className="w-full max-w-sm" onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm mb-2">Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm mb-2">Email</label>
            <input
              type="email"
              placeholder="Enter your email address"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm mb-2">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="Confirm your password"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {localError && (
            <p className="text-red-500 text-sm mb-2">{localError}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 duration-200 disabled:opacity-60"
          >
            {isLoading ? "Signing Up..." : "SignUp"}
          </button>
          
        </form>
         <p className="text-sm text-gray-600 mt-4 text-center">
            Alreay have an account?
            <span
              className="text-blue-700 font-semibold cursor-pointer hover:underline"
              onClick={() => navigate("/signin")}
            >
              Sign In
            </span>
          </p>
      </div>
    </div>
  );
};

export default SignUpPage;
