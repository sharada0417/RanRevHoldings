// pages/SignIn.page.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import Login from "../assets/Login.png";

import { useSignInMutation } from "../api/userApi";
import { setCredentials } from "../api/features/userSlice";

const SignInPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [signIn, { isLoading }] = useSignInMutation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");

    try {
      const res = await signIn({ email, password }).unwrap();

      // ✅ if email not verified, backend returns 403 with ok:false
      if (!res?.ok) {
        // if backend sends email back
        if (res?.status === 403) {
          navigate("/vertify", { state: { email: res?.data?.email || email } });
          return;
        }
        setLocalError(res?.message || "Signin failed");
        return;
      }

      // ✅ success => save token + user
      dispatch(
        setCredentials({
          token: res.data.token,
          user: res.data.user,
        })
      );

      navigate("/home");
    } catch (err) {
      const msg =
        err?.data?.message ||
        err?.error ||
        "Signin failed. Please try again.";
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
          SignIn
        </h2>

        <form className="w-full max-w-sm" onSubmit={handleSubmit}>
          {/* ✅ EMAIL */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm mb-2">Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* ✅ PASSWORD */}
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

          {localError && (
            <p className="text-red-500 text-sm mb-2">{localError}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 duration-200 disabled:opacity-60"
          >
            {isLoading ? "Signing In..." : "SignIn"}
          </button>

          {/* optional link */}
          <p className="text-sm text-gray-600 mt-4 text-center">
            Don&apos;t have an account?{" "}
            <span
              className="text-blue-700 font-semibold cursor-pointer hover:underline"
              onClick={() => navigate("/signup")}
            >
              Sign Up
            </span>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignInPage;
