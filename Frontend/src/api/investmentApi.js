import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export const investmentApi = createApi({
  reducerPath: "investmentApi",
  tagTypes: ["Investment"],
  baseQuery: fetchBaseQuery({
    baseUrl: `${BACKEND_URL}/api/investment/`,
    credentials: "include",
    prepareHeaders: (headers, { getState }) => {
      const token = getState()?.user?.token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getInvestments: builder.query({
      query: () => "",
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((x) => ({ type: "Investment", id: x._id })),
              { type: "Investment", id: "LIST" },
            ]
          : [{ type: "Investment", id: "LIST" }],
    }),

    getInvestmentById: builder.query({
      query: (id) => `${id}`,
      providesTags: (result, error, id) => [{ type: "Investment", id }],
    }),

    createInvestment: builder.mutation({
      query: (payload) => ({ url: "", method: "POST", body: payload }),
      invalidatesTags: [{ type: "Investment", id: "LIST" }],
    }),

    updateInvestment: builder.mutation({
      query: ({ id, payload }) => ({
        url: `${id}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (r, e, arg) => [
        { type: "Investment", id: arg?.id },
        { type: "Investment", id: "LIST" },
      ],
    }),

    deleteInvestment: builder.mutation({
      query: (id) => ({ url: `${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Investment", id: "LIST" }],
    }),
  }),
});

export const {
  useGetInvestmentsQuery,
  useGetInvestmentByIdQuery,
  useCreateInvestmentMutation,
  useUpdateInvestmentMutation,
  useDeleteInvestmentMutation,
} = investmentApi;
