import React, { useState } from "react";
import ModalBase from "./ModalBase";
import { changePassword } from "../../services/api";

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (newPass !== confirmPass) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    try {
      setLoading(true);
      const userID = sessionStorage.getItem("userID");
      if (!userID) throw new Error("Không tìm thấy userID");

      await changePassword(userID, oldPass, newPass);
      setSuccess("Đổi mật khẩu thành công!");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || "Lỗi khi đổi mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalBase title="Đổi mật khẩu" onClose={onClose} onSubmit={handleSubmit}>
      <div className="space-y-4">
        <input
          type="password"
          placeholder="Mật khẩu hiện tại"
          value={oldPass}
          onChange={(e) => setOldPass(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
        />
        <input
          type="password"
          placeholder="Mật khẩu mới"
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
        />
        <input
          type="password"
          placeholder="Xác nhận mật khẩu mới"
          value={confirmPass}
          onChange={(e) => setConfirmPass(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {success && <p className="text-green-400 text-sm">{success}</p>}
      </div>

      <p className="text-sm text-gray-400 mt-4">
        Nhập mật khẩu hiện tại và mật khẩu mới để tiến hành thay đổi.
      </p>

      {loading && <p className="text-purple-400 text-sm mt-2">Đang xử lý...</p>}
    </ModalBase>
  );
};

export default ChangePasswordModal;
