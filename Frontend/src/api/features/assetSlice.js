import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  modal: null, // "add" | "view" | "edit" | "delete" | null
  selected: null, // asset object
};

const assetSlice = createSlice({
  name: "asset",
  initialState,
  reducers: {
    openAssetModal: (state, action) => {
      const { modal, asset } = action.payload || {};
      state.modal = modal || null;
      state.selected = asset || null;
    },
    closeAssetModal: (state) => {
      state.modal = null;
      state.selected = null;
    },
  },
});

export const { openAssetModal, closeAssetModal } = assetSlice.actions;
export default assetSlice.reducer;
