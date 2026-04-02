(function () {
  "use strict";

  const API_BASE = window.location.origin;
  const SOCKET_PATH = "/socket.io";

  const SOCKET_MESSAGE_TYPE = { ROOM_JOINING: 1, SEND_MESSAGE: 2 };
  const MESSAGE_STREAM_EVENT = {
    messageStreamChunk: "messageStreamChunk",
    messageStreamEnd: "messageStreamEnd",
    messageStreamError: "messageStreamError",
  };

  function uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  // State
  let socket = null;
  let agentId = null;
  let entityId = localStorage.getItem("sentinel-entity-id");
  if (!entityId) {
    entityId = uuid();
    localStorage.setItem("sentinel-entity-id", entityId);
  }
  let channelId = localStorage.getItem("sentinel-channel-id");
  if (!channelId) {
    channelId = uuid();
    localStorage.setItem("sentinel-channel-id", channelId);
  }
  let messageServerId = null;
  let isConnected = false;
  let streamBuffer = {};

  // DOM Elements
  const messagesEl = document.getElementById("messages");
  const inputEl = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-btn");
  const statusDot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");
  const menuToggle = document.getElementById("menu-toggle");
  const sidebar = document.getElementById("sidebar");

  // Initialize
  init();

  async function init() {
    setStatus("connecting");
    try {
      const agents = await fetchAgents();
      if (agents.length === 0) {
        addSystemMessage("No agents found. Make sure the Sentinel agent is running.");
        setStatus("disconnected");
        return;
      }
      agentId = agents[0].id;
      messageServerId = agentId;
      connectSocket();
    } catch (err) {
      addSystemMessage("Could not reach the ElizaOS server. Is it running on " + API_BASE + "?");
      setStatus("disconnected");
    }
  }

  async function fetchAgents() {
    const res = await fetch(API_BASE + "/api/agents");
    const data = await res.json();
    if (data.success && data.data && data.data.agents) {
      return data.data.agents.filter(function (a) { return a.status === "active"; });
    }
    return [];
  }

  function connectSocket() {
    var opts = {
      path: SOCKET_PATH,
      transports: ["websocket", "polling"],
      auth: { entityId: entityId },
    };

    var apiKey = getApiKey();
    if (apiKey) {
      opts.auth.apiKey = apiKey;
    }

    socket = io(API_BASE, opts);

    socket.on("connect", function () {
      setStatus("connecting");
    });

    socket.on("authenticated", function () {
      joinChannel();
    });

    socket.on("channel_joined", function () {
      setStatus("connected");
      isConnected = true;
      sendBtn.disabled = false;
    });

    socket.on("room_joined", function () {
      setStatus("connected");
      isConnected = true;
      sendBtn.disabled = false;
    });

    socket.on("connection_established", function () {
      joinChannel();
    });

    socket.on("messageBroadcast", function (data) {
      if (data.senderId === entityId) return;
      removeTypingIndicator();
      addAgentMessage(data.text || data.content || "");
    });

    socket.on(MESSAGE_STREAM_EVENT.messageStreamChunk, function (data) {
      handleStreamChunk(data);
    });

    socket.on(MESSAGE_STREAM_EVENT.messageStreamEnd, function (data) {
      finalizeStream(data.messageId);
    });

    socket.on(MESSAGE_STREAM_EVENT.messageStreamError, function (data) {
      removeTypingIndicator();
      if (data.partialText) {
        addAgentMessage(data.partialText + "\n\n*[Response interrupted]*");
      } else {
        addAgentMessage("Sorry, something went wrong. Please try again.");
      }
    });

    socket.on("disconnect", function () {
      setStatus("disconnected");
      isConnected = false;
      sendBtn.disabled = true;
    });

    socket.on("connect_error", function () {
      setStatus("disconnected");
    });
  }

  function joinChannel() {
    if (!socket) return;
    socket.emit(String(SOCKET_MESSAGE_TYPE.ROOM_JOINING), {
      channelId: channelId,
      roomId: channelId,
      agentId: agentId,
      entityId: entityId,
      messageServerId: messageServerId,
      username: "user",
      displayName: "User",
      metadata: { isDm: true, channelType: "DM" },
    });
  }

  function sendMessage(text) {
    if (!text.trim() || !isConnected || !socket) return;

    clearWelcome();
    addUserMessage(text);
    showTypingIndicator();

    var messageId = uuid();
    socket.emit(String(SOCKET_MESSAGE_TYPE.SEND_MESSAGE), {
      channelId: channelId,
      roomId: channelId,
      senderId: entityId,
      senderName: "User",
      message: text,
      messageServerId: messageServerId,
      messageId: messageId,
      source: "sentinel_frontend",
      metadata: { isDm: true, channelType: "DM" },
    });
  }

  // Stream handling
  function handleStreamChunk(data) {
    var msgId = data.messageId;
    if (!streamBuffer[msgId]) {
      removeTypingIndicator();
      streamBuffer[msgId] = { chunks: [], el: null };
      streamBuffer[msgId].el = createStreamingMessage();
    }
    streamBuffer[msgId].chunks[data.index] = data.chunk;
    var fullText = streamBuffer[msgId].chunks.join("");
    updateStreamingMessage(streamBuffer[msgId].el, fullText);
  }

  function finalizeStream(msgId) {
    if (!streamBuffer[msgId]) return;
    var fullText = streamBuffer[msgId].chunks.join("");
    updateStreamingMessage(streamBuffer[msgId].el, fullText);
    streamBuffer[msgId].el.classList.remove("streaming");
    delete streamBuffer[msgId];
  }

  function createStreamingMessage() {
    var wrapper = document.createElement("div");
    wrapper.className = "message agent streaming";
    wrapper.innerHTML =
      '<div class="message-avatar">S</div>' +
      '<div><div class="message-content"></div>' +
      '<div class="message-time">' + formatTime() + "</div></div>";
    messagesEl.appendChild(wrapper);
    scrollToBottom();
    return wrapper;
  }

  function updateStreamingMessage(el, text) {
    var contentEl = el.querySelector(".message-content");
    if (contentEl) {
      contentEl.innerHTML = renderMarkdown(text);
    }
    scrollToBottom();
  }

  // UI helpers
  function addUserMessage(text) {
    var el = document.createElement("div");
    el.className = "message user";
    el.innerHTML =
      '<div class="message-avatar">U</div>' +
      '<div><div class="message-content">' + escapeHtml(text) + "</div>" +
      '<div class="message-time">' + formatTime() + "</div></div>";
    messagesEl.appendChild(el);
    scrollToBottom();
  }

  function addAgentMessage(text) {
    var el = document.createElement("div");
    el.className = "message agent";
    el.innerHTML =
      '<div class="message-avatar">S</div>' +
      '<div><div class="message-content">' + renderMarkdown(text) + "</div>" +
      '<div class="message-time">' + formatTime() + "</div></div>";
    messagesEl.appendChild(el);
    scrollToBottom();
  }

  function addSystemMessage(text) {
    var el = document.createElement("div");
    el.className = "message agent";
    el.innerHTML =
      '<div class="message-avatar">!</div>' +
      '<div><div class="message-content" style="color:var(--text-muted)">' + escapeHtml(text) + "</div></div>";
    messagesEl.appendChild(el);
    scrollToBottom();
  }

  function showTypingIndicator() {
    removeTypingIndicator();
    var el = document.createElement("div");
    el.className = "message agent";
    el.id = "typing";
    el.innerHTML =
      '<div class="message-avatar">S</div>' +
      '<div class="message-content"><div class="typing-indicator">' +
      "<span></span><span></span><span></span></div></div>";
    messagesEl.appendChild(el);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    var el = document.getElementById("typing");
    if (el) el.remove();
  }

  function clearWelcome() {
    var w = document.querySelector(".welcome-message");
    if (w) w.remove();
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function setStatus(state) {
    statusDot.className = "dot " + state;
    var labels = { connected: "Connected", disconnected: "Disconnected", connecting: "Connecting..." };
    statusText.textContent = labels[state] || state;
  }

  function formatTime() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  function renderMarkdown(text) {
    if (typeof marked !== "undefined" && marked.parse) {
      try {
        return marked.parse(text);
      } catch (e) {
        return escapeHtml(text);
      }
    }
    return escapeHtml(text);
  }

  function getApiKey() {
    var params = new URLSearchParams(window.location.search);
    return params.get("apiKey") || "";
  }

  // Event listeners
  sendBtn.addEventListener("click", function () {
    sendMessage(inputEl.value);
    inputEl.value = "";
    inputEl.style.height = "auto";
    sendBtn.disabled = !isConnected;
  });

  inputEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });

  inputEl.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 120) + "px";
    sendBtn.disabled = !isConnected || !this.value.trim();
  });

  document.querySelectorAll(".action-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var action = this.getAttribute("data-action");
      if (action && isConnected) {
        inputEl.value = action;
        sendBtn.disabled = false;
        sendBtn.click();
      }
      if (sidebar.classList.contains("open")) {
        sidebar.classList.remove("open");
      }
    });
  });

  menuToggle.addEventListener("click", function () {
    sidebar.classList.toggle("open");
  });

  document.addEventListener("click", function (e) {
    if (sidebar.classList.contains("open") && !sidebar.contains(e.target) && e.target !== menuToggle) {
      sidebar.classList.remove("open");
    }
  });
})();
