import axios from 'axios';

const API_BASE = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";

export const login = async (data) => {
  return await axios.post(`${API_BASE}/login`, data);
};

export const register = async (data) => {
  return await axios.post(`${API_BASE}/register`, data);
};
