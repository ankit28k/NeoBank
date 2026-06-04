import axios from "axios";

const client = axios.create({
  baseURL: "/api",
  timeout: 10000,
});

// Attach JWT on every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("nb_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-redirect on 401
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default client;
