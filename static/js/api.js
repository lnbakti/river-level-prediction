window.formatWaNumber = (phone) => {
    if (!phone) return "-";
    let digits = phone.replace(/\D/g, "");
    if (digits.startsWith("0")) {
        digits = "62" + digits.substring(1);
    } else if (!digits.startsWith("62")) {
        digits = "62" + digits;
    }
    if (digits.length <= 2) return "+" + digits;
    let prefix = "+" + digits.substring(0, 2);
    let remainder = digits.substring(2);
    let formatted = prefix;
    if (remainder.length > 0) {
        formatted += " " + remainder.substring(0, 3);
        remainder = remainder.substring(3);
    }
    if (remainder.length > 0) {
        formatted += "-" + remainder.substring(0, 4);
        remainder = remainder.substring(4);
    }
    if (remainder.length > 0) {
        formatted += "-" + remainder;
    }
    return formatted;
};

window.handlePhoneInput = (e) => {
    let val = e.target.value;

    // Jangan format jika ada huruf
    if (/[a-zA-Z]/.test(val)) return;

    let digits = val.replace(/\D/g, "");

    if (digits.length === 0 && val !== "+") {
        e.target.value = val;
        return;
    }

    if (digits.length > 0) {
        if (digits.startsWith("0")) {
            digits = "62" + digits.substring(1);
        } else if (!digits.startsWith("62") && digits.length > 0) {
            digits = "62" + digits;
        }
    }

    if (digits.length === 0) {
        e.target.value = "";
        return;
    }

    let formatted = "+" + digits.substring(0, 2);
    let remainder = digits.substring(2);
    if (remainder.length > 0) {
        formatted += " " + remainder.substring(0, 3);
        remainder = remainder.substring(3);
    }
    if (remainder.length > 0) {
        formatted += "-" + remainder.substring(0, 4);
        remainder = remainder.substring(4);
    }
    if (remainder.length > 0) {
        formatted += "-" + remainder;
    }
    e.target.value = formatted;
};

const DEFAULT_API_BASE = window.location.origin;
const BASE_URL = DEFAULT_API_BASE + "/api";
if (typeof window !== "undefined") {
    console.log(
        "[API] Base URL:",
        BASE_URL,
        "pageOrigin:",
        window.location.origin,
        "pageHref:",
        window.location.href,
    );
}
const api = {
    _parseResponse: async (response) => {
        try {
            const data = await response.json();
            // Jika FastAPI mengembalikan error 422, detailnya adalah array of objects
            if (data.detail && Array.isArray(data.detail)) {
                data.detail = data.detail.map((e) => e.msg).join(", ");
            }
            return data;
        } catch (error) {
            const text = await response.text();
            return { detail: text || "Invalid JSON response from server" };
        }
    },
    checkUsername: async (username) => {
        try {
            const response = await fetch(
                `${BASE_URL}/users/check-username?username=${encodeURIComponent(username)}`,
                {
                    mode: "cors",
                },
            );
            if (response.status === 401) {
                api._handleUnauthorized();
                throw new Error("Sesi berakhir");
            }
            if (!response.ok) throw new Error("Network response was not ok");
            return await response.json();
        } catch (error) {
            console.error("API Error (Check Username):", error);
            return { available: true }; // Fallback jika server error
        }
    },
    checkWA: async (no_wa) => {
        try {
            const response = await fetch(
                `${BASE_URL}/users/check-wa?no_wa=${encodeURIComponent(no_wa)}`,
            );
            if (response.status === 401) {
                api._handleUnauthorized();
                throw new Error("Sesi berakhir");
            }
            if (!response.ok) throw new Error("Network response was not ok");
            return await response.json();
        } catch (error) {
            console.error("API Error (Check WA):", error);
            return { available: true };
        }
    },
    register: async (userData) => {
        try {
            const response = await fetch(`${BASE_URL}/users/register`, {
                method: "POST",
                mode: "cors",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(userData),
            });
            const data = await response.json();
            if (response.status === 401) {
                api._handleUnauthorized();
                throw new Error("Sesi berakhir");
            }
            if (!response.ok) {
                if (Array.isArray(data.detail)) {
                    const messages = data.detail.map((e) => e.msg).join(", ");
                    throw new Error(messages);
                }
                let errorMsg = "Registrasi gagal";
                if (data.detail) {
                    errorMsg =
                        typeof data.detail === "object"
                            ? JSON.stringify(data.detail)
                            : data.detail;
                } else if (data.message) {
                    errorMsg =
                        typeof data.message === "object"
                            ? JSON.stringify(data.message)
                            : data.message;
                }
                throw new Error(errorMsg);
            }
            return data;
        } catch (error) {
            console.error("API Error (Register):", error);
            throw new Error(
                error.message === "Failed to fetch"
                    ? "Tidak dapat terhubung ke server backend. Pastikan backend berjalan dan buka halaman melalui HTTP (bukan file://)."
                    : error.message,
            );
        }
    },
    verifyOTP: async (username, otp) => {
        try {
            const response = await fetch(`${BASE_URL}/users/verify-otp`, {
                method: "POST",
                mode: "cors",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, otp }),
            });
            const data = await response.json();
            if (response.status === 401) {
                api._handleUnauthorized();
                throw new Error("Sesi berakhir");
            }
            if (!response.ok) {
                if (Array.isArray(data.detail)) {
                    throw new Error(data.detail.map((e) => e.msg).join(", "));
                }
                throw new Error(data.detail || "Verifikasi OTP gagal");
            }
            return data;
        } catch (error) {
            console.error("API Error (Verify OTP):", error);
            throw new Error(
                error.message === "Failed to fetch"
                    ? "Tidak dapat terhubung ke server backend. Pastikan backend berjalan dan buka halaman melalui HTTP (bukan file://)."
                    : error.message,
            );
        }
    },
    resendOTP: async (username) => {
        try {
            const response = await fetch(`${BASE_URL}/users/resend-otp`, {
                method: "POST",
                mode: "cors",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username }),
            });
            const data = await response.json();
            if (response.status === 401) {
                api._handleUnauthorized();
                throw new Error("Sesi berakhir");
            }
            if (!response.ok) {
                if (Array.isArray(data.detail)) {
                    throw new Error(data.detail.map((e) => e.msg).join(", "));
                }
                throw new Error(data.detail || "Gagal mengirim ulang OTP");
            }
            return data;
        } catch (error) {
            console.error("API Error (Resend OTP):", error);
            throw new Error(
                error.message === "Failed to fetch"
                    ? "Tidak dapat terhubung ke server backend. Pastikan backend berjalan dan buka halaman melalui HTTP (bukan file://)."
                    : error.message,
            );
        }
    },
    login: async (username, password) => {
        try {
            const formData = new URLSearchParams();
            formData.append("username", username);
            formData.append("password", password);
            const response = await fetch(`${BASE_URL}/auth/login`, {
                method: "POST",
                mode: "cors",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: formData,
            });
            const data = await response.json();
            if (response.status === 401) {
                api._handleUnauthorized();
                throw new Error("Sesi berakhir");
            }
            if (!response.ok) {
                if (Array.isArray(data.detail)) {
                    throw new Error(data.detail.map((e) => e.msg).join(", "));
                }
                throw new Error(
                    data.detail || "Login gagal, periksa kredensial Anda",
                );
            }
            return data;
        } catch (error) {
            console.error("API Error (Login):", error);
            throw error;
        }
    },
    forgotPasswordRequestOTP: async (no_wa) => {
        try {
            const response = await fetch(
                `${BASE_URL}/auth/forgot-password/request-otp`,
                {
                    method: "POST",
                    mode: "cors",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ no_wa }),
                },
            );
            const data = await response.json();
            if (response.status === 401) {
                api._handleUnauthorized();
                throw new Error("Sesi berakhir");
            }
            if (!response.ok) {
                if (Array.isArray(data.detail)) {
                    throw new Error(data.detail.map((e) => e.msg).join(", "));
                }
                throw new Error(data.detail || "Gagal mengirim OTP");
            }
            return data;
        } catch (error) {
            console.error("API Error (Forgot Password OTP):", error);
            throw new Error(
                error.message === "Failed to fetch"
                    ? "Tidak dapat terhubung ke server backend."
                    : error.message,
            );
        }
    },
    forgotPasswordVerifyOTP: async (no_wa, otp) => {
        try {
            const response = await fetch(
                `${BASE_URL}/auth/forgot-password/verify-otp`,
                {
                    method: "POST",
                    mode: "cors",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ no_wa, otp }),
                },
            );
            const data = await response.json();
            if (response.status === 401) {
                api._handleUnauthorized();
                throw new Error("Sesi berakhir");
            }
            if (!response.ok) {
                if (Array.isArray(data.detail)) {
                    throw new Error(data.detail.map((e) => e.msg).join(", "));
                }
                throw new Error(data.detail || "Verifikasi OTP gagal");
            }
            return data;
        } catch (error) {
            console.error("API Error (Forgot Password Verify OTP):", error);
            throw new Error(
                error.message === "Failed to fetch"
                    ? "Tidak dapat terhubung ke server backend."
                    : error.message,
            );
        }
    },
    forgotPasswordReset: async (no_wa, otp, new_password) => {
        try {
            const response = await fetch(
                `${BASE_URL}/auth/forgot-password/reset`,
                {
                    method: "POST",
                    mode: "cors",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ no_wa, otp, new_password }),
                },
            );
            const data = await response.json();
            if (response.status === 401) {
                api._handleUnauthorized();
                throw new Error("Sesi berakhir");
            }
            if (!response.ok) {
                if (Array.isArray(data.detail)) {
                    throw new Error(data.detail.map((e) => e.msg).join(", "));
                }
                throw new Error(data.detail || "Gagal mereset password");
            }
            return data;
        } catch (error) {
            console.error("API Error (Forgot Password Reset):", error);
            throw new Error(
                error.message === "Failed to fetch"
                    ? "Tidak dapat terhubung ke server backend."
                    : error.message,
            );
        }
    },
    getUsers: async (limit = 50, offset = 0) => {
        const response = await fetch(
            `${BASE_URL}/users/?limit=${limit}&offset=${offset}`,
            {
                mode: "cors",
                headers: {
                    "Content-Type": "application/json",
                    ...api._getAuthHeaders(),
                },
            },
        );
        if (response.status === 401) {
            api._handleUnauthorized();
            throw new Error("Sesi berakhir");
        }
        if (!response.ok) throw new Error("Gagal memuat daftar pengguna");
        return await response.json();
    },
    getUser: async (userId) => {
        const response = await fetch(`${BASE_URL}/users/${userId}`, {
            mode: "cors",
            headers: {
                "Content-Type": "application/json",
                ...api._getAuthHeaders(),
            },
        });
        if (response.status === 401) {
            api._handleUnauthorized();
            throw new Error("Sesi berakhir");
        }
        if (!response.ok) throw new Error("Gagal memuat data pengguna");
        return await response.json();
    },
    deleteUser: async (userId) => {
        const response = await fetch(`${BASE_URL}/users/${userId}`, {
            method: "DELETE",
            mode: "cors",
            headers: {
                "Content-Type": "application/json",
                ...api._getAuthHeaders(),
            },
        });
        if (response.status === 401) {
            api._handleUnauthorized();
            throw new Error("Sesi berakhir");
        }
        if (!response.ok) {
            const data = await api._parseResponse(response);
            throw new Error(data.detail || "Gagal menghapus pengguna");
        }
        return await response.json();
    },
    updateUser: async (userId, payload) => {
        const response = await fetch(`${BASE_URL}/users/${userId}`, {
            method: "PUT",
            mode: "cors",
            headers: {
                "Content-Type": "application/json",
                ...api._getAuthHeaders(),
            },
            body: JSON.stringify(payload),
        });
        if (response.status === 401) {
            api._handleUnauthorized();
            throw new Error("Sesi berakhir");
        }
        if (!response.ok) {
            const data = await api._parseResponse(response);
            throw new Error(data.detail || "Gagal memperbarui pengguna");
        }
        return await response.json();
    },
    _handleUnauthorized: () => {
        localStorage.removeItem("access_token");
        window.location.href = "/login";
    },
    logout: () => {
        localStorage.removeItem("access_token");
        window.location.href = "/login";
    },
    getCurrentUser: async () => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            return null;
        }
        const response = await fetch(`${BASE_URL}/auth/me`, {
            mode: "cors",
            headers: {
                "Content-Type": "application/json",
                ...api._getAuthHeaders(),
            },
        });
        if (response.status === 401) {
            api._handleUnauthorized();
            return null;
        }
        if (response.status === 401) {
            api._handleUnauthorized();
            throw new Error("Sesi berakhir");
        }
        if (!response.ok) {
            const data = await api._parseResponse(response);
            throw new Error(data.detail || "Gagal memuat profil pengguna");
        }
        return await response.json();
    },
    requestProfileUpdateOTP: async () => {
        const response = await fetch(
            `${BASE_URL}/users/me/request-update-otp`,
            {
                method: "POST",
                mode: "cors",
                headers: {
                    ...api._getAuthHeaders(),
                },
            },
        );
        const data = await api._parseResponse(response);
        if (response.status === 401) {
            api._handleUnauthorized();
            throw new Error("Sesi berakhir");
        }
        if (!response.ok) {
            if (Array.isArray(data.detail)) {
                throw new Error(data.detail.map((e) => e.msg).join(", "));
            }
            throw new Error(
                data.detail || "Gagal meminta OTP pembaruan profil",
            );
        }
        return data;
    },
    updateProfileWithOTP: async (payload) => {
        const response = await fetch(`${BASE_URL}/users/me/update-with-otp`, {
            method: "PUT",
            mode: "cors",
            headers: {
                "Content-Type": "application/json",
                ...api._getAuthHeaders(),
            },
            body: JSON.stringify(payload),
        });
        const data = await api._parseResponse(response);
        if (response.status === 401) {
            api._handleUnauthorized();
            throw new Error("Sesi berakhir");
        }
        if (!response.ok) {
            if (Array.isArray(data.detail)) {
                throw new Error(data.detail.map((e) => e.msg).join(", "));
            }
            throw new Error(data.detail || "Gagal memperbarui profil");
        }
        return data;
    },
    getPredictionLatest: async () => {
        const response = await fetch(`${BASE_URL}/predictions/latest`, {
            mode: "cors",
            headers: {
                "Content-Type": "application/json",
                ...api._getAuthHeaders(),
            },
        });
        if (response.status === 404) {
            return null;
        }
        if (response.status === 401) {
            api._handleUnauthorized();
            throw new Error("Sesi berakhir");
        }
        if (!response.ok) throw new Error("Gagal memuat prediksi terbaru");
        return await response.json();
    },
    _getAuthHeaders: () => {
        const token = localStorage.getItem("access_token");
        return token ? { Authorization: `Bearer ${token}` } : {};
    },
    getMonitoringById: async (id) => {
        const response = await fetch(`${BASE_URL}/monitoring/${id}`, {
            mode: "cors",
            headers: {
                "Content-Type": "application/json",
                ...api._getAuthHeaders(),
            },
        });
        if (response.status === 401) {
            api._handleUnauthorized();
            throw new Error("Sesi berakhir");
        }
        if (!response.ok) throw new Error("Gagal memuat data");
        return await response.json();
    },
getMonitoringHistory: async (limit = 50) => {
        const response = await fetch(`${BASE_URL}/monitoring/?limit=${limit}`, {
            mode: "cors",
            headers: {
                "Content-Type": "application/json",
                ...api._getAuthHeaders(),
            },
        });
        if (response.status === 401) {
            api._handleUnauthorized();
            throw new Error("Sesi berakhir");
        }
        if (!response.ok) throw new Error("Gagal memuat riwayat sensor");
        return await response.json();
    },
    getMonitoringLatest: async () => {
        const response = await fetch(`${BASE_URL}/monitoring/latest`, {
            mode: "cors",
            headers: {
                "Content-Type": "application/json",
                ...api._getAuthHeaders(),
            },
        });
        if (response.status === 404) return null;
        if (response.status === 401) {
            api._handleUnauthorized();
            throw new Error("Sesi berakhir");
        }
        if (!response.ok) throw new Error("Gagal memuat data sensor terbaru");
        return await response.json();
    },
    getNotifications: async (limit = 50, offset = 0) => {
        const response = await fetch(
            `${BASE_URL}/notifications/?limit=${limit}&offset=${offset}`,
            {
                mode: "cors",
                headers: {
                    "Content-Type": "application/json",
                    ...api._getAuthHeaders(),
                },
            },
        );
        if (response.status === 401) {
            api._handleUnauthorized();
            throw new Error("Sesi berakhir");
        }
        if (!response.ok) throw new Error("Gagal memuat riwayat notifikasi");
        return await response.json();
    },
    getSystemErrors: async (limit = 50, offset = 0, unreadOnly = false) => {
        const response = await fetch(
            `${BASE_URL}/system-error/?limit=${limit}&offset=${offset}&unread_only=${unreadOnly}`,
            {
                mode: "cors",
                headers: {
                    "Content-Type": "application/json",
                    ...api._getAuthHeaders(),
                },
            },
        );
        if (response.status === 401) {
            api._handleUnauthorized();
            throw new Error("Sesi berakhir");
        }
        if (!response.ok) throw new Error("Gagal memuat riwayat sistem error");
        return await response.json();
    },
    markSystemErrorRead: async (id) => {
        const response = await fetch(`${BASE_URL}/system-error/${id}/read`, {
            method: "PUT",
            mode: "cors",
            headers: {
                "Content-Type": "application/json",
                ...api._getAuthHeaders(),
            },
        });
        if (response.status === 401) {
            api._handleUnauthorized();
            throw new Error("Sesi berakhir");
        }
        if (!response.ok) throw new Error("Gagal update status read");
        return await response.json();
    },
    markAllSystemErrorsRead: async () => {
        const response = await fetch(`${BASE_URL}/system-error/read-all`, {
            method: "PUT",
            mode: "cors",
            headers: {
                "Content-Type": "application/json",
                ...api._getAuthHeaders(),
            },
        });
        if (response.status === 401) {
            api._handleUnauthorized();
            throw new Error("Sesi berakhir");
        }
        if (!response.ok) throw new Error("Gagal update status read semua");
        return await response.json();
    },
};
window.showToast = function (message, type = "success") {
    let toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
        toastContainer = document.createElement("div");
        toastContainer.id = "toast-container";
        toastContainer.className =
            "toast-container position-fixed top-0 end-0 p-3";
        toastContainer.style.zIndex = "9999";
        document.body.appendChild(toastContainer);
    }
    const bgClass =
        type === "success"
            ? "bg-success text-white"
            : type === "danger"
              ? "bg-danger text-white"
              : "bg-primary text-white";
    const icon =
        type === "success"
            ? "ti-check"
            : type === "danger"
              ? "ti-alert-circle"
              : "ti-info-circle";
    const toastId =
        "toast-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center ${bgClass} border-0 shadow-lg" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body fw-bold d-flex align-items-center">
                    <i class="ti ${icon} fs-5 me-2"></i> 
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    toastContainer.insertAdjacentHTML("beforeend", toastHtml);
    const toastElement = document.getElementById(toastId);
    if (typeof bootstrap !== "undefined" && bootstrap.Toast) {
        const bsToast = new bootstrap.Toast(toastElement, { delay: 3000 });
        bsToast.show();
        toastElement.addEventListener("hidden.bs.toast", () => {
            toastElement.remove();
        });
    } else {
        toastElement.style.display = "block";
        toastElement.style.opacity = "1";
        setTimeout(() => {
            toastElement.remove();
        }, 3000);
    }
};
