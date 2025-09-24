import axios from "axios";
import { jwtDecode } from "jwt-decode";

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

export const sendWebSocketMessage = (channelID, content, messageType = "Text") => {
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
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error("[sendWebSocketMessage]WebSocket is not connected");
    throw new Error("WebSocket is not connected");
  }
  const message = {
    channelId: channelID,
    senderId: userID,
    content,
    messageType,
  };
  console.log("[sendWebSocketMessage]Sending WebSocket message:", message);
  ws.send(JSON.stringify(message));
  return message;
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

// Hủy yêu cầu kết bạn

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