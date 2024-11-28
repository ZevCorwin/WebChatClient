import React from "react";
import LoginForm from "../components/LoginForm";
import { loginUser } from "../services/api";
import { useNavigate } from "react-router-dom"; // Import useNavigate

const LoginPage = () => {
  const navigate = useNavigate(); // Khởi tạo hook điều hướng

  const handleLogin = async (loginData) => {
    try {
      const response = await loginUser(loginData); // Gửi API
      console.log("Đăng nhập thành công:", response);

      // Lưu token và userID vào localStorage
      const { token, userID } = response; // Giả sử API trả về token và userId
      sessionStorage.setItem("token", token);
      sessionStorage.setItem("userID", userID);
      // Chuyển hướng tới HomePage
      navigate("/home");
    } catch (error) {
      console.error("Đăng nhập thất bại:", error.response?.data || error.message);
      alert(error.response?.data?.error || "Đăng nhập thất bại");
    }
  };

  return (
    <div>
      <LoginForm onSubmit={handleLogin} />
    </div>
  );
};

export default LoginPage;
