"use client";
import { Clock, Layers, Target } from "lucide-react";
import { motion } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";

const ClusterHistorySection = ({
  journey,
  currentSelectionIndex,
  onSegmentClick,
}) => {
  return (
    <div className="w-full h-full bg-white dark:bg-gray-800 overflow-y-auto">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <Clock className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
          Segment History
        </h3>
      </div>
      <div className="p-4">
        {journey.length > 0 ? (
          <motion.div className="space-y-2" initial="hidden" animate="visible">
            {journey.map((item, index) => (
              <motion.div
                key={index}
                onClick={() =>
                  onSegmentClick(
                    journey.slice(0, index + 1).map((j) => j.clusterIndex)
                  )
                }
                className={`p-4 rounded-lg cursor-pointer transition-all ${
                  index === currentSelectionIndex
                    ? "bg-indigo-100 dark:bg-indigo-900/30 border-l-4 border-indigo-500 dark:border-indigo-400"
                    : "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm"
                }`}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-indigo-600 dark:text-indigo-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-gray-700 dark:text-gray-200">
                        Segment {item.clusterIndex + 1}
                      </span>
                      <span className="text-xs text-gray-500">
                        Level: {index + 1}
                      </span>
                      {item.feature && (
                        <span className="text-xs text-gray-500">
                          Parameter:{" "}
                          <span className="font-medium text-gray-700 dark:text-gray-200">
                            {item.feature}
                          </span>
                        </span>
                      )}
                      {item.value !== undefined && (
                        <span className="text-xs text-gray-500">
                          Value:{" "}
                          <span className="font-medium text-gray-700 dark:text-gray-200">
                            {item.value}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h4 className="text-gray-700 dark:text-gray-300 font-medium mb-2">
              No History Yet
            </h4>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs">
              Select a segment and click "Analyze" to start building your
              analysis history.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClusterHistorySection;
