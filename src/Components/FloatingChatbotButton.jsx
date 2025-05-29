import React from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FaRobot } from "react-icons/fa";

const FloatingChatbotButton = () => {
  const { project_id, com_id } = useParams();
  const navigate = useNavigate();
  const project = useSelector((state) =>
    state.projects.find(
      (project) =>
        project.projectId === project_id || project.project_id === project_id
    )
  );

  if (!project || !project.data_uploaded) return null;

  return (
    <motion.button
      onClick={() => navigate(`/${com_id}/projects/${project_id}/chatbot`)}
      className="fixed bottom-6 right-6 p-4 rounded-full shadow-lg flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white z-50"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <FaRobot className="text-xl" />
      <span className="font-medium">Chatbot</span>
    </motion.button>
  );
};

export default FloatingChatbotButton;
