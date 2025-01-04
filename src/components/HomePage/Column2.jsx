import React, { useState, useEffect } from "react";
import { searchUserByPhone, checkFriendStatus, getChatChannelHistory, createPrivateChannel, searchPrivateChannel } from "../../services/api";

const Column2 = ({ mode, onSelectOption }) => {
  const [searchMode, setSearchMode] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedOption, setSelectedOption] = useState("Danh sách bạn bè");
  const [friendModalVisible, setFriendModalVisible] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [friendStatus, setFriendStatus] = useState("none");
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const options = [
      "Danh sách bạn bè",
      "Danh sách kênh",
      "Lời mời kết bạn",
  ];

  const currentUserId = sessionStorage.getItem("userID");

  const handleOptionClick = (option) => {
      setSelectedOption(option);
      onSelectOption(option); // Gọi hàm truyền từ Column3
  };

  const enableSearchMode = () => setSearchMode(true);
  const disableSearchMode = () => setSearchMode(false);
  const clearSearchText = () => setSearchText("");
  const openFriendModal = () => setFriendModalVisible(true);
  const closeFriendModal = () => {
      setFriendModalVisible(false);
      setSearchResult(null);
      setSearchError("");
    };
  
    const handleSearch = async () => {
      setSearchError("");
      setSearchResult(null);
    
      if (!searchText.trim()) {
        setSearchError("Vui lòng nhập số điện thoại.");
        return;
      }
    
      try {
        const result = await searchUserByPhone(searchText);
        if (result) {
          setSearchResult(result);
        } else {
          setSearchError("Không tìm thấy người dùng.");
        }
      } catch (error) {
        setSearchError("Lỗi không xác định.");
      }
    };    

    const handleStartPrivateChat = async (targetUserID) => {
      try {
        const currentUserID = sessionStorage.getItem("userID");
    
        // Kiểm tra xem kênh riêng tư đã tồn tại chưa
        const existingChannel = await searchPrivateChannel(currentUserID, targetUserID);
    
        if (existingChannel) {
          // Nếu kênh đã tồn tại, chuyển sang chế độ chat với kênh đó
          onSelectOption({ mode: "chat", channel: existingChannel });
        } else {
          // Nếu chưa có kênh, tạo kênh mới
          const newChannel = await createPrivateChannel(currentUserID, targetUserID);
          if (newChannel) {
            onSelectOption({ mode: "chat", channel: newChannel });
          } else {
            alert("Không thể tạo kênh mới.");
          }
        }
      } catch (error) {
        console.error("Lỗi khi bắt đầu chat riêng:", error);
        alert("Không thể bắt đầu cuộc trò chuyện.");
      }
    };
    
    
    // Lấy lịch sử kênh chat
    useEffect(() => {
      const fetchChatHistory = async () => {
        setLoading(true);
        setError("");
        try {
          const channels = await getChatChannelHistory(currentUserId);
          setChatHistory(channels);
        } catch (err) {
          setError("Không thể tải lịch sử kênh chat.");
        } finally {
          setLoading(false);
        }
      };

      if (currentUserId) {
        fetchChatHistory();
      }
    }, [currentUserId]);

    // Kiểm tra trạng thái bạn bè
    useEffect(() => {
      const fetchFriendStatus = async () => {
        if (searchResult && searchResult.id !== currentUserId) {
          try {
            const status = await checkFriendStatus(currentUserId, searchResult.id);
            setFriendStatus(status);
          } catch (error) {
            console.error("Lỗi khi kiểm tra trạng thái bạn bè:", error);
          }
        } else {
          setFriendStatus("none");
        }
      };

      if (searchResult) {
        fetchFriendStatus();
      }
    }, [searchResult, currentUserId]);

    if (mode === "chat") {
      return (
        <div className="column column-2">
          {searchMode ? (
            <div className="search-container">
              <div className="search-bar active">
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên kênh..."
                  className="search-input"
                />
                <button className="close-btn" onClick={disableSearchMode}>
                  Đóng
                </button>
              </div>
              <div className="search-results">Kết quả tìm kiếm (Sẽ thêm sau)</div>
            </div>
          ) : (
            <div>
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Nhập để tìm kiếm..."
                  className="search-input"
                  onClick={enableSearchMode}
                />
                <button className="add-friend-btn" onClick={openFriendModal}>
                  Kết bạn
                </button>
                <button className="create-group-btn">Tạo nhóm</button>
              </div>
              {loading ? (
                <div>Đang tải...</div>
              ) : error ? (
                <div className="error-message">{error}</div>
              ) : chatHistory.length === 0 ? (
                <div>Chưa có lịch sử kênh chat.</div>
              ) : (
                <ul className="chat-history-list">
                  {chatHistory.map((channel) => (
                    <li key={channel.channelID} className="chat-history-item">
                      <div className="channel-avatar">
                        <img src={channel.channelAvatar || channel.userAvatar} alt="Avatar" width={40} />
                        <span className="channel-name">{channel.channelName || channel.userName}</span>
                      </div>
                      <div className="channel-info">
                        <span className="last-message">{channel.lastMessage || "Chưa có tin nhắn nào"}</span><br></br>
                        <span className="last-message-time">
                          {new Date(channel.lastActive).toLocaleString()}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
    
          {friendModalVisible && (
            <div className="friend-modal">
              <div className="modal-row">
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Nhập số điện thoại..."
                  className="modal-search-input"
                />
                <button className="clear-btn" onClick={clearSearchText}>
                  X
                </button>
                <button className="search-btn" onClick={handleSearch}>
                  Tìm kiếm
                </button>
              </div>
              <div className="modal-row modal-results">
                {searchError ? (
                  <p className="error-message">{searchError}</p>
                  ) : searchResult ? (
                    <div className="search-result">
                      <p>Tên: {searchResult.name}</p>
                      <p>Số điện thoại: {searchResult.phone}</p>
                      {searchResult.id === currentUserId ? (
                        <p>Đây là tài khoản của bạn.</p>
                      ) : (
                        <>
                          {friendStatus === "none" && (
                            <>
                              <button className="add-friend-btn" >
                                Kết bạn
                              </button>
                              <button className="message-btn" onClick={() => handleStartPrivateChat(searchResult.id)} >
                                Nhắn tin
                              </button>
                            </>
                          )}
                          {friendStatus === "Pending" && (
                            <>
                              <button className="cancel-request-btn" >
                                Hủy yêu cầu
                              </button>
                              <button className="message-btn" onClick={() => handleStartPrivateChat(searchResult.id)} >
                                Nhắn tin
                              </button>
                            </>
                          )}
                          {friendStatus === "Friend" && (
                            <button className="message-btn" onClick={() => handleStartPrivateChat(searchResult.id)} >
                              Nhắn tin
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <p>Không có kết quả tìm kiếm.</p>
                  )}
              </div>
              <div className="modal-row">
                <button className="cancel-btn" onClick={closeFriendModal}>
                  Hủy
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }      

    if (mode === "friends") {
        return (
        <div className="column column-2">
            {/* Hàng 1: Tìm kiếm và kết bạn */}
            <div className="top-row">
            <input
                type="text"
                placeholder="Nhập để tìm kiếm..."
                className="search-input"
                onClick={enableSearchMode}
            />
            {searchMode ? (
                // Chỉ hiển thị khi chế độ tìm kiếm được bật
                <>
                <button className="close-btn" onClick={disableSearchMode}>
                    Đóng
                </button>
                </>
            ) : (
                <>
                <button className="add-friend-btn" onClick={openFriendModal}>
                    Kết bạn
                </button>
                <button className="create-group-btn">Tạo nhóm</button>
                </>
            )}
            </div>

            {searchMode ? (
            <div className="search-results">Kết quả tìm kiếm (Sẽ thêm sau)</div>
            ) : (
            <div className="friends-options vertical">
                {options.map((option) => (
                <button
                    key={option}
                    className={`option-btn ${selectedOption === option ? "active" : ""}`}
                    onClick={() => handleOptionClick(option)}
                >
                    {option}
                </button>
                ))}
            </div>
            )}

            {/* Hàng 2: Danh sách bạn bè */}
            <div className="bottom-row">
            {/* Nội dung hàng dưới (danh sách bạn bè hoặc các mục khác) */}
            </div>

            {friendModalVisible && (
            <div className="friend-modal">
                <div className="modal-row">
                <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Nhập số điện thoại..."
                    className="modal-search-input"
                />
                <button className="clear-btn" onClick={clearSearchText}>
                    X
                </button>
                <button className="search-btn">Tìm kiếm</button>
                </div>
                <div className="modal-row modal-results">
                <p>Kết quả tìm kiếm sẽ hiển thị tại đây</p>
                </div>
                <div className="modal-row">
                <button className="cancel-btn" onClick={closeFriendModal}>
                    Hủy
                </button>
                </div>
            </div>
            )}
        </div>
        );
    }

    return null;
};

export default Column2;
