import axios from "axios";
import { jwtDecode } from "jwt-decode";

const API_BASE = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";

// Khởi tạo Axios với cấu hình cơ bản
const API = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL, // URL cơ sở từ file .env
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

export const connectWebSocket = (onMessageReceived) => {
  const token = sessionStorage.getItem("token");
  if (!token) {
    console.error("[connectWebSocket]No token found in localStorage");
    throw new Error("No token");
  }
  let userID;
  try {
    const decoded = jwtDecode(token);
    userID = decoded.user_id || decoded.sub;
    if (!userID) throw new Error("No userID in token");
  } catch (error) {
    console.error("[connectWebSocket]Invalid token:", error);
    throw new Error("Invalid token");
  }
  console.log("[connectWebSocket]Connecting WebSocket with userID:", userID);

  ws = new WebSocket(`${process.env.REACT_APP_BACKEND_URL.replace("http", "ws")}/ws/messages?token=${encodeURIComponent(token)}`);

  ws.onopen = () => {
    console.log("[connectWebSocket]Connected to /ws/messages");
  };
  ws.onmessage = (event) => {
    console.log("[connectWebSocket]WebSocket message received:", event.data);
    try {
      const message = JSON.parse(event.data);
      console.log("[WS][PARSED]", {
      id: message.id,
      channelId: message.channelId,
      senderId: message.senderId,
      senderName: message.senderName,
      senderAvatar: message.senderAvatar,
      messageType: message.messageType,
      timestamp: message.timestamp,
    });
      onMessageReceived(message);
    } catch (error) {
      console.error("[WS] Error parsing message:", error);
    }
  };
  ws.onerror = (error) => {
    console.error("[connectWebSocket]WebSocket error:", error);
  };
  ws.onclose = () => {
    console.log("[connectWebSocket]WebSocket connection closed");
  };

  return ws;
};

// Cho phép gửi kèm replyTo + attachments (nếu có)
export const sendWebSocketMessage = (channelID, content, messageType = "Text", replyTo = null, attachments = []) => {
  const token = sessionStorage.getItem("token");
  if (!token) throw new Error("No token");

  let userID;
  try {
    const decoded = jwtDecode(token);
    userID = decoded.user_id || decoded.sub;
    if (!userID) throw new Error("No userID in token");
  } catch (error) {
    console.error("[sendWebSocketMessage]Invalid token:", error);
    throw new Error("Invalid token");
  }

  if (!ws) {
    console.error("[sendWebSocketMessage]WebSocket is not initialized");
    throw new Error("WebSocket is not initialized");
  }

  // Hỗ trợ trường hợp CONNECTING: đợi onopen rồi gửi để tránh "not connected"
  const payload = {
    channelId: channelID,
    senderId: userID,
    content,
    messageType,
    replyTo: replyTo || null,     // <- reply
    attachments: attachments || []// <- attachments (mặc định [])
  };

  const doSend = () => {
    console.log("[sendWebSocketMessage]Sending WebSocket message:", payload);
    ws.send(JSON.stringify(payload));
  };

  if (ws.readyState === WebSocket.OPEN) {
    doSend();
  } else if (ws.readyState === WebSocket.CONNECTING) {
    console.log("[sendWebSocketMessage]WS CONNECTING → sẽ gửi sau khi open");
    const onceOpen = () => {
      ws.removeEventListener("open", onceOpen);
      doSend();
    };
    ws.addEventListener("open", onceOpen);
  } else {
    console.error("[sendWebSocketMessage]WebSocket is not connected (state:", ws.readyState, ")");
    throw new Error("WebSocket is not connected");
  }

  return payload;
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
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error); // Trả lỗi cụ thể
      }
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
