import axios from "axios";
import { jwtDecode } from "jwt-decode";

const API_BASE = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080" || "https://webchatserver-japo.onrender.com";

// Khởi tạo Axios với cấu hình cơ bản
const API = axios.create({
  baseURL: API_BASE, // URL cơ sở từ file .env
  headers: {
    "Content-Type": "application/json",
  },
});

// Thêm interceptor để tự động thêm token
API.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`; // Thêm header Authorization
  }
  return config;
});

// WebSocket instance
let ws = null;
let wsConnecting = false;
let wsReconnectTimer = null;
let wsBackoffMs = 800;         // backoff khởi điểm
const WS_BACKOFF_MAX = 10_000; // giới hạn backoff
let wsHeartbeatTimer = null;
let wsLastPongAt = 0;
let wsOnMessageCb = null;

const inFlightSends = new Map();

// 👇👇 Thêm hai helper gửi trạng thái
export const wsSendDelivered = (messageId, channelId, userId) => {
  try {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({
      type: "message_delivered",
      messageId,
      channelId,
      userId,
    }));
  } catch (e) { /* ignore */ }
};

export const wsSendRead = (messageId, channelId, userId) => {
  try {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({
      type: "message_read",
      messageId,
      channelId,
      userId,
    }));
  } catch (e) { /* ignore */ }
};

function clearTimers() {
  if (wsReconnectTimer) { clearTimeout(wsReconnectTimer); wsReconnectTimer = null; }
  if (wsHeartbeatTimer) { clearInterval(wsHeartbeatTimer); wsHeartbeatTimer = null; }
}

function makeWsUrl(token) {
  const backend = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";
  const u = new URL(backend);
  const wsProto = u.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProto}//${u.host}/ws/messages?token=${encodeURIComponent(token)}`;
}

export const connectWebSocket = (onMessageReceived) => {
  const token = sessionStorage.getItem("token");
  if (!token) {
    console.error("[connectWebSocket] No token");
    return null;
  }
  wsOnMessageCb = onMessageReceived;

  // nếu đã OPEN thì trả luôn
  if (ws && ws.readyState === WebSocket.OPEN) return ws;
  // nếu đang CONNECTING thì trả lại ws (đỡ tạo thêm)
  if (ws && ws.readyState === WebSocket.CONNECTING) return ws;
  if (wsConnecting) return ws;

  const url = makeWsUrl(token);
  wsConnecting = true;
  clearTimers();

  try {
    ws = new WebSocket(url);
  } catch (e) {
    console.error("[connectWebSocket] new WebSocket error:", e);
    scheduleReconnect(); // thử lại
    wsConnecting = false;
    return null;
  }

  ws.onopen = () => {
    console.log("[WS] open");
    wsConnecting = false;
    // reset backoff sau khi nối lại thành công
    wsBackoffMs = 800;

    // heartbeat (ping mỗi 15s)
    wsLastPongAt = Date.now();
    clearTimers();
    wsHeartbeatTimer = setInterval(() => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      try {
        ws.send(JSON.stringify({ type: "ping", ts: Date.now() }));
      } catch {}
      // nếu > 35s không thấy pong → đóng để kích hoạt reconnect
      if (Date.now() - wsLastPongAt > 35_000) {
        console.warn("[WS] heartbeat timeout -> close to reconnect");
        try { ws.close(); } catch {}
      }
    }, 15_000);
  };

  ws.onmessage = (event) => {
    let rawText = "";
    try {
      rawText = typeof event.data === "string" ? event.data : JSON.stringify(event.data);
      const msg = JSON.parse(rawText);

      // nếu server có trả pong
      if (msg && msg.type === "pong") {
        wsLastPongAt = Date.now();
        return;
      }

      // **đồng bộ kiểu statusStage**: số -> số, chuỗi “Đã xem/…” -> map sang số
      if (msg && msg.type === "message_status_update") {
        if (typeof msg.statusStage !== "number") {
          const map = { "Đang gửi":0, "Đã gửi":1, "Đã nhận":2, "Đã xem":3 };
          msg.statusStage = typeof msg.statusStage === "string" && map[msg.statusStage] != null
            ? map[msg.statusStage]
            : (map[msg.status] ?? undefined);
        }
      }

      // đẩy ra UI
      wsOnMessageCb && wsOnMessageCb(msg);
    } catch (e) {
      // nếu server gửi nhiều frame / text có \u0003… vẫn log an toàn, không crash
      console.warn("[WS] parse fail, raw:", rawText.slice(0, 300));
    }
  };

  ws.onerror = (e) => {
    console.warn("[WS] error", e);
  };

  ws.onclose = (ev) => {
    console.log("[WS] close", ev.code, ev.reason || "");
    wsConnecting = false;
    clearTimers();
    // tự reconnect nếu không phải do mình logout
    scheduleReconnect();
  };

  // tự reconnect khi tab regain mạng
  window.addEventListener("online", tryInstantReconnect, { once: true });

  return ws;
};

function scheduleReconnect() {
  if (wsReconnectTimer) return;
  // tăng backoff + jitter nhẹ
  const delay = Math.min(wsBackoffMs, WS_BACKOFF_MAX) + Math.floor(Math.random() * 300);
  console.log(`[WS] reconnect in ${delay}ms`);
  wsReconnectTimer = setTimeout(() => {
    wsReconnectTimer = null;
    wsBackoffMs = Math.min(wsBackoffMs * 2, WS_BACKOFF_MAX);
    connectWebSocket(wsOnMessageCb);
  }, delay);
}
function tryInstantReconnect() {
  // khi mạng lên lại: thử ngay lập tức, và reset backoff nhỏ
  wsBackoffMs = 800;
  clearTimers();
  connectWebSocket(wsOnMessageCb);
}

const payloadPreviewKey = (payload) => {
  try {
    return `${payload.clientId || ""}|${payload.channelId || ""}|${(payload.content || "").slice(0,200)}`;
  } catch {
    return Math.random().toString(36).slice(2,9);
  }
};

// Cho phép gửi kèm replyTo + attachments (nếu có)
export const sendWebSocketMessage = async (
  channelID,
  content,
  messageType = "Text",
  replyTo = null,
  attachments = [],
  clientId = null
) => {
  const token = sessionStorage.getItem("token");
  if (!token) throw new Error("No token");

  let userID;
  try {
    const decoded = jwtDecode(token);
    userID = decoded.user_id || decoded.sub;
  } catch (err) {
    console.error("[sendWebSocketMessage] invalid token:", err);
    throw err;
  }

  if (!ws) {
    console.error("[sendWebSocketMessage] ws not initialized");
    throw new Error("WebSocket not initialized");
  }

  const payload = {
    type: "message",
    channelId: channelID,
    senderId: userID,
    content,
    messageType,
    replyTo: replyTo || null,
    attachments: attachments || [],
  };
  if (clientId) payload.clientId = clientId;

  const key = clientId || payloadPreviewKey(payload);

  // avoid duplicate sends for same key
  if (inFlightSends.has(key)) {
    console.warn("[WS-OUT] Duplicate send prevented for key:", key);
    return key;
  }

  const sendPromise = new Promise((resolve, reject) => {
    const doSend = () => {
      try {
        console.log("[WS-OUT] Sending", new Date().toISOString(), { key, channelId: payload.channelId, clientId: payload.clientId, snippet: (payload.content || "").slice(0,200) });
        ws.send(JSON.stringify(payload));
        resolve(key);
      } catch (err) {
        console.error("[WS-OUT] send error", err, { key, payload });
        reject(err);
      } finally {
        // keep key in-flight briefly to avoid immediate duplicates from UI
        setTimeout(() => inFlightSends.delete(key), 2000);
      }
    };

    if (ws.readyState === WebSocket.OPEN) {
      doSend();
    } else if (ws.readyState === WebSocket.CONNECTING) {
      // Wait for open once, avoid stacking listeners
      const onOpen = () => {
        try {
          ws.removeEventListener("open", onOpen);
          ws.removeEventListener("error", onErr);
          doSend();
        } catch (e) {
          reject(e);
        }
      };
      const onErr = (e) => {
        ws.removeEventListener("open", onOpen);
        ws.removeEventListener("error", onErr);
        reject(e || new Error("WebSocket error during connect"));
      };
      ws.addEventListener("open", onOpen);
      ws.addEventListener("error", onErr);
      // safety timeout
      setTimeout(() => {
        ws.removeEventListener("open", onOpen);
        ws.removeEventListener("error", onErr);
        reject(new Error("WebSocket open timeout"));
      }, 6000);
    } else {
      reject(new Error("WebSocket not open"));
    }
  });

  // mark as in-flight
  inFlightSends.set(key, { payload, startedAt: Date.now() });
  return sendPromise;
};

// --- Message actions ---
export const recallMessage = async (messageID) => {
  const res = await API.post(`/api/messages/${messageID}/recall`);
  return res.data;
};

export const hideMessageForMe = async (messageID) => {
  const res = await API.delete(`/api/messages/${messageID}/hide`);
  return res.data;
};

// Hàm kiểm tra kết nối server
const pingServer = async () => {
  try {
    const response = await API.get('/ping');
    return response.data;
  } catch (error) {
    console.error('[pingServer]Error pinging server:', error);
    throw error;
  }
};

// Đăng nhập người dùng
const loginUser = async (loginData) => {
    try {
      const response = await API.post('/login', loginData);
      console.log("[loginUser]Phản hồi từ API:", response.data); // Log phản hồi
      return response.data;
    } catch (error) {
      console.error("[loginUser]Lỗi API đăng nhập:", error.response || error);
      throw error;
    }
  };
  
  
  // Đăng ký người dùng
  const registerUser = async (userData) => {
    try {
      const response = await API.post('/register', userData);
      return response.data;
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        throw new Error(error.response.data.message); // Trả về thông báo lỗi cụ thể
      }
      throw error;
    }
  };

export { API, pingServer, registerUser, loginUser };

export const requestRegisterOtp = async (userData) => {
  const response = await API.post('/register/request-otp', userData);
  return response.data;
}

export const verifyRegisterOtp = async (email, code) => {
  const response = await API.post('/register/verify-otp', { email, code });
  return response.data;
}

const searchChannels = async (keyword) => {
  try {
    const response = await API.get('/channels/search', {
      params: { q: keyword }, // Gửi tham số tìm kiếm qua query string
    });
    return response.data.channels; // Trả về danh sách kênh
  } catch (error) {
    console.error("[searchChannels]Lỗi khi tìm kiếm kênh:", error.response || error);
    throw error;
  }
};

export { searchChannels };

// Tìm kiếm người dùng bằng số điện thoại
export const searchUserByPhone = async (phone) => {
  try {
    const response = await API.get('/users/search', { params: { phone } });
    console.log("[searchUserByPhone]Kết quả tìm thành viên:", response.data.users);
    return response.data.users;
  } catch (error) {
    console.error("[searchUserByPhone]Lỗi khi tìm kiếm người dùng:", error.response || error);
    throw error.response?.data?.error || "Không thể tìm thấy người dùng";
  }
};

// Lấy danh sách bạn bè
export const getFriends = async (userID) => {
  try {
    const response = await API.get(`/api/friends/${userID}/list`);
    return response.data.friends;
  } catch (error) {
    console.error("[getFriends]Lỗi khi lấy danh sách bạn bè:", error);
    throw error;
  }
};

// Lấy danh sách lời mời kết bạn
export const getFriendRequests = async (userID) => {
  try {
    const response = await API.get(`/api/friends/${userID}/requests`);
    return response.data.requests;
  } catch (error) {
    console.error("[getFriendRequests]Lỗi khi lấy lời mời kết bạn:", error);
    throw error;
  }
};

// Hủy yêu cầu kết bạn
export const cancelFriendRequest = async (userID, friendID) => {
  try {
    await API.delete(`/api/friends/${userID}/cancel/${friendID}`);
  } catch (error) {
    throw new Error(error.response?.data?.error || "Không thể hủy yêu cầu kết bạn");
  }
};

// Từ chối lời mời kết bạn
export const declineFriendRequest = async (userID, friendID) => {
  try {
    await API.put(`/api/friends/${userID}/decline/${friendID}`);
  } catch (error) {
    throw new Error(error.response?.data?.error || "Không thể từ chối lời mời kết bạn");
  }
};

// Xóa bạn
export const removeFriend = async (userID, friendID) => {
  try {
    await API.delete(`/api/friends/${userID}/remove/${friendID}`);
  } catch (error) {
    throw new Error(error.response?.data?.error || "Không thể xóa bạn");
  }
};


// Gửi yêu cầu kết bạn
export const sendFriendRequest = async (userID, friendID) => {
  if (!userID || !friendID) {
    throw new Error("Thiếu thông tin userID hoặc friendID.");
  }
  try {
    await API.post(`/api/friends/${userID}/send/${friendID}`);
  } catch (error) {
    throw new Error(error.response?.data?.error || "Lỗi gửi yêu cầu kết bạn");
  }
};

// Chấp nhận lời mời kết bạn
export const acceptFriendRequest = async (userID, friendID) => {
  if (!userID || !friendID) {
    throw new Error("Thiếu thông tin userID hoặc friendID.");
  }
  try {
    await API.put(`/api/friends/${userID}/accept/${friendID}`);
  } catch (error) {
    throw new Error(error.response?.data?.error || "Lỗi chấp nhận yêu cầu kết bạn");
  }
};

// Kiểm tra trạng thái bạn bè
export const checkFriendStatus = async (userID, friendID) => {
  try {
    const { data } = await API.get(`/api/friends/${userID}/status/${friendID}`);
    return data.status;
  } catch (error) {
    throw new Error(error.response?.data?.error || "Không thể kiểm tra trạng thái bạn bè");
  }
};

// Lấy lịch sử kênh chat của người dùng
export const getChatChannelHistory = async (userID) => {
  try {
    const response = await API.get(`/api/chatHistory/user/${userID}`);
    return response.data.channels; // Trả về danh sách kênh
  } catch (error) {
    console.error("[getChatChannelHistory]Lỗi khi lấy lịch sử kênh chat:", error);
    throw error;
  }
};

// Tạo kênh riêng tư
export const createPrivateChannel = async (currentUserID, targetUserID) => {
  try {
    const response = await API.post('/api/channels', {
      name: "", // Tên kênh sẽ được backend tự động tạo
      type: "Private",
      members: [currentUserID, targetUserID],
      approvalRequired: false, // Không cần phê duyệt
    });
    return response.data;
  } catch (error) {
    console.error("[createPrivateChannel]Lỗi khi tạo kênh riêng tư:", error.response || error);
    throw error.response?.data?.error || "Không thể tạo kênh.";
  }
};

// Tạo kênh nhóm
export const createGroupChannel = async (groupChannelName, currentUserID, ...memberIDs) => {
  try {
    const allMembers = [currentUserID, ...memberIDs];
    if (allMembers.length < 3) { 
      throw new Error("Cần ít nhất 3 thành viên để tạo kênh nhóm.");
    }
    const response = await API.post('/api/channels', {
      userID: currentUserID,
      name: groupChannelName,
      type: "Group",
      members: [...memberIDs],
      approvalRequired: false, // Không cần phê duyệt
    });
    return response.data;
  } catch (error) {
    console.error("[createGroupChannel]Lôi lỗi khi tạo kênh nhóm:", error.response || error);
    throw error.response?.data?.error || "Không thể tạo kênh nhóm."; 
  }
};

export const getChannelMembers = async (channelID) => {
  try {
    const response = await API.get(`/api/channels/${channelID}/members`);
    return response.data.members;
  } catch (error) {
    console.error("[getChannelMembers] Lỗi khi lấy danh sách thành viên:", error);
    throw error;
  }
};

export const getBlockedMembers = async (channelID) => {
  try {
    const response = await API.get(`/api/channels/${channelID}/blocked-members`);
    return response.data;
  } catch (error) {
    console.error("[getBlockedMembers] Lỗi khi lấy danh sách thành viên bị chặn:", error);
    throw error;
  }
};

// Thêm thành viên vào kênh
export const addChannelMember = async (channelID, memberID) => {
  try {
    const response = await API.put(`/api/channels/${channelID}/members/${memberID}`);
    return response.data;
  } catch (error) {
    console.error("[addChannelMember] Lỗi khi thêm thành viên:", error);
    throw error;
  }
};

// Xóa thành viên khỏi kênh
export const removeChannelMember = async (channelID, memberID) => {
  try {
    const response = await API.delete(`/api/channels/${channelID}/members/${memberID}`);
    return response.data;
  } catch (error) {
    console.error("[removeChannelMember] Lỗi khi xóa thành viên:", error);
    throw error;
  }
};

// Thành viên rời khỏi kênh
export const leaveChannel = async (channelID, memberID) => {
  try {
    const response = await API.post(`/api/channels/${channelID}/leave/${memberID}`);
    return response.data;
  } catch (error) {
    console.error("[leaveChannel] Lỗi khi rời khỏi kênh:", error);
    throw error;
  }
};

// Giải tán kênh (Leader)
export const dissolveChannel = async (channelID, leaderID) => {
  try {
    const response = await API.delete(`/api/channels/${channelID}/dissolve/${leaderID}`);
    return response.data;
  } catch (error) {
    console.error("[dissolveChannel] Lỗi khi giải tán kênh:", error);
    throw error;
  }
};

// Chặn thành viên
export const blockMember = async (channelID, memberID) => {
  try {
    const response = await API.post(`/api/channels/${channelID}/block/${memberID}`);
    return response.data;
  } catch (error) {
    console.error("[blockMember] Lỗi khi chặn thành viên:", error);
    throw error;
  }
};

// Bỏ chặn thành viên
export const unblockMember = async (channelID, unblockerID, memberID) => {
  try {
    const response = await API.post(`/api/channels/${channelID}/unblock/${memberID}`);
    return response.data;
  } catch (error) {
    console.error("[unblockMember] Lỗi khi bỏ chặn thành viên:", error);
    throw error;
  }
};

// Tìm kênh riêng tư giữa hai người dùng
export const searchPrivateChannel = async (member1, member2) => {
  try {
    const response = await API.get('/api/channels/find-private-channel', {
      params: { member1, member2 },
    });
    return response.data; // Trả về kênh tìm thấy
  } catch (error) {
    console.error("[searchPrivateChannel]Lỗi khi tìm kênh riêng tư:", error.response || error);
    throw error;
  }
};

// API lấy tin nhắn của kênh
export const getMessages = async (channelID, userID) => {
  try {
    const response = await API.get(`/api/chatHistory/${channelID}/${userID}`);
    return response.data.message;
  } catch (error) {
    console.error("[getMessages]Lỗi khi lấy lịch sử tin nhắn:", error);
    throw error;
  }
};
        
export const getUserByID = async (userID) => {
  try {
    const response = await API.get(`/users/${userID}`);
    return response.data.user;
  } catch (error) {
    console.error("[getUserByID]Lỗi khi lấy thông tin người dùng:", error);
    throw error;
  }
}

export const getUserChannels = async (userID) => {
  try {
    const response = await API.get(`/api/channels/user/${userID}/channels`);
    return response.data.channels; // Trả về danh sách kênh
  } catch (error) {
    console.error("[getUserChannels]Lỗi khi lấy danh sách kênh của người dùng:", error);
    throw error;
  }
};

// B1: Gửi OTP đến email cũ (cần nhập mật khẩu)
export const requestOldEmailOTP = async (userID, password) => {
  try {
    const { data } = await API.post(`/users/${userID}/change-email/request-old-otp`, { password });
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.error || "Không thể gửi OTP email cũ");
  }
};

// B2: Xác thực OTP từ email cũ
export const verifyOldEmailOTP = async (userID, otp) => {
  try {
    const { data } = await API.post(`/users/${userID}/change-email/verify-old-otp`, { otp });
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.error || "OTP email cũ không hợp lệ");
  }
};

// B3: Gửi OTP đến email mới
export const requestNewEmailOTP = async (userID, newEmail) => {
  try {
    const { data } = await API.post(`/users/${userID}/change-email/request-new-otp`, { newEmail });
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.error || "Không thể gửi OTP email mới");
  }
};

// B4: Xác thực OTP email mới và cập nhật email
export const verifyNewEmailAndChange = async (userID, newEmail, otp) => {
  try {
    const { data } = await API.post(`/users/${userID}/change-email/verify-new-email`, {
      newEmail,
      otp,
    });
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.error || "Không thể đổi email");
  }
};

export const changePhone = async (userID, password, newPhone) => {
  try {
    const response = await API.post(`/users/${userID}/change-phone`, {
      password,
      newPhone,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || "Không thể đổi số điện thoại");
  }
};

// Đổi mật khẩu
export const changePassword = async (userID, oldPassword, newPassword) => {
  try {
    const response = await API.post(`/users/${userID}/change-password`, {
      oldPassword,
      newPassword,
    });
    return response.data;
  } catch (error) {
    console.error("[changePassword] Lỗi:", error.response || error);
    throw new Error(error.response?.data?.error || "Không thể đổi mật khẩu");
  }
};

export const updateUserProfile = async (userID, profileData) => {
  try {
    const response = await API.put(`/users/${userID}`, profileData);
    return response.data;
  } catch (error) {
    console.error("[updateUserProfile] Lỗi khi cập nhật:", error.response || error);
    throw error.response?.data?.error || "Không thể cập nhật thông tin.";
  }
};

// Upload avatar
export const updateAvatar = async (userID, file, defaultUrl = null) => {
  const formData = new FormData();
  formData.append("avatar", file);
  const res = await axios.post(`${API_BASE}/users/${userID}/avatar`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const setDefaultAvatar = async (userID) => {
  const res = await axios.post(
    `${API_BASE}/users/${userID}/avatar?default=true`
  );
  return res.data;
};

// Upload cover photo
export const updateCoverPhoto = async (userID, file) => {
  const formData = new FormData();
  formData.append("cover", file);

  const res = await axios.post(`${API_BASE}/users/${userID}/cover`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// --- Upload file đính kèm tin nhắn ---
export const uploadFile = async (file) => {
  if (!file) throw new Error("Chưa chọn file để tải lên.");

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await API.post("/uploads", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data; // { id, url, mime, size, fileType }
  } catch (error) {
    console.error("[uploadFile] Lỗi tải file:", error);
    throw new Error(error.response?.data?.error || "Không thể tải file lên.");
  }
};

// Giống cấu trúc code 1 (uploadFile)
export const editMessage = async (messageId, content) => {
  if (!messageId || !content) throw new Error("Thiếu ID tin nhắn hoặc nội dung mới.");

  try {
    const res = await API.put(`/api/messages/${messageId}`, { content });
    return res.data; // { updatedMessage } hoặc object trả về từ BE
  } catch (error) {
    console.error("[editMessage] Lỗi chỉnh sửa tin nhắn:", error);
    throw new Error(error.response?.data?.error || "Không thể chỉnh sửa tin nhắn.");
  }
};

export const toggleReaction = async (messageId, emoji) => {
  if (!messageId || !emoji) throw new Error("Thiếu ID tin nhắn hoặc emoji.");

  try {
    const res = await API.post(`/api/messages/${messageId}/reaction`, { emoji });
    return res.data; // { success: true, reactions: [...] }
  } catch (error) {
    console.error("[toggleReaction] Lỗi phản ứng emoji:", error);
    throw new Error(error.response?.data?.error || "Không thể thực hiện phản ứng emoji.");
  }
};

export const sendReplyMessage = async (
  channelID,
  content,
  messageType = "Text",
  replyTo = null,
  attachments = []
) => {
  if (!channelID || !content) throw new Error("Thiếu dữ liệu để gửi tin nhắn trả lời.");

  try {
    return await sendWebSocketMessage(channelID, content, messageType, replyTo, attachments);
  } catch (error) {
    console.error("[sendReplyMessage] Lỗi gửi tin nhắn trả lời:", error);
    throw new Error(error.response?.data?.error || "Không thể gửi tin nhắn trả lời.");
  }
};

export const sendTypingEvent = (channelID, isTyping) => {
  if (!channelID) throw new Error("Thiếu channelID cho typing event");
  const token = sessionStorage.getItem("token");
  if (!token) return; // không có token -> không gửi

  let userID;
  try {
    const decoded = jwtDecode(token);
    userID = decoded.user_id || decoded.sub;
    if (!userID) return;
  } catch (error) {
    console.error("[sendTypingEvent] Invalid token:", error);
    return;
  }

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    // nếu ws chưa mở thì bỏ qua (hoặc có thể queue sau)
    return;
  }

  const senderName = sessionStorage.getItem("userName") || undefined; // optional
  const payload = {
    type: "typing",
    channelId: channelID,
    senderId: userID,
    isTyping,
  };
  if (senderName) payload.senderName = senderName;

  try {
    ws.send(JSON.stringify(payload));
  } catch (err) {
    console.error("[sendTypingEvent] send error:", err);
  }
};