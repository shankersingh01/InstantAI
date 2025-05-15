import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  clusterHistory: [],
  selectedIndex: -1,
  clusters: null,
  currentPath: [],
};

const clusterSlice = createSlice({
  name: "cluster",
  initialState,
  reducers: {
    setClusterHistory: (state, action) => {
      state.clusterHistory = action.payload;
    },
    setSelectedIndex: (state, action) => {
      state.selectedIndex = action.payload;
    },
    addToHistory: (state, action) => {
      // Add new history item
      state.clusterHistory.push(action.payload);
      state.selectedIndex = state.clusterHistory.length - 1;
      state.currentPath = action.payload.path;
    },
    navigateToHistoryIndex: (state, action) => {
      const index = action.payload;
      if (index >= 0 && index < state.clusterHistory.length) {
        state.selectedIndex = index;
        state.currentPath = state.clusterHistory[index].path;
      }
    },
    clearHistory: (state) => {
      state.clusterHistory = [];
      state.selectedIndex = -1;
      state.currentPath = [];
    },
    setClusters: (state, action) => {
      state.clusters = action.payload;
    },
  },
});

export const {
  setClusterHistory,
  setSelectedIndex,
  addToHistory,
  navigateToHistoryIndex,
  clearHistory,
  setClusters,
} = clusterSlice.actions;

export default clusterSlice.reducer;
