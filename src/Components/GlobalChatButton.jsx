import React, { useState } from "react";
import { FaRobot } from "react-icons/fa";
import { motion } from "framer-motion";
import ChatBot from "./ChatBot";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";

const GlobalChatButton = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { project_id } = useParams();

  // Get project state from Redux
  const project = useSelector((state) =>
    state.projects.find(
      (project) =>
        project.projectId === project_id || project.project_id === project_id
    )
  );

  // Determine if advanced mode is available
  const hasClusters = project?.clusters !== null;
  const currentMode = hasClusters ? "advanced" : "basic";

  return (
    <>
      <motion.button
        onClick={() => setIsChatOpen(true)}
        className={`fixed bottom-6 right-6 p-4 rounded-full shadow-lg flex items-center space-x-2 ${
          hasClusters
            ? "bg-purple-600 hover:bg-purple-700"
            : "bg-indigo-600 hover:bg-indigo-700"
        } text-white transition-colors`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <FaRobot className="text-xl" />
        <span className="font-medium">
          {hasClusters ? "Advanced AI" : "Basic AI"}
        </span>
      </motion.button>

      <ChatBot
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        projectId={project_id}
        mode={currentMode}
      />
    </>
  );
};

export default GlobalChatButton;
