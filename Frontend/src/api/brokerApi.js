import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export const brokerApi = createApi({
  reducerPath: "brokerApi",
  tagTypes: ["Broker"],
  baseQuery: fetchBaseQuery({
    baseUrl: `${BACKEND_URL}/api/broker/`,
    prepareHeaders: (headers, { getState }) => {
      const token = getState()?.user?.token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  endpoints: (builder) => ({
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

    searchBrokers: builder.query({
      query: ({ nic, name }) => {
        const params = new URLSearchParams();
        if (nic) params.append("nic", nic);
        if (name) params.append("name", name);
        return `search?${params.toString()}`;
      },
      providesTags: [{ type: "Broker", id: "LIST" }],
    }),

    getBrokerById: builder.query({
      query: (id) => `${id}`,
      providesTags: (result, error, id) => [{ type: "Broker", id }],
    }),

    createBroker: builder.mutation({
      query: (payload) => ({
        url: "",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: [{ type: "Broker", id: "LIST" }],
    }),

    updateBroker: builder.mutation({
      query: ({ id, payload }) => ({
        url: `${id}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: "Broker", id: arg.id },
        { type: "Broker", id: "LIST" },
      ],
    }),

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
  useLazySearchBrokersQuery,
  useGetBrokerByIdQuery,
  useCreateBrokerMutation,
  useUpdateBrokerMutation,
  useDeleteBrokerMutation,
} = brokerApi;
