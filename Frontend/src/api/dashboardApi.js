// src/api/dashboardApi.js
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export const dashboardApi = createApi({
  reducerPath: "dashboardApi",
  tagTypes: ["Dashboard"],
  baseQuery: fetchBaseQuery({
    baseUrl: `${BACKEND_URL}/api/dashboard/`,
    credentials: "include",
    prepareHeaders: (headers, { getState }) => {
      const token = getState()?.user?.token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getDashboardSummary: builder.query({
      query: ({ granularity = "month", year, month } = {}) => {
        const params = new URLSearchParams();
        params.set("granularity", granularity);
        if (year) params.set("year", String(year));
        if (month) params.set("month", String(month));
        return `summary?${params.toString()}`;
      },
      providesTags: [{ type: "Dashboard", id: "SUMMARY" }],
    }),
  }),
});

export const { useGetDashboardSummaryQuery } = dashboardApi;
