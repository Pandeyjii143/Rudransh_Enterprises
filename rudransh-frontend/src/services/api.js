import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

/**
 * Create Axios instance with interceptors
 */
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Request interceptor - Add access token to all requests
 */
apiClient.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * Response interceptor - Handle token refresh on 401
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 (Unauthorized) and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");

        if (!refreshToken) {
          // No refresh token available - logout user
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          window.location.href = "/login";
          return Promise.reject(error);
        }

        // Try to refresh token
        const response = await axios.post(`${API_BASE}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data;

        // Save new access token
        localStorage.setItem("accessToken", accessToken);

        // Update original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        // Retry original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout user
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

/**
 * Auth API calls
 */
export const authAPI = {
  register: (data) => apiClient.post("/auth/register", data),
  login: (email, password) =>
    apiClient.post("/auth/login", { email, password }),
  refreshToken: (refreshToken) =>
    apiClient.post("/auth/refresh", { refreshToken }),
  logout: (refreshToken) => apiClient.post("/auth/logout", { refreshToken }),
  getMe: () => apiClient.get("/auth/me"),
};

/**
 * Product API calls
 */
export const productAPI = {
  getAll: (params) => apiClient.get("/products", { params }),
  getById: (id) => apiClient.get(`/products/${id}`),
  create: (data) => apiClient.post("/products", data),
  update: (id, data) => apiClient.put(`/products/${id}`, data),
  delete: (id) => apiClient.delete(`/products/${id}`),
};

/**
 * Section API calls
 */
export const sectionAPI = {
  getAll: () => apiClient.get("/sections"),
  getById: (id) => apiClient.get(`/sections/${id}`),
  create: (data) => apiClient.post("/sections", data),
  update: (id, data) => apiClient.put(`/sections/${id}`, data),
  delete: (id) => apiClient.delete(`/sections/${id}`),
};

/**
 * Order API calls
 */
export const orderAPI = {
  getAll: () => apiClient.get("/orders"),
  getById: (id) => apiClient.get(`/orders/${id}`),
  checkout: (data) => apiClient.post("/orders/checkout", data),
  createPaymentIntent: (orderId) =>
    apiClient.post("/orders/payment/create-intent", { orderId }),
  updateStatus: (id, status) =>
    apiClient.put(`/orders/${id}/status`, { status }),
};

/**
 * Payment / Razorpay API calls
 */
export const paymentAPI = {
  createOrder: (orderId) => apiClient.post("/payment/create-order", { orderId }),
  verifyPayment: (payload) => apiClient.post("/payment/verify", payload),
};

/**
 * File upload API
 */
export const uploadAPI = {
  file: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

/**
 * Utility function to handle API errors
 */
export const handleApiError = (error) => {
  if (error.response?.data?.error) {
    return error.response.data.error.message;
  }
  if (error.response?.status === 404) {
    return "Resource not found";
  }
  if (error.response?.status === 500) {
    return "Server error. Please try again later";
  }
  return error.message || "An unexpected error occurred";
};

// Backward compatibility exports
export const getProducts = (params = {}) => productAPI.getAll(params);
export const getProduct = (id) => productAPI.getById(id);

export default apiClient;
