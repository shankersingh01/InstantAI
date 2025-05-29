import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiSend,
  FiX,
  FiRefreshCw,
  FiAlertCircle,
  FiMinimize2,
  FiMaximize2,
} from "react-icons/fi";
import { useParams } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FaRobot } from "react-icons/fa";
import { X } from "lucide-react";

const ChatBot = ({
  isOpen,
  onClose,
  projectId,
  mode = "basic",
  fullPage = false,
}) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);
  const { project_id } = useParams();

  // Mode-specific configurations
  const modeConfig = {
    basic: {
      title: "Basic AI Assistant",
      description: "Ask questions about your uploaded dataset",
      placeholder: "Ask questions about your data...",
      icon: <FaRobot className="text-xl" />,
    },
    advanced: {
      title: "Advanced AI Assistant",
      description: "Ask questions about your clusters and segments",
      placeholder: "Ask questions about your clusters and segments...",
      icon: <FaRobot className="text-xl text-purple-500" />,
    },
  };

  const currentMode = modeConfig[mode];

  // Reset state when component mounts or key changes
  useEffect(() => {
    setMessages([]);
    setInput("");
    setIsLoading(false);
    setIsTyping(false);
    setError(null);
    setIsMinimized(false);
  }, [project_id]); // Reset when project_id changes

  // Add welcome message when chat is first opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          type: "bot",
          content: `👋 Welcome to your AI Assistant! I'm here to help you analyze and understand your data. You can ask me questions like:

• "What are the key insights from this dataset?"
• "Show me a summary of the data"
• "What are the correlations between variables?"
• "Generate a visualization of [specific data]"
• "Explain the trends in [specific column]"

Feel free to ask any questions about your data, and I'll help you make sense of it!`,
          timestamp: new Date().toISOString(),
          status: "sent",
        },
      ]);
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      fetchChatHistory();
      // Load messages from localStorage
      const savedMessages = localStorage.getItem(`chat_messages_${project_id}`);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
    }
  }, [project_id, isOpen]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(
        `chat_messages_${project_id}`,
        JSON.stringify(messages)
      );
    }
  }, [messages, project_id]);

  const fetchChatHistory = async () => {
    try {
      const response = await axiosInstance.get(
        `/projects/${project_id}/chat_history`
      );
      if (response.data && response.data.chat_history) {
        setMessages(response.data.chat_history);
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        // No chat history yet, not an error
        setMessages([]);
        setError(null);
      } else {
        console.error("Error fetching chat history:", error);
        setError(
          error.response?.data?.detail ||
            error.message ||
            "Failed to load chat history. Please try again."
        );
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage = {
      type: "user",
      content: input,
      timestamp: new Date().toISOString(),
      status: "sent",
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setIsLoading(true);
    setIsTyping(true);
    setError(null);

    try {
      const response = await axiosInstance.post(
        `/projects/${project_id}/chat`,
        {
          query: input,
        }
      );

      // Check if response has the expected structure
      if (!response.data) {
        throw new Error("No response data received");
      }

      const botMessage = {
        type: "bot",
        content:
          typeof response.data === "string"
            ? response.data
            : response.data.response || JSON.stringify(response.data),
        timestamp: new Date().toISOString(),
        status: "sent",
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      let errorMessage = "Sorry, I encountered an error. Please try again.";

      if (error.response?.status === 404) {
        errorMessage =
          "The chat endpoint is not available. Please check your connection.";
      } else if (error.response?.data?.detail?.includes("Invalid API key")) {
        errorMessage =
          "There's an issue with the API configuration. Please contact support.";
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }

      const errorMessageObj = {
        type: "error",
        content: errorMessage,
        timestamp: new Date().toISOString(),
        status: "error",
        originalMessage: newMessage,
      };
      setMessages((prev) => [...prev, errorMessageObj]);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleRetry = async (errorMessage) => {
    if (!errorMessage.originalMessage) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.post(
        `/projects/${project_id}/chat`,
        {
          query: errorMessage.originalMessage.content,
        }
      );

      if (!response.data) {
        throw new Error("No response data received");
      }

      const botMessage = {
        type: "bot",
        content:
          typeof response.data === "string"
            ? response.data
            : response.data.response || JSON.stringify(response.data),
        timestamp: new Date().toISOString(),
        status: "sent",
      };

      // Remove the error message and add the new response
      setMessages((prev) =>
        prev.filter((msg) => msg !== errorMessage).concat(botMessage)
      );
    } catch (error) {
      console.error("Error retrying message:", error);
      setError(
        error.response?.data?.detail ||
          error.message ||
          "Failed to retry message. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (message) => {
    const isCodeBlock = (content) => {
      return content.includes("```") || content.includes("`");
    };

    const isBase64Image = (content) => {
      try {
        const json = JSON.parse(content);
        return (
          json.type === "image" &&
          json.value &&
          json.value.startsWith("data:image")
        );
      } catch {
        return false;
      }
    };

    const isRawBase64Image = (content) => {
      return (
        typeof content === "string" &&
        content.length > 1000 &&
        /^[A-Za-z0-9+/=]+$/.test(content.slice(0, 1000))
      );
    };

    const isDataFrame = (content) => {
      try {
        const json = JSON.parse(content);
        return json.type === "dataframe" && Array.isArray(json.value);
      } catch {
        return false;
      }
    };

    if (message.type === "error") {
      return (
        <div className="flex items-center space-x-2">
          <FiAlertCircle className="text-red-500" />
          <p className="text-red-500">{message.content}</p>
          <button
            onClick={() => handleRetry(message)}
            className="text-blue-500 hover:text-blue-700"
            title="Retry message"
          >
            <FiRefreshCw />
          </button>
        </div>
      );
    }

    if (message.type === "bot") {
      // Standalone image rendering (not in bubble)
      if (isBase64Image(message.content)) {
        return (
          <div className="flex justify-center my-4">
            <img
              src={JSON.parse(message.content).value}
              alt="Generated visualization"
              className="max-w-full max-h-96 rounded-lg shadow-md border"
              style={{ background: "white" }}
            />
          </div>
        );
      } else if (isRawBase64Image(message.content)) {
        return (
          <div className="flex justify-center my-4">
            <img
              src={`data:image/png;base64,${message.content}`}
              alt="Generated visualization"
              className="max-w-full max-h-96 rounded-lg shadow-md border"
              style={{ background: "white" }}
            />
          </div>
        );
      }
      // All other bot messages remain in bubble
      return (
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            <FaRobot className="text-blue-600 text-xl" />
          </div>
          <div className="flex-1">
            {isDataFrame(message.content) ? (
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(
                        JSON.parse(message.content).value[0] || {}
                      ).map((header) => (
                        <th
                          key={header}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {JSON.parse(message.content).value.map((row, idx) => (
                      <tr key={idx}>
                        {Object.values(row).map((cell, cellIdx) => (
                          <td
                            key={cellIdx}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                          >
                            {cell === null ? "N/A" : cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : isCodeBlock(message.content) ? (
              <ReactMarkdown
                components={{
                  code({ inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
        </div>
      );
    }

    // User and other messages remain in bubble
    return <p className="text-sm">{message.content}</p>;
  };

  if (fullPage) {
    // Render as a normal block, not modal
    return (
      <div className="flex flex-col h-full min-h-[60vh]">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          {currentMode.icon}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentMode.title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {currentMode.description}
            </p>
          </div>
        </div>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.type === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                }`}
              >
                {renderMessage(message)}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={currentMode.placeholder}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? "block" : "hidden"}`}>
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      ></div>
      <div className="absolute right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {currentMode.icon}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {currentMode.title}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {currentMode.description}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.type === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.type === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                  }`}
                >
                  {renderMessage(message)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={currentMode.placeholder}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

ChatBot.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  projectId: PropTypes.string.isRequired,
  mode: PropTypes.string,
  fullPage: PropTypes.bool,
};

export default ChatBot;
