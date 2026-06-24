import axios from "axios";

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
