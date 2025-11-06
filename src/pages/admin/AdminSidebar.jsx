import React from "react";
import { NavLink, useNavigate } from "react-router-dom";

const linkBase =
  "block px-4 py-2 rounded-lg hover:bg-gray-100 transition text-sm font-medium";
const linkActive = "bg-gray-200";

export default function AdminSidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm("Bạn có chắc chắn muốn đăng xuất không?")) {
      // Xoá các thông tin phiên làm việc
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("userID");
      sessionStorage.removeItem("role");
      sessionStorage.removeItem("currentChannel");
      // Nếu bạn có dùng localStorage thì xoá luôn:
      localStorage.removeItem("token");
      localStorage.removeItem("userID");

      navigate("/admin/login");
    }
  };

  return (
    <aside className="w-64 bg-white border-r p-4 flex flex-col justify-between min-h-screen">
      {/* --- menu chính --- */}
      <div>
        <h2 className="text-xl font-bold mb-4">Admin</h2>

        <NavLink
          to="/admin/users"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : ""}`
          }
        >
          Người dùng
        </NavLink>

        {/* <NavLink
          to="/admin/allowlist"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : ""}`
          }
        >
          Allowlist
        </NavLink> */}

        <NavLink
          to="/admin/stats"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : ""}`
          }
        >
          Thống kê
        </NavLink>

        <NavLink
          to="/admin/roles"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : ""}`
          }
        >
          Quản lý vai trò
        </NavLink>
      </div>

      {/* --- nút đăng xuất --- */}
      <button
        onClick={handleLogout}
        className="mt-4 w-full text-center bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition"
      >
        Đăng xuất
      </button>
    </aside>
  );
}
