import React, { useEffect, useState } from "react";
import { API, getMessages, sendMessage } from "../../services/api";

const Column3 = ({ mode, selectedOption }) => {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentChannel, setCurrentChannel] = useState(null);
  const [messages, setMessages] = useState([]); // Lưu trữ các tin nhắn
  const [newMessage, setNewMessage] = useState(""); // Dữ liệu tin nhắn mới
  const [socket, setSocket] = useState(null); // WebSocket instance

  useEffect(() => {
    if (mode === "friends") {
      setLoading(true);
      if (selectedOption === "Danh sách bạn bè") {
        fetchFriends();
      } else if (selectedOption === "Lời mời kết bạn") {
        fetchFriendRequests();
      }
    }
  }, [mode, selectedOption]);

  useEffect(() => {
    if (mode === "chat" && selectedOption.channel) {
      console.log("selectedOption.channel:", selectedOption.channel);
      setCurrentChannel(selectedOption.channel);
      fetchMessages(selectedOption.channel.id);
    }
  }, [mode, selectedOption]);

  useEffect(() => {
    if (currentChannel) {
      const ws = new WebSocket("ws://localhost:8080/ws/messages"); // Thay bằng URL WebSocket server
      setSocket(ws);

      // Lắng nghe tin nhắn từ server
      ws.onmessage = (event) => {
        const newMessage = JSON.parse(event.data); // Tin nhắn mới từ server
        // Đồng nhất cấu trúc dữ liệu
        const standardizedMessage = {
          id: newMessage.id || Math.random().toString(36).substring(7), // Tạo ID tạm nếu thiếu
          content: newMessage.content || "Tin nhắn trống",
          timestamp: newMessage.timestamp || new Date().toISOString(), // Gán timestamp hiện tại nếu không có
          messageType: newMessage.messageType || "Text", // Loại tin nhắn mặc định là "Text"
          senderId: newMessage.senderId || "Unknown",
          senderName: newMessage.senderName || currentChannel?.name || "Người gửi",
          senderAvatar: newMessage.senderAvatar || "/default-avatar.png", // Avatar mặc định
          status: newMessage.status || "sent",
          recalled: newMessage.recalled || false,
          url: newMessage.url || null,
          fileId: newMessage.fileId || null,
        };

        // Cập nhật danh sách tin nhắn
        setMessages((prevMessages) => [...prevMessages, standardizedMessage]);
      };

      // Đóng kết nối khi component bị unmount
      return () => {
        ws.close();
      };
    }
  }, [currentChannel]);

  useEffect(() => {
    console.log("Messages received:", messages);
  }, [messages]);
  

  const fetchMessages = async (channelID) => {
    try {
      const userID = sessionStorage.getItem("userID");
      const response = await getMessages(channelID, userID); // `response` là object chứa cả messages và thông tin khác
  
      setMessages(response.messages); // Lấy danh sách tin nhắn
      setCurrentChannel((prev) => ({
        id: response.channelID || prev?.id, // Giữ lại id cũ nếu response.channelID không tồn tại
        name: response.userName || response.channelName || prev?.name,
        avatar: response.userAvatar || response.channelAvatar || prev?.avatar,
        type: response.userName ? "Private" : prev?.type,
      }));
    } catch (err) {
      setError("Không thể tải tin nhắn.");
    }
  };
  

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    if (!currentChannel || !currentChannel.id) {
      setError("Không thể gửi tin nhắn: kênh không hợp lệ.");
      return;
    }

    const userID = sessionStorage.getItem("userID");
    const messageData = {
      channelId: currentChannel.id,
      senderId: userID,
      content: newMessage,
      messageType: "Text",
    };

    try {
      if (socket) {
        socket.send(JSON.stringify(messageData));
      } else {
        throw new Error("WebSocket không hoạt động")
      }
      
      console.log("messageData gửi API:", messageData);
      const response = await sendMessage(messageData);
      console.log("Response từ API:", response);
      console.log("Messages trước setMessages:", messages);
      setMessages((prevMessages) => [
        ...prevMessages,
      ]);

      setNewMessage("");
    } catch (err) {
      setError("Không thể gửi tin nhắn.");
    }
  };

  const fetchFriends = async () => {
    try {
      const userId = sessionStorage.getItem("userID"); // Lấy ID người dùng từ localStorage
      const response = await API.get(`/friends/${userId}`);
      setFriends(response.data);
    } catch (err) {
      setError("Không thể tải danh sách bạn bè.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const userId = sessionStorage.getItem("userID"); // Lấy ID người dùng từ localStorage
      const response = await API.get(`/friend-requests/${userId}`);
      setFriendRequests(response.data);
    } catch (err) {
      setError("Không thể tải danh sách lời mời kết bạn.");
    } finally {
      setLoading(false);
    }
  };

  const renderFriends = () => {
    if (loading) return <p>Đang tải...</p>;
    if (error) return <p>{error}</p>;
    if (friends.length === 0) return <p>Không có bạn bè nào.</p>;

    return (
      <ul className="friend-list">
        {friends.map((friend) => (
          <li key={friend.id}>
            <p>{friend.name}</p>
          </li>
        ))}
      </ul>
    );
  };

  const renderFriendRequests = () => {
    if (loading) return <p>Đang tải...</p>;
    if (error) return <p>{error}</p>;
    if (friendRequests.length === 0) return <p>Không có lời mời kết bạn.</p>;

    return (
      <ul className="friend-request-list">
        {friendRequests.map((request) => (
          <li key={request.id}>
            <p>{request.name}</p>
            <div className="request-actions">
              <button className="accept-btn">Chấp nhận</button>
              <button className="decline-btn">Từ chối</button>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  const renderContent = () => {
    switch (selectedOption) {
      case "Danh sách bạn bè":
        return renderFriends();
      case "Lời mời kết bạn":
        return renderFriendRequests();
      default:
        return <p>Chọn một tùy chọn để xem nội dung.</p>;
    }
  };

  const renderChatWindow = () => {
    if (loading) return <p>Đang tải...</p>;
    if (error) return <p>{error}</p>;
    if (!currentChannel) return <p>Chưa chọn kênh chat nào.</p>;
  
    return (
      <div className="chat-window">
        <h3>{currentChannel.name}</h3>
        <img src={currentChannel.avatar} alt={currentChannel.name} width={50}/>
        <div className="messages">
        {messages.length > 0 ? (
          messages.map((msg) => (
            <div key={msg.id} className="message">
              <div className="content">
                <img
                src={msg.senderAvatar} // Avatar của người dùng (nếu kênh private) hoặc avatar mặc định
                alt="Avatar"
                className="avatar"
                width={20}
                />
                <span>{msg.senderName}</span>
                <p>{msg.content}</p>
                <span className="timestamp">{new Date(msg.timestamp).toLocaleString()}</span>
              </div>
            </div>
          ))
        ) : (
          <p>Chưa có tin nhắn</p>
        )}

        </div>
        <div className="chat-input">
          <input
            type="text"
            placeholder="Nhập tin nhắn..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button onClick={handleSendMessage}>Gửi</button>
        </div>
      </div>
    );
  };
  
  if (mode === "chat") {
    return <div className="column column-3">{renderChatWindow()}</div>;
  }

  if (mode === "friends") {
    return (
      <div className="column column-3">
        <div className="header">{selectedOption}</div>
        {selectedOption !== "Lời mời kết bạn" && (
          <div className="search-bar">
            <input
              type="text"
              placeholder={`Tìm kiếm ${selectedOption.toLowerCase()}...`}
              className="search-input"
            />
          </div>
        )}
        <div className="list-container">{renderContent()}</div>
      </div>
    );
  }

  return null;
};

export default Column3;
