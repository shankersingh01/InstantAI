import React, { useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, Settings, ChevronLeft, FileText } from "lucide-react";
import Select from "react-select";

const DUMMY_COLUMNS = [
  {
    id: 1,
    name: "customer_id",
    type: "string",
    description: "Unique identifier for each customer",
  },
  {
    id: 2,
    name: "transaction_date",
    type: "date",
    description: "Date of transaction",
  },
  { id: 3, name: "amount", type: "numeric", description: "Transaction amount" },
  {
    id: 4,
    name: "product_category",
    type: "categorical",
    description: "Category of product",
  },
];

export default function Tracking() {
  const navigate = useNavigate();
  const { project_id, com_id } = useParams();
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const [validated, setValidated] = useState(false);
  const [columns, setColumns] = useState(DUMMY_COLUMNS);
  const [newDroppedColumns, setNewDroppedColumns] = useState([]);
  const [selectedKpi, setSelectedKpi] = useState([]);
  const [selectedImportant, setSelectedImportant] = useState([]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
        setUploadError("");
      }
    }
  };
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        setUploadError("");
      }
    }
  };
  const validateFile = (file) => {
    const validTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (!validTypes.includes(file.type)) {
      setUploadError("Please upload a CSV or Excel file");
      return false;
    }
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setUploadError("File size should not exceed 10MB");
      return false;
    }
    return true;
  };
  const handleRemoveFile = () => {
    setFile(null);
    setValidated(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setUploadError("Please select a file to upload");
      return;
    }
    setLoading(true);
    setUploadError("");
    setTimeout(() => {
      setValidated(true);
      setLoading(false);
    }, 1000); // Simulate validation
  };

  // Settings selectors
  const selectOptions = columns.map((col) => ({
    value: col.id,
    label: col.name,
  }));

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-[calc(100vh-64px)]">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3">
            <motion.button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </motion.button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Tracking
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Upload and validate your tracking file, then configure columns.
              </p>
            </div>
          </div>
        </motion.div>
        {/* Upload Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden mb-8">
          <div className="p-6">
            {uploadError && (
              <motion.div
                className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 flex items-start"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <span className="text-red-500 mr-3 mt-0.5">!</span>
                <div>
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-400">
                    Error
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {uploadError}
                  </p>
                </div>
              </motion.div>
            )}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                  : "border-gray-300 bg-gray-50 dark:bg-gray-700/20"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() =>
                fileInputRef.current && fileInputRef.current.click()
              }
            >
              {file ? (
                <div className="flex flex-col items-center">
                  <FileText className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mb-2" />
                  <span className="text-gray-700 dark:text-gray-200 font-medium mb-1">
                    {file.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile();
                    }}
                    className="mt-2 px-3 py-1 text-xs bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/40"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="mb-4 p-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
                    <Upload className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {isDragging
                      ? "Drop your file here"
                      : "Drag & Drop your file here"}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    or click to browse from your computer
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Supported formats: CSV, Excel (.xls, .xlsx)
                  </p>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv,.xls,.xlsx"
                className="hidden"
              />
            </div>
            <button
              onClick={handleFileUpload}
              disabled={!file || loading}
              className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Validating..." : "Upload & Validate"}
            </button>
          </div>
        </div>
        {/* Settings Section */}
        {validated && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
              Tracking Settings
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Drop Columns
              </label>
              <Select
                isMulti
                options={selectOptions}
                value={selectOptions.filter((opt) =>
                  newDroppedColumns.includes(opt.value)
                )}
                onChange={(selected) =>
                  setNewDroppedColumns(selected.map((s) => s.value))
                }
                className="react-select-container"
                classNamePrefix="react-select"
                placeholder="Select columns to drop"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                KPI Columns
              </label>
              <Select
                isMulti
                options={selectOptions}
                value={selectOptions.filter((opt) =>
                  selectedKpi.includes(opt.value)
                )}
                onChange={(selected) =>
                  setSelectedKpi(selected.map((s) => s.value))
                }
                className="react-select-container"
                classNamePrefix="react-select"
                placeholder="Select KPI columns"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Important Columns
              </label>
              <Select
                isMulti
                options={selectOptions}
                value={selectOptions.filter((opt) =>
                  selectedImportant.includes(opt.value)
                )}
                onChange={(selected) =>
                  setSelectedImportant(selected.map((s) => s.value))
                }
                className="react-select-container"
                classNamePrefix="react-select"
                placeholder="Select important columns"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
