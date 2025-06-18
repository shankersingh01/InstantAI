"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { ArrowBigDownDash, ChevronRight } from "lucide-react";
import ClusterHistorySection from "../Components/ClusterHistorySection";
import ClusterTreeVisualization from "../Components/ClusterTreeVisualization";
import { useDispatch, useSelector } from "react-redux";
import {
  setClusterHistory,
  setClusters,
  setSelectedIndex,
} from "../redux/clusterSlice";
import { CircularProgress, Typography, Box } from "@mui/material";
import ClusterDropdown from "../Components/ClusterDropdown";
import WorkbenchModal from "../Components/WorkbenchModal";
import DefinationModel from "../Components/DefinationModel";
import SelectableClusterPopup from "../Components/SelectableClustorPopup";
import { restoreProjectState } from "../redux/projectsSlice";
import axiosInstance from "../utils/axiosInstance";
import React from "react";

// Utility function for Indian number formatting
function formatIndianNumber(num) {
  if (typeof num !== "number") num = Number(num);
  if (isNaN(num)) return num;
  return num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

const ClusteringComponent = () => {
  const location = useLocation();
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const { project_id, com_id } = useParams();
  const navigate = useNavigate();
  const { activeKPI, kpiList, importantColumnNames } = location.state || {};

  // Add check for required state
  useEffect(() => {
    if (!activeKPI || !kpiList || !importantColumnNames) {
      console.error("Missing required state data, redirecting to select-kpi");
      navigate(`/${com_id}/projects/${project_id}/select-kpi`);
      return;
    }
  }, [activeKPI, kpiList, importantColumnNames, com_id, project_id, navigate]);

  const [newkpi, setNewkpi] = useState(
    activeKPI || (kpiList && kpiList.length > 0 ? kpiList[0] : "")
  );
  const [journey, setJourney] = useState([]);
  const [currentSelectionIndex, setCurrentSelectionIndex] = useState(-1); // -1 means root
  const [error, setError] = useState(null);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState(null);
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isOpen1, setIsOpen1] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState(0);
  const [groupedClusters, setGroupedClusters] = useState({
    top1: {},
    mean: {},
    percentage: {},
    top2: {},
    top3: {},
    lowest: {},
  });
  const [clusterTree, setClusterTree] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // Default to table view
  const dispatch = useDispatch();
  const { clusterHistory, selectedIndex } = useSelector(
    (state) => state.cluster
  );
  const [breadcrumbPath, setBreadcrumbPath] = useState([]);
  const [selectedClusterIndex, setSelectedClusterIndex] = useState(null);
  const [definitionAbsZScore, setDefinitionAbsZScore] = useState(null);
  const [numericalCellSelection, setNumericalCellSelection] = useState({}); // key: `${feature}-${clusterIndex}`
  const [selectedDropdownValues, setSelectedDropdownValues] = useState({});

  // Ref to track if processData has been called for the current project and KPI
  const processCalledRef = React.useRef({});

  // Fetch and restore project state on mount
  useEffect(() => {
    const fetchAndRestoreProject = async () => {
      try {
        const response = await axiosInstance.get(
          `/${com_id}/projects/${project_id}`
        );
        if (response.data) {
          const projectData = response.data;
          dispatch(
            restoreProjectState({
              projectId: project_id,
              project_id: project_id,
              columns: (projectData.total_columns || []).map((name, idx) => ({
                id: idx + 1,
                name,
                type: "string",
                description: name,
              })),
              importantColumnNames: projectData.important_columns || [],
              kpiList: projectData.kpi_columns || [],
              droppedColumns: projectData.dropped_columns || [],
              uploadedFileData: projectData.uploadedFileData || [],
              selectedKpi: projectData.selectedKpi || null,
              data_uploaded: projectData.data_uploaded,
              clusters: projectData.clusters || null,
              currentStep: projectData.clusters
                ? "clustering"
                : projectData.data_uploaded
                ? "analysis"
                : "configuration",
              analysisComplete: !!projectData.clusters,
            })
          );

          // Fetch cluster journey
          const journeyResponse = await axios.get(
            `${baseUrl}/get-cluster-journey`,
            {
              params: {
                project_id: project_id,
              },
            }
          );
          if (journeyResponse.data && journeyResponse.data.cluster_journey) {
            const savedJourney = journeyResponse.data.cluster_journey;
            console.log("Restoring saved journey:", savedJourney);
            setJourney(savedJourney);
            setCurrentSelectionIndex(savedJourney.length - 1);

            // Update Redux state
            dispatch(setClusterHistory(savedJourney));
            dispatch(setSelectedIndex(savedJourney.length - 1));

            // Update breadcrumb path
            const pathIndices = savedJourney.map((j) => j.clusterIndex);
            setBreadcrumbPath(pathIndices);

            // Update current level
            if (savedJourney.length > 0) {
              setCurrentLevel(savedJourney[savedJourney.length - 1].level + 1);
            }
          }

          // If clusters exist, use them directly
          if (projectData.clusters) {
            setClusterTree(projectData.clusters);
            // Set extractedClusters to the children of the root node for the current KPI
            const kpi = newkpi || Object.keys(projectData.clusters)[0];
            const rootCluster = projectData.clusters[kpi];
            if (rootCluster && rootCluster.children) {
              setGroupedClusters(transformClusterData(rootCluster.children));
            }
            setLoading(false);
          } else if (newkpi && project_id) {
            // If no clusters and KPI is set, check if processData has been called
            const key = `${project_id}-${newkpi}`;
            if (!processCalledRef.current[key]) {
              console.log(
                "No clusters found and not yet processed, calling processData..."
              );
              processData(newkpi);
              processCalledRef.current[key] = true;
            }
          }
        } else if (newkpi && project_id) {
          // If no response data and KPI is set, check if processData has been called
          const key = `${project_id}-${newkpi}`;
          if (!processCalledRef.current[key]) {
            console.log(
              "No project data found and not yet processed, calling processData..."
            );
            processData(newkpi);
            processCalledRef.current[key] = true;
          }
        }
      } catch (error) {
        console.error("Error fetching project data:", error);
        setError(error);
        setLoading(false);
      }
    };
    if (com_id && project_id) {
      fetchAndRestoreProject();
    }
    // eslint-disable-next-line
  }, [com_id, project_id, newkpi]);

  // Trigger processData if clusters are null for the selected KPI after initial load and KPI is set
  useEffect(() => {
    // Only run this effect if not currently loading and no errors
    if (!loading && !error && newkpi && project_id) {
      // Check if clusterTree is null or if the selected KPI has no children (no clusters)
      if (
        !clusterTree ||
        !clusterTree[newkpi] ||
        clusterTree[newkpi].children?.length === 0
      ) {
        console.log(
          "Clusters for selected KPI are missing or empty after load, calling processData..."
        );
        processData(newkpi);
      }
    }
  }, [clusterTree, newkpi, loading, error, project_id]); // Add project_id as dependency

  // Data transformation functions
  const transformClusterData = (clusters) => {
    return clusters.reduce(
      (acc, cluster, clusterIndex) => {
        Object.entries(cluster.analysis || {}).forEach(([feature, data]) => {
          // Handle numerical features
          if (data.segment && typeof data.segment.mean === "number") {
            if (!acc.mean[feature]) acc.mean[feature] = {};
            acc.mean[feature][clusterIndex] = {
              original: {
                Mean: data.segment.mean,
                Count: cluster.size || 0,
              },
            };
          }

          // Handle categorical features
          if (data.mode) {
            if (!acc.top1[feature]) acc.top1[feature] = {};
            acc.top1[feature][clusterIndex] = {
              original: {
                Value: data.mode.category,
                Percentage: data.mode.percentage,
              },
            };

            // Handle top categories
            if (data.top_categories && data.top_categories.length > 0) {
              data.top_categories.forEach((cat, idx) => {
                const statKey =
                  idx === 0 ? "top1" : idx === 1 ? "top2" : "top3";
                if (!acc[statKey][feature]) acc[statKey][feature] = {};
                acc[statKey][feature][clusterIndex] = {
                  original: {
                    Value: cat.category,
                    Percentage: cat.percentage,
                  },
                };
              });
            }
          }
        });
        return acc;
      },
      { top1: {}, mean: {}, percentage: {}, top2: {}, top3: {}, lowest: {} }
    );
  };

  const processData = async (kpi) => {
    try {
      setLoading(true);
      console.log("Making process request to backend");
      const response = await axios.post(`${baseUrl}/process/${project_id}`, {
        project_id,
        kpi,
        important_column_names: importantColumnNames,
      });
      console.log("Process response received:", response.data);

      if (response.status === 200 && response.data) {
        const clusterTree = response.data.cluster_tree || response.data.message;
        console.log("Cluster tree:", clusterTree);
        setClusterTree(clusterTree);

        if (!clusterTree || !clusterTree[kpi]) {
          throw new Error(`No clusters found for KPI: ${kpi}`);
        }

        const rootCluster = clusterTree[kpi];
        const currentLevelClusters = getClustersForLevel(
          rootCluster,
          currentLevel
        );

        // Transform the new format to old format
        const transformedData = transformClusterData(currentLevelClusters);
        setGroupedClusters(transformedData);

        dispatch(setClusters({ [kpi]: currentLevelClusters }));
        setLoading(false);
      } else {
        throw new Error(`Invalid response: ${response.status}`);
      }
    } catch (error) {
      console.error("Error processing data:", error);
      setError(error.message || "Failed to process data");
      setLoading(false);
    }
  };

  // Helper function to get clusters for a specific level
  const getClustersForLevel = (cluster, targetLevel, currentLevel = 0) => {
    if (currentLevel === targetLevel) {
      return [cluster];
    }

    if (cluster.children && cluster.children.length > 0) {
      return cluster.children.flatMap((child) =>
        getClustersForLevel(child, targetLevel, currentLevel + 1)
      );
    }

    return [];
  };

  useEffect(() => {
    if (clusterHistory.length === 0 && selectedIndex === -1) {
      dispatch(setClusterHistory([]));
    }
  }, []);

  useEffect(() => {
    if (clusterHistory.length > 0) {
      setCurrentLevel(clusterHistory[clusterHistory?.length - 1].level + 1);
    }
  }, [clusterHistory]);

  const handleKpiClick = (kpi) => {
    setBreadcrumbPath([]);
    setSelectedClusterIndex(null);
    setNewkpi(kpi);
    // Update groupedClusters for the new KPI
    if (clusterTree && clusterTree[kpi] && clusterTree[kpi].children) {
      setGroupedClusters(transformClusterData(clusterTree[kpi].children));
    }
  };

  const handleCellClick = (feature, clusterIndex, value) => {
    setSelectedDropdownValues((prev) => ({
      ...prev,
      [`${feature}-${clusterIndex}`]: value,
    }));

    // Rest of the existing handleCellClick logic
    const displayValue = value;
    let percentage = undefined;

    if (typeof value === "string" && value.includes(" - ")) {
      const parts = value.split(" - ");
      if (parts.length === 2) {
        percentage = parts[1];
      }
    }

    setSelectedCell({
      feature,
      clusterIndex,
      currentLevel,
      value: displayValue,
      percentage,
    });
    setSelectedClusterIndex(clusterIndex);
    setOpenDropdowns({});
  };

  const toggleDropdown = (e, feature, clusterIndex) => {
    e.stopPropagation();
    setOpenDropdowns((prev) => ({
      ...prev,
      [`${feature}-${clusterIndex}`]: !prev[`${feature}-${clusterIndex}`],
    }));
  };

  const handleAnalyze = () => {
    if (selectedClusterIndex !== null && selectedCell) {
      // Truncate journey to the current selection, then add the new segment
      const baseJourney =
        currentSelectionIndex === -1
          ? []
          : journey.slice(0, currentSelectionIndex + 1);
      const newStep = {
        clusterIndex: selectedClusterIndex,
        feature: selectedCell.feature,
        value: selectedCell.value,
        level: currentLevel,
        path: breadcrumbPath,
        cluster: `Cluster ${selectedClusterIndex + 1}`,
        percentage: selectedCell.percentage,
      };
      const newJourney = [...baseJourney, newStep];

      // Update local state
      setJourney(newJourney);
      const nextSelectionIndex = newJourney.length - 1; // Calculate the next index
      setCurrentSelectionIndex(nextSelectionIndex);

      // Update table view
      const pathIndices = newJourney.map((j) => j.clusterIndex);
      setBreadcrumbPath(pathIndices);

      // Update Redux state
      dispatch(setClusterHistory(newJourney));
      dispatch(setSelectedIndex(nextSelectionIndex));

      // Call updateClusterJourney directly here (user-initiated)
      updateClusterJourney(newJourney, nextSelectionIndex);

      setSelectedClusterIndex(null);
    }
  };

  const updateClusterJourney = async (journey, selectionIndex) => {
    try {
      // Calculate the correct level
      let level = 0;
      if (journey.length > 0 && journey[journey.length - 1].level != null) {
        level = Number(journey[journey.length - 1].level) + 1;
      }
      // Convert the journey data to ensure all values are strings
      // We only send the newly added step(s) to append to the backend journey
      const newSteps = journey.slice(selectionIndex);
      const formattedNewSteps = newSteps.map((step) => ({
        clusterIndex: Number(step.clusterIndex),
        feature: step.feature,
        value: String(step.value),
        level: level, // Always use calculated level
        path: step.path ? step.path.map(Number) : [],
        cluster: step.cluster,
        percentage: step.percentage ? String(step.percentage) : undefined,
      }));

      console.log(
        "Updating cluster journey with new steps:",
        formattedNewSteps
      );
      console.log("Level being sent:", level);
      const response = await axios.post(`${baseUrl}/update-cluster-journey`, {
        project_id,
        cluster_journey: formattedNewSteps, // Send only the new steps
        cluster_selection_index: selectionIndex,
      });
      console.log("Cluster journey update response:", response.data);
    } catch (error) {
      console.error(
        "Error updating cluster journey:",
        error.response?.data || error
      );
    }
  };

  // Update groupedClusters and extractedClusters when journey, clusterTree, or newkpi changes
  useEffect(() => {
    if (clusterTree && newkpi) {
      const kpi = newkpi || Object.keys(clusterTree)[0];
      const rootCluster = clusterTree[kpi];

      if (journey.length > 0) {
        const pathIndices = journey.map((j) => j.clusterIndex);
        const node = getClusterByPath(rootCluster, pathIndices);
        if (node && node.children) {
          setGroupedClusters(transformClusterData(node.children));
        }
      } else if (rootCluster && rootCluster.children) {
        // If no journey, show root cluster
        setGroupedClusters(transformClusterData(rootCluster.children));
      }
    }
  }, [journey, clusterTree, newkpi]);

  // Initialize journey from Redux state on mount - Keeping this separate as it depends on Redux state after initial fetch
  useEffect(() => {
    if (clusterHistory && clusterHistory.length > 0) {
      setJourney(clusterHistory);
      setCurrentSelectionIndex(selectedIndex);

      // Also update groupedClusters and extractedClusters based on restored journey
      if (clusterTree && newkpi) {
        const kpi = newkpi || Object.keys(clusterTree)[0];
        const rootCluster = clusterTree[kpi];
        const pathIndices = clusterHistory.map((j) => j.clusterIndex);
        const node = getClusterByPath(rootCluster, pathIndices);
        if (node && node.children) {
          setGroupedClusters(transformClusterData(node.children));
        } else if (
          rootCluster &&
          rootCluster.children &&
          clusterHistory.length === 0
        ) {
          // If journey is empty after restore, show root cluster
          setGroupedClusters(transformClusterData(rootCluster.children));
        }
      }
    }
  }, [clusterHistory, selectedIndex, clusterTree, newkpi]); // Add clusterTree and newkpi as dependencies

  const handleNavigateToPath = (pathIndices) => {
    // Always set currentSelectionIndex to the level (for UI sync, root = 0, first child = 1, etc.)
    setCurrentSelectionIndex(pathIndices.length);
    setBreadcrumbPath(pathIndices);
    setSelectedClusterIndex(null);

    // Update currentLevel based on the path length
    // If we're at level X, we want to look at the cell analyzed in level X-1
    setCurrentLevel(pathIndices.length + 1);

    // Update table view using the full path to get the correct clusters for the selected level
    const node =
      pathIndices.length === 0
        ? clusterTree[newkpi]
        : getClusterByPath(clusterTree[newkpi], pathIndices);
    if (node && node.children) {
      setGroupedClusters(transformClusterData(node.children));
    }
  };

  const handleDownload = async (clusterIndex) => {
    try {
      // Get the current cluster node to access its indices
      let clusterNode;
      if (breadcrumbPath.length === 0) {
        clusterNode = clusterTree[newkpi].children[clusterIndex];
      } else {
        const currentNode = getClusterByPath(
          clusterTree[newkpi],
          breadcrumbPath
        );
        if (currentNode && currentNode.children) {
          clusterNode = currentNode.children[clusterIndex];
        }
      }

      if (!clusterNode || !clusterNode.indices) {
        throw new Error("No cluster data available");
      }

      const response = await axios.post(
        `${baseUrl}/projects/${project_id}/clusters/get_clusters`,
        clusterNode.indices,
        { headers: { "Content-Type": "application/json" } }
      );
      const html = response.data;
      const parser = new window.DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const table = doc.querySelector("table");
      let csv = "";
      for (const row of table.rows) {
        const cells = Array.from(row.cells).map(
          (cell) => '"' + cell.innerText.replace(/"/g, '""') + '"'
        );
        csv += cells.join(",") + "\n";
      }
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cluster_${clusterIndex + 1}_level_${currentLevel}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading cluster:", err);
      setError("Failed to download cluster data");
    }
  };

  const filterImportantFeatures = (features) => {
    // Filter features to include both important columns and KPI columns
    return features.filter(
      (feature) =>
        importantColumnNames.includes(feature) || kpiList.includes(feature)
    );
  };

  const getClusterByPath = (tree, path) => {
    let node = tree;
    for (const idx of path) {
      if (!node.children || !node.children[idx]) return null;
      node = node.children[idx];
    }
    return node;
  };

  const handleColumnHeaderClick = (clusterIndex) => {
    if (clusterTree && newkpi) {
      let clusterNode;
      if (breadcrumbPath.length === 0) {
        // If we're at the root level, get from root children
        clusterNode = clusterTree[newkpi].children[clusterIndex];
      } else {
        // If we're in a drill-down, get from the current path
        const currentNode = getClusterByPath(
          clusterTree[newkpi],
          breadcrumbPath
        );
        if (currentNode && currentNode.children) {
          clusterNode = currentNode.children[clusterIndex];
        }
      }

      if (clusterNode) {
        const absZScore = clusterNode?.cluster_definition?.abs_z_score;
        console.log("Current level:", currentLevel);
        console.log("Cluster node for modal:", clusterNode);
        console.log("abs_z_score for modal:", absZScore);
        setDefinitionAbsZScore(absZScore || null);
        setTimeout(() => setIsOpen(true), 0);
      } else {
        setDefinitionAbsZScore(null);
        setIsOpen(true);
      }
    } else {
      setDefinitionAbsZScore(null);
      setIsOpen(true);
    }
  };

  const handleDownloadCSV = async () => {
    try {
      // Convert indexes to strings for backend compatibility
      const indexes = (breadcrumbPath.length > 0 ? breadcrumbPath : [0]).map(
        String
      );
      const response = await axios.post(
        `${baseUrl}/projects/${project_id}/clusters/get_clusters`,
        indexes,
        { headers: { "Content-Type": "application/json" } }
      );
      const html = response.data;
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const table = doc.querySelector("table");
      let csv = "";
      for (const row of table.rows) {
        const cells = Array.from(row.cells).map(
          (cell) => '"' + cell.innerText.replace(/"/g, '""') + '"'
        );
        csv += cells.join(",") + "\n";
      }
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `clusters_level_${breadcrumbPath.length}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to download CSV", err);
    }
  };

  if (!project_id || !location.state) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <Typography color="error">
          Project not found or no change made
        </Typography>
      </Box>
    );
  }

  // Show loader while loading
  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        gap={2}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" color="textSecondary">
          Loading cluster data...
        </Typography>
      </Box>
    );
  }

  // Show error if there is one
  if (error) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700">{error}</p>
          <div className="mt-4 space-x-4">
            <button
              onClick={() => {
                setError(null);
                setLoading(false);
              }}
              className="px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500"
            >
              OK
            </button>
            <button
              onClick={() => {
                setError(null);
                setLoading(false);
                setIsOpen(true);
              }}
              className="px-4 py-2 bg-purple-400 text-white rounded-md hover:bg-purple-500"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentNode =
    breadcrumbPath.length === 0
      ? clusterTree[newkpi]
      : getClusterByPath(clusterTree[newkpi], breadcrumbPath);
  const currentClusters =
    currentNode && currentNode.children ? currentNode.children : [];

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden overflow-y-auto">
      <div className="w-64 bg-gray-100 border-r border-gray-200 overflow-y-auto">
        <ClusterHistorySection
          journey={journey}
          currentSelectionIndex={currentSelectionIndex}
          clusterTree={clusterTree}
          newkpi={newkpi}
          onSegmentClick={(indices) => handleNavigateToPath(indices)}
        />
      </div>
      <div className="w-[calc(100%-16rem)] overflow-hidden overflow-y-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() =>
              navigate(`/${com_id}/projects/${project_id}/select-kpi`)
            }
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg
              className="h-6 w-6 text-gray-600 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-gray-700">
            Select the target KPI for analysis
          </h1>
          <div className="flex items-center space-x-2 ml-auto">
            <button
              onClick={() =>
                setViewMode(viewMode === "table" ? "tree" : "table")
              }
              className="px-4 py-2 text-sm font-medium rounded-md bg-white border border-gray-200 hover:bg-gray-50"
            >
              Switch to {viewMode === "table" ? "Tree" : "Table"} View
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {kpiList.map((kpi, index) => (
            <button
              key={index}
              onClick={() => handleKpiClick(kpi)}
              className={`px-4 py-2 text-sm font-medium rounded-md min-w-[100px] ${
                newkpi === kpi
                  ? "text-white bg-purple-400"
                  : "text-gray-600 bg-white hover:bg-gray-50"
              }`}
            >
              {kpi}
            </button>
          ))}
        </div>

        {/* Breadcrumb Path */}
        <div className="flex items-center gap-2 mb-4 text-sm font-medium">
          <button
            className={`text-blue-600 hover:underline ${
              currentSelectionIndex === -1
                ? "font-bold border-b-2 border-indigo-500"
                : ""
            }`}
            onClick={() => handleNavigateToPath([])}
          >
            Root
          </button>
          {journey.map((step, i) => (
            <span key={`bc-${i}`} className="flex items-center">
              <ChevronRight className="inline-block w-4 h-4 mx-1 text-gray-400" />
              <button
                className={`text-blue-600 hover:underline ${
                  i + 1 === currentSelectionIndex
                    ? "font-bold border-b-2 border-indigo-500"
                    : ""
                }`}
                onClick={() =>
                  handleNavigateToPath(
                    journey.slice(0, i + 1).map((j) => j.clusterIndex)
                  )
                }
              >
                Cluster {step.clusterIndex + 1}
              </button>
            </span>
          ))}
        </div>

        {viewMode === "table" ? (
          <div className="flex flex-row justify-start items-start gap-0 w-min mx-auto">
            <div className="flex flex-col justify-start mx-auto items-start p-1 w-fit">
              <div className="w-full overflow-x-auto">
                <div className="w-[calc(100vw-18rem)] overflow-x-auto border-b border-gray-200 shadow sm:rounded-lg">
                  {loading && (
                    <Box
                      display="flex"
                      justifyContent="center"
                      alignItems="center"
                      p={4}
                    >
                      <CircularProgress />
                    </Box>
                  )}
                  {error && <p className="text-red-500 p-4">Error: {error}</p>}
                  {!loading && !error && (
                    <table className="w-[calc(100vw-20rem)] divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50"
                          >
                            Segments/Parameters
                          </th>
                          {currentClusters.map((_, index) => (
                            <th
                              key={index}
                              scope="col"
                              className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer ${
                                selectedClusterIndex === index
                                  ? "bg-indigo-200"
                                  : ""
                              }`}
                              onClick={() => handleColumnHeaderClick(index)}
                            >
                              <div className="flex items-center justify-start min-w-[120px] max-w-[120px]">
                                Segment {index + 1}
                                <button
                                  className="ml-2 p-1 rounded-full hover:bg-gray-200 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(index);
                                  }}
                                >
                                  <ArrowBigDownDash className="w-4 h-4" />
                                </button>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentClusters.length === 0 ? (
                          <tr>
                            <td
                              colSpan={2}
                              className="text-center py-8 text-gray-500"
                            >
                              No more clusters can be formed
                            </td>
                          </tr>
                        ) : (
                          <>
                            {filterImportantFeatures(
                              Object.keys(groupedClusters.top1)
                            ).map((feature) => (
                              <tr key={feature} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                                  {feature}
                                </td>
                                {currentClusters.map((_, clusterIndex) => {
                                  // For categorical columns
                                  if (
                                    groupedClusters.top1?.[feature]?.[
                                      clusterIndex
                                    ]?.original
                                  ) {
                                    const value =
                                      groupedClusters.top1[feature][
                                        clusterIndex
                                      ].original.Value;
                                    const percentage =
                                      groupedClusters.top1[feature][
                                        clusterIndex
                                      ].original.Percentage;
                                    return (
                                      <td
                                        key={clusterIndex}
                                        className={`px-6 py-4 whitespace-nowrap text-sm ${
                                          currentLevel > 0 &&
                                          journey[currentLevel - 1] &&
                                          journey[currentLevel - 1].feature ===
                                            feature &&
                                          journey[currentLevel - 1]
                                            .clusterIndex === clusterIndex
                                            ? "bg-blue-100 font-medium cursor-not-allowed"
                                            : ""
                                        } ${
                                          selectedCell?.feature === feature &&
                                          selectedCell?.clusterIndex ===
                                            clusterIndex &&
                                          selectedClusterIndex === clusterIndex
                                            ? "ring-2 ring-indigo-400"
                                            : ""
                                        }`}
                                        onClick={
                                          currentLevel > 0 &&
                                          journey[currentLevel - 1] &&
                                          journey[currentLevel - 1].feature ===
                                            feature &&
                                          journey[currentLevel - 1]
                                            .clusterIndex === clusterIndex
                                            ? undefined
                                            : () => {
                                                setOpenDropdowns({});
                                                handleCellClick(
                                                  feature,
                                                  clusterIndex,
                                                  value
                                                );
                                              }
                                        }
                                      >
                                        <div className="relative">
                                          <div className="cursor-pointer hover:bg-indigo-50 p-2 rounded transition-colors hover:underline">
                                            {value}
                                            {percentage !== undefined && (
                                              <span className="ml-2 text-sm text-gray-500">
                                                - {percentage}{" "}
                                                <span
                                                  className="pl-4"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleDropdown(
                                                      e,
                                                      feature,
                                                      clusterIndex
                                                    );
                                                  }}
                                                >
                                                  ▼
                                                </span>
                                              </span>
                                            )}
                                          </div>
                                          {openDropdowns[
                                            `${feature}-${clusterIndex}`
                                          ] && (
                                            <ClusterDropdown
                                              groupedClusters={groupedClusters}
                                              feature={feature}
                                              handleCellClick={handleCellClick}
                                              toggleDropdown={toggleDropdown}
                                              clusterIndex={clusterIndex}
                                              analysis={
                                                currentClusters[clusterIndex]
                                                  ?.analysis?.[feature]
                                              }
                                              selectedValue={
                                                selectedDropdownValues[
                                                  `${feature}-${clusterIndex}`
                                                ]
                                              }
                                            />
                                          )}
                                        </div>
                                      </td>
                                    );
                                  }

                                  // For numerical columns
                                  const mean =
                                    groupedClusters.mean?.[feature]?.[
                                      clusterIndex
                                    ]?.original?.Mean;
                                  const sum =
                                    currentClusters[clusterIndex]?.analysis?.[
                                      feature
                                    ]?.segment?.sum;
                                  const count =
                                    groupedClusters.mean?.[feature]?.[
                                      clusterIndex
                                    ]?.original?.Count;
                                  const key = `${feature}-${clusterIndex}`;
                                  const selectedValue =
                                    numericalCellSelection[key] || "mean";
                                  const displayValue =
                                    selectedValue === "sum" ? sum : mean;
                                  return (
                                    <td
                                      key={clusterIndex}
                                      className={`px-6 py-4 whitespace-nowrap text-sm ${
                                        currentLevel > 0 &&
                                        journey[currentLevel - 1] &&
                                        journey[currentLevel - 1].feature ===
                                          feature &&
                                        journey[currentLevel - 1]
                                          .clusterIndex === clusterIndex
                                          ? "bg-blue-100 font-medium cursor-not-allowed"
                                          : ""
                                      } ${
                                        selectedCell?.feature === feature &&
                                        selectedCell?.clusterIndex ===
                                          clusterIndex &&
                                        selectedClusterIndex === clusterIndex
                                          ? "ring-2 ring-indigo-400"
                                          : ""
                                      }`}
                                      onClick={
                                        currentLevel > 0 &&
                                        journey[currentLevel - 1] &&
                                        journey[currentLevel - 1].feature ===
                                          feature &&
                                        journey[currentLevel - 1]
                                          .clusterIndex === clusterIndex
                                          ? undefined
                                          : () => {
                                              setOpenDropdowns({});
                                              handleCellClick(
                                                feature,
                                                clusterIndex,
                                                displayValue
                                              );
                                            }
                                      }
                                    >
                                      <div className="cursor-pointer hover:bg-indigo-50 p-2 rounded transition-colors flex items-center gap-2">
                                        {typeof displayValue === "number" &&
                                        !isNaN(displayValue)
                                          ? formatIndianNumber(displayValue)
                                          : displayValue}
                                        {count !== undefined && (
                                          <span className="ml-2 text-sm text-gray-500">
                                            ({formatIndianNumber(count)})
                                          </span>
                                        )}
                                        {/* Dropdown for mean/sum toggle */}
                                        <span
                                          className="pl-4 cursor-pointer text-xs text-blue-500 underline"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setNumericalCellSelection(
                                              (prev) => ({
                                                ...prev,
                                                [key]:
                                                  selectedValue === "mean"
                                                    ? "sum"
                                                    : "mean",
                                              })
                                            );
                                          }}
                                        >
                                          {selectedValue === "mean"
                                            ? "Show Sum"
                                            : "Show Mean"}
                                        </span>
                                        {/* Option to reset to original value */}
                                        {numericalCellSelection[key] && (
                                          <span
                                            className="pl-2 cursor-pointer text-xs text-gray-400 underline"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setNumericalCellSelection(
                                                (prev) => {
                                                  const newSel = { ...prev };
                                                  delete newSel[key];
                                                  return newSel;
                                                }
                                              );
                                            }}
                                          >
                                            Reset
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                            {filterImportantFeatures(
                              Object.keys(groupedClusters.mean)
                            ).map((feature) => (
                              <tr key={feature} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                                  {feature}
                                </td>
                                {currentClusters.map((_, clusterIndex) => {
                                  // For categorical columns
                                  if (
                                    groupedClusters.top1?.[feature]?.[
                                      clusterIndex
                                    ]?.original
                                  ) {
                                    const value =
                                      groupedClusters.top1[feature][
                                        clusterIndex
                                      ].original.Value;
                                    const percentage =
                                      groupedClusters.top1[feature][
                                        clusterIndex
                                      ].original.Percentage;
                                    return (
                                      <td
                                        key={clusterIndex}
                                        className={`px-6 py-4 whitespace-nowrap text-sm ${
                                          currentLevel > 0 &&
                                          journey[currentLevel - 1] &&
                                          journey[currentLevel - 1].feature ===
                                            feature &&
                                          journey[currentLevel - 1]
                                            .clusterIndex === clusterIndex
                                            ? "bg-blue-100 font-medium cursor-not-allowed"
                                            : ""
                                        } ${
                                          selectedCell?.feature === feature &&
                                          selectedCell?.clusterIndex ===
                                            clusterIndex &&
                                          selectedClusterIndex === clusterIndex
                                            ? "ring-2 ring-indigo-400"
                                            : ""
                                        }`}
                                        onClick={
                                          currentLevel > 0 &&
                                          journey[currentLevel - 1] &&
                                          journey[currentLevel - 1].feature ===
                                            feature &&
                                          journey[currentLevel - 1]
                                            .clusterIndex === clusterIndex
                                            ? undefined
                                            : () => {
                                                setOpenDropdowns({});
                                                handleCellClick(
                                                  feature,
                                                  clusterIndex,
                                                  value
                                                );
                                              }
                                        }
                                      >
                                        <div className="cursor-pointer hover:bg-indigo-50 p-2 rounded transition-colors hover:underline">
                                          {value}
                                          {percentage !== undefined && (
                                            <span className="ml-2 text-sm text-gray-500">
                                              - {percentage}{" "}
                                              <span
                                                className="pl-4"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  toggleDropdown(
                                                    e,
                                                    feature,
                                                    clusterIndex
                                                  );
                                                }}
                                              >
                                                ▼
                                              </span>
                                            </span>
                                          )}
                                        </div>
                                        {openDropdowns[
                                          `${feature}-${clusterIndex}`
                                        ] && (
                                          <ClusterDropdown
                                            groupedClusters={groupedClusters}
                                            feature={feature}
                                            handleCellClick={handleCellClick}
                                            toggleDropdown={toggleDropdown}
                                            clusterIndex={clusterIndex}
                                            analysis={
                                              currentClusters[clusterIndex]
                                                ?.analysis?.[feature]
                                            }
                                            selectedValue={
                                              selectedDropdownValues[
                                                `${feature}-${clusterIndex}`
                                              ]
                                            }
                                          />
                                        )}
                                      </td>
                                    );
                                  }

                                  // For numerical columns
                                  const mean =
                                    groupedClusters.mean?.[feature]?.[
                                      clusterIndex
                                    ]?.original?.Mean;
                                  const sum =
                                    currentClusters[clusterIndex]?.analysis?.[
                                      feature
                                    ]?.segment?.sum;
                                  const count =
                                    groupedClusters.mean?.[feature]?.[
                                      clusterIndex
                                    ]?.original?.Count;
                                  const key = `${feature}-${clusterIndex}`;
                                  const selectedValue =
                                    numericalCellSelection[key] || "mean";
                                  const displayValue =
                                    selectedValue === "sum" ? sum : mean;
                                  return (
                                    <td
                                      key={clusterIndex}
                                      className={`px-6 py-4 whitespace-nowrap text-sm ${
                                        currentLevel > 0 &&
                                        journey[currentLevel - 1] &&
                                        journey[currentLevel - 1].feature ===
                                          feature &&
                                        journey[currentLevel - 1]
                                          .clusterIndex === clusterIndex
                                          ? "bg-blue-100 font-medium cursor-not-allowed"
                                          : ""
                                      } ${
                                        selectedCell?.feature === feature &&
                                        selectedCell?.clusterIndex ===
                                          clusterIndex &&
                                        selectedClusterIndex === clusterIndex
                                          ? "ring-2 ring-indigo-400"
                                          : ""
                                      }`}
                                      onClick={
                                        currentLevel > 0 &&
                                        journey[currentLevel - 1] &&
                                        journey[currentLevel - 1].feature ===
                                          feature &&
                                        journey[currentLevel - 1]
                                          .clusterIndex === clusterIndex
                                          ? undefined
                                          : () => {
                                              setOpenDropdowns({});
                                              handleCellClick(
                                                feature,
                                                clusterIndex,
                                                displayValue
                                              );
                                            }
                                      }
                                    >
                                      <div className="cursor-pointer hover:bg-indigo-50 p-2 rounded transition-colors flex items-center gap-2">
                                        {typeof displayValue === "number" &&
                                        !isNaN(displayValue)
                                          ? formatIndianNumber(displayValue)
                                          : displayValue}
                                        {count !== undefined && (
                                          <span className="ml-2 text-sm text-gray-500">
                                            ({formatIndianNumber(count)})
                                          </span>
                                        )}
                                        {/* Dropdown for mean/sum toggle */}
                                        <span
                                          className="pl-4 cursor-pointer text-xs text-blue-500 underline"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setNumericalCellSelection(
                                              (prev) => ({
                                                ...prev,
                                                [key]:
                                                  selectedValue === "mean"
                                                    ? "sum"
                                                    : "mean",
                                              })
                                            );
                                          }}
                                        >
                                          {selectedValue === "mean"
                                            ? "Show Sum"
                                            : "Show Mean"}
                                        </span>
                                        {/* Option to reset to original value */}
                                        {numericalCellSelection[key] && (
                                          <span
                                            className="pl-2 cursor-pointer text-xs text-gray-400 underline"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setNumericalCellSelection(
                                                (prev) => {
                                                  const newSel = { ...prev };
                                                  delete newSel[key];
                                                  return newSel;
                                                }
                                              );
                                            }}
                                          >
                                            Reset
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap justify-start items-center gap-4 mt-4">
                <button
                  onClick={handleAnalyze}
                  disabled={selectedClusterIndex === null}
                  className={`px-4 py-2 rounded ${
                    selectedClusterIndex !== null
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Analyze
                </button>
                <button
                  onClick={() => {
                    // Ensure all required state is passed
                    const stateData = {
                      activeKPI: newkpi,
                      kpiList,
                      importantColumnNames,
                      project_id,
                    };
                    navigate(`/${com_id}/projects/${project_id}/workbench`, {
                      state: stateData,
                    });
                  }}
                  className="p-2 rounded-lg font-semibold border px-4 bg-white text-gray-800 hover:bg-gray-100 transition-colors"
                >
                  Workbench
                </button>
              </div>
            </div>
          </div>
        ) : (
          <ClusterTreeVisualization
            clusterTree={clusterTree}
            activeKPI={newkpi}
            onClusterSelect={(cluster, path, level) => {
              setCurrentLevel(level);
              setJourney(path);
              if (cluster.children && cluster.children.length > 0) {
                setGroupedClusters(transformClusterData(cluster.children));
              }
            }}
          />
        )}

        {showModal && (
          <WorkbenchModal
            categorical_columns={[]}
            currentLevel={currentLevel}
            currentPath={journey}
            activeKPI={newkpi}
            showModal={showModal}
            setShowModal={setShowModal}
            project_id={project_id}
            com_id={com_id}
          />
        )}
        {isOpen && (
          <DefinationModel
            setIsOpen={setIsOpen}
            absZScore={definitionAbsZScore}
          />
        )}
        {isOpen1 && (
          <SelectableClusterPopup
            setIsOpen1={setIsOpen1}
            selectedCluster={selectedCluster}
            setSelectedCluster={setSelectedCluster}
            kpi={newkpi}
          />
        )}

        <button
          className="mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          onClick={handleDownloadCSV}
        >
          Download CSV
        </button>
      </div>
    </div>
  );
};

export default ClusteringComponent;
