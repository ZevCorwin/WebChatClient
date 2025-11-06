import React, { useState, useEffect } from "react";
import { getPermissions, createRole, updateRole } from "../../api/adminApi"; // 👈 Kiểm tra lại path

const RoleEditModal = ({ roleToEdit, onClose, onSave }) => {
  // 1. State cho form: tên vai trò
  const [name, setName] = useState(roleToEdit?.name || "");
  
  // 2. State cho checkbox:
  // - allPermissions: mảng tất cả 14 quyền (lấy từ API)
  // - selectedPermissions: một Set chứa các ID quyền đã được chọn
  const [allPermissions, setAllPermissions] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState(
    new Set(roleToEdit?.permissions || [])
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // 3. Khi modal mở, gọi API /permissions để lấy danh sách checkbox
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        setLoading(true);
        const permsData = await getPermissions();
        setAllPermissions(permsData);
        setError(null);
      } catch (err) {
        console.error("Lỗi khi tải danh sách quyền:", err);
        setError("Không thể tải danh sách quyền.");
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  // 4. Khi bấm "Lưu" (Tạo mới hoặc Cập nhật)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || !name.trim()) return;

    setSaving(true);
    setError(null);

    // Chuyển Set ID thành mảng ID để gửi cho BE
    const permissionIDs = Array.from(selectedPermissions);

    try {
      if (roleToEdit) {
        // --- Kịch bản CẬP NHẬT ---
        await updateRole(roleToEdit.id, name, permissionIDs);
      } else {
        // --- Kịch bản TẠO MỚI ---
        await createRole(name, permissionIDs);
      }
      onSave(); // Báo cho trang cha (AdminRoles.jsx) biết để tải lại
      onClose(); // Đóng modal
    } catch (err) {
      console.error("Lỗi khi lưu vai trò:", err);
      setError(err.response?.data?.error || "Lưu vai trò thất bại.");
    } finally {
      setSaving(false);
    }
  };

  // 5. Khi tích/bỏ tích một checkbox
  const handlePermissionToggle = (permID) => {
    // Copy Set cũ
    const newSelected = new Set(selectedPermissions);
    
    if (newSelected.has(permID)) {
      newSelected.delete(permID); // Bỏ tích
    } else {
      newSelected.add(permID); // Tích
    }
    
    setSelectedPermissions(newSelected);
  };
  
  // Dùng để nhóm các quyền (user.*, role.*) cho đẹp
  const groupedPermissions = allPermissions.reduce((acc, perm) => {
    const groupName = perm.code.split('.')[0]; // Lấy 'user' từ 'user.read'
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(perm);
    return acc;
  }, {}); // Kết quả: { user: [...], role: [...], stats: [...] }

  return (
    // Lớp phủ mờ
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      {/* Khung Modal */}
      <form onSubmit={handleSubmit} className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h2 className="text-2xl font-bold text-purple-300 mb-6">
          {roleToEdit ? "Chỉnh sửa vai trò" : "Tạo vai trò mới"}
        </h2>

        {error && <p className="text-red-400 mb-4">{error}</p>}

        {/* Tên vai trò */}
        <div className="mb-4">
          <label htmlFor="roleName" className="block text-sm font-medium text-gray-300 mb-2">
            Tên vai trò (VD: Moderator, Kế toán)
          </label>
          <input
            type="text"
            id="roleName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
        </div>

        {/* Danh sách quyền (dạng checkbox) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Danh sách quyền
          </label>
          {loading ? (
            <p>Đang tải danh sách quyền...</p>
          ) : (
            <div className="space-y-4 max-h-64 overflow-y-auto bg-gray-900 p-4 rounded-md border border-gray-700">
              {Object.keys(groupedPermissions).map((groupName) => (
                <div key={groupName}>
                  <h4 className="text-sm font-semibold text-purple-300 uppercase mb-2">
                    Nhóm: {groupName}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {groupedPermissions[groupName].map((perm) => (
                      <label key={perm.id} className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-gray-700 rounded">
                        <input
                          type="checkbox"
                          className="form-checkbox h-5 w-5 text-purple-500 bg-gray-700 border-gray-600 rounded focus:ring-purple-600"
                          checked={selectedPermissions.has(perm.id)}
                          disabled={saving}
                          onChange={() => handlePermissionToggle(perm.id)}
                        />
                        <span className="text-sm text-gray-200" title={perm.desc}>
                          {perm.code}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nút Bấm */}
        <div className="mt-6 flex justify-end gap-4">
          <button
            type="button" // Quan trọng: để không submit form
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading || saving}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : (roleToEdit ? "Cập nhật" : "Tạo mới")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RoleEditModal;