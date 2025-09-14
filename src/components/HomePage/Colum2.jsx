import React, { useState, useEffect } from "react";
import { 
  searchUserByPhone, checkFriendStatus, getChatChannelHistory, 
  createPrivateChannel, createGroupChannel, searchPrivateChannel, 
  sendFriendRequest, getFriends, getUserByID 
} from "../../services/api";

// ----- Component con cho Item Chat -----
const ChatItem = ({ channel, onSelect }) => (
  <li className="flex items-center justify-between p-2 hover:bg-purple-900 rounded cursor-pointer" onClick={() => onSelect(channel)}>
    <div className="flex items-center gap-2">
      <img src={channel.channelAvatar || channel.userAvatar} alt="Avatar" className="w-10 h-10 rounded-full" />
      <div>
        <p className="text-purple-200 font-semibold">{channel.channelName || channel.userName}</p>
        <p className="text-gray-400 text-xs">{channel.lastMessage || "Chưa có tin nhắn nào"}</p>
      </div>
    </div>
    <span className="text-gray-500 text-xs">{new Date(channel.lastActive).toLocaleString()}</span>
  </li>
);

// ----- Friend Modal -----
const FriendModal = ({ searchText, setSearchText, searchResult, searchError, clearSearchText, onSearch, onClose, onSendRequest, onStartChat, friendStatus, currentUserId }) => (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
    <div className="bg-gray-900 text-purple-200 p-4 rounded w-96 space-y-3">
      <div className="flex gap-2">
        <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Nhập số điện thoại..." className="flex-1 p-2 rounded bg-gray-800 border border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"/>
        <button onClick={clearSearchText} className="px-3 bg-red-600 rounded hover:bg-red-500">X</button>
        <button onClick={onSearch} className="px-3 bg-purple-700 rounded hover:bg-purple-600">Tìm kiếm</button>
      </div>
      <div>
        {searchError ? <p className="text-red-500">{searchError}</p> :
         searchResult ? (
          <div className="p-2 border border-purple-700 rounded">
            <p>Tên: {searchResult.name}</p>
            <p>Số điện thoại: {searchResult.phone}</p>
            {searchResult.id === currentUserId ? <p>Đây là tài khoản của bạn.</p> :
              <>
                {friendStatus === "none" && <div className="flex gap-2 mt-2">
                  <button onClick={() => onSendRequest(searchResult.id)} className="px-2 py-1 bg-purple-700 rounded hover:bg-purple-600">Kết bạn</button>
                  <button onClick={() => onStartChat(searchResult.id)} className="px-2 py-1 bg-purple-700 rounded hover:bg-purple-600">Nhắn tin</button>
                </div>}
                {friendStatus === "Pending" && <div className="flex gap-2 mt-2">
                  <button className="px-2 py-1 bg-red-600 rounded">Hủy yêu cầu</button>
                  <button onClick={() => onStartChat(searchResult.id)} className="px-2 py-1 bg-purple-700 rounded hover:bg-purple-600">Nhắn tin</button>
                </div>}
                {friendStatus === "Friend" && <button onClick={() => onStartChat(searchResult.id)} className="px-2 py-1 bg-purple-700 rounded hover:bg-purple-600 mt-2">Nhắn tin</button>}
              </>
            }
          </div>
         ) : <p>Không có kết quả tìm kiếm.</p>}
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1 bg-red-600 rounded hover:bg-red-500">Hủy</button>
      </div>
    </div>
  </div>
);

// ----- Group Modal -----
const GroupModal = ({ friends, groupMembers, groupName, setGroupName, selectedMemberPhone, setSelectedMemberPhone, groupSearchResult, groupSearchError, onClose, onAddMember, onSearchMember, onCreateGroup }) => (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
    <div className="bg-gray-900 text-purple-200 p-4 rounded w-96 space-y-3 max-h-[80vh] overflow-y-auto">
      <div>
        <p className="font-semibold mb-1">Danh sách bạn bè</p>
        {friends.length > 0 ? (
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {friends.map(friend => (
              <li key={friend.friendID} className="flex justify-between items-center bg-gray-800 p-1 rounded">
                <span>{friend.friendName} ({friend.friendPhone})</span>
                <button className="px-2 py-1 bg-purple-700 rounded hover:bg-purple-600" onClick={() => onAddMember(friend)}>Thêm</button>
              </li>
            ))}
          </ul>
        ) : <p>Không có bạn bè nào.</p>}
      </div>

      <div>
        <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Nhập tên nhóm" className="w-full p-2 rounded bg-gray-800 border border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"/>
      </div>

      <div className="flex gap-2">
        <input type="text" value={selectedMemberPhone} onChange={(e) => setSelectedMemberPhone(e.target.value)} placeholder="Nhập số điện thoại thành viên" className="flex-1 p-2 rounded bg-gray-800 border border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"/>
        <button onClick={onSearchMember} className="px-3 bg-purple-700 rounded hover:bg-purple-600">Tìm</button>
      </div>

      <div>
        {groupSearchError && <p className="text-red-500">{groupSearchError}</p>}
        {groupSearchResult && <div className="p-2 border border-purple-700 rounded mt-1">
          <p>Thành viên: {groupSearchResult.name} ({groupSearchResult.phone})</p>
          <button className="px-2 py-1 bg-purple-700 rounded hover:bg-purple-600 mt-1" onClick={() => onAddMember(groupSearchResult)}>Thêm vào nhóm</button>
        </div>}
      </div>

      {groupMembers.length > 0 && (
        <div>
          <p className="font-semibold">Danh sách thành viên được thêm:</p>
          <ul className="space-y-1 max-h-32 overflow-y-auto">
            {groupMembers.map(member => (
              <li key={member.id || member.friendID} className="flex justify-between items-center bg-gray-800 p-1 rounded">
                <span>{member.name || member.friendName || "Không tên"} ({member.phone || member.friendPhone || "Không có số điện thoại"})</span>
                <button className="px-2 py-1 bg-red-600 rounded hover:bg-red-500" onClick={() => console.log("Xóa thành viên", member)}>Xóa</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1 bg-red-600 rounded hover:bg-red-500">Hủy</button>
        {groupMembers.length > 0 && <button onClick={onCreateGroup} className="px-3 py-1 bg-purple-700 rounded hover:bg-purple-600">Tạo nhóm</button>}
      </div>
    </div>
  </div>
);

// ----- Column2 chính -----
const Column2 = ({ mode, onSelectOption, setCurrentChannel }) => {
  const [searchMode, setSearchMode] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [friendStatus, setFriendStatus] = useState("none");

  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [friendModalVisible, setFriendModalVisible] = useState(false);
  const [groupModalVisible, setGroupModalVisible] = useState(false);

  const [groupMembers, setGroupMembers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [selectedMemberPhone, setSelectedMemberPhone] = useState("");
  const [groupSearchResult, setGroupSearchResult] = useState(null);
  const [groupSearchError, setGroupSearchError] = useState("");

  const currentUserId = sessionStorage.getItem("userID");
  const options = ["Danh sách bạn bè", "Danh sách kênh", "Lời mời kết bạn"];

  // ----- Fetch chat history -----
  useEffect(() => {
    const fetchChatHistory = async () => {
      setLoading(true); setError("");
      try {
        const channels = await getChatChannelHistory(currentUserId);
        setChatHistory(Array.isArray(channels) ? channels : []);
      } catch (err) { 
        setError("Không thể tải lịch sử kênh chat."); 
        setChatHistory([]);
      }
      finally { setLoading(false); }
    };
    if (currentUserId) fetchChatHistory();
  }, [currentUserId]);

  // ----- Check friend status -----
  useEffect(() => {
    const fetchFriendStatus = async () => {
      if (searchResult && searchResult.id !== currentUserId) {
        try { const status = await checkFriendStatus(currentUserId, searchResult.id); setFriendStatus(status); }
        catch { setFriendStatus("none"); }
      } else setFriendStatus("none");
    };
    fetchFriendStatus();
  }, [searchResult, currentUserId]);

  // ----- Handlers -----
  const enableSearchMode = () => setSearchMode(true);
  const disableSearchMode = () => setSearchMode(false);
  const clearSearchText = () => setSearchText("");
  const openFriendModal = () => setFriendModalVisible(true);
  const closeFriendModal = () => { setFriendModalVisible(false); setSearchResult(null); setSearchError(""); };
  const handleOptionClick = (option) => onSelectOption(option);

  const handleSearchFriend = async () => {
    setSearchError(""); setSearchResult(null);
    if (!searchText.trim()) { setSearchError("Vui lòng nhập số điện thoại."); return; }
    try {
      const result = await searchUserByPhone(searchText);
      if (result) setSearchResult(result);
      else setSearchError("Không tìm thấy người dùng.");
    } catch { setSearchError("Lỗi không xác định."); }
  };

  const handleSendFriendRequest = async (friendID) => {
    try { await sendFriendRequest(currentUserId, friendID); alert("Đã gửi yêu cầu kết bạn."); } 
    catch { alert("Không thể gửi yêu cầu kết bạn."); }
  };

  const handleStartPrivateChat = async (targetUserID) => {
    try {
      const existingChannel = await searchPrivateChannel(currentUserId, targetUserID);
      const channel = existingChannel || await createPrivateChannel(currentUserId, targetUserID);
      if (channel) { onSelectOption("Chat", channel); setCurrentChannel(channel); }
    } catch { alert("Không thể bắt đầu cuộc trò chuyện."); }
  };

  const handleOpenGroupModal = async () => {
    try {
      const friendsList = await getFriends(currentUserId);
      setFriends(friendsList || []);
      const user = await getUserByID(currentUserId);
      setGroupMembers([user]);
    } catch { setFriends([]); setGroupMembers([{ id: currentUserId, name: "Current User", phone: "N/A" }]); }
    setGroupModalVisible(true); setGroupSearchResult(null); setGroupSearchError(""); setGroupName("");
  };

  const handleAddMember = (member) => {
    const memberID = member.id || member.friendID;
    if (!memberID || memberID === currentUserId) return;
    if (!groupMembers.some(m => m.id === memberID || m.friendID === memberID)) {
      setGroupMembers([...groupMembers, { ...member, id: memberID }]);
      setGroupSearchResult(null); setSelectedMemberPhone("");
    }
  };

  const handleSearchMemberForGroup = async () => {
    if (!selectedMemberPhone.trim()) { setGroupSearchError("Vui lòng nhập số điện thoại thành viên."); return; }
    try {
      const result = await searchUserByPhone(selectedMemberPhone);
      if (result) setGroupSearchResult(result);
      else setGroupSearchError("Không tìm thấy người dùng.");
    } catch { setGroupSearchError("Lỗi không xác định."); }
  };

  const handleCreateGroupChannel = async () => {
    if (groupMembers.length < 3) { alert("Cần ít nhất 3 thành viên."); return; }
    try {
      const memberIds = groupMembers.map(m => m.id || m.friendID).filter(Boolean);
      const newChannel = await createGroupChannel(groupName, currentUserId, ...memberIds);
      if (newChannel) { onSelectOption("Chat", newChannel); setGroupModalVisible(false); }
    } catch { alert("Không thể tạo nhóm."); }
  };

  const handleSelectChannel = (channel) => setCurrentChannel(channel);

  // ----- Render -----
  if (mode === "chat") return (
    <div className="column-2 p-3 bg-gradient-to-b from-black via-gray-900 to-purple-950 h-full overflow-y-auto text-purple-200">
      <div className="flex gap-2 mb-3">
        <input type="text" placeholder="Nhập để tìm kiếm..." className="flex-1 p-2 rounded bg-gray-800 border border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500" onClick={enableSearchMode} />
        <button className="px-3 bg-purple-700 rounded hover:bg-purple-600" onClick={openFriendModal}>Kết bạn</button>
        <button className="px-3 bg-purple-700 rounded hover:bg-purple-600" onClick={handleOpenGroupModal}>Tạo nhóm</button>
      </div>

      {searchMode && (
        <div className="flex gap-2 mb-3">
          <input type="text" placeholder="Tìm kiếm theo tên kênh..." className="flex-1 p-2 rounded bg-gray-800 border border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"/>
          <button className="px-3 bg-red-600 rounded hover:bg-red-500" onClick={disableSearchMode}>Đóng</button>
        </div>
      )}

      {loading ? (
        <div>Đang tải...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : !Array.isArray(chatHistory) || chatHistory.length === 0 ? (
        <div>Chưa có lịch sử kênh chat.</div>
      ) : (
        <ul className="space-y-1">
          {chatHistory.map((c) => (
            <ChatItem key={c.channelID} channel={c} onSelect={handleSelectChannel} />
          ))}
        </ul>
      )}

      {friendModalVisible && <FriendModal
        searchText={searchText} setSearchText={setSearchText}
        searchResult={searchResult} searchError={searchError}
        clearSearchText={clearSearchText} onSearch={handleSearchFriend} onClose={closeFriendModal}
        onSendRequest={handleSendFriendRequest} onStartChat={handleStartPrivateChat}
        friendStatus={friendStatus} currentUserId={currentUserId}
      />}

      {groupModalVisible && <GroupModal
        friends={friends} groupMembers={groupMembers} groupName={groupName} setGroupName={setGroupName}
        selectedMemberPhone={selectedMemberPhone} setSelectedMemberPhone={setSelectedMemberPhone}
        groupSearchResult={groupSearchResult} groupSearchError={groupSearchError}
        onClose={() => setGroupModalVisible(false)}
        onAddMember={handleAddMember} onSearchMember={handleSearchMemberForGroup} onCreateGroup={handleCreateGroupChannel}
      />}
    </div>
  );

  if (mode === "friends") return (
    <div className="column-2 p-3 bg-gradient-to-b from-black via-gray-900 to-purple-950 h-full overflow-y-auto text-purple-200">
      <div className="flex gap-2 mb-3">
        <input type="text" placeholder="Nhập để tìm kiếm..." className="flex-1 p-2 rounded bg-gray-800 border border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500" onClick={enableSearchMode} />
        {searchMode ? <button className="px-3 bg-red-600 rounded hover:bg-red-500" onClick={disableSearchMode}>Đóng</button> :
          <>
            <button className="px-3 bg-purple-700 rounded hover:bg-purple-600" onClick={openFriendModal}>Kết bạn</button>
            <button className="px-3 bg-purple-700 rounded hover:bg-purple-600" onClick={handleOpenGroupModal}>Tạo nhóm</button>
          </>
        }
      </div>

      <div className="flex flex-col gap-2">
        {options.map(opt => (
          <button key={opt} className="w-full text-left px-3 py-2 bg-gray-800 rounded hover:bg-purple-900 hover:shadow-lg transition-all" onClick={() => handleOptionClick(opt)}>
            {opt}
          </button>
        ))}
      </div>

      {friendModalVisible && <FriendModal
        searchText={searchText} setSearchText={setSearchText}
        searchResult={searchResult} searchError={searchError}
        clearSearchText={clearSearchText} onSearch={handleSearchFriend} onClose={closeFriendModal}
        onSendRequest={handleSendFriendRequest} onStartChat={handleStartPrivateChat}
        friendStatus={friendStatus} currentUserId={currentUserId}
      />}

      {groupModalVisible && <GroupModal
        friends={friends} groupMembers={groupMembers} groupName={groupName} setGroupName={setGroupName}
        selectedMemberPhone={selectedMemberPhone} setSelectedMemberPhone={setSelectedMemberPhone}
        groupSearchResult={groupSearchResult} groupSearchError={groupSearchError}
        onClose={() => setGroupModalVisible(false)}
        onAddMember={handleAddMember} onSearchMember={handleSearchMemberForGroup} onCreateGroup={handleCreateGroupChannel}
      />}
    </div>
  );

  return null;
};

export default Column2;
