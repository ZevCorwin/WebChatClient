import axios from "axios";

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


// Hàm kiểm tra kết nối server
const pingServer = async () => {
  try {
    const response = await API.get('/ping');
    return response.data;
  } catch (error) {
    console.error('Error pinging server:', error);
    throw error;
  }
};

// Đăng nhập người dùng
const loginUser = async (loginData) => {
    try {
      const response = await API.post('/login', loginData);
      console.log("Phản hồi từ API:", response.data); // Log phản hồi
      return response.data;
    } catch (error) {
      console.error("Lỗi API đăng nhập:", error.response || error);
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

const searchChannels = async (keyword) => {
  try {
    const response = await API.get('/channels/search', {
      params: { q: keyword }, // Gửi tham số tìm kiếm qua query string
    });
    return response.data.channels; // Trả về danh sách kênh
  } catch (error) {
    console.error('Lỗi khi tìm kiếm kênh:', error.response || error);
    throw error;
  }
};

export { searchChannels };

// Lấy danh sách bạn bè
export const getFriends = async (userID) => {
  try {
    const response = await API.get(`/friends/${userID}`);
    return response.data.friends;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách bạn bè:", error);
    throw error;
  }
};

// Lấy danh sách lời mời kết bạn
export const getFriendRequests = async (userID) => {
  try {
    const response = await API.get(`/friend-requests/${userID}`);
    return response.data.requests;
  } catch (error) {
    console.error("Lỗi khi lấy lời mời kết bạn:", error);
    throw error;
  }
};

// Tìm kiếm người dùng bằng số điện thoại
export const searchUserByPhone = async (phone) => {
  try {
    const response = await API.get('/users/search', { params: { phone } });
    return response.data.users;
  } catch (error) {
    console.error("Lỗi khi tìm kiếm người dùng:", error.response || error);
    throw error.response?.data?.error || "Không thể tìm thấy người dùng";
  }
};

// Gửi yêu cầu kết bạn
export const sendFriendRequest = async (userID, friendID) => {
  if (!userID || !friendID) {
    throw new Error("Thiếu thông tin userID hoặc friendID.");
  }
  try {
    await API.post(`/friends/${userID}/send/${friendID}`);
  } catch (error) {
    throw new Error(error.response?.data?.error || "Lỗi gửi yêu cầu kết bạn");
  }
};

// Kiểm tra trạng thái bạn bè
export const checkFriendStatus = async (userID, friendID) => {
  try {
    const { data } = await API.get(`/friends/${userID}/status/${friendID}`);
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
    console.error("Lỗi khi lấy lịch sử kênh chat:", error);
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
    console.error("Lỗi khi tạo kênh riêng tư:", error.response || error);
    throw error.response?.data?.error || "Không thể tạo kênh.";
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
    console.error("Lỗi khi tìm kênh riêng tư:", error.response || error);
    throw error;
  }
};

// API lấy tin nhắn của kênh
export const getMessages = async (channelID, userID) => {
  try {
    const response = await API.get(`/api/chatHistory/${channelID}/${userID}`);
    return response.data.message;
  } catch (error) {
    console.error("Lỗi khi lấy lịch sử tin nhắn:", error);
    throw error;
  }
};

// API gửi tin nhắn
export const sendMessage = async (messageData) => {
  try {
    const response = await API.post('/api/messages/send', messageData);
    return response.data;
  } catch (error) {
    console.error("Lỗi khi gửi tin nhắn:", error);
    throw error;
  }
};
