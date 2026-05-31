// src/api/brokerpayApi.js  (MODIFIED — added getBrokerSummaryById endpoint)

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export const brokerPayApi = createApi({
  reducerPath: "brokerPayApi",
  tagTypes: ["BrokerPaySummary", "BrokerPay"],
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
    // ✅ summary by NIC (for brokers that have a NIC)
    getBrokerSummaryByNic: builder.query({
      query: (nic) => `broker/${encodeURIComponent(nic)}/summary`,
      providesTags: (res, err, nic) => [{ type: "BrokerPaySummary", id: nic }],
    }),

    // ✅ NEW: summary by MongoDB _id (for brokers that have no NIC)
    getBrokerSummaryById: builder.query({
      query: (id) => `broker/id/${encodeURIComponent(id)}/summary`,
      providesTags: (res, err, id) => [{ type: "BrokerPaySummary", id }],
    }),

    // ✅ CREATE broker payment
    createBrokerPayment: builder.mutation({
      query: (payload) => ({
        url: "pay",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "BrokerPay", id: "LIST" },
        ...(arg?.brokerNic
          ? [{ type: "BrokerPaySummary", id: String(arg.brokerNic).trim().toUpperCase() }]
          : []),
      ],
    }),
  }),
});

export const {
  useLazyGetBrokerSummaryByNicQuery,
  useLazyGetBrokerSummaryByIdQuery,   // ✅ NEW
  useCreateBrokerPaymentMutation,
} = brokerPayApi;