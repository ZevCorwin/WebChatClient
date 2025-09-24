import React, { useState } from "react";
import ModalBase from "./ModalBase";

const ChangePhoneModal = ({ isOpen, onClose }) => {
  const [password, setPassword] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [otp, setOtp] = useState("");

  if (!isOpen) return null;

  return (
    <ModalBase title="Đổi số điện thoại" onClose={onClose} onSubmit={() => alert("Submit đổi số điện thoại")}>
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
        <input
          type="text"
          placeholder="Mã OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
        />
      </div>
    </ModalBase>
  );
};

export default ChangePhoneModal;
