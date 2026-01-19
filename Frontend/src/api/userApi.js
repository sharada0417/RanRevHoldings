import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export const userApi = createApi({
  reducerPath: "userApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${BACKEND_URL}/api/user/`,
    prepareHeaders: (headers, { getState }) => {
      const token = getState()?.user?.token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  endpoints: (builder) => ({
    signIn: builder.mutation({
      query: (payload) => ({
        url: "signin",
        method: "POST",
        body: payload, // { email, password }
      }),
    }),

    signUp: builder.mutation({
      query: (payload) => ({
        url: "signup",
        method: "POST",
        body: payload,
      }),
    }),

    verifyEmail: builder.mutation({
      query: (payload) => ({
        url: "verify-email",
        method: "POST",
        body: payload,
      }),
    }),

    resendOtp: builder.mutation({
      query: (payload) => ({
        url: "resend-otp",
        method: "POST",
        body: payload,
      }),
    }),
  }),
});

export const {
  useSignUpMutation,
  useSignInMutation,
  useVerifyEmailMutation,
  useResendOtpMutation,
} = userApi;
