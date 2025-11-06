import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { requestPasswordOtp, resetPasswordWithOtp } from "../services/api";
import EmailInfoTip from "../components/EmailInfoTip";

const LoginForm = ({ onSubmit }) => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // Các state cho quy trình quên mật khẩu
  const [view, setView] = useState("login"); // 'login', 'forgot', 'reset'
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const navigate = useNavigate();

  // --- Xử lý đăng nhập ---
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      setErrorMessage("Vui lòng nhập email hoặc số điện thoại và mật khẩu.");
      return;
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    const isPhone = /^[0-9]{10,15}$/.test(identifier);

    if (!isEmail && !isPhone) {
      setErrorMessage("Email hoặc số điện thoại không hợp lệ.");
      return;
    }

    const loginData = isEmail
      ? { email: identifier, password }
      : { phone: identifier, password };

    setErrorMessage("");
    setSuccessMessage("");
    onSubmit(loginData);
  };

  // --- Gửi OTP quên mật khẩu ---
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setErrorMessage("Vui lòng nhập email.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const data = await requestPasswordOtp(email);
      setSuccessMessage(
        `${data.message} (Lưu ý: có thể nằm trong thư mục Spam/Rác)`
      );
      setView("reset");
    } catch (err) {
      setErrorMessage(err.error || "Lỗi khi gửi OTP.");
    } finally {
      setLoading(false);
    }
  };

  // --- Đặt lại mật khẩu ---
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword) {
      setErrorMessage("Vui lòng nhập OTP và mật khẩu mới.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const data = await resetPasswordWithOtp(email, otp, newPassword);
      setSuccessMessage(`${data.message} Vui lòng đăng nhập lại.`);
      setView("login");
      setEmail("");
      setOtp("");
      setNewPassword("");
    } catch (err) {
      setErrorMessage(err.error || "OTP không đúng hoặc đã hết hạn.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoToRegister = () => {
    navigate("/register");
  };

  // === VIEW: LOGIN ===
  if (view === "login") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-purple-900 to-black">
        <div className="bg-gradient-to-br from-black via-fuchsia-900 to-purple-800 p-8 rounded-3xl shadow-lg w-full max-w-md border border-purple-400/50">
          <h2 className="text-3xl font-bold text-center text-white mb-6">
            Đăng nhập
          </h2>

          {errorMessage && (
            <p className="text-red-400 text-sm mb-4 text-center font-semibold">
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <p className="text-green-400 text-sm mb-4 text-center font-semibold">
              {successMessage}
            </p>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Email hoặc Số điện thoại"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-400 focus:ring-4 focus:ring-fuchsia-500 outline-none"
            />
            <input
              type="password"
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-400 focus:ring-4 focus:ring-fuchsia-500 outline-none"
            />
            <div className="text-right">
              <button
                type="button"
                onClick={() => setView("forgot")}
                className="text-sm text-fuchsia-400 hover:underline"
              >
                Quên mật khẩu?
              </button>
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-fuchsia-500 via-purple-600 to-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:scale-105 transition"
            >
              Đăng nhập
            </button>
          </form>

          <p className="text-sm text-center text-gray-400 mt-4">
            Chưa có tài khoản?{" "}
            <button
              className="text-fuchsia-400 font-semibold hover:underline"
              onClick={handleGoToRegister}
            >
              Đăng ký
            </button>
          </p>
        </div>
      </div>
    );
  }

  // === VIEW: QUÊN MẬT KHẨU ===
  if (view === "forgot") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-purple-900 to-black">
        <div className="bg-gradient-to-br from-black via-fuchsia-900 to-purple-800 p-8 rounded-3xl shadow-lg w-full max-w-md border border-purple-400/50">
          <h2 className="text-3xl font-bold text-center text-white mb-6">
            Quên mật khẩu
          </h2>
          <EmailInfoTip email={email} type="reset" />

          {errorMessage && (
            <p className="text-red-400 text-sm mb-4 text-center font-semibold">
              {errorMessage}
            </p>
          )}

          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Nhập Email của bạn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-400 focus:ring-4 focus:ring-fuchsia-500 outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-fuchsia-500 via-purple-600 to-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:scale-105 transition disabled:opacity-70"
            >
              {loading ? "Đang gửi..." : "Gửi mã OTP"}
            </button>
          </form>

          <p className="text-sm text-center text-gray-400 mt-4">
            <button
              className="text-fuchsia-400 font-semibold hover:underline"
              onClick={() => setView("login")}
            >
              ← Quay lại Đăng nhập
            </button>
          </p>
        </div>
      </div>
    );
  }

  // === VIEW: ĐẶT LẠI MẬT KHẨU ===
  if (view === "reset") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-purple-900 to-black">
        <div className="bg-gradient-to-br from-black via-fuchsia-900 to-purple-800 p-8 rounded-3xl shadow-lg w-full max-w-md border border-purple-400/50">
          <h2 className="text-3xl font-bold text-center text-white mb-6">
            Đặt lại mật khẩu
          </h2>
          <EmailInfoTip email={email} type="reset" />
          {errorMessage && (
            <p className="text-red-400 text-sm mb-4 text-center font-semibold">
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <p className="text-green-400 text-sm mb-4 text-center font-semibold">
              {successMessage}
            </p>
          )}

          <form onSubmit={handleResetSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-4 py-3 rounded-xl bg-white/5 text-gray-400 border-none"
            />  

            <input
              type="text"
              placeholder="Mã OTP (6 số từ email)"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-400 focus:ring-4 focus:ring-fuchsia-500 outline-none"
            />
            <input
              type="password"
              placeholder="Mật khẩu mới"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-400 focus:ring-4 focus:ring-fuchsia-500 outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-fuchsia-500 via-purple-600 to-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:scale-105 transition disabled:opacity-70"
            >
              {loading ? "Đang xử lý..." : "Xác nhận & Đổi mật khẩu"}
            </button>
          </form>

          <p className="text-sm text-center text-gray-400 mt-4">
            <button
              className="text-fuchsia-400 font-semibold hover:underline"
              onClick={() => setView("login")}
            >
              ← Quay lại Đăng nhập
            </button>
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default LoginForm;
