import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export const customerApi = createApi({
  reducerPath: "customerApi",
  tagTypes: ["Customer"],
  baseQuery: fetchBaseQuery({
    baseUrl: `${BACKEND_URL}/api/customer/`,
    prepareHeaders: (headers, { getState }) => {
      // If you have auth token in redux, keep this.
      // If you don't use token, you can delete this block safely.
      const token = getState()?.user?.token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),

  endpoints: (builder) => ({
    // GET /api/customer
    getCustomers: builder.query({
      query: () => "",
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((c) => ({ type: "Customer", id: c._id })),
              { type: "Customer", id: "LIST" },
            ]
          : [{ type: "Customer", id: "LIST" }],
    }),

    // GET /api/customer/search?nic=... or ?name=...
    searchCustomers: builder.query({
      query: ({ nic, name }) => {
        const params = new URLSearchParams();
        if (nic) params.append("nic", nic);
        if (name) params.append("name", name);
        return `search?${params.toString()}`;
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((c) => ({ type: "Customer", id: c._id })),
              { type: "Customer", id: "LIST" },
            ]
          : [{ type: "Customer", id: "LIST" }],
    }),

    // POST /api/customer
    createCustomer: builder.mutation({
      query: (payload) => ({
        url: "",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: [{ type: "Customer", id: "LIST" }],
    }),

    // PUT /api/customer/:id
    updateCustomer: builder.mutation({
      query: ({ id, payload }) => ({
        url: `${id}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: "Customer", id: arg.id },
        { type: "Customer", id: "LIST" },
      ],
    }),

    // DELETE /api/customer/:id
    deleteCustomer: builder.mutation({
      query: (id) => ({
        url: `${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Customer", id: "LIST" }],
    }),
  }),
});

export const {
  useGetCustomersQuery,
  useLazySearchCustomersQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
} = customerApi;
