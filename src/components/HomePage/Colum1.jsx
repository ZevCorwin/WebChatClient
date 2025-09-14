import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AiOutlineMessage, AiOutlineTeam, AiOutlineBell, AiOutlineLogout } from "react-icons/ai";

const Column1 = ({ setMode, resetToDefault }) => {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(true);

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    navigate("/login");
  };

  const menuItems = [
    { name: "Trò chuyện", icon: <AiOutlineMessage size={24} />, action: resetToDefault },
    { name: "Bạn bè", icon: <AiOutlineTeam size={24} />, action: () => setMode("friends") },
    { name: "Thông báo", icon: <AiOutlineBell size={24} />, action: () => {} },
    { name: "Đăng xuất", icon: <AiOutlineLogout size={24} />, action: handleLogout, isLogout: true },
  ];

  return (
    <div
      className={`relative min-h-screen bg-gradient-to-b from-purple-900 via-black to-purple-800
                  flex flex-col items-center transition-all duration-500 
                  ${isCollapsed ? "w-20" : "w-64"}`}
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
    >
      {/* Avatar */}
      <div className="mt-4 mb-8 w-full flex justify-center cursor-pointer">
        <div className="w-16 h-16 rounded-full border-4 border-purple-500/60 shadow-lg transition-all duration-500">
          <img
            src="/path/to/avatar.jpg"
            alt="Avatar"
            className="w-full h-full rounded-full object-cover"
          />
        </div>
      </div>

      {/* Menu */}
      <div className="flex flex-col gap-4 w-full px-2">
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={item.action}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl 
                        ${item.isLogout ? "bg-red-600/30 hover:bg-red-500/50" : "bg-purple-700/20 hover:bg-purple-600/40"} 
                        hover:shadow-[0_0_20px_#a855f7] transition-all duration-300`}
          >
            {item.icon}
            {!isCollapsed && <span className="text-lg font-semibold text-white">{item.name}</span>}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Column1;
