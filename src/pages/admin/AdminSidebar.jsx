import React from "react";
import { NavLink } from "react-router-dom";

const linkBase =
  "block px-4 py-2 rounded-lg hover:bg-gray-100 transition text-sm font-medium";
const linkActive = "bg-gray-200";

export default function AdminSidebar() {
  return (
    <aside className="w-64 bg-white border-r p-4 space-y-2">
      <h2 className="text-xl font-bold mb-4">Admin</h2>
      <NavLink
        to="/admin/users"
        className={({ isActive }) => `${linkBase} ${isActive ? linkActive : ""}`}
      >
        Người dùng
      </NavLink>
      {/* <NavLink to="/admin/allowlist" className={({isActive}) => `${linkBase} ${isActive?linkActive:""}`}>Allowlist</NavLink> */}
      <NavLink to="/admin/stats" className={({isActive}) => `${linkBase} ${isActive?linkActive:""}`}>Thống kê</NavLink>
      <NavLink
        to="/admin/roles"
        className={({ isActive }) => `${linkBase} ${isActive ? linkActive : ""}`}
      >
        Quản lý vai trò
      </NavLink>
    </aside>
  );
}
