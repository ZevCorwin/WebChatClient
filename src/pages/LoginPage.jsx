// src/pages/LoginPage.jsx
import React, { useState } from "react";
import LoginForm from "../components/LoginForm";
import { loginUser } from "../services/api";
import { useNavigate } from "react-router-dom";
import LockedDialog from "../components/LockedDialog";

const LoginPage = () => {
  const navigate = useNavigate();
  const [lockedOpen, setLockedOpen] = useState(false);
  const [lockedReason, setLockedReason] = useState("");
  const [lockedUntil, setLockedUntil] = useState(null);

  const handleLogin = async (loginData) => {
    try {
      const { token, userID } = await loginUser(loginData);
      sessionStorage.setItem("token", token);
      sessionStorage.setItem("userID", userID);
      navigate("/home");
    } catch (error) {
      const resp = error?.response;
      const status = resp?.status;
      const raw = resp?.data;

      // Chuẩn hoá data về object
      let dataObj;
      if (raw && typeof raw === "object") {
        dataObj = raw;
      } else if (typeof raw === "string") {
        // cố gắng parse khi BE trả string JSON
        try { dataObj = JSON.parse(raw); } catch { dataObj = { error: raw }; }
      } else {
        dataObj = { error: "Đăng nhập thất bại" };
      }

      if (status === 423) {
        // Ưu tiên nhiều nguồn để chắc chắn có text
        const candidate =
          dataObj.reason ??
          dataObj.message ??
          dataObj.error ??
          "";

        const reason =
          typeof candidate === "string" && candidate.trim()
            ? candidate.trim()
            : "Tài khoản đang bị khóa.";

        const untilISO = dataObj.lockedUntil || null;

        console.log("[LoginPage] reason nhận được:", reason, "until:", untilISO);

        setLockedReason(reason);
        setLockedUntil(untilISO ? new Date(untilISO).toLocaleString() : null);
        setLockedOpen(true);
        return;
      }

      alert(dataObj?.error || "Đăng nhập thất bại");
    }
  };

  return (
    <>
      <LoginForm onSubmit={handleLogin} />
      <LockedDialog
        open={lockedOpen}
        reason={lockedReason}
        until={lockedUntil}
        onClose={() => setLockedOpen(false)}
      />
    </>
  );
};

export default LoginPage;
