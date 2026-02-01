import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export const assetApi = createApi({
  reducerPath: "assetApi",
  tagTypes: ["Asset"],
  baseQuery: fetchBaseQuery({
    baseUrl: `${BACKEND_URL}/api/assets/`,
    credentials: "include",
    prepareHeaders: (headers, { getState }) => {
      const token = getState()?.user?.token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),

  endpoints: (builder) => ({
    getAssets: builder.query({
      query: () => "",
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((a) => ({ type: "Asset", id: a._id })),
              { type: "Asset", id: "LIST" },
            ]
          : [{ type: "Asset", id: "LIST" }],
    }),

    getAssetFlow: builder.query({
      query: (arrearsDays = 30) => `flow?arrearsDays=${arrearsDays}`,
      providesTags: [{ type: "Asset", id: "FLOW" }],
    }),

    getAssetById: builder.query({
      query: (id) => `${id}`,
      providesTags: (result, error, id) => [{ type: "Asset", id }],
    }),

    createAsset: builder.mutation({
      query: (payload) => ({
        url: "",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: [{ type: "Asset", id: "LIST" }, { type: "Asset", id: "FLOW" }],
    }),

    updateAsset: builder.mutation({
      query: ({ id, payload }) => ({
        url: `${id}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: "Asset", id: arg.id },
        { type: "Asset", id: "LIST" },
        { type: "Asset", id: "FLOW" },
      ],
    }),

    deleteAsset: builder.mutation({
      query: (id) => ({
        url: `${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Asset", id: "LIST" }, { type: "Asset", id: "FLOW" }],
    }),
  }),
});

export const {
  useGetAssetsQuery,
  useGetAssetFlowQuery,
  useGetAssetByIdQuery,
  useCreateAssetMutation,
  useUpdateAssetMutation,
  useDeleteAssetMutation,
} = assetApi;
