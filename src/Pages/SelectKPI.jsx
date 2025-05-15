"use client";

import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setClusterHistory } from "../redux/clusterSlice";
import { updateProject, restoreProjectState } from "../redux/projectsSlice";
import axiosInstance from "../utils/axiosInstance";
// import { featureRanking } from "../utils/apiUtils";

const SelectKPI = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { project_id, com_id } = useParams();
  const dispatch = useDispatch();
  const project = useSelector((state) =>
    state.projects.find(
      (project) =>
        project.projectId === project_id || project.project_id === project_id
    )
  );

  // Fetch and restore project state on mount
  useEffect(() => {
    const fetchAndRestoreProject = async () => {
      try {
        const response = await axiosInstance.get(
          `/${com_id}/projects/${project_id}`
        );
        if (response.data) {
          dispatch(
            restoreProjectState({
              projectId: project_id,
              project_id: project_id,
              columns: (response.data.total_columns || []).map((name, idx) => ({
                id: idx + 1,
                name,
                type: "string",
                description: name,
              })),
              importantColumnNames: response.data.important_columns || [],
              kpiList: response.data.kpi_columns || [],
              droppedColumns: response.data.dropped_columns || [],
              uploadedFileData: response.data.uploadedFileData || [],
              selectedKpi: response.data.selectedKpi || null,
              data_uploaded: response.data.data_uploaded,
              clusters: response.data.clusters || null,
              currentStep: response.data.clusters
                ? "clustering"
                : response.data.data_uploaded
                ? "analysis"
                : "configuration",
              analysisComplete: !!response.data.clusters,
            })
          );
        }
      } catch (error) {
        // Optionally handle error
      }
    };
    if (com_id && project_id) {
      fetchAndRestoreProject();
    }
  }, [com_id, project_id, dispatch]);

  // Use Redux state for columns if available
  const importantColumns =
    project?.importantColumnNames
      ?.map((name) => project.columns?.find((col) => col.name === name))
      ?.filter(Boolean) ||
    location.state?.importantColumns ||
    [];
  // Get dropped column names
  const droppedNames = (project?.droppedColumns || []).map((col) =>
    typeof col === "string" ? col : col.name
  );
  // Only show KPI columns that are not dropped
  const kpiColumns =
    project?.kpiList
      ?.map((name) =>
        project.columns?.find(
          (col) => col.name === name && !droppedNames.includes(col.name)
        )
      )
      ?.filter(Boolean) ||
    location.state?.kpiColumns ||
    [];

  // State for selected KPI
  const [selectedKpi, setSelectedKpi] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [taskStatus, setTaskStatus] = useState("");

  // Pre-select last selected KPI for existing projects
  useEffect(() => {
    if (
      project &&
      project.columns &&
      project.kpiList &&
      project.kpiList.length > 0
    ) {
      // Get dropped column names
      const droppedNames = (project.droppedColumns || []).map((col) =>
        typeof col === "string" ? col : col.name
      );
      // Only consider columns that are not dropped
      const availableColumns = project.columns.filter(
        (col) => !droppedNames.includes(col.name)
      );
      // Pre-select KPI columns from persisted state
      const kpiIds = availableColumns.filter((col) =>
        project.kpiList.some(
          (kpi) => kpi.trim().toLowerCase() === col.name.trim().toLowerCase()
        )
      );
      // If you want to allow multi-select, use setSelectedKpi(kpiIds)
      // If you want to allow only one, use setSelectedKpi(kpiIds[0] || null)
      setSelectedKpi(kpiIds[0] || null);
    }
  }, [project]);

  // Debug logging
  console.log("KPI Columns:", kpiColumns);
  console.log("Important Columns:", importantColumns);
  console.log("Com ID:", com_id);

  const handleAnalyze = async () => {
    if (!selectedKpi) {
      setError("Please select a KPI before analyzing");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Navigate directly to clustered-data with loading state
      navigate(`/${com_id}/projects/${project_id}/clustered-data`, {
        state: {
          activeKPI: selectedKpi.name,
          kpiList: kpiColumns.map((col) => col.name),
          importantColumnNames: importantColumns.map((col) => col.name),
          isLoading: true,
          kpiColumnsSet: true,
        },
      });
    } catch (error) {
      console.error("Error:", error);
      setError("Failed to start analysis. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    dispatch(setClusterHistory([]));
  }, [dispatch]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() =>
              navigate(`/${com_id}/projects/${project_id}/configuration`, {
                state: { activeTab: "settings" },
              })
            }
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Select KPI
          </h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <p className="text-green-700 dark:text-green-300">{success}</p>
          </div>
        )}

        {loading && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start gap-3">
            <Loader2 className="h-5 w-5 text-blue-500 mt-0.5 animate-spin" />
            <p className="text-blue-700 dark:text-blue-300">
              Starting analysis...
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {kpiColumns?.map((kpi) => (
            <motion.button
              key={kpi.id}
              onClick={() => setSelectedKpi(kpi)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedKpi?.id === kpi.id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {kpi.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {kpi.description || "No description available"}
              </p>
            </motion.button>
          ))}
        </div>

        <div className="flex justify-end">
          <motion.button
            onClick={handleAnalyze}
            disabled={!selectedKpi || loading}
            className={`px-6 py-3 rounded-lg font-medium text-white ${
              selectedKpi && !loading
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
            whileHover={selectedKpi && !loading ? { scale: 1.05 } : {}}
            whileTap={selectedKpi && !loading ? { scale: 0.95 } : {}}
          >
            {loading ? "Analyzing..." : "Analyze"}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default SelectKPI;
