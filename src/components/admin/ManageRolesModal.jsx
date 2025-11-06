// File: src/components/admin/ManageRolesModal.jsx
import React, { useState, useEffect } from "react";
import { getRoles, assignRoleToUser, revokeRoleFromUser } from "../../api/adminApi"; // 👈 Kiểm tra lại path

const ManageRolesModal = ({ user, onClose, onSave }) => {
  // 1. State lưu danh sách TẤT CẢ vai trò (lấy từ API)
  const [allRoles, setAllRoles] = useState([]);
  
  // 2. State lưu các vai trò MÀ USER NÀY ĐANG CÓ (chỉ lưu ID)
  const [userRoleIDs, setUserRoleIDs] = useState(new Set(user.roleIds || []));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // 3. Khi modal mở, gọi API lấy tất cả vai trò
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoading(true);
        const rolesData = await getRoles();
        setAllRoles(rolesData);
        setError(null);
      } catch (err) {
        console.error("Lỗi khi tải vai trò:", err);
        setError("Không thể tải danh sách vai trò.");
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  // 4. Khi user tích/bỏ tích vào 1 checkbox
  const handleRoleToggle = async (roleID, isCurrentlyChecked) => {
    if (saving) return; // Không cho bấm khi đang lưu
    setSaving(true);
    setError(null);

    const newRoleIDs = new Set(userRoleIDs);

    try {
      if (isCurrentlyChecked) {
        // --- Kịch bản GIÁNG CHỨC (Tước quyền) ---
        await revokeRoleFromUser(user.id, roleID);
        newRoleIDs.delete(roleID);
      } else {
        // --- Kịch bản BAN CHỨC (Gán quyền) ---
        await assignRoleToUser(user.id, roleID);
        newRoleIDs.add(roleID);
      }
      
      // Cập nhật lại Set để checkbox đổi ngay lập tức
      setUserRoleIDs(newRoleIDs);

    } catch (err) {
      console.error("Lỗi khi cập nhật vai trò:", err);
      // Hiển thị lỗi từ BE (ví dụ: "Không thể tự tước quyền")
      setError(err.response?.data?.error || "Cập nhật vai trò thất bại.");
      // Rollback lại Set nếu lỗi
      setUserRoleIDs(new Set(userRoleIDs));
    } finally {
      setSaving(false);
    }
  };

  // 5. Khi bấm nút "Hoàn tất"
  const handleClose = () => {
    // Gọi onSave để trang AdminUsers biết mà tải lại user list
    // (Vì vai trò cứng "role" có thể đã thay đổi)
    onSave(); 
    onClose();
  };

  return (
    // Lớp phủ mờ
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      {/* Khung Modal */}
      <div className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-2xl font-bold text-purple-300 mb-4">
          Quản lý vai trò
        </h2>
        <p className="text-gray-400 mb-1">
          Đang sửa quyền cho: <span className="font-bold text-white">{user.name}</span>
        </p>
        <p className="text-gray-400 mb-6">
          Email: <span className="font-bold text-white">{user.email}</span>
        </p>

        {loading && <p>Đang tải danh sách vai trò...</p>}
        {error && <p className="text-red-400 mb-4">{error}</p>}

        {/* Danh sách các checkbox */}
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
          {!loading && allRoles.map((role) => {
            const isChecked = userRoleIDs.has(role.id);
            return (
              <label
                key={role.id}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                  isChecked ? "bg-purple-600" : "bg-gray-700 hover:bg-gray-600"
                } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span className="font-semibold">{role.name}</span>
                <input
                  type="checkbox"
                  className="form-checkbox h-5 w-5 text-purple-500 bg-gray-900 border-gray-600 rounded focus:ring-purple-600"
                  checked={isChecked}
                  disabled={saving}
                  onChange={() => handleRoleToggle(role.id, isChecked)}
                />
              </label>
            );
          })}
        </div>

        {/* Nút Đóng */}
        <div className="mt-6 text-right">
          <button
            onClick={handleClose}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition"
          >
            Hoàn tất
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageRolesModal;