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
    // ✅ summary for View Brokers page
    getBrokerSummaryByNic: builder.query({
      query: (nic) => `broker/${encodeURIComponent(nic)}/summary`,
      providesTags: (res, err, nic) => [{ type: "BrokerPaySummary", id: nic }],
    }),

    // ✅ CREATE broker payment (this hook was missing)
    createBrokerPayment: builder.mutation({
      query: (payload) => ({
        url: "pay",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "BrokerPay", id: "LIST" },
        // refresh broker summary too (if brokerNic available)
        ...(arg?.brokerNic
          ? [{ type: "BrokerPaySummary", id: String(arg.brokerNic).trim().toUpperCase() }]
          : []),
      ],
    }),
  }),
});

export const {
  useLazyGetBrokerSummaryByNicQuery,
  useCreateBrokerPaymentMutation, // ✅ now available
} = brokerPayApi;
