import React, { useState, useEffect } from "react";
import { getRoles, deleteRole } from "../../api/adminApi"; // 👈 Import API
import RoleEditModal from "../../components/admin/RoleEditModal"; // 👈 Import Modal
import { PencilIcon, TrashIcon, PlusIcon } from "@heroicons/react/24/outline";

const AdminRoles = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State cho Modal:
  // 1. rolesModalOpen: Đóng/mở modal
  // 2. roleToEdit: 
  //    - null: là modal TẠO MỚI
  //    - {...}: là modal SỬA
  const [rolesModalOpen, setRolesModalOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState(null);

  // Hàm tải danh sách vai trò (gọi khi vào trang và sau khi Sửa/Xóa/Tạo)
  const fetchRoles = async () => {
    try {
      setLoading(true);
      const data = await getRoles();
      setRoles(data);
      setError(null);
    } catch (err) {
      console.error("Lỗi khi tải vai trò:", err);
      setError("Không thể tải danh sách vai trò.");
    } finally {
      setLoading(false);
    }
  };

  // Tải lần đầu khi vào trang
  useEffect(() => {
    fetchRoles();
  }, []);

  // --- Xử lý Modal ---
  const handleOpenCreateModal = () => {
    setRoleToEdit(null); // Đặt là null để Modal biết đây là TẠO MỚI
    setRolesModalOpen(true);
  };

  const handleOpenEditModal = (role) => {
    setRoleToEdit(role); // Đưa vai trò cần sửa vào Modal
    setRolesModalOpen(true);
  };

  const handleModalClose = () => {
    setRolesModalOpen(false);
    setRoleToEdit(null); // Reset
  };

  const handleModalSave = () => {
    fetchRoles(); // Tải lại danh sách sau khi Tạo/Sửa thành công
  };

  // --- Xử lý Xóa ---
  const handleDeleteRole = async (role) => {
    // Ngăn xóa Super Admin (an toàn)
    if (role.name === "Super Admin") {
      alert("Không thể xóa vai trò 'Super Admin'!");
      return;
    }

    if (
      window.confirm(`Bạn có chắc muốn xóa vai trò "${role.name}" không? \n\nHành động này không thể hoàn tác.`)
    ) {
      try {
        await deleteRole(role.id);
        fetchRoles(); // Tải lại danh sách
      } catch (err) {
        console.error("Lỗi khi xóa vai trò:", err);
        // Hiển thị lỗi BE (ví dụ: "có user đang sử dụng")
        alert(`Xóa thất bại: ${err.response?.data?.error || err.message}`);
      }
    }
  };

  return (
    <div className="p-8 text-white bg-gray-900 min-h-full">
      {/* Header và Nút tạo mới */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-purple-300">
          Quản lý Vai trò ({roles.length})
        </h1>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition"
        >
          <PlusIcon className="w-5 h-5" />
          Tạo vai trò mới
        </button>
      </div>

      {loading && <p>Đang tải danh sách vai trò...</p>}
      {error && <p className="text-red-400">{error}</p>}

      {/* Bảng hiển thị Vai trò */}
      {!loading && !error && (
        <div className="bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Tên Vai trò
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Số lượng quyền
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-white">{role.name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                    {role.permissions?.length || 0} quyền
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {/* Nút Sửa */}
                    <button
                      onClick={() => handleOpenEditModal(role)}
                      className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                      title="Sửa vai trò và quyền"
                    >
                      <PencilIcon className="w-5 h-5 text-white" />
                    </button>
                    
                    {/* Nút Xóa (Vô hiệu hóa cho Super Admin) */}
                    <button
                      onClick={() => handleDeleteRole(role)}
                      disabled={role.name === "Super Admin"}
                      className="p-2 bg-red-600 hover:bg-red-700 rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
                      title="Xóa vai trò"
                    >
                      <TrashIcon className="w-5 h-5 text-white" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Tạo/Sửa:
        Nó sẽ tự động là "Tạo mới" (khi roleToEdit=null) 
        hoặc "Sửa" (khi roleToEdit có dữ liệu)
      */}
      {rolesModalOpen && (
        <RoleEditModal
          roleToEdit={roleToEdit}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
};

export default AdminRoles;