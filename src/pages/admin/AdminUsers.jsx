import React, { useEffect, useState } from "react";
import { adminListUsers, adminLockUser, adminUnlockUser } from "../../api/adminApi";
import LockUserModal from "../../components/admin/LockUserModal";
import ManageRolesModal from "../../components/admin/ManageRolesModal";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [filterLocked, setFilterLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Modal state (dùng chung selectedUser)
  const [lockOpen, setLockOpen] = useState(false);
  const [rolesModalOpen, setRolesModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // loading theo từng row
  const [rowBusy, setRowBusy] = useState({}); // { [userId]: true }

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await adminListUsers({ locked: filterLocked });
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.message || "Lỗi tải users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterLocked]);

  // ===== Modal Khoá =====
  const openLockModal = (u) => {
    setSelectedUser(u);
    setLockOpen(true);
  };

  const onSubmitLock = async ({ untilISO, reason }) => {
    const id = selectedUser?.id || selectedUser?._id;
    try {
      setRowBusy((m) => ({ ...m, [id]: true }));
      await adminLockUser(id, { untilISO, reason });
      await load();
      setLockOpen(false);
      setSelectedUser(null);
    } finally {
      setRowBusy((m) => {
        const { [id]: _drop, ...rest } = m;
        return rest;
      });
    }
  };

  const doUnlock = async (u) => {
    const id = u.id || u._id;
    try {
      setRowBusy((m) => ({ ...m, [id]: true }));
      await adminUnlockUser(id);
      await load();
    } finally {
      setRowBusy((m) => {
        const { [id]: _drop, ...rest } = m;
        return rest;
      });
    }
  };

  // ===== Modal Phân quyền =====
  const openRolesModal = (u) => {
    setSelectedUser(u);
    setRolesModalOpen(true);
  };

  const handleRolesModalClose = () => {
    setRolesModalOpen(false);
    setSelectedUser(null);
  };

  const handleRolesModalSave = () => {
    load();             // có thể role cứng đã đổi → reload
    handleRolesModalClose();
  };

  return (
    <div className="space-y-4 p-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Người dùng ({users.length})</h1>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filterLocked}
            onChange={(e) => setFilterLocked(e.target.checked)}
          />
          Chỉ xem tài khoản đang bị khoá
        </label>
      </div>

      {err && <div className="text-red-600 text-sm">{err}</div>}

      {loading ? (
        <div className="text-sm text-gray-500">Đang tải…</div>
      ) : (
        <div className="overflow-auto border rounded-xl bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-3">Tên</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Vai trò (cứng)</th>
                <th className="text-left p-3">Trạng thái</th>
                <th className="text-left p-3">Khoá đến</th>
                <th className="text-left p-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => {
                const id = u.id || u._id;
                const locked =
                  u.adminLocked ||
                  (u.lockedUntil && new Date(u.lockedUntil) > new Date());
                const busy = !!rowBusy[id];

                return (
                  <tr key={id}>
                    <td className="p-3">{u.name || "-"}</td>
                    <td className="p-3">{u.email || "-"}</td>

                    {/* Vai trò cứng */}
                    <td className="p-3">
                      <span
                        className={[
                          "px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full",
                          u.role === "Quản trị viên"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-gray-100 text-gray-800",
                        ].join(" ")}
                      >
                        {u.role || "Người dùng"}
                      </span>
                    </td>

                    {/* Trạng thái */}
                    <td className="p-3">
                      {locked ? (
                        <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs">
                          Đang khoá
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs">
                          Bình thường
                        </span>
                      )}
                    </td>

                    {/* Khoá đến */}
                    <td className="p-3">
                      {u.lockedUntil
                        ? new Date(u.lockedUntil).toLocaleString()
                        : "-"}
                    </td>

                    {/* Hành động */}
                    <td className="p-3 space-x-2">
                      {locked ? (
                        <button
                          onClick={() => doUnlock(u)}
                          disabled={busy}
                          className={[
                            "px-3 py-1 rounded text-white",
                            busy
                              ? "bg-blue-300 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700",
                          ].join(" ")}
                        >
                          {busy ? "Đang mở…" : "Mở khoá"}
                        </button>
                      ) : (
                        <button
                          onClick={() => openLockModal(u)}
                          disabled={busy}
                          className={[
                            "px-3 py-1 rounded text-white",
                            busy
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-rose-600 hover:bg-rose-700",
                          ].join(" ")}
                        >
                          Khoá
                        </button>
                      )}

                      {/* Nút phân quyền */}
                      <button
                        onClick={() => openRolesModal(u)}
                        disabled={busy}
                        className={[
                          "inline-flex items-center gap-1 px-3 py-1 rounded text-white align-middle",
                          busy
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-green-600 hover:bg-green-700",
                        ].join(" ")}
                        title="Quản lý vai trò (phân quyền động)"
                      >
                        <Cog6ToothIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">Phân quyền</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {users.length === 0 && (
                <tr>
                  <td className="p-3 text-gray-500" colSpan={6}>
                    Không có người dùng nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal khoá */}
      <LockUserModal
        open={lockOpen}
        user={selectedUser}
        onClose={() => {
          setLockOpen(false);
          setSelectedUser(null);
        }}
        onSubmit={onSubmitLock}
      />

      {/* Modal phân quyền */}
      {rolesModalOpen && selectedUser && (
        <ManageRolesModal
          user={selectedUser}
          onClose={handleRolesModalClose}
          onSave={handleRolesModalSave}
        />
      )}
    </div>
  );
}
