import React, { useEffect, useRef, useState } from "react";
import {
  getMessages,
  getFriends,
  getFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  connectWebSocket,
  sendWebSocketMessage,
  getChannelMembers,
  // 2 API dưới đây cần có trong services/api.js
  recallMessage,
  hideMessageForMe,
} from "../../services/api";
import { BsThreeDotsVertical } from "react-icons/bs";
import ChannelMenu from "../Channel/ChannelMenu";
import ChannelModal from "../Channel/ChannelModal";

const Column3 = ({ mode, selectedOption, currentChannel }) => {
  const [friends, setFriends] = useState([]);
  const [friendsError, setFriendsError] = useState("");
  const [friendRequests, setFriendRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [friendRequestsError, setFriendRequestsError] = useState("");
  const [messages, setMessages] = useState([]);
  const [messagesError, setMessagesError] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newMessageError, setNewMessageError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [myRole, setMyRole] = useState("Member");
  const [modal, setModal] = useState({ type: null, data: null });

  // ----- context menu -----
  const [ctxMenu, setCtxMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    message: null,
  });

  const me = sessionStorage.getItem("userID");
  const scrollBottomRef = useRef(null);
  const listRef = useRef(null); // khung cuộn tin nhắn

  // Auto scroll
  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Đóng context menu khi click ngoài / ESC
  useEffect(() => {
    const onDocClick = () => setCtxMenu((s) => ({ ...s, visible: false, message: null }));
    const onEsc = (e) => {
      if (e.key === "Escape") onDocClick();
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    // KHÔNG add listener cho 'contextmenu' nữa, kẻo vừa mở đã bị đóng
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  // Điều hướng dữ liệu theo mode/option
  useEffect(() => {
    if (mode === "friends") {
      setLoading(true);
      if (selectedOption === "Danh sách bạn bè") {
        fetchFriends();
      } else if (selectedOption === "Lời mời kết bạn") {
        fetchFriendRequests();
      }
    } else if (mode === "chat" && currentChannel) {
      if (!currentChannel || (!currentChannel.id && !currentChannel.channelID)) {
        setMessagesError("Kênh không hợp lệ.");
        return;
      }
      fetchMessages(currentChannel.id || currentChannel.channelID);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedOption, currentChannel]);

  // WebSocket realtime
  useEffect(() => {
    if (!currentChannel) return;
    const currentId = currentChannel.id || currentChannel.channelID;

    const ws = connectWebSocket((incoming) => {
      if (!incoming?.channelId) return;
      if (incoming.channelId !== currentId) return;

      // Nếu là sự kiện recall
      if (incoming.type === "message_recalled") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === incoming.messageId
              ? { ...m, recalled: true, content: "" }
              : m
          )
        );
        return; // dừng, không chuẩn hoá như message thường
      }

      // Nếu là tin nhắn thường
      const standardizedMessage = {
        id: incoming.id || Math.random().toString(36).substring(7),
        content: incoming.content ?? "",
        timestamp: incoming.timestamp || new Date().toISOString(),
        messageType: incoming.messageType || "Text",
        senderId: incoming.senderId || "Unknown",
        senderName: incoming.senderName || "Người gửi",
        senderAvatar: incoming.senderAvatar || "/default-avatar.png",
        status: incoming.status || "sent",
        recalled: !!incoming.recalled,
        url: incoming.url || null,
        fileId: incoming.fileId || null,
        channelId: incoming.channelId,
      };

      setMessages((prev) => [...prev, standardizedMessage]);
    });

    return () => ws.close();
  }, [currentChannel]);

  // API: Messages
  const fetchMessages = async (channelID) => {
    try {
      const userID = sessionStorage.getItem("userID");
      const response = await getMessages(channelID, userID);
      const list = Array.isArray(response?.messages)
        ? response.messages
        : Array.isArray(response?.message)
        ? response.message
        : Array.isArray(response)
        ? response
        : [];
      setMessages(list);
      setMessagesError("");
    } catch (err) {
      setMessages([]);
      setMessagesError("Không thể tải tin nhắn: " + (err?.message || "Unknown error"));
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    if (!currentChannel || (!currentChannel.id && !currentChannel.channelID)) {
      setMessagesError("Không thể gửi tin nhắn: kênh không hợp lệ.");
      return;
    }
    try {
      await sendWebSocketMessage(currentChannel.id || currentChannel.channelID, newMessage, "Text");
      setNewMessage("");
      setNewMessageError("");
    } catch (err) {
      setNewMessageError("Không thể gửi tin nhắn.");
    }
  };

  // Helpers
  const isMine = (msg) => msg?.senderId?.toString() === me?.toString();

  // Mở menu tại vị trí chuột phải (theo toạ độ của khung cuộn listRef)
  const openMessageMenu = (e, msg) => {
    e.preventDefault();
    e.stopPropagation();

    const host = listRef.current;
    if (!host) return;

    const hostRect = host.getBoundingClientRect();
    let x = e.clientX - hostRect.left + host.scrollLeft;
    let y = e.clientY - hostRect.top + host.scrollTop;

    const menuWidth = 190;
    const menuHeight = 80;

    if (x + menuWidth > host.scrollWidth) x = host.scrollWidth - menuWidth - 10;
    if (y + menuHeight > host.scrollHeight) y = host.scrollHeight - menuHeight - 10;

    setCtxMenu({ visible: true, x, y, message: msg });
  };

  const handleRecall = async () => {
    if (!ctxMenu.message?.id) return;
    try {
      await recallMessage(ctxMenu.message.id);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === ctxMenu.message.id ? { ...m, recalled: true, content: "" } : m
        )
      );
    } catch (err) {
      alert(err?.message || "Không thể thu hồi tin nhắn");
    } finally {
      setCtxMenu((s) => ({ ...s, visible: false, message: null }));
    }
  };

  // Thời gian cho phép thu hồi tin nhắn (2 phút)
  const RECALL_WINDOW_MS = 2 * 60 * 1000;

  // Kiểm tra tin nhắn có hết hạn thu hồi chưa
  const isRecallExpired = (msg) => {
    if (!msg?.timestamp) return true;
    const msgTime = new Date(msg.timestamp).getTime();
    return Date.now() - msgTime > RECALL_WINDOW_MS;
  };

  const handleHideForMe = async () => {
    if (!ctxMenu.message?.id) return;
    try {
      await hideMessageForMe(ctxMenu.message.id);
      setMessages((prev) => prev.filter((m) => m.id !== ctxMenu.message.id));
    } catch (err) {
      alert(err?.message || "Không thể xóa tin nhắn phía bạn");
    } finally {
      setCtxMenu((s) => ({ ...s, visible: false, message: null }));
    }
  };

  // API: Friends
  const fetchFriends = async () => {
    try {
      const userId = sessionStorage.getItem("userID");
      const res = await getFriends(userId);
      setFriends(Array.isArray(res) ? res : []);
      setFriendsError("");
    } catch {
      setFriends([]);
      setFriendsError("Không thể tải danh sách.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const userId = sessionStorage.getItem("userID");
      const res = await getFriendRequests(userId);
      setFriendRequests(Array.isArray(res) ? res : []);
      setFriendRequestsError("");
    } catch {
      setFriendRequests([]);
      setFriendRequestsError("Không thể tải danh sách lời mời kết bạn.");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptFriendRequest = async (friendID) => {
    const userID = sessionStorage.getItem("userID");
    try {
      await acceptFriendRequest(userID, friendID);
      setFriendRequests((prev) => prev.filter((r) => r.friendID !== friendID));
    } catch {}
  };

  const handleDeclineFriendRequest = async (friendID) => {
    const userID = sessionStorage.getItem("userID");
    try {
      await declineFriendRequest(userID, friendID);
      setFriendRequests((prev) => prev.filter((r) => r.friendID !== friendID));
    } catch {
      alert("Không thể từ chối lời mời kết bạn.");
    }
  };

  const handleRemoveFriend = async (friendID) => {
    const userID = sessionStorage.getItem("userID");
    try {
      await removeFriend(userID, friendID);
      setFriends((prev) => prev.filter((f) => f.friendID !== friendID));
    } catch {
      alert("Không thể xóa bạn.");
    }
  };

  const handleOpenMenu = async () => {
    if (!currentChannel?.channelID) return;
    try {
      const members = await getChannelMembers(currentChannel.channelID);
      const me = sessionStorage.getItem("userID");
      const myMember = members.find((m) => m.MemberID === me);
      setMyRole(myMember?.Role || "Member");
      setMenuOpen(true);
    } catch (err) {
      console.error("Không thể lấy danh sách thành viên:", err);
      setMenuOpen(true);
    }
  };

  const handleChannelAction = (action) => {
    switch (action) {
      case "addMember":
        setModal({ type: "addMember" });
        break;
      case "listMembers":
        setModal({ type: "listMembers" });
        break;
      case "blockedList":
        setModal({ type: "blockedList" });
        break;
      case "leaveChannel":
        setModal({ type: "confirmLeave" });
        break;
      case "dissolveChannel":
        setModal({ type: "confirmDissolve" });
        break;
      default:
        alert("Chức năng chưa được hỗ trợ");
    }
  };

  // UI
  const renderChatWindow = () => (
    <div className="flex h-full flex-col rounded-xl p-4 bg-gradient-to-br from-black via-purple-900 to-black shadow-[0_0_20px_#a855f7]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-purple-700 pb-3 mb-3">
        <img
          src={currentChannel?.userAvatar || currentChannel?.channelAvatar}
          alt={currentChannel?.userName || currentChannel?.channelName || "Channel"}
          className="w-10 h-10 rounded-full border border-purple-400 object-cover"
        />
        <div>
          <h3 className="text-lg font-bold text-purple-300">
            {currentChannel?.channelName || currentChannel?.userName || "Không tên"}
          </h3>
          <p className="text-xs text-gray-400">{currentChannel?.channelType || ""}</p>
        </div>
        <button
          onClick={handleOpenMenu}
          className="ml-auto p-2 rounded-full hover:bg-purple-700/30 transition"
        >
          <BsThreeDotsVertical className="w-6 h-6 text-gray-400 hover:text-white" />
        </button>
        <ChannelMenu
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          currentChannel={currentChannel}
          role={myRole}
          onAction={handleChannelAction}
        />
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="relative flex-1 overflow-y-auto space-y-2 p-2 rounded-lg bg-black/30 backdrop-blur-sm"
      >
        {messagesError && <p className="text-red-400 text-sm">{messagesError}</p>}
        {messages.length > 0 ? (
          messages.map((msg) => {
            const mine = isMine(msg);
            const isRecalled = !!msg.recalled;
            return (
              <div
                key={msg.id || msg.timestamp}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
                onContextMenu={(e) => openMessageMenu(e, msg)}
              >
                <div className="max-w-[70%] flex items-start gap-2">
                  {!mine && !isRecalled && (
                    <img
                      src={msg.senderAvatar || "/default-avatar.png"}
                      alt="avatar"
                      className="w-7 h-7 rounded-full border border-purple-500 object-cover shrink-0"
                    />
                  )}
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm text-white shadow transition select-text
                      ${
                        mine
                          ? "bg-gradient-to-r from-fuchsia-600 via-purple-600 to-blue-600 shadow-[0_0_12px_#a855f7]"
                          : "bg-purple-700/30 border border-purple-500/40"
                      } ${isRecalled ? "opacity-70" : ""}`}
                  >
                    {!mine && !isRecalled && (
                      <div className="text-xs text-purple-300 font-semibold mb-0.5">
                        {msg.senderName || "Người gửi"}
                      </div>
                    )}
                    {isRecalled ? (
                      <div className="italic text-gray-200">Tin nhắn đã được thu hồi</div>
                    ) : (
                      <div className="break-words">{msg.content}</div>
                    )}
                    <div className="text-[10px] text-gray-300 mt-1 text-right">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-gray-400 italic">Chưa có tin nhắn</p>
        )}

        {/* Context menu tin nhắn */}
        {ctxMenu.visible && ctxMenu.message && (
          <div
            className="absolute z-50 min-w-[190px] rounded-lg border border-purple-600/40 bg-[#1a1426] shadow-xl p-1"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              className={`w-full text-left px-3 py-2 rounded-md hover:bg-purple-700/30
                ${
                  isMine(ctxMenu.message)
                    ? isRecallExpired(ctxMenu.message)
                      ? "text-gray-400 cursor-not-allowed opacity-60" // hết hạn → xám + khóa
                      : "text-red-400 font-semibold" // còn hạn → đỏ đậm để nhấn mạnh
                    : "text-gray-400 cursor-not-allowed"
                }
                ${ctxMenu.message.recalled ? "opacity-60 cursor-not-allowed" : ""}`}
              onClick={
                isMine(ctxMenu.message) &&
                !ctxMenu.message.recalled &&
                !isRecallExpired(ctxMenu.message)
                  ? handleRecall
                  : undefined
              }
              disabled={
                !isMine(ctxMenu.message) ||
                ctxMenu.message.recalled ||
                isRecallExpired(ctxMenu.message)
              }
            >
              {isRecallExpired(ctxMenu.message)
                ? "Thu hồi (hết hạn)"
                : "Thu hồi tin nhắn"}
            </button>

            <button
              className="w-full text-left px-3 py-2 rounded-md hover:bg-purple-700/30 text-white"
              onClick={handleHideForMe}
            >
              Xóa tin nhắn phía bạn
            </button>
          </div>
        )}

        <div ref={scrollBottomRef} />
      </div>

      {/* Input */}
      <div className="mt-3 flex items-center gap-2">
        {newMessageError && <p className="text-red-400 text-sm">{newMessageError}</p>}
        <input
          type="text"
          placeholder="Nhập tin nhắn..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          className="flex-1 px-4 py-2 rounded-xl bg-white/10 text-white placeholder-gray-400 border border-purple-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
        />
        <button
          onClick={handleSendMessage}
          className="px-4 py-2 bg-gradient-to-r from-fuchsia-500 via-purple-600 to-blue-600 rounded-xl text-white font-bold shadow hover:scale-105 hover:shadow-[0_0_15px_#a855f7] transition-transform"
        >
          Gửi
        </button>
      </div>
    </div>
  );

  const renderFriends = () => {
    if (loading) return <p className="text-gray-300">Đang tải...</p>;
    if (friendsError) return <p className="text-red-400">{friendsError}</p>;
    if (!Array.isArray(friends) || friends.length === 0)
      return <p className="text-gray-400">Không có bạn bè nào.</p>;

    return (
      <div className="rounded-xl p-4 bg-gradient-to-br from-black via-purple-900 to-black shadow-[0_0_15px_#a855f7]">
        <h3 className="text-xl font-bold text-purple-300 mb-4">Danh sách bạn bè</h3>
        <ul className="space-y-3">
          {friends.map((friend) => (
            <li
              key={friend.friendID}
              className="flex items-center justify-between p-2 bg-black/30 rounded-lg hover:bg-purple-900/40 transition"
            >
              <div className="flex items-center gap-3">
                <img
                  src={friend.friendAvatar}
                  alt={friend.friendName}
                  className="w-10 h-10 rounded-full border border-purple-400 object-cover"
                />
                <p className="text-white">{friend.friendName}</p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 rounded-lg bg-purple-700 text-white hover:bg-purple-600">
                  Nhắn tin
                </button>
                <button
                  className="px-3 py-1 rounded-lg bg-red-700 text-white hover:bg-red-600"
                  onClick={() => handleRemoveFriend(friend.friendID)}
                >
                  Xóa
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderFriendRequests = () => {
    if (loading) return <p className="text-gray-300">Đang tải...</p>;
    if (friendRequestsError) return <p className="text-red-400">{friendRequestsError}</p>;
    if (friendRequests.length === 0) return <p className="text-gray-400">Không có lời mời kết bạn.</p>;

    return (
      <div className="rounded-xl p-4 bg-gradient-to-br from-black via-purple-900 to-black shadow-[0_0_15px_#a855f7]">
        <h3 className="text-xl font-bold text-purple-300 mb-4">Lời mời kết bạn</h3>
        <ul className="space-y-3">
          {friendRequests.map((request) => (
            <li
              key={request.requestID}
              className="flex items-center justify-between p-2 bg-black/30 rounded-lg hover:bg-purple-900/40 transition"
            >
              <div className="flex items-center gap-3">
                <img
                  src={request.friendAvatar}
                  alt={request.friendName}
                  className="w-10 h-10 rounded-full border border-purple-400 object-cover"
                />
                <p className="text-white">{request.friendName}</p>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 rounded-lg bg-green-600 hover:bg-green-500 text-white"
                  onClick={() => handleAcceptFriendRequest(request.friendID)}
                >
                  Chấp nhận
                </button>
                <button
                  className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white"
                  onClick={() => handleDeclineFriendRequest(request.friendID)}
                >
                  Từ chối
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="column column-3 h-full p-3">
      {mode === "chat" ? (
        currentChannel ? (
          renderChatWindow()
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            Chưa chọn kênh chat nào.
          </div>
        )
      ) : mode === "friends" ? (
        selectedOption === "Danh sách bạn bè" ? (
          renderFriends()
        ) : selectedOption === "Lời mời kết bạn" ? (
          renderFriendRequests()
        ) : (
          <p className="text-gray-400">Chọn một tùy chọn để xem nội dung.</p>
        )
      ) : null}

      <ChannelModal
        modal={modal}
        currentChannel={currentChannel}
        onClose={() => setModal({ type: null, data: null })}
      />
    </div>
  );
};

export default Column3;
