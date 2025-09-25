import React, { useState } from "react";
import ModalBase from "./ModalBase";
import { changePhone } from "../../services/api";

const ChangePhoneModal = ({ isOpen, onClose }) => {
  const [password, setPassword] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const userID = sessionStorage.getItem("userID");
      if (!userID) throw new Error("Không tìm thấy userID");

      const res = await changePhone(userID, password, newPhone);
      alert(res.message || "Đổi số điện thoại thành công!");
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalBase
      title="Đổi số điện thoại"
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <div className="space-y-4">
        <input
          type="password"
          placeholder="Mật khẩu hiện tại"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
        />
        <input
          type="tel"
          placeholder="Số điện thoại mới"
          value={newPhone}
          onChange={(e) => setNewPhone(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
        />
      </div>

      <p className="text-sm text-gray-400 mt-4">
        Nhập mật khẩu hiện tại để xác thực và điền số điện thoại mới bạn muốn thay đổi.
      </p>

      {loading && <p className="text-purple-400 mt-2">Đang xử lý...</p>}
    </ModalBase>
  );
};

export default ChangePhoneModal;
