import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const RegisterForm = ({ onSubmit }) => {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!name || !dob || !email || !phone || !password || !confirmPassword) {
      setErrorMessage("⚠️ Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage("⚠️ Email không hợp lệ.");
      return;
    }

    if (!/^[0-9]{10,15}$/.test(phone)) {
      setErrorMessage("⚠️ Số điện thoại không hợp lệ.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("⚠️ Mật khẩu nhập lại không khớp.");
      return;
    }

    setErrorMessage("");
    onSubmit({ name, dob, email, phone, password });
  };

  const handleGoToLogin = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-black via-purple-900 to-black">
      <div className="relative bg-gradient-to-br from-black via-fuchsia-900 to-purple-800 backdrop-blur-lg p-8 rounded-3xl shadow-[0_0_25px_#a855f7] w-full max-w-md border border-purple-400/50 transition-all duration-500 hover:shadow-[0_0_50px_#d946ef]">
        <h2 className="text-3xl font-extrabold text-center text-white mb-6 drop-shadow-lg">
          Đăng ký 🚀
        </h2>

        {errorMessage && (
          <p className="text-red-400 text-sm mb-4 text-center font-semibold">
            {errorMessage}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Họ và Tên"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-400 border border-transparent focus:outline-none focus:ring-4 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition"
          />

          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-400 border border-transparent focus:outline-none focus:ring-4 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition"
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-400 border border-transparent focus:outline-none focus:ring-4 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition"
          />

          <input
            type="text"
            placeholder="Số điện thoại"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-400 border border-transparent focus:outline-none focus:ring-4 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition"
          />

          <input
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-400 border border-transparent focus:outline-none focus:ring-4 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition"
          />

          <input
            type="password"
            placeholder="Nhập lại mật khẩu"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-400 border border-transparent focus:outline-none focus:ring-4 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition"
          />

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-fuchsia-500 via-purple-600 to-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:scale-105 hover:shadow-[0_0_25px_#a855f7] transition-transform"
          >
            Đăng Ký ✨
          </button>
        </form>

        <p className="text-sm text-center text-gray-400 mt-4">
          Bạn đã có tài khoản?{" "}
          <button
            className="text-fuchsia-400 font-semibold hover:underline"
            onClick={handleGoToLogin}
          >
            Đăng nhập
          </button>
        </p>
      </div>
    </div>
  );
};

export default RegisterForm;
