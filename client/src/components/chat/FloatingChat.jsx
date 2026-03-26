import React, { useEffect, useState, useRef } from "react";
import socket from "../../services/socket";
import api from "../../services/api";
import { jwtDecode } from "jwt-decode";
import "./FloatingChat.css";

const FloatingChat = ({ currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState("list");

  const [users, setUsers] = useState([]);
  const [projectChats, setProjectChats] = useState([]);

  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);

  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const [editingMessageId, setEditingMessageId] = useState(null);

  const [contextMenu, setContextMenu] = useState(null);
  const [menuMessage, setMenuMessage] = useState(null);

  const [headerMenu, setHeaderMenu] = useState(false);

  const messagesEndRef = useRef(null);

  const storedUser = JSON.parse(localStorage.getItem("user"));
  const decodedUser = storedUser?.token ? jwtDecode(storedUser.token) : null;

  const displayName =
    selectedUser?.name ||
    selectedUser?.username ||
    selectedProject?.project_name ||
    "";

  const firstLetter = displayName ? displayName.charAt(0).toUpperCase() : "";

  /* ================= AUTO SCROLL ================= */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ================= LOAD USERS + PROJECT CHATS ================= */

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

  /* ================= OPEN PRIVATE CHAT ================= */

  const openPrivateChat = async (user) => {
    setSelectedUser(user);
    setSelectedProject(null);
    setView("chat");

    const res = await api.post("/chat/private", {
      receiverId: user.id,
    });

    const id = res.data.chatId;
    setChatId(id);

    socket.emit("join_chat", id);

    const messagesRes = await api.get(`/chat/messages/${id}`);
    setMessages(messagesRes.data);
  };

  /* ================= OPEN PROJECT CHAT ================= */

  const openProjectChat = async (project) => {
    setSelectedProject(project);
    setSelectedUser(null);
    setView("chat");

    const id = project.chat_id;
    setChatId(id);

    socket.emit("join_chat", id);

    const messagesRes = await api.get(`/chat/messages/${id}`);
    setMessages(messagesRes.data);
  };

  /* ================= SEND MESSAGE ================= */

  const handleSend = async () => {
    if (!chatId || !decodedUser) return;
    if (!newMessage.trim() && !selectedFile) return;

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
          chatId,
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
    }
  };

  /* ================= RIGHT CLICK MENU ================= */
  const openContextMenu = (e, msg) => {
    if (msg.sender_id !== decodedUser?.id) return;

    e.preventDefault();

    const rect = e.currentTarget.getBoundingClientRect();

    const isSent = msg.sender_id === decodedUser?.id;

    setMenuMessage(msg);

    setContextMenu({
      x: isSent ? rect.left - 170 : rect.right + 8,
      y: rect.top,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  /* ================= EDIT ================= */

  const editMessage = () => {
    if (!menuMessage) return;

    setEditingMessageId(menuMessage.id);
    setNewMessage(menuMessage.message);

    closeContextMenu();
  };

  /* ================= DELETE ================= */

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

    closeContextMenu();
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
        <div className="chatContainer" onClick={closeContextMenu}>
          {/* CHAT LIST */}

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
              </div>
            </div>
          )}

          {/* CHAT VIEW */}

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
                    onClick={() => setHeaderMenu(!headerMenu)}
                  >
                    ⋮
                  </button>

                  {headerMenu && (
                    <div className="headerDropdown">
                      <button
                        onClick={() => {
                          setMessages([]);
                          setHeaderMenu(false);
                        }}
                      >
                        Clear Chat
                      </button>

                      <button
                        onClick={() => {
                          setView("list");
                          setHeaderMenu(false);
                        }}
                      >
                        Close Chat
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="messages">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`messageRow ${
                      msg.sender_id === decodedUser?.id ? "sent" : "received"
                    }`}
                  >
                    <div
                      className="messageBubble"
                      onContextMenu={(e) => openContextMenu(e, msg)}
                    >
                      {msg.message}

                      {msg.file_url && (
                        <div className="fileCard">
                          {msg.file_url.match(/\.(jpg|jpeg|png)$/i) ? (
                            <img
                              src={`http://localhost:5000${msg.file_url}`}
                              alt="attachment"
                              className="chatImage"
                            />
                          ) : (
                            <a
                              href={`http://localhost:5000${msg.file_url}`}
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
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                  />

                  <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type message..."
                  />

                  <button onClick={handleSend}>
                    {editingMessageId ? "Update" : "Send"}
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
