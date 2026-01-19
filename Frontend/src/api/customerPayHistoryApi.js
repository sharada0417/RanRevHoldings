import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export const customerPayHistoryApi = createApi({
  reducerPath: "customerPayHistoryApi",
  tagTypes: ["CustomerPayHistory"],
  baseQuery: fetchBaseQuery({
    baseUrl: `${BACKEND_URL}/api/customer/payments/`,
    credentials: "include",
    prepareHeaders: (headers, { getState }) => {
      const token = getState()?.user?.token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getCustomerPayHistory: builder.query({
      query: (q = "") => `history${q ? `?q=${encodeURIComponent(q)}` : ""}`,
      providesTags: [{ type: "CustomerPayHistory", id: "LIST" }],
    }),
  }),
});

export const { useGetCustomerPayHistoryQuery } = customerPayHistoryApi;
