"use client";

import React, { useState, useEffect } from "react";
import Plot from "react-plotly.js";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Download, Save, Loader2 } from "lucide-react";
import axios from "axios";

function base64ToFloatArray(bdata) {
  // Decode base64 to ArrayBuffer
  const binary = atob(bdata);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  // Float64Array for dtype 'f8'
  return Array.from(new Float64Array(bytes.buffer));
}

const Projection = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { project_id, com_id } = useParams();
  const [plotData, setPlotData] = useState(null);
  const [plotLayout, setPlotLayout] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const baseUrl = import.meta.env.VITE_BASE_URL;

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

  useEffect(() => {
    if (!location.state || !location.state.plotlyGraph) {
      setError("No graph data available.");
      setIsLoading(false);
      return;
    }
    try {
      const graph = location.state.plotlyGraph;
      // Deep copy to avoid mutating original
      const data = JSON.parse(JSON.stringify(graph.data));
      // Decode y arrays if needed
      data.forEach((trace) => {
        if (trace.y && typeof trace.y === "object" && trace.y.bdata) {
          trace.y = base64ToFloatArray(trace.y.bdata);
        }
      });
      setPlotData(data);
      setPlotLayout(graph.layout);
      setIsLoading(false);
    } catch (err) {
      setError("Failed to process graph data.");
      setIsLoading(false);
    }
  }, [location.state]);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setError("");
      setSuccess("");

      const response = await axios.post(`${baseUrl}/save-forecast/`, {
        project_id: project_id,
        plot_data: plotData,
      });

      if (response.data) {
        setSuccess("Forecast saved successfully!");
      }
    } catch (error) {
      console.error("Error saving forecast:", error);
      setError(
        error.response?.data?.message ||
          "Failed to save forecast. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Loading forecast...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600">
        {error}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
    >
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <motion.button
              onClick={() =>
                navigate(`/${com_id}/projects/${project_id}/workbench`)
              }
              className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </motion.button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Time Series Forecast
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <motion.button
              onClick={handleSave}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
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
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  <span>Save Forecast</span>
                </>
              )}
            </motion.button>
            <motion.button
              onClick={() => {
                // Download functionality can be added here
                console.log("Download clicked");
              }}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Download className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </motion.button>
          </div>
        </div>

        {/* Status Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400"
            >
              <p>{error}</p>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 text-green-700 dark:text-green-400"
            >
              <p>{success}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Plot */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <Plot
            data={plotData}
            layout={plotLayout}
            config={{
              responsive: true,
              displayModeBar: true,
              displaylogo: false,
              modeBarButtonsToAdd: [
                "drawline",
                "drawopenpath",
                "drawclosedpath",
                "drawcircle",
                "drawrect",
                "eraseshape",
              ],
              modeBarButtonsToRemove: ["lasso2d", "select2d"],
              scrollZoom: true,
            }}
            style={{ width: "100%", height: "600px" }}
            useResizeHandler={true}
          />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Projection;
