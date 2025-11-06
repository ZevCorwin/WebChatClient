// src/api/adminApi.js
import axios from "axios";

const API_BASE = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";

const adminAxios = axios.create({
  baseURL: API_BASE,
});

// tự động gắn token
adminAxios.interceptors.request.use((config) => {
  const t = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// Đăng nhập: dùng luôn /api/users/login (BE của đệ) với email+password
export async function adminLogin({ email, password }) {
  const res = await axios.post(`${API_BASE}/api/admin/login`, { email, password });
  const { token } = res.data || {};
  if (!token) throw new Error("Không nhận được token từ server");
  // Lưu ý: dùng localStorage để admin không văng ra khi F5
  localStorage.setItem("token", token);
  return true;
}

// Kiểm tra quyền admin nhanh: gọi 1 endpoint admin (nếu 401/403 → không có quyền)
export async function adminGuardProbe() {
  // gọi nhẹ: lấy 1 user đầu tiên
  await adminAxios.get(`/api/admin/users?limit=1`).catch((e) => {
    const status = e?.response?.status;
    if (status === 401 || status === 403) {
      throw new Error("FORBIDDEN");
    }
    throw e;
  });
  return true;
}

export async function adminListUsers({ locked } = {}) {
  const q = locked ? `?locked=true` : "";
  const res = await adminAxios.get(`/api/admin/users${q}`);
  return res.data?.users || [];
}

export async function adminLockUser(userId, { untilISO, reason }) {
  const body = { untilISO: untilISO || null, reason: reason || "" };
  const res = await adminAxios.post(`/api/admin/users/${userId}/lock`, body);
  return res.data;
}

export async function adminUnlockUser(userId) {
  const res = await adminAxios.post(`/api/admin/users/${userId}/unlock`);
  return res.data;
}

export async function getOverviewStats() {
  const res = await adminAxios.get("/api/admin/stats/overview");
  return res.data;
}

export async function getMessageActivityStats() {
  const res = await adminAxios.get("/api/admin/stats/messages");
  return res.data;
}

export async function getUserGrowthStats() {
  const res = await adminAxios.get("/api/admin/stats/user-growth");
  return res.data;
}

// === QUẢN LÝ QUYỀN (PERMISSIONS) ===

export async function getPermissions() {
  const res = await adminAxios.get("/api/admin/permissions");
  return res.data || [];
}

// === QUẢN LÝ VAI TRÒ (ROLES) ===

export async function getRoles() {
  const res = await adminAxios.get("/api/admin/roles");
  return res.data || [];
}

export async function createRole(name, permissionIDs) {
  const res = await adminAxios.post("/api/admin/roles", { name, permissionIDs });
  return res.data;
}

export async function updateRole(roleID, name, permissionIDs) {
  const res = await adminAxios.put(`/api/admin/roles/${roleID}`, { name, permissionIDs });
  return res.data;
}

export async function deleteRole(roleID) {
  const res = await adminAxios.delete(`/api/admin/roles/${roleID}`);
  return res.data;
}

// === GÁN QUYỀN CHO USER ===

export async function assignRoleToUser(userID, roleID) {
  const res = await adminAxios.post(`/api/admin/users/${userID}/assign-role`, { roleID });
  return res.data;
}

export async function revokeRoleFromUser(userID, roleID) {
  const res = await adminAxios.post(`/api/admin/users/${userID}/revoke-role`, { roleID });
  return res.data;
}