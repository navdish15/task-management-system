import React, { useEffect, useState, useRef } from "react";
import socket from "../../services/socket";
import api from "../../services/api";
import { jwtDecode } from "jwt-decode";
import "./FloatingChat.css";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const FloatingChat = ({ currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState("list");

  const [users, setUsers] = useState([]);
  const [projectChats, setProjectChats] = useState([]);

  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  const chatIdRef = useRef(null);

  const [messages, setMessages] = useState([]);

  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const [editingMessageId, setEditingMessageId] = useState(null);

  const [contextMenu, setContextMenu] = useState(null);
  const [menuMessage, setMenuMessage] = useState(null);

  const [headerMenu, setHeaderMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);

  /* ================= SAFE LOCAL STORAGE ================= */
  let storedUser = null;
  try {
    storedUser = JSON.parse(localStorage.getItem("user"));
  } catch {
    console.error("Invalid localStorage user");
  }

  /* ================= SAFE JWT ================= */
  let decodedUser = null;
  try {
    decodedUser = storedUser?.token ? jwtDecode(storedUser.token) : null;
  } catch {
    console.error("Invalid token");
  }

  const displayName =
    selectedUser?.name ||
    selectedUser?.username ||
    selectedProject?.project_name ||
    "";

  const firstLetter = displayName ? displayName.charAt(0).toUpperCase() : "";

  /* ================= AUTO SCROLL ================= */
  useEffect(() => {
    if (!editingMessageId) {
      messagesEndRef.current?.scrollIntoView({
        behavior: messages.length < 5 ? "auto" : "smooth",
      });
    }
  }, [messages, editingMessageId]);

  /* ================= SOCKET LISTENER ================= */
  useEffect(() => {
    const handler = (msg) => {
      if (msg.chatId !== chatIdRef.current) return;

      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    socket.on("receive_message", handler);

    return () => socket.off("receive_message", handler);
  }, []);

  /* ================= CLEANUP ON UNMOUNT ================= */
  useEffect(() => {
    return () => {
      if (chatIdRef.current) {
        socket.emit("leave_chat", chatIdRef.current);
      }
    };
  }, []);

  /* ================= CLOSE MENUS ================= */
  useEffect(() => {
    const handleClick = () => {
      setHeaderMenu(false);
      setContextMenu(null);
    };

    const handleScroll = () => setContextMenu(null);

    window.addEventListener("click", handleClick);
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  /* ================= LOAD USERS ================= */
  useEffect(() => {
    if (!isOpen || !currentUser) return;

    const loadData = async () => {
      try {
        const [usersRes, projectsRes] = await Promise.all([
          api.get("/chat/users"),
          api.get("/chat/projects"),
        ]);

        const filtered =
          currentUser.role === "admin"
            ? usersRes.data.filter((u) => u.role === "employee")
            : usersRes.data.filter((u) => u.role === "admin");

        setUsers(filtered);
        setProjectChats(projectsRes.data);
      } catch (error) {
        console.error("Chat load error:", error);
      }
    };

    loadData();
  }, [isOpen, currentUser]);

  /* ================= SWITCH CHAT ================= */
  const switchChat = async (id) => {
    try {
      setLoading(true);
      setMessages([]);

      if (chatIdRef.current) {
        socket.emit("leave_chat", chatIdRef.current);
      }

      chatIdRef.current = id;

      socket.emit("join_chat", id);

      const messagesRes = await api.get(`/chat/messages/${id}`);

      if (chatIdRef.current === id) {
        setMessages(messagesRes.data);
      }
    } catch (error) {
      console.error("Chat switch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const openPrivateChat = async (user) => {
    setSelectedUser(user);
    setSelectedProject(null);
    setView("chat");

    try {
      const res = await api.post("/chat/private", {
        receiverId: user.id,
      });

      await switchChat(res.data.chatId);
    } catch (error) {
      console.error("Private chat error:", error);
    }
  };

  const openProjectChat = async (project) => {
    setSelectedProject(project);
    setSelectedUser(null);
    setView("chat");

    await switchChat(project.chat_id);
  };

  /* ================= SEND MESSAGE ================= */
  const handleSend = async () => {
    if (!chatIdRef.current || !decodedUser || sending) return;
    if (!newMessage.trim() && !selectedFile) return;

    setSending(true);

    let file_url = null;
    let file_name = null;

    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadRes = await api.post("/chat/upload", formData);
        file_url = uploadRes.data.fileUrl;
        file_name = uploadRes.data.fileName;
      }

      if (editingMessageId) {
        await api.put(`/chat/message/${editingMessageId}`, {
          message: newMessage,
        });

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === editingMessageId ? { ...msg, message: newMessage } : msg,
          ),
        );

        setEditingMessageId(null);
      } else {
        socket.emit("send_message", {
          chatId: chatIdRef.current,
          senderId: decodedUser.id,
          message: newMessage || null,
          file_url,
          file_name,
        });
      }

      setNewMessage("");
      setSelectedFile(null);
    } catch (error) {
      console.error("Send failed:", error);
    } finally {
      setSending(false);
    }
  };

  /* ================= FILE VALIDATION ================= */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];

    if (!allowedTypes.includes(file.type)) {
      alert("Only JPG, PNG or PDF allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File too large (max 5MB)");
      return;
    }

    setSelectedFile(file);
  };

  /* ================= CONTEXT MENU ================= */
  const openContextMenu = (e, msg) => {
    if (msg.sender_id !== decodedUser?.id) return;

    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();

    const isSent = msg.sender_id === decodedUser?.id;

    const x = isSent
      ? Math.max(10, rect.left - 170)
      : Math.min(window.innerWidth - 180, rect.right + 10);

    const y = Math.max(10, rect.top);

    setMenuMessage(msg);
    setContextMenu({ x, y });
  };

  const editMessage = () => {
    if (!menuMessage) return;
    setEditingMessageId(menuMessage.id);
    setNewMessage(menuMessage.message);
    setContextMenu(null);
  };

  const deleteMessage = async () => {
    if (!menuMessage) return;

    try {
      await api.delete(`/chat/message/${menuMessage.id}`);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === menuMessage.id
            ? { ...msg, message: "You deleted this message" }
            : msg,
        ),
      );
    } catch (error) {
      console.error("Delete failed:", error);
    }

    setContextMenu(null);
  };

  return (
    <>
      <div
        className="floatingButton"
        onClick={() => {
          setIsOpen(!isOpen);
          setView("list");
        }}
      >
        💬
      </div>

      {isOpen && (
        <div className="chatContainer">
          {view === "list" && (
            <div className="userListView">
              <div className="chatHeader listHeader">Chats</div>

              <div className="userList">
                {projectChats.map((p) => (
                  <div
                    key={p.chat_id}
                    className="userItem"
                    onClick={() => openProjectChat(p)}
                  >
                    <div className="avatar">📁</div>
                    <span>{p.project_name}</span>
                  </div>
                ))}

                {users.map((u) => (
                  <div
                    key={u.id}
                    className="userItem"
                    onClick={() => openPrivateChat(u)}
                  >
                    <div className="avatar">
                      {(u.name || u.username)[0].toUpperCase()}
                    </div>
                    <span>{u.name || u.username}</span>
                  </div>
                ))}

                {users.length === 0 && projectChats.length === 0 && (
                  <div className="emptyState">No chats available</div>
                )}
              </div>
            </div>
          )}

          {view === "chat" && (
            <div className="chatView">
              <div className="chatHeader">
                <button className="backBtn" onClick={() => setView("list")}>
                  ←
                </button>

                <div className="headerAvatar">{firstLetter}</div>
                <div className="chatTitle">{displayName}</div>

                <div className="headerMenu">
                  <button
                    className="menuBtn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setHeaderMenu(!headerMenu);
                    }}
                  >
                    ⋮
                  </button>

                  {headerMenu && (
                    <div className="headerDropdown">
                      <button onClick={() => setMessages([])}>
                        Clear Chat
                      </button>
                      <button onClick={() => setView("list")}>
                        Close Chat
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="messages">
                {loading && <div className="loading">Loading...</div>}

                {messages.length === 0 && !loading && (
                  <div className="emptyChat">No messages yet</div>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.id ?? `${msg.sender_id}-${msg.created_at}`}
                    className={`messageRow ${
                      msg.sender_id === decodedUser?.id ? "sent" : "received"
                    }`}
                  >
                    <div
                      className="messageBubble"
                      onContextMenu={(e) => openContextMenu(e, msg)}
                    >
                      {/* ✅ PRO MAX MESSAGE UI */}
                      <div>
                        {msg.message}

                        <div className="messageMeta">
                          <span>
                            {msg.created_at
                              ? new Date(msg.created_at).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: false, // 👈 removes AM/PM
                                  },
                                )
                              : ""}
                          </span>

                          {msg.sender_id === decodedUser?.id && (
                            <span
                              className={`tick ${
                                msg.seen
                                  ? "seen"
                                  : msg.delivered
                                    ? "delivered"
                                    : "sent"
                              }`}
                            ></span>
                          )}
                        </div>
                      </div>

                      {/* FILE */}
                      {msg.file_url && (
                        <div className="fileCard">
                          {msg.file_url.match(/\.(jpg|jpeg|png)$/i) ? (
                            <img
                              src={`${BASE_URL}${msg.file_url}`}
                              alt="attachment"
                              className="chatImage"
                            />
                          ) : (
                            <a
                              href={`${BASE_URL}${msg.file_url}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {msg.file_name}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div ref={messagesEndRef}></div>
              </div>

              <div className="inputWrapper">
                {selectedFile && (
                  <div className="filePreview">
                    📎 {selectedFile.name}
                    <span
                      className="removeFile"
                      onClick={() => setSelectedFile(null)}
                    >
                      ✕
                    </span>
                  </div>
                )}

                <div className="inputContainer">
                  <label htmlFor="fileUpload" className="attachBtn">
                    📎
                  </label>

                  <input
                    type="file"
                    id="fileUpload"
                    hidden
                    onChange={handleFileChange}
                  />

                  <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newMessage.trim()) {
                        handleSend();
                      }
                    }}
                    placeholder="Type message..."
                  />

                  <button
                    onClick={handleSend}
                    disabled={(!newMessage.trim() && !selectedFile) || sending}
                  >
                    {sending
                      ? "Sending..."
                      : editingMessageId
                        ? "Update"
                        : "Send"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {contextMenu && (
        <div
          className="messageMenu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button onClick={editMessage}>✏ Edit</button>
          <button onClick={deleteMessage}>🗑 Delete</button>
        </div>
      )}
    </>
  );
};

export default FloatingChat;
