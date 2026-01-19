import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export const customerPayApi = createApi({
  reducerPath: "customerPayApi",
  tagTypes: ["CustomerPay", "Investment"],
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
    // ✅ GET full report by customer NIC + assetId
    // GET /api/customer/payments/customer/:nic/asset/:assetId/full
    getCustomerAssetFullReport: builder.query({
      query: ({ nic, assetId }) => `customer/${encodeURIComponent(nic)}/asset/${assetId}/full`,
      providesTags: (res) =>
        res?.data?.length
          ? [
              ...res.data.map((x) => ({ type: "Investment", id: x.investmentId })),
              { type: "CustomerPay", id: "REPORT" },
            ]
          : [{ type: "CustomerPay", id: "REPORT" }],
    }),

    // ✅ POST pay
    // POST /api/customer/payments/pay
    createCustomerPayment: builder.mutation({
      query: (payload) => ({
        url: "pay",
        method: "POST",
        body: payload, // { customerNic, investmentId, payAmount, paymentType, note }
      }),
      invalidatesTags: (res) =>
        res?.data?.investmentSummary?.investmentId
          ? [
              { type: "Investment", id: res.data.investmentSummary.investmentId },
              { type: "CustomerPay", id: "REPORT" },
            ]
          : [{ type: "CustomerPay", id: "REPORT" }],
    }),

    /* ✅ ADDED BELOW (FLOW) */

    // ✅ GET customer flow list (ALL)
    // GET /api/customer/payments/customer/flow
    getCustomerFlow: builder.query({
      query: () => `customer/flow`,
      providesTags: [{ type: "CustomerPay", id: "FLOW" }],
    }),

    // ✅ GET customer flow detail by NIC (CARD)
    // GET /api/customer/payments/customer/:nic/flow
    getCustomerFlowByNic: builder.query({
      query: (nic) => `customer/${encodeURIComponent(nic)}/flow`,
      providesTags: [{ type: "CustomerPay", id: "FLOW_DETAIL" }],
    }),
  }),
});

export const {
  useGetCustomerAssetFullReportQuery,
  useLazyGetCustomerAssetFullReportQuery,
  useCreateCustomerPaymentMutation,

  // ✅ added (flow)
  useGetCustomerFlowQuery,
  useLazyGetCustomerFlowByNicQuery,
} = customerPayApi;
