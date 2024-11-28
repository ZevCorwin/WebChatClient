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
      setCurrentChannel(selectedOption.channel);
      fetchMessages(selectedOption.channel.id);
    }
  }, [mode, selectedOption]);

  const fetchMessages = async (channelId) => {
    try {
      const messages = await getMessages(channelId); // Gọi hàm từ api.js
      setMessages(messages);
    } catch (err) {
      setError("Không thể tải tin nhắn.");
    }
  };
  

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return; // Kiểm tra tin nhắn không rỗng
    try {
      const userId = sessionStorage.getItem("userID");
      const messageData = {
        channelId: currentChannel.id,
        senderId: userId,
        content: newMessage,
        messageType: "Text", // Loại tin nhắn là văn bản
      };
  
      const response = await sendMessage(messageData); // Gọi hàm từ api.js
      setMessages([...messages, response]); // Thêm tin nhắn mới vào danh sách
      setNewMessage(""); // Reset input
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
    if (!currentChannel) return <p>Chưa chọn kênh chat nào.</p>;

    return (
      <div className="chat-window">
        <h3>{currentChannel.channelName}</h3>
        <div className="messages">
          {messages.map((message) => (
            <div key={message.id} className="message">
              <p>{message.content}</p>
            </div>
          ))}
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
