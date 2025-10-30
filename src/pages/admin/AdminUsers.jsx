import React, { useEffect, useState } from "react";
import { adminListUsers, adminLockUser, adminUnlockUser } from "../../api/adminApi";
import LockUserModal from "../../components/admin/LockUserModal";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [filterLocked, setFilterLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // modal state
  const [lockOpen, setLockOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // per-row action loading (khóa/mở)
  const [rowBusy, setRowBusy] = useState({}); // { [userId]: true }

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await adminListUsers({ locked: filterLocked });
      setUsers(data);
    } catch (e) {
      setErr(e.message || "Lỗi tải users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [filterLocked]);

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
      setLockOpen(false);   // đóng modal sau khi thành công
      setSelectedUser(null);
    } finally {
      setRowBusy((m) => {
        const { [id]: _, ...rest } = m;
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
        const { [id]: _, ...rest } = m;
        return rest;
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Người dùng</h1>
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
                <th className="text-left p-3">Trạng thái</th>
                <th className="text-left p-3">Khóa đến</th>
                <th className="text-left p-3">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const id = u.id || u._id;
                const locked =
                  u.adminLocked ||
                  (u.lockedUntil && new Date(u.lockedUntil) > new Date());
                const busy = !!rowBusy[id];

                return (
                  <tr key={id} className="border-t">
                    <td className="p-3">{u.name}</td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">
                      {locked ? (
                        <span className="px-2 py-1 rounded bg-red-100 text-red-700">
                          Đang khóa
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-green-100 text-green-700">
                          Bình thường
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {u.lockedUntil ? new Date(u.lockedUntil).toLocaleString() : "-"}
                    </td>
                    <td className="p-3">
                      {locked ? (
                        <button
                          onClick={() => doUnlock(u)}
                          disabled={busy}
                          className={`px-3 py-1 rounded text-white ${
                            busy
                              ? "bg-blue-300 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700"
                          }`}
                        >
                          {busy ? "Đang mở…" : "Mở khoá"}
                        </button>
                      ) : (
                        <button
                          onClick={() => openLockModal(u)}
                          className="px-3 py-1 rounded bg-rose-600 text-white hover:bg-rose-700"
                        >
                          Khoá
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td className="p-3 text-gray-500" colSpan={5}>
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
    </div>
  );
}
