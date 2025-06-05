"use client";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, BarChart2 } from "lucide-react";

const ClusterDropdown = ({
  groupedClusters,
  feature,
  clusterIndex,
  handleCellClick,
  analysis,
  toggleDropdown,
}) => {
  // Animation variants
  const dropdownVariants = {
    hidden: { opacity: 0, y: -5 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -5 },
    visible: { opacity: 1, x: 0 },
  };

  // Use the passed analysis prop for top1, top2, least
  let top1 = null,
    top2 = null,
    least = null;
  if (analysis && analysis.top_categories) {
    top1 = analysis.top_categories[0];
    top2 = analysis.top_categories[1];
  }
  if (
    analysis &&
    analysis.bottom_categories &&
    analysis.bottom_categories.length > 0
  ) {
    least = analysis.bottom_categories[analysis.bottom_categories.length - 1];
  }

  return (
    <motion.div
      variants={dropdownVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      className="z-10 mx-auto mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-md p-2"
    >
      <motion.div className="space-y-2" variants={itemVariants}>
        {/* Top 1 Value */}
        <div
          className="cursor-pointer p-2 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center gap-2"
          onClick={(e) => {
            e.stopPropagation();
            handleCellClick(
              feature,
              clusterIndex,
              top1 ? `${top1.category} - ${top1.percentage}` : "N/A"
            );
            if (typeof toggleDropdown === "function")
              toggleDropdown(e, feature, clusterIndex);
          }}
        >
          <TrendingUp className="h-4 w-4 text-green-500 dark:text-green-400 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-800 dark:text-gray-200">
                Top 1 Value:
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {top1 ? top1.category : "N/A"}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {top1 ? `${top1.percentage}%` : "N/A"}
            </div>
          </div>
        </div>

        {/* Top 2 Value */}
        <div
          className="cursor-pointer p-2 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center gap-2"
          onClick={(e) => {
            e.stopPropagation();
            handleCellClick(
              feature,
              clusterIndex,
              top2 ? `${top2.category} - ${top2.percentage}` : "N/A"
            );
            if (typeof toggleDropdown === "function")
              toggleDropdown(e, feature, clusterIndex);
          }}
        >
          <BarChart2 className="h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-800 dark:text-gray-200">
                Top 2 Value:
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {top2 ? top2.category : "N/A"}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {top2 ? `${top2.percentage}%` : "N/A"}
            </div>
          </div>
        </div>

        {/* Least Value */}
        <div
          className="cursor-pointer p-2 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center gap-2"
          onClick={(e) => {
            e.stopPropagation();
            handleCellClick(
              feature,
              clusterIndex,
              least ? `${least.category} - ${least.percentage}` : "N/A"
            );
            if (typeof toggleDropdown === "function")
              toggleDropdown(e, feature, clusterIndex);
          }}
        >
          <TrendingDown className="h-4 w-4 text-red-500 dark:text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-800 dark:text-gray-200">
                Least Value:
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {least ? least.category : "N/A"}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {least ? `${least.percentage}%` : "N/A"}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ClusterDropdown;
