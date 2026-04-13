(function () {
  "use strict";

  const API_BASE = window.location.origin;
  const BACKEND_URL = window.location.port === "5173" ? "http://localhost:3000" : window.location.origin;
  const SOCKET_MESSAGE_TYPE = { ROOM_JOINING: 1, SEND_MESSAGE: 2 };
  const STREAM = {
    chunk: "messageStreamChunk",
    end: "messageStreamEnd",
    error: "messageStreamError",
  };

  function uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  let socket = null;
  let agentId = null;
  const serverId = "00000000-0000-0000-0000-000000000000";
  let entityId = localStorage.getItem("sentinel-eid-v3") || (function () { var id = uuid(); localStorage.setItem("sentinel-eid-v3", id); return id; })();
  let channelId = localStorage.getItem("sentinel-cid-v3") || (function () { var id = uuid(); localStorage.setItem("sentinel-cid-v3", id); return id; })();
  let isConnected = false;
  let streamBuffer = {};

  const $ = function (sel) { return document.querySelector(sel); };
  const $$ = function (sel) { return document.querySelectorAll(sel); };

  const messagesEl = $("#messages");
  const inputEl = $("#user-input");
  const sendBtn = $("#send-btn");
  const statusDot = $("#status-dot");
  const statusText = $("#status-text");
  const sidebar = $("#sidebar");
  const overlay = $("#overlay");

  init();

  async function init() {
    setStatus("connecting");
    try {
      var res = await fetch(API_BASE + "/api/agents");
      var data = await res.json();
      var agents = (data.success && data.data && data.data.agents) ? data.data.agents.filter(function (a) { return a.status === "active"; }) : [];
      if (agents.length === 0) {
        addSystemMessage("No active agents found. Please ensure Sentinel is running.");
        setStatus("disconnected");
        return;
      }
      agentId = agents[0].id;
      connectSocket();
    } catch (e) {
      addSystemMessage("Cannot reach server at " + API_BASE);
      setStatus("disconnected");
    }
  }

  function connectSocket() {
    socket = io(BACKEND_URL, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      auth: { entityId: entityId },
    });

    socket.on("connect", function () { setStatus("connecting"); joinChannel(); });

    socket.on("authenticated", joinChannel);
    socket.on("connection_established", joinChannel);

    socket.on("channel_joined", onReady);
    socket.on("room_joined", onReady);

    var handledMessages = {};
    socket.on("messageBroadcast", function (data) {
      if (data.senderId === entityId) return;
      var mid = data.id || data.messageId || "";
      var text = data.text || data.content || "";
      if (!text) return;
      var dedupKey = mid || text.substring(0, 100);
      if (handledMessages[dedupKey]) return;
      handledMessages[dedupKey] = true;
      removeTyping();
      addAgentMsg(text);
    });

    socket.on(STREAM.chunk, function (data) {
      var id = data.messageId;
      if (!streamBuffer[id]) {
        removeTyping();
        streamBuffer[id] = { chunks: [], el: createStreamEl() };
      }
      streamBuffer[id].chunks[data.index] = data.chunk;
      updateStream(streamBuffer[id].el, streamBuffer[id].chunks.join(""));
    });

    socket.on(STREAM.end, function (data) {
      var buf = streamBuffer[data.messageId];
      if (!buf) return;
      updateStream(buf.el, buf.chunks.join(""));
      buf.el.classList.remove("streaming");
      delete streamBuffer[data.messageId];
    });

    socket.on(STREAM.error, function (data) {
      removeTyping();
      addAgentMsg(data.partialText ? data.partialText + "\n\n*[Response interrupted]*" : "Something went wrong. Please try again.");
    });

    socket.on("disconnect", function () { setStatus("disconnected"); isConnected = false; sendBtn.disabled = true; });
    socket.on("connect_error", function () { setStatus("disconnected"); });
  }

  function joinChannel() {
    if (!socket) return;
    socket.emit(String(SOCKET_MESSAGE_TYPE.ROOM_JOINING), {
      channelId: channelId, roomId: channelId,
      agentId: agentId, entityId: entityId,
      messageServerId: serverId,
      username: "user", displayName: "User",
      metadata: { isDm: true, channelType: "DM" },
    });
  }

  function onReady() {
    setStatus("connected");
    isConnected = true;
    sendBtn.disabled = false;
  }

  var lastSendTime = 0;

  function sendMessage(text) {
    if (!text.trim() || !isConnected || !socket) return;
    clearWelcome();
    addUserMsg(text);
    lastSendTime = Date.now();
    showTyping();

    socket.emit(String(SOCKET_MESSAGE_TYPE.SEND_MESSAGE), {
      channelId: channelId, roomId: channelId,
      senderId: entityId, senderName: "User",
      message: text, messageServerId: serverId,
      messageId: uuid(), source: "sentinel_frontend",
      targetUserId: agentId,
      metadata: { isDm: true, channelType: "DM", targetUserId: agentId, recipientId: agentId },
    });
  }

  function createStreamEl() {
    var el = document.createElement("div");
    el.className = "message agent streaming";
    el.innerHTML = '<div class="message-avatar">S</div><div><div class="message-content"></div><div class="message-time">' + timeStr() + "</div></div>";
    messagesEl.appendChild(el);
    scroll();
    return el;
  }

  function updateStream(el, text) {
    var c = el.querySelector(".message-content");
    if (c) c.innerHTML = md(text);
    scroll();
  }

  function addUserMsg(text) {
    appendMsg("user", esc(text));
  }

  function addAgentMsg(text) {
    var elapsed = lastSendTime ? ((Date.now() - lastSendTime) / 1000).toFixed(1) : null;
    appendMsg("agent", md(text), elapsed);
    lastSendTime = 0;
  }

  function addSystemMessage(text) {
    var el = document.createElement("div");
    el.className = "message agent";
    el.innerHTML = '<div class="message-avatar">!</div><div><div class="message-content" style="color:var(--text-muted)">' + esc(text) + "</div></div>";
    messagesEl.appendChild(el);
    scroll();
  }

  function appendMsg(type, html, elapsed) {
    var avatar = type === "agent" ? "S" : "U";
    var timeInfo = timeStr();
    if (elapsed && type === "agent") {
      timeInfo += ' · ' + elapsed + 's';
    }
    var el = document.createElement("div");
    el.className = "message " + type;
    el.innerHTML = '<div class="message-avatar">' + avatar + '</div><div><div class="message-content">' + html + '</div><div class="message-time">' + timeInfo + "</div></div>";
    messagesEl.appendChild(el);
    scroll();
  }

  function showTyping() {
    removeTyping();
    var el = document.createElement("div");
    el.className = "message agent"; el.id = "typing";
    el.innerHTML = '<div class="message-avatar">S</div><div><div class="message-content"><div class="typing-indicator"><span></span><span></span><span></span></div><span class="typing-label">Gathering data from sources...</span></div></div>';
    messagesEl.appendChild(el);
    scroll();
  }

  function removeTyping() { var el = $("#typing"); if (el) el.remove(); }

  function clearWelcome() { var w = $(".welcome-message"); if (w) w.remove(); }

  function scroll() { messagesEl.scrollTop = messagesEl.scrollHeight; }

  function setStatus(s) {
    statusDot.className = "dot " + s;
    var labels = { connected: "Connected", disconnected: "Disconnected", connecting: "Connecting..." };
    statusText.textContent = labels[s] || s;
    // Update source dots
    var dots = $$(".source-dot");
    dots.forEach(function (d) {
      if (s === "connected") { d.classList.add("live"); } else { d.classList.remove("live"); }
    });
  }

  function timeStr() { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }

  function esc(t) { var d = document.createElement("div"); d.appendChild(document.createTextNode(t)); return d.innerHTML; }

  function md(t) {
    if (typeof marked !== "undefined" && marked.parse) {
      try { return marked.parse(t); } catch (e) { return esc(t); }
    }
    return esc(t);
  }

  // Event listeners
  sendBtn.addEventListener("click", function () {
    sendMessage(inputEl.value);
    inputEl.value = "";
    inputEl.style.height = "auto";
    sendBtn.disabled = !isConnected;
  });

  inputEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendBtn.click(); }
  });

  inputEl.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 120) + "px";
    sendBtn.disabled = !isConnected || !this.value.trim();
  });

  // Action buttons (sidebar + welcome cards)
  function handleAction(action) {
    if (action && isConnected) {
      inputEl.value = action;
      sendBtn.disabled = false;
      sendBtn.click();
    }
    closeSidebar();
  }

  $$(".action-btn").forEach(function (btn) {
    btn.addEventListener("click", function () { handleAction(this.getAttribute("data-action")); });
  });

  $$(".feature-card").forEach(function (card) {
    card.addEventListener("click", function () { handleAction(this.getAttribute("data-action")); });
  });

  // Mobile sidebar
  function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
  }

  $("#menu-toggle").addEventListener("click", function () {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("show");
  });

  overlay.addEventListener("click", closeSidebar);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeSidebar();
  });
})();
