import React, { useState } from "react";
import { AiOutlineArrowLeft } from "react-icons/ai";
import { useNavigate } from "react-router-dom";

// Import các modal
import ChangeEmailModal from "../components/Settings/ChangeEmailModal";
import ChangePasswordModal from "../components/Settings/ChangePasswordModal";
import ChangePhoneModal from "../components/Settings/ChangePhoneModal";
import UpdateProfileModal from "../components/Settings/UpdateProfileModal";

const SettingsPage = () => {
  const navigate = useNavigate();

  // Quản lý modal
  const [openModal, setOpenModal] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900 to-black text-white">
      {/* Header */}
      <div className="flex items-center px-6 py-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-purple-300 hover:text-white transition"
        >
          <AiOutlineArrowLeft size={20} />
          <span>Quay lại</span>
        </button>
      </div>

      <div className="max-w-2xl mx-auto mt-6 space-y-6 px-4">
        <h1 className="text-2xl font-bold text-purple-300">Cài đặt</h1>

        <SettingCard title="Thông tin cá nhân">
          <button
            onClick={() => setOpenModal("profile")}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
          >
            Cập nhật
          </button>
        </SettingCard>

        <SettingCard title="Đổi số điện thoại">
          <button
            onClick={() => setOpenModal("phone")}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
          >
            Thay đổi SĐT
          </button>
        </SettingCard>

        <SettingCard title="Đổi email">
          <button
            onClick={() => setOpenModal("email")}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
          >
            Thay đổi Email
          </button>
        </SettingCard>

        <SettingCard title="Đổi mật khẩu">
          <button
            onClick={() => setOpenModal("password")}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
          >
            Thay đổi Mật khẩu
          </button>
        </SettingCard>
      </div>

      {/* Các modal */}
      <ChangeEmailModal isOpen={openModal === "email"} onClose={() => setOpenModal(null)} />
      <ChangePasswordModal isOpen={openModal === "password"} onClose={() => setOpenModal(null)} />
      <ChangePhoneModal isOpen={openModal === "phone"} onClose={() => setOpenModal(null)} />
      <UpdateProfileModal isOpen={openModal === "profile"} onClose={() => setOpenModal(null)} />
    </div>
  );
};

const SettingCard = ({ title, children }) => (
  <div className="p-4 bg-black/40 rounded-xl border border-purple-600/30 shadow">
    <h2 className="text-lg font-semibold mb-3">{title}</h2>
    {children}
  </div>
);

export default SettingsPage;
