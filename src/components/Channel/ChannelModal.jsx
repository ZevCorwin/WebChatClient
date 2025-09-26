import React, { useEffect, useState } from "react";
import {
  getFriends,
  searchUserByPhone,
  getChannelMembers,
  addChannelMember,
  removeChannelMember,
  blockMember,
  unblockMember,
  leaveChannel,
  dissolveChannel,
  getUserByID,          // <-- thêm import
} from "../../services/api";

const ChannelModal = ({ modal, currentChannel, onClose }) => {
  const [friends, setFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [hydratedMembers, setHydratedMembers] = useState([]);  // members kèm name, avatar, phone
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(false);               // loading cho tìm kiếm
  const [membersLoading, setMembersLoading] = useState(false); // loading cho listMembers
  const [existingMemberIDs, setExistingMemberIDs] = useState([]);

  const me = sessionStorage.getItem("userID");

  const API_BASE = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

  // --- Load bạn bè + memberIDs khi mở modal AddMember ---
  useEffect(() => {
    if (modal.type === "addMember" && currentChannel?.channelID) {
      const fetchData = async () => {
        try {
          const [friendsRes, membersRes] = await Promise.all([
            getFriends(me),
            getChannelMembers(currentChannel.channelID),
          ]);
          setFriends(Array.isArray(friendsRes) ? friendsRes : []);
          const ids = Array.isArray(membersRes) ? membersRes.map((m) => m.MemberID) : [];
          setExistingMemberIDs(ids);
        } catch (err) {
          console.error("[ChannelModal][addMember init] Lỗi:", err);
        }
      };
      fetchData();
    }
  }, [modal.type, me, currentChannel]);

  // --- Load & hydrate danh sách thành viên ---
  useEffect(() => {
    if (modal.type === "listMembers" && currentChannel?.channelID) {
      const fetchMembers = async () => {
        setMembersLoading(true);
        try {
          const raw = await getChannelMembers(currentChannel.channelID);
          console.log("[ChannelModal][listMembers] raw members:", raw);
          const list = Array.isArray(raw) ? raw : [];

          // Lấy thông tin user cho từng MemberID
          const uniqueIds = Array.from(new Set(list.map((m) => m.MemberID).filter(Boolean)));
          console.log("[ChannelModal][listMembers] unique MemberIDs:", uniqueIds);
          const pairs = await Promise.all(
            uniqueIds.map(async (id) => {
              try {
                const user = await getUserByID(id);
                console.log("[ChannelModal][getUserByID] id:", id, "→ user:", user);
                return [id, user];
              } catch (err) {
                console.error("[ChannelModal][getUserByID] lỗi với id", id, err);
                return [id, null];
              }
            })
          );
          const profileMap = Object.fromEntries(pairs);

          const merged = list.map((m) => {
            const u = profileMap[m.MemberID] || {};
            console.log("[ChannelModal][merge] MemberID:", m.MemberID, "User:", u);
            return {
              ...m,
              name:
                u.name ||
                u.fullName ||
                u.username ||
                (typeof m.MemberID === "string" ? `#${m.MemberID.slice(-6)}` : "Người dùng"),
              avatar: u.avatarUrl || u.avatar || "/default-avatar.png",
              phone: u.phone || u.phoneNumber || "",
            };
          });

          console.log("[ChannelModal][hydratedMembers]", merged);
          setHydratedMembers(merged);
        } catch (err) {
          console.error("[ChannelModal][getChannelMembers] Lỗi:", err);
          setHydratedMembers([]);
        } finally {
          setMembersLoading(false);
        }
      };
      fetchMembers();
    }
  }, [modal.type, currentChannel]);

  // --- Tìm kiếm theo số điện thoại ---
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    try {
      const res = await searchUserByPhone(searchTerm);
      if (Array.isArray(res)) setSearchResults(res);
      else if (res) setSearchResults([res]);
      else setSearchResults([]);
    } catch (err) {
      console.error("[ChannelModal][searchUserByPhone] Lỗi:", err);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // --- Hành động ---
  const handleAddMember = async (memberID) => {
    try {
      await addChannelMember(currentChannel.channelID, memberID);
      // Cập nhật để nút chuyển "Đã tham gia"
      setExistingMemberIDs((prev) =>
        prev.includes(memberID) ? prev : [...prev, memberID]
      );
      // Nếu đang hiển thị kết quả search thì cũng có thể disable ngay
      setSearchResults((prev) =>
        prev.map((u) => (u.id === memberID ? { ...u, __justAdded: true } : u))
      );
      alert("Đã thêm thành viên!");
    } catch (err) {
      alert("Không thể thêm thành viên.");
    }
  };

  const handleRemoveMember = async (memberID) => {
    try {
      await removeChannelMember(currentChannel.channelID, memberID);
      alert("Đã xóa thành viên!");
      setHydratedMembers((prev) => prev.filter((m) => m.MemberID !== memberID));
    } catch (err) {
      alert("Không thể xóa thành viên.");
    }
  };

  const handleBlockMember = async (memberID) => {
    try {
      await blockMember(currentChannel.channelID, me, memberID);
      alert("Đã chặn thành viên!");
    } catch (err) {
      alert("Không thể chặn thành viên.");
    }
  };

  const handleUnblockMember = async (memberID) => {
    try {
      await unblockMember(currentChannel.channelID, me, memberID);
      alert("Đã bỏ chặn!");
      setBlocked((prev) => prev.filter((m) => m.MemberID !== memberID));
    } catch (err) {
      alert("Không thể bỏ chặn.");
    }
  };

  const handleLeaveChannel = async () => {
    try {
      await leaveChannel(currentChannel.channelID, me);
      alert("Bạn đã rời nhóm!");
      onClose();
    } catch (err) {
      alert("Không thể rời nhóm.");
    }
  };

  const handleDissolveChannel = async () => {
    try {
      await dissolveChannel(currentChannel.channelID, me);
      alert("Kênh đã bị giải tán!");
      onClose();
    } catch (err) {
      alert("Không thể giải tán kênh.");
    }
  };

  // --- Render nội dung theo loại modal ---
  const renderContent = () => {
    switch (modal.type) {
      case "addMember":
        return (
          <div>
            <h3 className="text-lg font-bold mb-2">Thêm thành viên</h3>

            {/* Tìm kiếm */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Nhập số điện thoại..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 p-2 rounded bg-gray-800 border border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleSearch}
                className="px-3 bg-purple-700 rounded hover:bg-purple-600"
              >
                Tìm kiếm
              </button>
            </div>

            {/* Trạng thái loading tìm */}
            {loading && <p className="text-sm text-gray-400">Đang tìm kiếm...</p>}
            {!loading && searchResults.length === 0 && searchTerm && (
              <p className="text-sm text-red-400">Không tìm thấy người dùng</p>
            )}

            {/* Kết quả tìm kiếm */}
            {!loading && searchResults.length > 0 && (
              <ul className="space-y-2 mb-4">
                {searchResults.map((u) => {
                  const isInChannel =
                    existingMemberIDs.includes(u.id) || u.__justAdded;
                  return (
                    <li
                      key={u.id}
                      className="flex justify-between items-center bg-gray-800 p-2 rounded"
                    >
                      <span>{u.name} ({u.phone})</span>
                      {isInChannel ? (
                        <button
                          disabled
                          className="px-2 py-1 bg-gray-600 rounded text-white"
                        >
                          Đã tham gia
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAddMember(u.id)}
                          className="px-2 py-1 bg-green-600 rounded hover:bg-green-500 text-white"
                        >
                          Thêm
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Danh sách bạn bè */}
            <h4 className="font-semibold mb-2">Bạn bè</h4>
            <ul className="space-y-2 max-h-40 overflow-y-auto">
              {friends.map((f) => {
                const isInChannel = existingMemberIDs.includes(f.friendID);
                return (
                  <li
                    key={f.friendID}
                    className="flex justify-between items-center bg-gray-800 p-2 rounded"
                  >
                    <span>
                      {f.friendName} ({f.friendPhone || "?"})
                    </span>
                    {isInChannel ? (
                      <button
                        disabled
                        className="px-2 py-1 bg-gray-600 rounded text-white"
                      >
                        Đã tham gia
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAddMember(f.friendID)}
                        className="px-2 py-1 bg-green-600 rounded hover:bg-green-500 text-white"
                      >
                        Thêm
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );

      case "listMembers":
        return (
          <div>
            <h3 className="text-lg font-bold mb-3">Danh sách thành viên</h3>

            {membersLoading ? (
              <p className="text-sm text-gray-400">Đang tải danh sách...</p>
            ) : hydratedMembers.length === 0 ? (
              <p className="text-sm text-gray-400">Chưa có thành viên.</p>
            ) : (
              <ul className="space-y-2">
                {hydratedMembers.map((m) => (
                  <li
                    key={m.MemberID}
                    className="flex items-center justify-between bg-gray-800 p-2 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={`${API_BASE}${m.avatar}` || "/default-avatar.png"}
                        alt={m.name}
                        className="w-8 h-8 rounded-full object-cover border border-purple-600"
                      />
                      <div className="leading-tight">
                        <div className="font-semibold">
                          {m.name}
                          <span className="ml-2 text-xs text-purple-300">
                            ({m.Role})
                          </span>
                        </div>
                        {m.phone && (
                          <div className="text-xs text-gray-400">{m.phone}</div>
                        )}
                      </div>
                    </div>

                    {m.MemberID !== me && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRemoveMember(m.MemberID)}
                          className="px-2 py-1 bg-red-600 rounded text-white"
                        >
                          Xóa
                        </button>
                        <button
                          onClick={() => handleBlockMember(m.MemberID)}
                          className="px-2 py-1 bg-yellow-600 rounded text-white"
                        >
                          Chặn
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );

      case "blockedList":
        return (
          <div>
            <h3 className="text-lg font-bold mb-2">Danh sách bị chặn</h3>
            <ul className="space-y-2">
              {blocked.length > 0 ? (
                blocked.map((m) => (
                  <li key={m.MemberID} className="flex justify-between">
                    <span>{m.MemberName || m.MemberID}</span>
                    <button
                      onClick={() => handleUnblockMember(m.MemberID)}
                      className="px-2 py-1 bg-green-600 rounded text-white"
                    >
                      Bỏ chặn
                    </button>
                  </li>
                ))
              ) : (
                <p>Chưa có ai bị chặn.</p>
              )}
            </ul>
          </div>
        );

      case "confirmLeave":
        return (
          <div className="text-center">
            <p>Bạn có chắc chắn muốn rời nhóm?</p>
            <div className="mt-3 flex justify-center gap-2">
              <button
                onClick={handleLeaveChannel}
                className="px-3 py-1 bg-red-600 rounded text-white"
              >
                Rời
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1 bg-gray-600 rounded text-white"
              >
                Hủy
              </button>
            </div>
          </div>
        );

      case "confirmDissolve":
        return (
          <div className="text-center">
            <p>Bạn có chắc chắn muốn giải tán kênh?</p>
            <div className="mt-3 flex justify-center gap-2">
              <button
                onClick={handleDissolveChannel}
                className="px-3 py-1 bg-red-600 rounded text-white"
              >
                Giải tán
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1 bg-gray-600 rounded text-white"
              >
                Hủy
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!modal.type) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 text-white rounded-lg p-4 w-[420px] max-h-[80vh] overflow-y-auto">
        {renderContent()}
        <button
          onClick={onClose}
          className="mt-4 px-3 py-1 bg-gray-700 rounded text-white w-full"
        >
          Đóng
        </button>
      </div>
    </div>
  );
};

export default ChannelModal;
