import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate

const LoginForm = ({ onSubmit }) => {
  const [identifier, setIdentifier] = useState(""); // Email hoặc Số điện thoại
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate(); // Khởi tạo useNavigate

  const handleSubmit = (e) => {
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
      ? { email: identifier, password } // Nếu là email
      : { phone: identifier, password }; // Nếu là số điện thoại
  
    console.log("Dữ liệu đăng nhập:", loginData);
  
    setErrorMessage("");
    onSubmit(loginData); // Gửi đúng định dạng đến API
  };

  // Hàm chuyển hướng sang trang đăng ký
  const handleGoToRegister = () => {
    navigate("/register"); // Dùng navigate để chuyển sang trang đăng ký
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-black via-purple-900 to-black">
      <div className="relative bg-gradient-to-br from-black via-fuchsia-900 to-purple-800 backdrop-blur-lg p-8 rounded-3xl shadow-[0_0_25px_#a855f7] w-full max-w-md border border-purple-400/50 transition-all duration-500 hover:shadow-[0_0_50px_#d946ef]">
        <h2 className="text-3xl font-extrabold text-center text-white mb-6 drop-shadow-lg">
          Đăng nhập
        </h2>

        {errorMessage && 
          (<p className="text-red-400 text-sm mb-4 text-center font-semibold">{errorMessage}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Email hoặc Số điện thoại"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-400 border border-transparent focus:outline-none focus:ring-4 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition"
          />
          <input
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-400 border border-transparent focus:outline-none focus:ring-4 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition"
          />
          <button type="submit" className="w-full bg-gradient-to-r from-fuchsia-500 via-purple-600 to-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:scale-105 hover:shadow-[0_0_25px_#a855f7] transition-transform">
            Đăng nhập
          </button>
        </form>
        
          <p className="text-sm text-center text-gray-400 mt-4">
            Chưa có tài khoản?
            <button className="text-fuchsia-400 font-semibold hover:underline" onClick={handleGoToRegister}>Chuyển sang trang đăng ký</button>
          </p>
          
      </div>
    </div>
  );
};

export default LoginForm;
