import React, { useState } from "react";
import ModalBase from "./ModalBase";
import {
  requestOldEmailOTP,
  verifyOldEmailOTP,
  requestNewEmailOTP,
  verifyNewEmailAndChange,
} from "../../services/api";

const ChangeEmailModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState("");
  const [oldOtp, setOldOtp] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newOtp, setNewOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleNext = async () => {
    const userID = sessionStorage.getItem("userID");
    setError("");
    setLoading(true);
    try {
      if (step === 1) {
        await requestOldEmailOTP(userID, password);
        setStep(2);
      } else if (step === 2) {
        await verifyOldEmailOTP(userID, oldOtp);
        setStep(3);
      } else if (step === 3) {
        await requestNewEmailOTP(userID, newEmail);
        setStep(4);
      } else if (step === 4) {
        await verifyNewEmailAndChange(userID, newEmail, newOtp);
        alert("Đổi email thành công!");
        onClose();
      }
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalBase title="Đổi Email" onClose={onClose} onSubmit={handleNext}>
      <div className="space-y-4">
        {step === 1 && (
          <input
            type="password"
            placeholder="Nhập mật khẩu hiện tại"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 text-white"
          />
        )}
        {step === 2 && (
          <input
            type="text"
            placeholder="Nhập OTP từ email hiện tại"
            value={oldOtp}
            onChange={(e) => setOldOtp(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 text-white"
          />
        )}
        {step === 3 && (
          <input
            type="email"
            placeholder="Nhập email mới"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 text-white"
          />
        )}
        {step === 4 && (
          <input
            type="text"
            placeholder="Nhập OTP từ email mới"
            value={newOtp}
            onChange={(e) => setNewOtp(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 text-white"
          />
        )}
      </div>

      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      {loading && <p className="text-purple-400 text-sm mt-2">Đang xử lý...</p>}

      <p className="text-sm text-gray-400 mt-4">
        {step === 1 && "Bước 1: Nhập mật khẩu để xác thực và nhận OTP ở email cũ."}
        {step === 2 && "Bước 2: Nhập OTP đã gửi tới email cũ."}
        {step === 3 && "Bước 3: Nhập email mới bạn muốn đổi."}
        {step === 4 && "Bước 4: Nhập OTP đã gửi tới email mới để hoàn tất."}
      </p>
    </ModalBase>
  );
};

export default ChangeEmailModal;
