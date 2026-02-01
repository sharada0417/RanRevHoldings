import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  brokerSelectMode: "nic",
  selectedBrokerNic: "",
  selectedBrokerId: null,
};

const brokerPaySlice = createSlice({
  name: "brokerPay",
  initialState,
  reducers: {
    setBrokerSelectMode: (state, action) => {
      state.brokerSelectMode = action.payload === "name" ? "name" : "nic";
    },
    setSelectedBroker: (state, action) => {
      const { brokerNic, brokerId } = action.payload || {};
      state.selectedBrokerNic = brokerNic || "";
      state.selectedBrokerId = brokerId || null;
    },
    resetBrokerPay: () => initialState,
  },
});

export const { setBrokerSelectMode, setSelectedBroker, resetBrokerPay } =
  brokerPaySlice.actions;

export default brokerPaySlice.reducer;
