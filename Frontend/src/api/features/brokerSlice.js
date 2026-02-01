import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  modal: null, // "add" | "view" | "edit" | "delete" | null
  selected: null,
};

const brokerSlice = createSlice({
  name: "broker",
  initialState,
  reducers: {
    openBrokerModal: (state, action) => {
      const { modal, broker } = action.payload || {};
      state.modal = modal || null;
      state.selected = broker || null;
    },
    closeBrokerModal: (state) => {
      state.modal = null;
      state.selected = null;
    },
  },
});

export const { openBrokerModal, closeBrokerModal } = brokerSlice.actions;
export default brokerSlice.reducer;
