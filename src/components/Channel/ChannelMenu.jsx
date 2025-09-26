import React from "react";
import { 
  AiOutlineClose, 
  AiOutlineUserAdd, 
  AiOutlineTeam, 
  AiOutlineLogout, 
  AiOutlineStop, 
  AiOutlineCheckCircle, 
  AiOutlineDelete 
} from "react-icons/ai";

const ChannelMenu = ({ visible, onClose, onAction, currentChannel, role }) => {
  if (!visible || currentChannel?.channelType !== "Group") return null;
  console.log("[ChannelMenu] currentChannel:", currentChannel);
  console.log("[ChannelMenu] role:", role);

  const handleDevAction = () => {
    alert("Chức năng đang trong giai đoạn phát triển");
  };

  const isLeader = role === "Leader";
  const isDeputy = role === "Deputy";

  return (
    <div className="fixed inset-0 flex justify-end z-50">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>

      {/* Drawer */}
      <div className="relative w-80 h-full bg-gradient-to-br from-black via-purple-900 to-black text-purple-200 shadow-xl p-4 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Quản lý kênh</h3>
          <button onClick={onClose}>
            <AiOutlineClose className="w-6 h-6 text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {/* Ai cũng thấy */}
          <button 
            onClick={() => onAction?.("addMember")} 
            className="flex items-center gap-2 px-3 py-2 bg-purple-700 rounded hover:bg-purple-600"
          >
            <AiOutlineUserAdd /> Thêm thành viên
          </button>

          <button 
            onClick={() => onAction?.("listMembers")} 
            className="flex items-center gap-2 px-3 py-2 bg-purple-700 rounded hover:bg-purple-600"
          >
            <AiOutlineTeam /> Danh sách thành viên
          </button>

          <button 
            onClick={() => onAction?.("leaveChannel")} 
            className="flex items-center gap-2 px-3 py-2 bg-purple-700 rounded hover:bg-purple-600"
          >
            <AiOutlineLogout /> Rời nhóm
          </button>

          {/* Danh sách bị chặn: Leader + Deputy */}
          {(isLeader || isDeputy) && (
            <button 
              onClick={() => onAction?.("blockedList")} 
              className="flex items-center gap-2 px-3 py-2 bg-purple-700 rounded hover:bg-purple-600"
            >
              <AiOutlineStop /> Danh sách thành viên bị chặn
            </button>
          )}

          {/* Chỉ Leader */}
          {isLeader && (
            <>
              <button 
                onClick={handleDevAction} 
                className="flex items-center gap-2 px-3 py-2 bg-purple-700 rounded hover:bg-purple-600"
              >
                <AiOutlineCheckCircle /> Bật/Tắt phê duyệt
              </button>

              <button 
                onClick={handleDevAction} 
                className="flex items-center gap-2 px-3 py-2 bg-red-600 rounded hover:bg-red-500"
              >
                <AiOutlineDelete /> Giải tán kênh
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelMenu;
