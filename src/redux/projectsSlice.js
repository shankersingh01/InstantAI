import { createSlice } from "@reduxjs/toolkit";

const initialState = [];

const projectsSlice = createSlice({
  name: "projects",
  initialState,
  reducers: {
    createProject: (state, action) => {
      state.push({
        projectId: action.payload.projectId,
        project_id: action.payload.projectId,
        columns: action.payload.columns || [],
        importantColumnNames: action.payload.importantColumnNames || [],
        kpiList: action.payload.kpiList || [],
        droppedColumns: action.payload.droppedColumns || [],
        uploadedFileData: action.payload.uploadedFileData || [],
        selectedKpi: action.payload.selectedKpi || null,
        data_uploaded: action.payload.data_uploaded || false,
        clusters: action.payload.clusters || null,
        currentStep: action.payload.currentStep || "configuration",
        analysisComplete: action.payload.analysisComplete || false,
      });
    },
    updateProject: (state, action) => {
      const index = state.findIndex(
        (project) => project.projectId === action.payload.projectId
      );
      if (index !== -1) {
        const {
          columns,
          importantColumnNames,
          kpiList,
          uploadedFileData,
          selectedKpi,
          droppedColumns,
          data_uploaded,
          clusters,
          currentStep,
          analysisComplete,
        } = action.payload;

        if (columns !== undefined) state[index].columns = columns;
        if (importantColumnNames !== undefined)
          state[index].importantColumnNames = importantColumnNames;
        if (kpiList !== undefined) state[index].kpiList = kpiList;
        if (uploadedFileData !== undefined)
          state[index].uploadedFileData = uploadedFileData;
        if (selectedKpi !== undefined) state[index].selectedKpi = selectedKpi;
        if (droppedColumns !== undefined)
          state[index].droppedColumns = droppedColumns;
        if (data_uploaded !== undefined)
          state[index].data_uploaded = data_uploaded;
        if (clusters !== undefined) state[index].clusters = clusters;
        if (currentStep !== undefined) state[index].currentStep = currentStep;
        if (analysisComplete !== undefined)
          state[index].analysisComplete = analysisComplete;
      }
    },
    restoreProjectState: (state, action) => {
      const index = state.findIndex(
        (project) =>
          project.projectId === action.payload.projectId ||
          project.project_id === action.payload.projectId
      );
      if (index !== -1) {
        state[index] = {
          ...state[index],
          projectId: action.payload.projectId,
          project_id: action.payload.project_id,
          columns: action.payload.columns || [],
          importantColumnNames: action.payload.importantColumnNames || [],
          kpiList: action.payload.kpiList || [],
          droppedColumns: action.payload.droppedColumns || [],
          uploadedFileData: action.payload.uploadedFileData || [],
          selectedKpi: action.payload.selectedKpi || null,
          data_uploaded: action.payload.data_uploaded,
          clusters: action.payload.clusters || null,
          currentStep: action.payload.currentStep || "configuration",
          analysisComplete: action.payload.analysisComplete || false,
        };
      } else {
        state.push({
          projectId: action.payload.projectId,
          project_id: action.payload.project_id,
          columns: action.payload.columns || [],
          importantColumnNames: action.payload.importantColumnNames || [],
          kpiList: action.payload.kpiList || [],
          droppedColumns: action.payload.droppedColumns || [],
          uploadedFileData: action.payload.uploadedFileData || [],
          selectedKpi: action.payload.selectedKpi || null,
          data_uploaded: action.payload.data_uploaded,
          clusters: action.payload.clusters || null,
          currentStep: action.payload.currentStep || "configuration",
          analysisComplete: action.payload.analysisComplete || false,
        });
      }
    },
    clearProject: (state, action) => {
      const index = state.findIndex(
        (project) => project.projectId === action.payload.projectId
      );
      if (index !== -1) {
        state.splice(index, 1);
      }
    },
  },
});

export const {
  createProject,
  updateProject,
  restoreProjectState,
  clearProject,
} = projectsSlice.actions;

export default projectsSlice.reducer;
