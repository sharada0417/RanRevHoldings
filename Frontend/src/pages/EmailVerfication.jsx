// pages/EmailVerfication.jsx
import React, { useRef, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useVerifyEmailMutation, useResendOtpMutation } from "../api/userApi";

const EmailVerificationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ email passed from signup: navigate("/vertify", { state: { email } })
  const email = location?.state?.email || "";

  const [localError, setLocalError] = useState("");
  const [localSuccess, setLocalSuccess] = useState("");

  // ✅ RTK mutations
  const [verifyEmail, { isLoading: isVerifying }] = useVerifyEmailMutation();
  const [resendOtp, { isLoading: isResending }] = useResendOtpMutation();

  // ✅ 6 OTP refs (stable)
  const inputs = useMemo(
    () => Array.from({ length: 6 }, () => React.createRef()),
    []
  );

  const handleChange = (e, index) => {
    const value = e.target.value;

    // only allow single digit
    if (!/^[0-9]?$/.test(value)) return;

    // move next
    if (value && index < 5) {
      inputs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      const currentVal = inputs[index].current?.value || "";
      // if current empty, go previous
      if (!currentVal && index > 0) {
        inputs[index - 1].current?.focus();
      }
    }
  };

  const getOtp = () => {
    let otp = "";
    inputs.forEach((ref) => {
      otp += ref.current?.value || "";
    });
    return otp;
  };

  const handleSubmit = async () => {
    setLocalError("");
    setLocalSuccess("");

    if (!email) {
      setLocalError("Email not found. Please signup again.");
      return;
    }

    const otp = getOtp();
    if (otp.length !== 6) {
      setLocalError("Please enter the 6-digit OTP");
      return;
    }

    try {
      const res = await verifyEmail({ email, otp }).unwrap();

      if (res?.ok) {
        setLocalSuccess("Email verified successfully. Redirecting to Sign In...");
        setTimeout(() => navigate("/signin"), 800);
      } else {
        setLocalError(res?.message || "OTP verification failed");
      }
    } catch (err) {
      setLocalError(err?.data?.message || "OTP verification failed");
    }
  };

  const handleResend = async () => {
    setLocalError("");
    setLocalSuccess("");

    if (!email) {
      setLocalError("Email not found. Please signup again.");
      return;
    }

    try {
      const res = await resendOtp({ email }).unwrap();
      if (res?.ok) {
        setLocalSuccess("OTP resent successfully. Check your email.");
      } else {
        setLocalError(res?.message || "Resend failed");
      }
    } catch (err) {
      setLocalError(err?.data?.message || "Resend failed");
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full">
      <div className="flex flex-col justify-center items-center bg-white w-full p-10">
        <h2
          className="text-5xl font-bold mb-3 text-blue-800"
          style={{ fontFamily: "Fruktur, cursive" }}
        >
          Email Verification
        </h2>

        {/* show email */}
        <p className="text-gray-600 mb-8 text-sm">
          OTP sent to: <span className="font-semibold">{email || "N/A"}</span>
        </p>

        {/* OTP boxes */}
        <div className="flex gap-3 mb-6">
          {inputs.map((ref, index) => (
            <input
              key={index}
              ref={ref}
              maxLength={1}
              inputMode="numeric"
              onChange={(e) => handleChange(e, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="w-12 h-14 border border-gray-400 rounded-lg text-center text-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ))}
        </div>

        {localError && (
          <p className="text-red-500 text-sm mb-3">{localError}</p>
        )}
        {localSuccess && (
          <p className="text-green-600 text-sm mb-3">{localSuccess}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={isVerifying}
          className="bg-blue-600 text-white px-10 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition duration-200 disabled:opacity-60"
        >
          {isVerifying ? "Verifying..." : "Verify"}
        </button>

        {/* resend */}
        <button
          onClick={handleResend}
          disabled={isResending}
          className="mt-4 text-blue-700 font-semibold hover:underline disabled:opacity-60"
        >
          {isResending ? "Sending OTP..." : "Resend OTP"}
        </button>
      </div>
    </div>
  );
};

export default EmailVerificationPage;
