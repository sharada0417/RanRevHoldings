import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export const brokerPayApi = createApi({
  reducerPath: "brokerPayApi",
  tagTypes: ["BrokerPay"],
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
    // ✅ summary
    getBrokerSummaryByNic: builder.query({
      query: (nic) => `broker/${encodeURIComponent(nic)}/summary`,
      providesTags: [{ type: "BrokerPay", id: "SUMMARY" }],
    }),

    // ✅ pay
    createBrokerPayment: builder.mutation({
      query: (payload) => ({
        url: "pay",
        method: "POST",
        body: payload, // { brokerNic, investmentId, payAmount, note }
      }),
      invalidatesTags: [{ type: "BrokerPay", id: "SUMMARY" }],
    }),

    // ✅ history
    getBrokerHistoryByNic: builder.query({
      query: (nic) => `broker/${encodeURIComponent(nic)}/history`,
      providesTags: [{ type: "BrokerPay", id: "HISTORY" }],
    }),
  }),
});

export const {
  useLazyGetBrokerSummaryByNicQuery,
  useGetBrokerSummaryByNicQuery,
  useCreateBrokerPaymentMutation,
  useGetBrokerHistoryByNicQuery,
} = brokerPayApi;
