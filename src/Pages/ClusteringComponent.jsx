"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { ArrowBigDownDash, ChevronRight } from "lucide-react";
import ClusterHistorySection from "../Components/ClusterHistorySection";
import ClusterTreeVisualization from "../Components/ClusterTreeVisualization";
import { useDispatch, useSelector } from "react-redux";
import { setClusterHistory, setClusters } from "../redux/clusterSlice";
import { CircularProgress, Typography, Box } from "@mui/material";
import ClusterDropdown from "../Components/ClusterDropdown";
import WorkbenchModal from "../Components/WorkbenchModal";
import DefinationModel from "../Components/DefinationModel";
import SelectableClusterPopup from "../Components/SelectableClustorPopup";
import { restoreProjectState } from "../redux/projectsSlice";
import axiosInstance from "../utils/axiosInstance";

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
  const { activeKPI, kpiList, importantColumnNames } = location.state || {};
  const [newkpi, setNewkpi] = useState(
    activeKPI || (kpiList && kpiList.length > 0 ? kpiList[0] : "")
  );
  const [extractedClusters, setExtractedClusters] = useState([]);
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
  const navigate = useNavigate();
  const [breadcrumbPath, setBreadcrumbPath] = useState([]);
  const [selectedClusterIndex, setSelectedClusterIndex] = useState(null);

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
          // If clusters exist, use them directly
          if (response.data.clusters) {
            setClusterTree(response.data.clusters);
            // Set extractedClusters to the children of the root node for the current KPI
            const kpi = newkpi || Object.keys(response.data.clusters)[0];
            setExtractedClusters(response.data.clusters[kpi]?.children || []);
            setLoading(false);
            return;
          }
        }
        // If no clusters, proceed with processData as usual
        if (newkpi && project_id) {
          processData(newkpi);
        }
      } catch (error) {
        setError(error);
        setLoading(false);
      }
    };
    if (com_id && project_id) {
      fetchAndRestoreProject();
    }
    // eslint-disable-next-line
  }, [com_id, project_id, newkpi]);

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

        setExtractedClusters(currentLevelClusters);
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
    setSelectedCell({ feature, clusterIndex, currentLevel, value });
    setSelectedClusterIndex(clusterIndex); //for cell selection and analyze it
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
      };
      const newJourney = [...baseJourney, newStep];
      setJourney(newJourney);
      setCurrentSelectionIndex(newJourney.length - 1);
      // Update table view
      const pathIndices = newJourney.map((j) => j.clusterIndex);
      setBreadcrumbPath(pathIndices);
      const newNode = getClusterByPath(clusterTree[newkpi], pathIndices);
      if (newNode && newNode.children) {
        setGroupedClusters(transformClusterData(newNode.children));
      }
      setSelectedClusterIndex(null);
    }
  };

  const handleNavigateToPath = (pathIndices) => {
    // Find the index in the journey that matches the path
    let selIdx = -1;
    for (let i = 0; i < pathIndices.length; i++) {
      if (!journey[i] || journey[i].clusterIndex !== pathIndices[i]) {
        selIdx = -1;
        break;
      }
      selIdx = i;
    }
    if (selIdx === -1 && pathIndices.length === 0) selIdx = -1; // root
    setCurrentSelectionIndex(selIdx);
    setBreadcrumbPath(pathIndices);
    setSelectedClusterIndex(null);
    // Update table view
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
      const response = await axios.post(
        `${baseUrl}/projects/${project_id}/clusters/download`,
        {
          project_id,
          level: currentLevel,
          path: breadcrumbPath,
          cluster_index: clusterIndex,
        },
        {
          responseType: "blob",
        }
      );
      const blob = new Blob([response.data], { type: "text/csv" });
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
    return features.filter((feature) => importantColumnNames.includes(feature));
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
    setSelectedClusterIndex(clusterIndex);
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

  // Add useEffect to update groupedClusters when clusterTree or newkpi changes (initial load or KPI change)
  useEffect(() => {
    if (
      clusterTree &&
      newkpi &&
      clusterTree[newkpi] &&
      clusterTree[newkpi].children
    ) {
      setGroupedClusters(transformClusterData(clusterTree[newkpi].children));
    }
  }, [clusterTree, newkpi]);

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
              className="px-4 py-2 bg-purple-400 text-white rounded-md hover:bg-purple-500"
            >
              Try Again
            </button>
            <button
              onClick={() => {
                window.location.href = `/${com_id}/projects/${project_id}/configuration/`;
              }}
              className="px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500"
            >
              Go to Configuration
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show "No data" message only if we're not loading and there's no error
  if (!extractedClusters || extractedClusters.length === 0) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <Typography>No cluster data available</Typography>
      </Box>
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
                  i === currentSelectionIndex
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
                  {!loading && !error && currentClusters.length > 0 && (
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
                                    e.preventDefault();
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
                        {filterImportantFeatures(
                          Object.keys(groupedClusters.top1)
                        ).map((feature) => (
                          <tr key={feature} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                              {feature}
                            </td>
                            {currentClusters.map((_, clusterIndex) => {
                              const value =
                                groupedClusters.top1?.[feature]?.[clusterIndex]
                                  ?.original?.Value ??
                                groupedClusters.mean?.[feature]?.[clusterIndex]
                                  ?.original?.Mean ??
                                0;
                              const percentage =
                                groupedClusters.top1[feature]?.[clusterIndex]
                                  ?.original?.Percentage;
                              return (
                                <td
                                  key={clusterIndex}
                                  className={`px-6 py-4 whitespace-nowrap text-sm ${
                                    selectedCell?.feature === feature &&
                                    selectedCell?.clusterIndex === clusterIndex
                                      ? "bg-indigo-100"
                                      : ""
                                  }`}
                                  onClick={() =>
                                    handleCellClick(
                                      feature,
                                      clusterIndex,
                                      value
                                    )
                                  }
                                >
                                  <div className="cursor-pointer hover:bg-indigo-50 p-2 rounded transition-colors hover:underline">
                                    {typeof value === "number" && !isNaN(value)
                                      ? formatIndianNumber(value)
                                      : value}
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
                                    />
                                  )}
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
                              const mean =
                                groupedClusters.mean?.[feature]?.[clusterIndex]
                                  ?.original?.Mean;
                              const count =
                                groupedClusters.mean?.[feature]?.[clusterIndex]
                                  ?.original?.Count;
                              return (
                                <td
                                  key={clusterIndex}
                                  className={`px-6 py-4 whitespace-nowrap text-sm ${
                                    selectedCell?.feature === feature &&
                                    selectedCell?.clusterIndex === clusterIndex
                                      ? "bg-indigo-100"
                                      : ""
                                  }`}
                                  onClick={() =>
                                    handleCellClick(feature, clusterIndex, mean)
                                  }
                                >
                                  <div className="cursor-pointer hover:bg-indigo-50 p-2 rounded transition-colors">
                                    {typeof mean === "number" && !isNaN(mean)
                                      ? formatIndianNumber(mean)
                                      : mean}
                                    {count !== undefined && (
                                      <span className="ml-2 text-sm text-gray-500">
                                        ({formatIndianNumber(count)})
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
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
                  onClick={() =>
                    navigate(`/projects/${project_id}/workbench`, {
                      state: {
                        activeKPI: newkpi,
                        kpiList,
                        importantColumnNames,
                      },
                    })
                  }
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
                setExtractedClusters(cluster.children);
                const transformedData = transformClusterData(cluster.children);
                setGroupedClusters(transformedData);
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
          />
        )}
        {isOpen && (
          <DefinationModel
            setIsOpen={setIsOpen}
            kpi={newkpi}
            clusterNo={selectedCluster}
            path={journey}
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
