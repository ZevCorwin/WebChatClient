// File: src/pages/RegisterPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import RegisterForm from "../components/RegisterForm";
import { requestRegisterOtp, verifyRegisterOtp } from "../services/api";
import EmailInfoTip from "../components/EmailInfoTip";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [registerPayload, setRegisterPayload] = useState(null);

  const [resending, setResending] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  const startCooldown = (seconds = 30) => {
    setCooldown(seconds);
    const startedAt = Date.now();
    const timer = setInterval(() => {
      setCooldown((prev) => {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        const remain = seconds - elapsed;
        if (remain <= 0) {
          clearInterval(timer);
          return 0;
        }
        return remain;
      });
    }, 1000);
  };

  // Bước 1: gửi thông tin đăng ký + yêu cầu OTP
  const handleRegister = async (registerData) => {
    setLoading(true);
    try {
      await requestRegisterOtp(registerData);
      setRegisterPayload(registerData);
      setShowOtpModal(true);
      setOtpError("");
      startCooldown(30);
    } catch (error) {
      alert(error?.message || "Gửi OTP thất bại");
    }
    setLoading(false);
  };

  // Bước 2: xác thực OTP
  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      alert("Vui lòng nhập mã OTP");
      return;
    }
    setLoading(true);
    setOtpError("");
    try {
      await verifyRegisterOtp(registerPayload.email, otpCode);
      alert("Đăng ký thành công!");
      navigate("/login");
    } catch (error) {
      setOtpError(error?.message || "Mã OTP không đúng, vui lòng thử lại!");
    }
    setLoading(false);
  };

  const handleResendOtp = async () => {
    if (!registerPayload || cooldown > 0 || resendCount >= 3) return;
    setResending(true);
    setOtpError("");
    try {
      await requestRegisterOtp(registerPayload);
      setOtpError("✅ Mã OTP mới đã được gửi, vui lòng kiểm tra hộp thư (kể cả Spam/Quảng cáo).");
      setResendCount((prev) => prev + 1);
      startCooldown(30);
    } catch (error) {
      setOtpError(error?.message || "Không thể gửi lại OTP.");
    }
    setResending(false);
  };

  return (
    <div className="relative">
      <RegisterForm onSubmit={handleRegister} />
      {loading && <p className="text-center text-gray-300">Đang xử lý...</p>}

      {showOtpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-6 w-80 shadow-lg">
            <h3 className="text-xl font-bold mb-2 text-white">Nhập mã OTP</h3>

            {/* giới thiệu email nhận để user nhớ kiểm tra đúng hộp thư */}
            <p className="mb-2 text-center text-gray-300">
              Mã OTP đã được gửi đến:{" "}
              <b className="text-white break-all">{registerPayload?.email || "(chưa có email)"}</b>
            </p>

            {/* banner nhắc kiểm tra spam/quảng cáo + nút mở hộp thư */}
            <EmailInfoTip email={registerPayload?.email} type="register" />

            {otpError && (
              <p
                className={`text-sm mb-3 text-center ${
                  otpError.startsWith("✅") ? "text-green-400" : "text-red-400"
                }`}
              >
                {otpError}
              </p>
            )}

            <input
              type="text"
              placeholder="6 số OTP"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              className="w-full px-4 py-2 mb-4 rounded-lg bg-white/10 text-white text-center focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              inputMode="numeric"
              maxLength={6}
            />

            <div className="flex flex-col gap-3">
              <button
                className={`text-sm ${
                  resendCount >= 3 ? "text-gray-500" : "text-fuchsia-400 hover:underline"
                }`}
                onClick={handleResendOtp}
                disabled={resending || cooldown > 0 || resendCount >= 3}
              >
                {resending
                  ? "Đang gửi lại..."
                  : resendCount >= 3
                  ? "Đã hết số lần gửi lại (3/3)"
                  : cooldown > 0
                  ? `Chờ ${cooldown}s để gửi lại`
                  : `Gửi lại OTP (${3 - resendCount} lần còn lại)`}
              </button>

              <div className="flex justify-between gap-2">
                <button
                  className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700"
                  onClick={() => setShowOtpModal(false)}
                >
                  Hủy
                </button>
                <button
                  className="flex-1 bg-gradient-to-r from-fuchsia-500 via-purple-600 to-blue-600 text-white py-2 rounded-lg hover:scale-105 transition"
                  onClick={handleVerifyOtp}
                >
                  Xác nhận
                </button>
              </div>
            </div>

            {/* gợi ý thêm dưới cùng */}
            <div className="mt-4 text-xs text-gray-400">
              Mẹo: nếu thấy email nằm trong Spam/Quảng cáo, hãy bấm{" "}
              <b>“Không phải thư rác / Not spam”</b> để các lần sau vào Hộp thư chính.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPage;
