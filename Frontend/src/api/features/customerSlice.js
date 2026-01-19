import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  modal: null, // "add" | "view" | "edit" | "delete" | null
  selected: null, // customer object
};

const customerSlice = createSlice({
  name: "customer",
  initialState,
  reducers: {
    openModal: (state, action) => {
      const { modal, customer } = action.payload || {};
      state.modal = modal || null;
      state.selected = customer || null;
    },
    closeModal: (state) => {
      state.modal = null;
      state.selected = null;
    },
  },
});

export const { openModal, closeModal } = customerSlice.actions;
export default customerSlice.reducer;
