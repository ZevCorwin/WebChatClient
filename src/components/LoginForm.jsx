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
    <div>
      <h2>Đăng nhập</h2>
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Email hoặc Số điện thoại"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
        <input
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Đăng nhập</button>
      </form>
      {/* Thêm nút chuyển sang trang đăng ký */}
      <div>
        <p>Chưa có tài khoản?</p>
        <button onClick={handleGoToRegister}>Chuyển sang trang đăng ký</button>
      </div>
    </div>
  );
};

export default LoginForm;
