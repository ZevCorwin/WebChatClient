import React, { useState } from "react";
import ModalBase from "./ModalBase";

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  if (!isOpen) return null;

  return (
    <ModalBase title="Đổi mật khẩu" onClose={onClose} onSubmit={() => alert("Submit đổi mật khẩu")}>
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
      </div>
    </ModalBase>
  );
};

export default ChangePasswordModal;
