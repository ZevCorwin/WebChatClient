import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import RegisterForm from "../components/RegisterForm";
import { registerUser } from "../services/api";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleRegister = async (registerData) => {
    setLoading(true);
    try {
      const response = await registerUser(registerData);
      console.log("Đăng ký thành công:", response);

      // Chuyển hướng đến trang đăng nhập
      navigate("/login");
    } catch (error) {
      console.error("Đăng ký thất bại:", error);
      alert("Đăng ký không thành công. Vui lòng thử lại!");
    }
    setLoading(false);
  };

  return (
    <div>
      <RegisterForm onSubmit={handleRegister} />
      {loading && <p>Đang xử lý đăng ký...</p>}
    </div>
  );
};

export default RegisterPage;
