// src/components/AdminRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { adminGuardProbe } from "../api/adminApi";

export default function AdminRoute({ children }) {
  const [ok, setOk] = useState(null);
  const loc = useLocation();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await adminGuardProbe();
        if (mounted) setOk(true);
      } catch (e) {
        if (mounted) setOk(false);
      }
    })();
    return () => (mounted = false);
  }, [loc.pathname]);

  if (ok === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Đang kiểm tra quyền…</div>
      </div>
    );
  }
  if (!ok) return <Navigate to="/admin/login" replace />;

  return children;
}
