import { createSlice } from "@reduxjs/toolkit";

const safeParse = (value) => {
  try {
    if (!value || value === "undefined" || value === "null") {
      return null;
    }
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
};

const initialState = {
  token: localStorage.getItem("token") || null,
  user: safeParse(localStorage.getItem("user")),
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { token, user } = action.payload || {};

      state.token = token || null;
      state.user = user || null;

      if (token) {
        localStorage.setItem("token", token);
      } else {
        localStorage.removeItem("token");
      }

      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
      } else {
        localStorage.removeItem("user");
      }
    },

    logout: (state) => {
      state.token = null;
      state.user = null;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
  },
});

export const { setCredentials, logout } = userSlice.actions;
export default userSlice.reducer;
