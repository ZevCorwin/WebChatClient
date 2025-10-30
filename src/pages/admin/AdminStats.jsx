// src/pages/admin/AdminStats.jsx
import React from "react";
export default function AdminStats() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Stats</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border p-4 bg-white">
          <div className="text-sm text-gray-500">Users</div>
          <div className="text-2xl font-bold">—</div>
        </div>
        <div className="rounded-xl border p-4 bg-white">
          <div className="text-sm text-gray-500">Messages</div>
          <div className="text-2xl font-bold">—</div>
        </div>
        <div className="rounded-xl border p-4 bg-white">
          <div className="text-sm text-gray-500">Active Today</div>
          <div className="text-2xl font-bold">—</div>
        </div>
      </div>
      <div className="mt-4 rounded-xl border p-6 bg-white">
        <p>Đặt chart theo ngày (sau này dùng /api/admin/stats/overview).</p>
      </div>
    </div>
  );
}
