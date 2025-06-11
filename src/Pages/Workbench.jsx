"use client";

import { useSelector } from "react-redux";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Loader2,
  Calendar,
  BarChart4,
  TrendingUp,
  Settings,
  Download,
  X,
  Info,
  ChevronDown,
  ChevronUp,
  Check,
  ChevronLeft,
} from "lucide-react";
import Plot from "react-plotly.js";

const Workbench = () => {
  const { clusterHistory } = useSelector((state) => state.cluster);
  const location = useLocation();
  const navigate = useNavigate();
  const { activeKPI, kpiList, importantColumnNames } = location.state || {};
  const { project_id, com_id } = useParams();
  const [storedClusterJourney, setStoredClusterJourney] = useState([]);
  const [isLoadingJourney, setIsLoadingJourney] = useState(true);

  // Add state validation and redirection
  useEffect(() => {
    if (!activeKPI || !kpiList || !importantColumnNames) {
      console.error("Missing required state data, redirecting to select-kpi");
      navigate(`/${com_id}/projects/${project_id}/select-kpi`);
    }
  }, [activeKPI, kpiList, importantColumnNames, com_id, project_id, navigate]);

  // Function to handle navigation back to clustering
  const handleBackNavigation = () => {
    if (!activeKPI || !kpiList || !importantColumnNames) {
      console.error("Missing required state data for navigation");
      return;
    }
    navigate(`/${com_id}/projects/${project_id}/clustered-data`, {
      state: {
        activeKPI,
        kpiList,
        importantColumnNames,
        project_id,
      },
    });
  };

  // Initialize state with persisted values
  const [checkedState, setCheckedState] = useState(() => {
    const saved = localStorage.getItem(`workbench_checked_${project_id}`);
    return saved
      ? JSON.parse(saved)
      : new Array(clusterHistory?.length || 0).fill(false);
  });

  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [adjustments, setAdjustments] = useState(() => {
    const saved = localStorage.getItem(`workbench_adjustments_${project_id}`);
    return saved ? JSON.parse(saved) : {};
  });

  const [noOfMonths, setNoOfMonths] = useState(() => {
    const saved = localStorage.getItem(`workbench_months_${project_id}`);
    return saved ? parseInt(saved) : 12;
  });

  const [dateColumn, setDateColumn] = useState(() => {
    const saved = localStorage.getItem(`workbench_date_column_${project_id}`);
    return saved || "";
  });

  const [weightData, setWeightData] = useState(() => {
    const saved = localStorage.getItem(`workbench_weight_data_${project_id}`);
    return saved ? JSON.parse(saved) : {};
  });

  const [columns, setColumns] = useState([]);
  const baseUrl = import.meta.env.VITE_BASE_URL;

  const [childCheckedState, setChildCheckedState] = useState(() => {
    const saved = localStorage.getItem(`workbench_child_checked_${project_id}`);
    return saved ? JSON.parse(saved) : {};
  });

  const [expandedSections, setExpandedSections] = useState(() => {
    const saved = localStorage.getItem(`workbench_expanded_${project_id}`);
    return saved ? JSON.parse(saved) : {};
  });

  const [plotData] = useState([]);
  const [plotLayout] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(
      `workbench_checked_${project_id}`,
      JSON.stringify(checkedState)
    );
  }, [checkedState, project_id]);

  useEffect(() => {
    localStorage.setItem(
      `workbench_adjustments_${project_id}`,
      JSON.stringify(adjustments)
    );
  }, [adjustments, project_id]);

  useEffect(() => {
    localStorage.setItem(
      `workbench_months_${project_id}`,
      noOfMonths.toString()
    );
  }, [noOfMonths, project_id]);

  useEffect(() => {
    localStorage.setItem(`workbench_date_column_${project_id}`, dateColumn);
  }, [dateColumn, project_id]);

  useEffect(() => {
    localStorage.setItem(
      `workbench_weight_data_${project_id}`,
      JSON.stringify(weightData)
    );
  }, [weightData, project_id]);

  useEffect(() => {
    localStorage.setItem(
      `workbench_child_checked_${project_id}`,
      JSON.stringify(childCheckedState)
    );
  }, [childCheckedState, project_id]);

  useEffect(() => {
    localStorage.setItem(
      `workbench_expanded_${project_id}`,
      JSON.stringify(expandedSections)
    );
  }, [expandedSections, project_id]);

  // Clear persisted data when component unmounts
  useEffect(() => {
    return () => {
      // Don't clear the data on unmount as we want to persist it
      // This is just a placeholder for future cleanup if needed
    };
  }, []);

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

  const popupVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: "spring", damping: 25, stiffness: 300 },
    },
  };

  // Fetch columns when component mounts
  useEffect(() => {
    const fetchColumns = async () => {
      try {
        // First try to get columns from sessionStorage
        const storedColumns = sessionStorage.getItem("columns");
        if (storedColumns) {
          try {
            const parsedColumns = JSON.parse(storedColumns);
            setColumns(parsedColumns);
            return;
          } catch (parseError) {
            console.error("Error parsing stored columns:", parseError);
          }
        }

        // If no stored columns or parsing failed, fetch from API
        const response = await axios.get(
          `${baseUrl}/projects/${project_id}/get_columns`
        );

        if (response.data && Array.isArray(response.data)) {
          setColumns(response.data);
          // Store the columns in sessionStorage for future use
          sessionStorage.setItem("columns", JSON.stringify(response.data));
        } else if (
          response.data &&
          response.data.columns &&
          Array.isArray(response.data.columns)
        ) {
          setColumns(response.data.columns);
          // Store the columns in sessionStorage for future use
          sessionStorage.setItem(
            "columns",
            JSON.stringify(response.data.columns)
          );
        } else {
          console.error("Invalid columns data in response:", response.data);
          setError("Invalid columns data received from server");
        }
      } catch (error) {
        console.error("Error fetching columns:", error);
        if (error.response) {
          setError(
            `Error loading columns: ${
              error.response.data?.message || error.response.statusText
            }`
          );
        } else if (error.request) {
          setError("No response from server while loading columns");
        } else {
          setError("Error loading columns data");
        }
      }
    };

    if (project_id) {
      fetchColumns();
    }
  }, [project_id, baseUrl]);

  // Fetch cluster journey when component mounts
  useEffect(() => {
    console.log("Workbench useEffect running", { project_id, baseUrl });
    const fetchProjectData = async () => {
      if (!project_id) {
        console.log("No project_id, skipping fetch");
        setError("Project ID is missing. Cannot load workbench data.");
        setIsLoadingJourney(false);
        return;
      }
      console.log("Fetching cluster journey for project_id:", project_id);
      setIsLoadingJourney(true);
      setError(null);

      try {
        console.log(
          `Attempting to fetch project data for project ID: ${project_id}`
        );
        // Fetch cluster journey using the correct endpoint
        const journeyResponse = await axios.get(
          `${baseUrl}/get-cluster-journey`,
          {
            params: {
              project_id: project_id,
            },
          }
        );

        console.log("Journey fetch response:", journeyResponse.data);

        if (journeyResponse.data && journeyResponse.data.cluster_journey) {
          const fetchedJourney = journeyResponse.data.cluster_journey;
          setStoredClusterJourney(fetchedJourney);
          console.log(
            "Successfully fetched and set cluster journey.",
            fetchedJourney
          );
        } else {
          console.log(
            "No cluster journey found in backend response, falling back to Redux."
          );
          // Fallback to Redux state if backend doesn't have the journey
          if (clusterHistory && clusterHistory.length > 0) {
            setStoredClusterJourney(clusterHistory);
            console.log(
              "Using Redux cluster history as fallback.",
              clusterHistory
            );
          } else {
            setStoredClusterJourney([]); // Ensure it's an empty array if no data anywhere
            console.log("No cluster history available in backend or Redux.");
            // Optionally set a message for the user
            // setError("No cluster journey found for this project.");
          }
        }
      } catch (err) {
        console.error("Error fetching project data:", err);
        // Check for specific error types and provide user feedback
        if (err.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error("Error response data:", err.response.data);
          console.error("Error response status:", err.response.status);
          console.error("Error response headers:", err.response.headers);
          if (err.response.status === 404) {
            setError("Project or cluster journey not found.");
          } else {
            setError(`Failed to load cluster journey: ${err.response.status}`);
          }
        } else if (err.request) {
          // The request was made but no response was received
          console.error("Error request:", err.request);
          setError("Failed to load cluster journey: No response from server.");
        } else {
          // Something happened in setting up the request that triggered an Error
          console.error("Error message:", err.message);
          setError(`Failed to load cluster journey: ${err.message}`);
        }

        // Fallback to Redux state even on error if available
        if (clusterHistory && clusterHistory.length > 0) {
          setStoredClusterJourney(clusterHistory);
          console.log(
            "Using Redux cluster history as fallback after error.",
            clusterHistory
          );
        } else {
          setStoredClusterJourney([]); // Ensure it's an empty array on error if no Redux data
        }
      }
      setIsLoadingJourney(false);
    };

    fetchProjectData();
  }, [project_id, baseUrl]);

  // Re-initialize checkedState when displayClusterHistory changes, only if there is data
  // useEffect(() => {
  //   if (displayClusterHistory.length > 0) {
  //     setCheckedState(new Array(displayClusterHistory.length).fill(false));
  //   }
  // }, [displayClusterHistory]);

  // Show loading state while fetching cluster journey
  if (isLoadingJourney) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-gray-600 dark:text-gray-400">
            Loading cluster journey...
          </p>
        </div>
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-red-600 mb-4">
            Error Loading Data
          </h2>
          <p className="text-gray-700">{error}</p>
          <div className="mt-4 space-x-4">
            <button
              onClick={() => {
                setError(""); // Just close the error box
                setIsLoading(false);
              }}
              className="px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500"
            >
              Go Back
            </button>
            <button
              onClick={handleActionClick}
              className="px-4 py-2 bg-purple-400 text-white rounded-md hover:bg-purple-500"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Use stored cluster journey if available, otherwise use Redux state
  const displayClusterHistory =
    storedClusterJourney.length > 0 ? storedClusterJourney : clusterHistory;

  // Filter out duplicate features, keeping only the first occurrence
  const uniqueClusterHistory = displayClusterHistory.reduce((acc, cluster) => {
    const featureExists = acc.some((item) => item.feature === cluster.feature);
    if (!featureExists) {
      acc.push(cluster);
    }
    return acc;
  }, []);

  // Debug logs to diagnose blank UI
  console.log("storedClusterJourney", storedClusterJourney);
  console.log("clusterHistory", clusterHistory);
  console.log("isLoadingJourney", isLoadingJourney);
  console.log("error", error);
  console.log("displayClusterHistory", displayClusterHistory);

  const handleCheckboxChange = (index) => {
    const updatedCheckedState = checkedState.map((item, idx) =>
      idx === index ? !item : item
    );
    setCheckedState(updatedCheckedState);
  };

  const handleInputChange = (feature, value) => {
    setAdjustments((prev) => ({
      ...prev,
      [feature]: value,
    }));
  };

  const handleActionClick = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    // Only include adjustments for checked sub-features
    const filteredAdjustments = {};
    Object.entries(childCheckedState).forEach(([parentIndex, childMap]) => {
      if (weightData[parentIndex]) {
        weightData[parentIndex].forEach((item, idx) => {
          if (childMap[idx]) {
            filteredAdjustments[item.feature] = adjustments[item.feature];
          }
        });
      }
    });

    try {
      const response = await axios.post(
        `${baseUrl}/run-time-series-forecast/`,
        {
          project_id: project_id,
          subfolder: "other_files",
          kpi: activeKPI,
          no_of_months: Number(noOfMonths),
          adjustments: filteredAdjustments,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data && response.data.data && response.data.layout) {
        setSuccess("Projection generated successfully!");
        navigate(`/${com_id}/projects/${project_id}/projection`, {
          state: {
            plotlyGraph: response.data,
            activeKPI,
            kpiList,
            importantColumnNames,
            project_id,
          },
        });
      } else {
        throw new Error("Invalid response format from forecast API");
      }
    } catch (error) {
      console.error(
        "Error generating projection:",
        error,
        error?.response?.data
      );
      setError(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          "Failed to generate projection. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const closePopup = () => {
    setIsPopupVisible(false);
  };

  const handleOneHotEncoding = async (feature) => {
    setLoadingIndex(feature);
    setError("");
    setSuccess("");

    // Robust column matching: always use the exact column name from columns
    const actualColumn = columns.find(
      (col) => col.trim().toLowerCase() === (feature || "").trim().toLowerCase()
    );

    if (!actualColumn) {
      setError(
        `Target column '${feature}' not found in available columns. Please check your data.`
      );
      setLoadingIndex(null);
      return;
    }

    // Log for debugging
    console.log("actualColumn:", actualColumn, "type:", typeof actualColumn);

    try {
      const response = await axios.get(`${baseUrl}/feature-ranking/`, {
        params: {
          project_id: project_id,
          target_col: actualColumn, // always send the exact column name
        },
      });

      if (response.data && response.data.top_5_feature_importances) {
        // Find the index in uniqueClusterHistory for this feature
        const idx = uniqueClusterHistory.findIndex(
          (c) => c.feature === feature
        );
        setWeightData((prevState) => ({
          ...prevState,
          [idx]: response.data.top_5_feature_importances,
        }));

        setExpandedSections((prev) => ({
          ...prev,
          [idx]: true,
        }));

        setSuccess("Feature ranking completed successfully!");
      } else {
        throw new Error("Invalid response format from feature ranking API");
      }
    } catch (error) {
      console.error("Error in feature ranking:", error, error?.response?.data);
      setError(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          "Failed to get feature ranking. Please try again."
      );
    } finally {
      setLoadingIndex(null);
    }
  };

  const toggleSection = (index) => {
    setExpandedSections((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Show fallback UI if no cluster journey data is available
  if (!storedClusterJourney || storedClusterJourney.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
          <div className="flex items-center gap-3 text-yellow-500 mb-4">
            <Info className="h-6 w-6" />
            <h2 className="text-lg font-semibold">No Data Available</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No cluster journey data is available. Please go back to the
            clustering page and create some segments.
          </p>
          <div className="flex justify-end">
            <button
              onClick={() => {
                // Ensure we have all required state data
                if (!activeKPI || !kpiList || !importantColumnNames) {
                  console.error("Missing required state data for navigation");
                  return;
                }
                navigate(`/${com_id}/projects/${project_id}/clustered-data`, {
                  state: {
                    activeKPI,
                    kpiList,
                    importantColumnNames,
                    project_id,
                  },
                });
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
            >
              Go Back to Clustering
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handler for sub-feature (child) checkboxes
  const handleChildCheckboxChange = (parentIndex, childIndex) => {
    setChildCheckedState((prev) => ({
      ...prev,
      [parentIndex]: {
        ...prev[parentIndex],
        [childIndex]: !prev[parentIndex]?.[childIndex],
      },
    }));
  };

  // Handler for sub-feature (child) input changes
  const handleChildInputChange = (parentIndex, childIndex, feature, value) => {
    setAdjustments((prev) => ({
      ...prev,
      [feature]: value,
    }));
  };

  // Add number formatting function
  const formatIndianNumber = (value) => {
    if (value === undefined || value === null || value === "") return "";
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <motion.div
      className="bg-gray-50 dark:bg-gray-900 min-h-[calc(100vh-64px)]"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="container mx-auto px-4 py-8">
        {/* Add back navigation button in the header section */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex items-center gap-3">
            <motion.button
              onClick={handleBackNavigation}
              className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </motion.button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Workbench
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Analyze and modify parameters to generate time series
                projections
              </p>
            </div>
          </div>
        </motion.div>

        {/* Cluster History Timeline */}
        <motion.div
          variants={itemVariants}
          className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            Segment History
          </h2>

          <div className="overflow-x-auto">
            <div className="flex items-center space-x-4 min-w-max">
              {displayClusterHistory.map((cluster, index) => (
                <React.Fragment key={index}>
                  <motion.div
                    whileHover={{ y: -5 }}
                    className="flex-shrink-0 w-64 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    <div className="h-24 bg-gradient-to-r from-indigo-500 to-purple-600 relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <BarChart4 className="h-12 w-12 text-white/20" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/50 to-transparent">
                        <p className="text-white font-bold">
                          Level {(cluster.level || 0) + 1}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-800">
                      <div className="space-y-2">
                        <p className="text-sm flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">
                            Value:
                          </span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {formatIndianNumber(cluster.value)}
                            {cluster.percentage !== undefined &&
                            cluster.percentage !== null &&
                            cluster.percentage !== ""
                              ? ` - ${formatIndianNumber(cluster.percentage)}%`
                              : ""}
                          </span>
                        </p>
                        <p className="text-sm flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">
                            Parameter:
                          </span>
                          <span className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[120px]">
                            {cluster.feature || "Parameter"}
                          </span>
                        </p>
                        <p className="text-sm flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">
                            Segment:
                          </span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {cluster.cluster}
                          </span>
                        </p>
                      </div>
                    </div>
                  </motion.div>
                  {index < displayClusterHistory.length - 1 && (
                    <div className="flex-shrink-0">
                      <ArrowRight className="h-6 w-6 text-gray-400 dark:text-gray-600" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Date Column Selection */}
          <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date Column
                </label>
                <select
                  value={dateColumn}
                  onChange={(e) => setDateColumn(e.target.value)}
                  className="border rounded px-3 py-2 w-full text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
                  disabled={isLoading}
                >
                  <option value="">Select a date column</option>
                  {columns && columns.length > 0 ? (
                    columns.map((column, index) => (
                      <option key={index} value={column}>
                        {column}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      {error ? "Error loading columns" : "Loading columns..."}
                    </option>
                  )}
                </select>
                {error && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                )}
              </div>
              <div className="flex justify-end">
                <motion.button
                  onClick={async () => {
                    if (!dateColumn) {
                      setError("Please select a date column");
                      return;
                    }

                    try {
                      setIsLoading(true);
                      setError("");
                      setSuccess("");

                      const response = await axios.get(
                        `${baseUrl}/run-pipeline/`,
                        {
                          params: {
                            project_id: project_id,
                            kpi_col: activeKPI,
                            date_col: dateColumn,
                          },
                        }
                      );

                      if (response.data) {
                        setSuccess("Pipeline started successfully!");
                        // You can add additional logic here based on the response
                        console.log("Pipeline response:", response.data);
                      }
                    } catch (error) {
                      console.error("Error running pipeline:", error);
                      setError(
                        error.response?.data?.message ||
                          "Failed to run pipeline. Please try again."
                      );
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className={`px-6 py-2 bg-indigo-600 text-white rounded-lg transition-colors flex items-center gap-2 ${
                    isLoading
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-indigo-700"
                  }`}
                  whileHover={isLoading ? {} : { scale: 1.05 }}
                  whileTap={isLoading ? {} : { scale: 0.95 }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4" />
                      <span>Proceed</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Definition Table */}
        <motion.div
          variants={itemVariants}
          className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Settings className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
              Parameter Adjustments
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700"></th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                    Parameter
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                    Current Value
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                    Modify To
                  </th>
                </tr>
              </thead>
              <tbody>
                {uniqueClusterHistory.map((cluster, index) => (
                  <React.Fragment key={index}>
                    <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={checkedState[index]}
                            onChange={() => handleCheckboxChange(index)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-indigo-400"
                            disabled={isLoading}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                        {cluster.feature || "Parameter"}
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        {formatIndianNumber(cluster.value)}
                        {cluster.percentage !== undefined &&
                        cluster.percentage !== null &&
                        cluster.percentage !== ""
                          ? ` - ${formatIndianNumber(cluster.percentage)}%`
                          : ""}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <input
                            className={`border rounded px-3 py-1.5 w-full max-w-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 ${
                              !checkedState[index]
                                ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                                : ""
                            }`}
                            disabled={!checkedState[index] || isLoading}
                            onChange={(e) =>
                              handleInputChange(cluster.feature, e.target.value)
                            }
                            value={adjustments[cluster.feature] || ""}
                            placeholder="New value"
                          />
                          {checkedState[index] && (
                            <div className="flex items-center gap-2">
                              <motion.button
                                onClick={() =>
                                  handleOneHotEncoding(cluster.feature)
                                }
                                className={`h-8 px-2 rounded-md flex items-center gap-1 text-xs font-medium ${
                                  loadingIndex === cluster.feature
                                    ? "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                    : "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                                }`}
                                title="Generate OneHot Encoding"
                                disabled={
                                  loadingIndex === cluster.feature || isLoading
                                }
                                whileHover={
                                  loadingIndex === cluster.feature
                                    ? {}
                                    : { scale: 1.05 }
                                }
                                whileTap={
                                  loadingIndex === cluster.feature
                                    ? {}
                                    : { scale: 0.95 }
                                }
                              >
                                {loadingIndex === cluster.feature ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <TrendingUp className="w-3 h-3" />
                                    <span>Encode</span>
                                  </>
                                )}
                              </motion.button>

                              {weightData[index] && (
                                <motion.button
                                  onClick={() => toggleSection(index)}
                                  className="h-8 w-8 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  {expandedSections[index] ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </motion.button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Sub-parameters section */}
                    {weightData[index] &&
                      checkedState[index] &&
                      expandedSections[index] && (
                        <tr>
                          <td
                            colSpan="4"
                            className="py-0 px-0 border-b border-gray-200 dark:border-gray-700"
                          >
                            <AnimatePresence>
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3"
                              >
                                <div className="mb-2 flex items-center justify-between">
                                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Sub-parameters
                                  </h3>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    Select parameters to adjust
                                  </span>
                                </div>
                                <table className="w-full border-collapse">
                                  <thead>
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                                        Select
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                                        Feature
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                                        Modify To
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {weightData[index].map((item, idx) => {
                                      const isChecked =
                                        childCheckedState[index]?.[idx] ||
                                        false;
                                      return (
                                        <motion.tr
                                          key={idx}
                                          className="hover:bg-gray-100 dark:hover:bg-gray-700/30"
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: idx * 0.05 }}
                                        >
                                          <td className="px-4 py-2">
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() =>
                                                handleChildCheckboxChange(
                                                  index,
                                                  idx
                                                )
                                              }
                                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-indigo-400"
                                              disabled={isLoading}
                                            />
                                          </td>
                                          <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                                            {item.feature || "-"}
                                          </td>
                                          <td className="px-4 py-2">
                                            <input
                                              className={`border rounded px-3 py-1.5 w-full max-w-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 ${
                                                !isChecked
                                                  ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                                                  : ""
                                              }`}
                                              disabled={!isChecked || isLoading}
                                              value={
                                                adjustments[item.feature] || ""
                                              }
                                              onChange={(e) =>
                                                handleChildInputChange(
                                                  index,
                                                  idx,
                                                  item.feature,
                                                  e.target.value
                                                )
                                              }
                                              placeholder="New value"
                                            />
                                          </td>
                                        </motion.tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </motion.div>
                            </AnimatePresence>
                          </td>
                        </tr>
                      )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Configuration Section */}
        <motion.div
          variants={itemVariants}
          className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            Time Series Configuration
          </h2>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Number of Months to Predict
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={noOfMonths}
                onChange={(e) => setNoOfMonths(e.target.value)}
                className="border rounded px-3 py-2 w-full text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
                disabled={isLoading}
              />
            </div>
          </div>
        </motion.div>

        {/* Status Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400"
            >
              <div className="flex items-center">
                <Info className="h-5 w-5 mr-2 flex-shrink-0" />
                <p>{error}</p>
              </div>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 text-green-700 dark:text-green-400"
            >
              <div className="flex items-center">
                <Check className="h-5 w-5 mr-2 flex-shrink-0" />
                <p>{success}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Button */}
        <motion.div variants={itemVariants} className="flex justify-end">
          <motion.button
            onClick={handleActionClick}
            disabled={isLoading}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
              isLoading
                ? "bg-indigo-400 dark:bg-indigo-600 text-white cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700"
            }`}
            whileHover={isLoading ? {} : { scale: 1.05 }}
            whileTap={isLoading ? {} : { scale: 0.95 }}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <TrendingUp className="h-5 w-5" />
                <span>Generate Projection</span>
              </>
            )}
          </motion.button>
        </motion.div>
      </div>

      {/* Plot Popup */}
      <AnimatePresence>
        {isPopupVisible && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePopup}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-5xl mx-4 overflow-hidden"
              variants={popupVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                  Time Series Projection
                </h2>
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={() => {
                      navigate(`/${com_id}/projects/${project_id}/projection`, {
                        state: {
                          timeSeriesFigure: {
                            plotly_figure: JSON.stringify({
                              data: plotData,
                              layout: plotLayout,
                            }),
                          },
                        },
                      });
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Download className="h-4 w-4" />
                  </motion.button>
                  <motion.button
                    onClick={closePopup}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full p-1"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>
              <div className="p-4">
                <Plot
                  data={plotData}
                  layout={{
                    ...plotLayout,
                    autosize: true,
                    width: undefined,
                    height: undefined,
                  }}
                  config={{ responsive: true }}
                  style={{ width: "100%", height: "100%", minHeight: "500px" }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Workbench;
