import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export const brokerPayHistoryApi = createApi({
  reducerPath: "brokerPayHistoryApi",
  tagTypes: ["BrokerPayHistory"],
  baseQuery: fetchBaseQuery({
    baseUrl: `${BACKEND_URL}/api/broker/payments/`,
    credentials: "include",
    prepareHeaders: (headers, { getState }) => {
      const token = getState()?.user?.token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getBrokerPayHistory: builder.query({
      query: (search = "") => `history?search=${encodeURIComponent(search)}`,
      providesTags: [{ type: "BrokerPayHistory", id: "LIST" }],
    }),
  }),
});

export const { useGetBrokerPayHistoryQuery } = brokerPayHistoryApi;
