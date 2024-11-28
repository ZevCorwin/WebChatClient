import React from "react";
import { useNavigate } from "react-router-dom";

const Column1 = ({ setMode, resetToDefault }) => {
  const navigate = useNavigate();

  // Hàm xử lý đăng xuất
  const handleLogout = () => {
    sessionStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="column column-1">
      {/* Avatar người dùng */}
      <div className="menu-item avatar">
        <img src="/path/to/avatar.jpg" alt="Avatar" className="avatar-img" />
      </div>
      
      {/* Mục "Nhắn tin" - chuyển về chế độ "chat" */}
      <div className="menu-item" onClick={() => resetToDefault()}>
        Nhắn tin
      </div>
      
      {/* Mục "Bạn bè" - chuyển sang chế độ "friends" */}
      <div className="menu-item" onClick={() => setMode("friends")}>
        Bạn bè
      </div>
      
      {/* Mục "Thông báo" */}
      <div className="menu-item">Thông báo</div>
      
      {/* Mục "Đăng xuất" */}
      <div className="menu-item logout" onClick={handleLogout}>
        Đăng xuất
      </div>
    </div>
  );
};

export default Column1;
