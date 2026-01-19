import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export const brokerApi = createApi({
  reducerPath: "brokerApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${BACKEND_URL}/api/broker/`,
    prepareHeaders: (headers, { getState }) => {
      const token = getState()?.user?.token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),

  tagTypes: ["Broker"],

  endpoints: (builder) => ({
    // ✅ GET ALL
    getBrokers: builder.query({
      query: () => "",
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((b) => ({ type: "Broker", id: b._id })),
              { type: "Broker", id: "LIST" },
            ]
          : [{ type: "Broker", id: "LIST" }],
    }),

    // ✅ SEARCH (nic or name)
    searchBrokers: builder.query({
      query: ({ nic, name }) => {
        const params = new URLSearchParams();
        if (nic) params.append("nic", nic);
        if (name) params.append("name", name);
        return `search?${params.toString()}`;
      },
      providesTags: [{ type: "Broker", id: "LIST" }],
    }),

    // ✅ GET BY ID
    getBrokerById: builder.query({
      query: (id) => `${id}`,
      providesTags: (result, error, id) => [{ type: "Broker", id }],
    }),

    // ✅ CREATE
    createBroker: builder.mutation({
      query: (payload) => ({
        url: "",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: [{ type: "Broker", id: "LIST" }],
    }),

    // ✅ UPDATE
    updateBroker: builder.mutation({
      query: ({ id, ...payload }) => ({
        url: `${id}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Broker", id },
        { type: "Broker", id: "LIST" },
      ],
    }),

    // ✅ DELETE
    deleteBroker: builder.mutation({
      query: (id) => ({
        url: `${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Broker", id: "LIST" }],
    }),
  }),
});

export const {
  useGetBrokersQuery,
  useSearchBrokersQuery,
  useLazySearchBrokersQuery,
  useGetBrokerByIdQuery,
  useCreateBrokerMutation,
  useUpdateBrokerMutation,
  useDeleteBrokerMutation,
} = brokerApi;
