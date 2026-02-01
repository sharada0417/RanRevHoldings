import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export const customerPayApi = createApi({
  reducerPath: "customerPayApi",
  tagTypes: ["CustomerPay", "CustomerPayHistory", "CustomerFlow"],
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
    // ✅ EXISTING: investments list for payment page
    // GET /api/customer/payments/customer/:nic/investments?brokerId=...
    getCustomerInvestments: builder.query({
      query: ({ nic, brokerId }) =>
        `customer/${encodeURIComponent(nic)}/investments?brokerId=${encodeURIComponent(
          brokerId
        )}`,
      providesTags: [{ type: "CustomerPay", id: "INV_LIST" }],
    }),

    // ✅ EXISTING: create payment
    // POST /api/customer/payments/pay
    createCustomerPayment: builder.mutation({
      query: (payload) => ({ url: "pay", method: "POST", body: payload }),
      invalidatesTags: [
        { type: "CustomerPay", id: "INV_LIST" },
        { type: "CustomerFlow", id: "LIST" },
      ],
    }),

    // ✅ NEW: Customer Flow list
    // GET /api/customer/payments/customer/flow
    getCustomerFlow: builder.query({
      query: () => `customer/flow`,
      providesTags: [{ type: "CustomerFlow", id: "LIST" }],
    }),

    // ✅ NEW: Customer Flow detail by NIC (for modal)
    // GET /api/customer/payments/customer/:nic/flow
    getCustomerFlowByNic: builder.query({
      query: (nic) => `customer/${encodeURIComponent(nic)}/flow`,
      providesTags: (res, err, nic) => [
        { type: "CustomerFlow", id: String(nic || "").trim().toUpperCase() || "NIC" },
      ],
    }),
  }),
});

export const {
  useGetCustomerInvestmentsQuery,
  useLazyGetCustomerInvestmentsQuery,
  useCreateCustomerPaymentMutation,

  // ✅ NEW exports
  useGetCustomerFlowQuery,
  useLazyGetCustomerFlowByNicQuery,
} = customerPayApi;
