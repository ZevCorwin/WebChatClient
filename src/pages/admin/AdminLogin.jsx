// src/pages/admin/AdminLogin.jsx
import React, { useState } from "react";
import { adminLogin } from "../../api/adminApi";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await adminLogin({ email, password });
      nav("/admin/users");
    } catch (e) {
      setErr(e.message || "Đăng nhập thất bại");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-white shadow-lg rounded-xl p-6 space-y-4">
        <h1 className="text-2xl font-bold">Admin Sign In</h1>
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <div className="space-y-1">
          <label className="text-sm text-gray-600">Email</label>
          <input
            className="w-full rounded-lg border px-3 py-2"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            placeholder="admin@example.com"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-gray-600">Mật khẩu</label>
          <input
            type="password"
            className="w-full rounded-lg border px-3 py-2"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <button className="w-full rounded-lg bg-blue-600 text-white py-2 hover:bg-blue-700">
          Đăng nhập
        </button>
        <p className="text-xs text-gray-500">
          Lưu ý: Quyền admin được kiểm tra ở server khi truy cập /api/admin/*.
        </p>
      </form>
    </div>
  );
}
