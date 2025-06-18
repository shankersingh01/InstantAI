"use client";

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  FolderOpen,
  AlertCircle,
  RefreshCw,
  Search,
  Edit,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import CreateProjModal from "../Components/CreateProjModal";
import Loader from "../Components/Loader";
import { createProject, restoreProjectState } from "../redux/projectsSlice";
import axiosInstance from "../utils/axiosInstance";
import { getAuthState } from "../utils/auth";

const Home = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", description: "" });
  const { com_id } = getAuthState();
  const projectsInStore = useSelector((state) => state.projects);
  const [searchTerm, setSearchTerm] = useState("");
  const hasFetched = useRef(false);

  // Add state for project actions
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [projectToModify, setProjectToModify] = useState(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const toastTimer = useRef(null);

  const [sortOption, setSortOption] = useState("created_desc");

  useEffect(() => {
    if (!com_id) {
      setError("Company ID is not set. Please log in again.");
      return;
    }

    // Only load projects if we haven't fetched them yet
    if (!hasFetched.current) {
      loadProjects();
      hasFetched.current = true;
    }
  }, [com_id]);

  useEffect(() => {
    if (showSuccess) {
      toastTimer.current = setTimeout(() => {
        setShowSuccess(false);
      }, 5000);
    }
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [showSuccess]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axiosInstance.get(`/${com_id}/projects/`);
      const fetchedProjects = response.data.projects || [];

      // Transform the projects to match the expected structure
      const transformedProjects = fetchedProjects.map((project) => ({
        project_id: project.project_id,
        name: project.name,
        description: project.description,
        com_id: com_id,
        data_uploaded: project.data_uploaded,
        created_at: project.created_at,
      }));

      // Update Redux store only for new projects
      transformedProjects.forEach((project) => {
        const projectExists = projectsInStore.some(
          (p) => p.projectId === project.project_id
        );

        if (!projectExists) {
          // Fetch complete project data for new projects
          const fetchProjectDetails = async () => {
            try {
              const projectResponse = await axiosInstance.get(
                `/${com_id}/projects/${project.project_id}`
              );
              if (projectResponse.data) {
                dispatch(
                  restoreProjectState({
                    projectId: project.project_id,
                    project_id: project.project_id,
                    columns: (projectResponse.data.total_columns || []).map(
                      (name, idx) => ({
                        id: idx + 1,
                        name,
                        type: "string",
                        description: name,
                      })
                    ),
                    importantColumnNames:
                      projectResponse.data.important_columns || [],
                    kpiList: projectResponse.data.kpi_columns || [],
                    droppedColumns: projectResponse.data.dropped_columns || [],
                    uploadedFileData:
                      projectResponse.data.uploadedFileData || [],
                    selectedKpi: projectResponse.data.selectedKpi || null,
                    data_uploaded: projectResponse.data.data_uploaded,
                    clusters: projectResponse.data.clusters || null,
                    currentStep: projectResponse.data.data_uploaded
                      ? "analysis"
                      : "configuration",
                    analysisComplete: !!projectResponse.data.clusters,
                  })
                );
              }
            } catch (error) {
              console.error(
                `Error fetching details for project ${project.project_id}:`,
                error
              );
            }
          };
          fetchProjectDetails();
        }
      });

      setProjects(transformedProjects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      setError("Failed to fetch projects. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleNewProject = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      if (!newProject.name.trim()) {
        throw new Error("Project name is required");
      }

      const response = await axiosInstance.post(`/${com_id}/projects/`, {
        name: newProject.name,
        description: newProject.description,
      });
      const projectId = response?.data?.project_id;

      if (!projectId) {
        throw new Error("Invalid project ID received from server");
      }

      localStorage.setItem("project_id", projectId);
      dispatch(
        createProject({
          projectId,
          columns: [],
          importantColumnNames: [],
          kpiList: [],
          droppedColumns: [],
          uploadedFileData: [],
          selectedKpi: null,
          data_uploaded: false,
        })
      );

      // Show success message
      setSuccessMessage("Project created successfully!");
      setShowSuccess(true);
      setShowModal(false);
      setNewProject({ name: "", description: "" });

      // Wait for animation to complete before navigating
      setTimeout(() => {
        navigate(`/${com_id}/projects/${projectId}/configuration`);
      }, 1500);
    } catch (error) {
      console.error("Error creating project:", error);
      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to create project"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProjectClick = async (projectId) => {
    try {
      if (!projectId) {
        throw new Error("Invalid project ID");
      }

      setLoading(true);
      setError(null);
      localStorage.setItem("project_id", projectId);

      // Always fetch full project details before navigation
      const projectResponse = await axiosInstance.get(
        `/${com_id}/projects/${projectId}`
      );
      if (projectResponse.data) {
        dispatch(
          restoreProjectState({
            projectId: projectId,
            project_id: projectId,
            columns: (projectResponse.data.total_columns || []).map(
              (name, idx) => ({
                id: idx + 1,
                name,
                type: "string",
                description: name,
              })
            ),
            importantColumnNames: projectResponse.data.important_columns || [],
            kpiList: projectResponse.data.kpi_columns || [],
            droppedColumns: projectResponse.data.dropped_columns || [],
            uploadedFileData: projectResponse.data.uploadedFileData || [],
            selectedKpi: projectResponse.data.selectedKpi || null,
            data_uploaded: projectResponse.data.data_uploaded,
            clusters: projectResponse.data.clusters || null,
            currentStep: projectResponse.data.data_uploaded
              ? "analysis"
              : "configuration",
            analysisComplete: !!projectResponse.data.clusters,
          })
        );
      }

      navigate(`/${com_id}/projects/${projectId}/configuration`);
    } catch (error) {
      console.error("Error navigating to project:", error);
      setError(error.message || "Failed to open project. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Sorting logic
  const sortedProjects = [...projects].sort((a, b) => {
    if (sortOption === "name_asc") return a.name.localeCompare(b.name);
    if (sortOption === "name_desc") return b.name.localeCompare(a.name);
    if (sortOption === "created_asc")
      return new Date(a.created_at) - new Date(b.created_at);
    // Default: created_desc
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // Filter projects based on search term
  const filteredProjects = sortedProjects.filter((project) =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
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

  const handleRenameProject = async () => {
    if (!projectToModify || !newProjectName.trim()) {
      console.warn("No project selected for rename.");
      return;
    }
    console.log("Renaming project with ID:", projectToModify.project_id);
    try {
      setLoading(true);
      setError(null);
      await axiosInstance.put(
        `/${com_id}/projects/${projectToModify.project_id}`,
        {
          name: newProjectName.trim(),
        }
      );
      setShowRenameModal(false);
      setSuccessMessage("Project renamed successfully!");
      setShowSuccess(true);
      setProjectToModify(null);
      setNewProjectName("");
      await loadProjects();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to rename project.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToModify) {
      console.warn("No project selected for delete.");
      return;
    }
    console.log("Deleting project with ID:", projectToModify.project_id);
    try {
      setLoading(true);
      setError(null);
      await axiosInstance.delete(
        `/${com_id}/projects/${projectToModify.project_id}`
      );
      setShowDeleteConfirm(false);
      setSuccessMessage("Project deleted successfully!");
      setShowSuccess(true);
      setProjectToModify(null);
      await loadProjects();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to delete project.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Projects
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and analyze your data projects
          </p>
        </div>
        <div className="flex flex-col sm:flex-row w-full md:w-auto items-center gap-3">
          <div className="flex flex-col sm:flex-row w-full gap-3 flex-1">
            <div className="relative w-full sm:w-48">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search projects"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="input w-56 px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
            >
              <option value="created_desc">Newest</option>
              <option value="created_asc">Oldest</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
            </select>
          </div>
          <motion.button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors duration-200 ml-0 sm:ml-8 mt-2 sm:mt-0"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="h-5 w-5" />
            <span>New Project</span>
          </motion.button>
        </div>
      </div>
      {/* Project List */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-lg bg-red-50 border-l-4 border-red-500 dark:bg-red-900/20 dark:border-red-500"
        >
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-400">
                {error}
              </p>
            </div>
            <motion.button
              onClick={loadProjects}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </motion.button>
          </div>
        </motion.div>
      )}
      {/* Project Cards Grid */}
      {loading ? (
        <Loader />
      ) : filteredProjects.length > 0 ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {filteredProjects.map((project) => (
            <motion.div
              key={project.project_id}
              variants={itemVariants}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="group"
            >
              <div className="h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer border border-gray-200 dark:border-gray-700">
                <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600 relative overflow-hidden">
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    initial={false}
                    whileHover={{ scale: 1.2, rotate: 15 }}
                  >
                    <FolderOpen className="h-20 w-20 text-white/20 group-hover:text-white/30 transition-colors" />
                  </motion.div>
                </div>
                <div className="p-6 flex flex-col gap-2">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {project.name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm truncate">
                    {project.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Created: {new Date(project.created_at).toLocaleString()}
                  </p>
                  <div className="flex justify-center gap-2 mt-3">
                    <motion.button
                      onClick={() => handleProjectClick(project.project_id)}
                      className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors duration-200"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Open
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        setProjectToModify(project);
                        setShowRenameModal(true);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Edit className="h-4 w-4" />
                      Rename
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        setProjectToModify(project);
                        setShowDeleteConfirm(true);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors duration-200"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="text-center text-gray-500 dark:text-gray-400 py-12">
          No projects found.
        </div>
      )}

      {showModal && (
        <CreateProjModal
          setNewProject={setNewProject}
          setShowModal={setShowModal}
          handleNewProject={handleNewProject}
          newProject={newProject}
          loading={loading}
        />
      )}

      {showRenameModal && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowRenameModal(false)}
        >
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              transition: { type: "spring", damping: 25, stiffness: 300 },
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Rename Project
              </h2>
              <motion.button
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowRenameModal(false)}
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRenameProject();
              }}
              className="p-6"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="input w-full"
                    placeholder="Enter new project name"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <motion.button
                  type="button"
                  onClick={() => setShowRenameModal(false)}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Rename Project
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {showDeleteConfirm && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              transition: { type: "spring", damping: 25, stiffness: 300 },
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Delete Project
              </h2>
              <motion.button
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowDeleteConfirm(false)}
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Confirm deletion
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Are you sure you want to delete{" "}
                    <span className="font-medium">{projectToModify?.name}</span>
                    ? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <motion.button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="button"
                  onClick={handleDeleteProject}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Delete Project
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            className="fixed top-4 right-4 z-50"
          >
            <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>{successMessage}</span>
            </div>
            <button
              className="ml-2 text-white/80 hover:text-white"
              onClick={() => {
                setShowSuccess(false);
                if (toastTimer.current) clearTimeout(toastTimer.current);
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Home;
