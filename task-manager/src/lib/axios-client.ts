import axios from "axios";

const apiClient = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // sends the httpOnly cookie on every request automatically
});

export default apiClient;
