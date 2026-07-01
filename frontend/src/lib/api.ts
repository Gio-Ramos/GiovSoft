import axios from "axios";
import { clearAdminSession, getAdminToken } from "./adminSession";

const productionApiUrl = "https://api.giovsoft.com";
const isGiovSoftDomain =
  typeof window !== "undefined" &&
  ["giovsoft.com", "www.giovsoft.com", "admin.giovsoft.com"].includes(window.location.hostname);

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (isGiovSoftDomain ? productionApiUrl : ""),
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getAdminToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && window.location.pathname.startsWith("/admin")) {
      clearAdminSession();
      window.location.assign("/login");
    }

    return Promise.reject(error);
  },
);
