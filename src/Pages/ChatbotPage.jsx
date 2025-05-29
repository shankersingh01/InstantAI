import React from "react";
import ChatBot from "../Components/ChatBot";
import { useNavigate, useParams } from "react-router-dom";

const ChatbotPage = () => {
  const { project_id } = useParams();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-0 mt-10 flex flex-col h-[80vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h1 className="text-2xl font-bold text-indigo-700">
              Basic Chatbot
            </h1>
            <p className="text-gray-500 mt-1">
              Ask questions about your uploaded dataset
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="ml-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition"
          >
            Back
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ChatBot
            isOpen={true}
            onClose={() => {}}
            projectId={project_id}
            mode="basic"
            fullPage={true}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatbotPage;
