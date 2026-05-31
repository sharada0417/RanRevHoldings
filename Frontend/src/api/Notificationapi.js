// src/api/notificationApi.js

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export const notificationApi = createApi({
  reducerPath: "notificationApi",
  tagTypes: ["Notification"],
  baseQuery: fetchBaseQuery({
    baseUrl: `${BACKEND_URL}/api/notifications/`,
    credentials: "include",
    prepareHeaders: (headers, { getState }) => {
      const token = getState()?.user?.token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getNotifications: builder.query({
      query: () => "",
      providesTags: [{ type: "Notification", id: "LIST" }],
    }),
  }),
});

export const { useGetNotificationsQuery } = notificationApi;