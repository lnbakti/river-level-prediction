const initProfilePage = async () => {
    const nameInput = document.getElementById("profile-name");
    const usernameInput = document.getElementById("profile-username");
    const noWaInput = document.getElementById("profile-no-wa");
    const alamatInput = document.getElementById("profile-alamat");
    const sidebarName = document.getElementById("profile-sidebar-name");
    const sidebarInitial = document.getElementById("profile-sidebar-initial");
    if (!nameInput || !usernameInput || !noWaInput || !alamatInput) {
        return;
    }

    noWaInput.addEventListener("input", window.handlePhoneInput);

    try {
        const user = await api.getCurrentUser();
        if (!user) {
            console.warn(
                "User not authenticated, profile page will remain blank.",
            );
            return;
        }
        console.log("Populating profile:", user);
        nameInput.value = user.nama_lengkap ?? "";
        usernameInput.value = user.username ?? "";
        noWaInput.value = formatWaNumber(user.no_wa);
        alamatInput.value = user.alamat ?? "";
        if (sidebarName) {
            sidebarName.textContent =
                user.nama_lengkap ?? user.username ?? "Pengguna";
        }
        if (sidebarInitial) {
            const initialSource = user.nama_lengkap || user.username || "P";
            sidebarInitial.textContent = initialSource.charAt(0).toUpperCase();
        }
        const sidebarStatus = document.getElementById("profile-sidebar-status");
        if (sidebarStatus) {
            sidebarStatus.textContent = user.status_akun ?? "";
        }
        const cardInitial = document.getElementById("profile-card-initial");
        const cardName = document.getElementById("profile-card-name");
        const cardStatus = document.getElementById("profile-card-status");

        if (cardName) {
            cardName.textContent =
                user.nama_lengkap ?? user.username ?? "Pengguna";
        }
        if (cardInitial) {
            const initSource = user.nama_lengkap || user.username || "P";
            cardInitial.textContent = initSource.charAt(0).toUpperCase();
        }
        if (cardStatus) {
            cardStatus.textContent = user.status_akun ?? "Aktif";
            if (user.status_akun === "Aktif") {
                cardStatus.className =
                    "badge bg-light-success border border-success";
            } else {
                cardStatus.className =
                    "badge bg-light-danger border border-danger";
            }
        }
        const notifCheck = document.getElementById("notifWarning");
        if (notifCheck) {
            notifCheck.checked = user.status_notif === "Aktif";
        }
    } catch (error) {
        console.error("Profile page error:", error);
    }
};
let currentUpdatePayload = null;
let profileModal = null;
let profileOtpTimerInt;
const startProfileOTPTimer = () => {
    const btnResend = document.getElementById("btn-profile-resend-otp");
    const timerText = document.getElementById("profile-otp-timer-text");
    const timerSpan = document.getElementById("profile-otp-timer");
    if (!btnResend || !timerSpan) return;

    let timeLeft = 120;
    btnResend.classList.add("disabled");
    btnResend.textContent = "Minta Ulang Kode";
    timerText.style.display = "block";

    clearInterval(profileOtpTimerInt);
    profileOtpTimerInt = setInterval(() => {
        timeLeft--;
        timerSpan.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(profileOtpTimerInt);
            timerText.style.display = "none";
            btnResend.classList.remove("disabled");
        }
    }, 1000);
};

const startProfileUpdate = async (payload, btn) => {
    const originalText = btn.innerHTML;
    btn.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2"></span>Memproses...';
    btn.disabled = true;
    try {
        await api.requestProfileUpdateOTP();
        currentUpdatePayload = payload;
        showToast(
            "Permintaan diproses. Silakan periksa WhatsApp Anda untuk kode OTP.",
            "info",
        );
        if (!profileModal) {
            profileModal = new bootstrap.Modal(
                document.getElementById("modalOTPProfile"),
            );
        }
        document.querySelectorAll(".p-otp-input").forEach((i) => {
            i.value = "";
            i.classList.remove("border-danger", "text-danger", "is-invalid");
            i.disabled = false;
        });
        const errDiv = document.getElementById("profile-otp-error");
        if (errDiv) errDiv.classList.add("hidden");
        const loadingDiv = document.getElementById("profile-otp-loading");
        if (loadingDiv) loadingDiv.style.display = "none";
        profileModal.show();
        startProfileOTPTimer();
        setTimeout(() => {
            document.querySelector(".p-otp-input").focus();
        }, 500);
    } catch (error) {
        showToast(error.message || "Gagal meminta OTP.", "danger");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};
const setupProfileEvents = () => {
    const btnSaveProfile = document.getElementById("btn-save-profile");
    if (btnSaveProfile) {
        btnSaveProfile.addEventListener("click", () => {
            const payload = {
                nama_lengkap: document.getElementById("profile-name").value,
                no_wa:
                    "+" +
                    document
                        .getElementById("profile-no-wa")
                        .value.replace(/\D/g, ""),
                alamat: document.getElementById("profile-alamat").value,
            };
            startProfileUpdate(payload, btnSaveProfile);
        });
    }
    const btnSaveNotif = document.getElementById("btn-save-notif");
    if (btnSaveNotif) {
        btnSaveNotif.addEventListener("click", () => {
            const isChecked = document.getElementById("notifWarning").checked;
            const payload = {
                status_notif: isChecked ? "Aktif" : "Nonaktif",
            };
            startProfileUpdate(payload, btnSaveNotif);
        });
    }
    const btnSavePw = document.getElementById("btn-save-password");
    if (btnSavePw) {
        btnSavePw.addEventListener("click", () => {
            const oldPw = document.getElementById("profile-old-pw").value;
            const newPw = document.getElementById("profile-new-pw").value;
            const confirmPw = document.getElementById(
                "profile-new-pw-confirm",
            ).value;
            if (!oldPw || !newPw || !confirmPw) {
                showToast("Semua field password harus diisi.", "danger");
                return;
            }
            if (newPw !== confirmPw) {
                showToast("Konfirmasi password baru tidak cocok.", "danger");
                return;
            }
            const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
            if (!regex.test(newPw)) {
                showToast(
                    "Password minimal 8 karakter, wajib mengandung huruf besar, huruf kecil, dan angka.",
                    "danger",
                );
                return;
            }
            const payload = {
                old_password: oldPw,
                new_password: newPw,
            };
            startProfileUpdate(payload, btnSavePw);
        });
    }
    const otpInputs = document.querySelectorAll(".p-otp-input");
    const otpErrorDiv = document.getElementById("profile-otp-error");
    const otpLoadingDiv = document.getElementById("profile-otp-loading");

    // Resend Logic
    const btnResend = document.getElementById("btn-profile-resend-otp");
    if (btnResend) {
        btnResend.addEventListener("click", async () => {
            if (btnResend.classList.contains("disabled")) return;
            try {
                btnResend.innerHTML =
                    '<span class="spinner-border spinner-border-sm"></span> Mengirim...';
                btnResend.classList.add("disabled");
                await api.requestProfileUpdateOTP();
                showToast("Kode OTP baru telah dikirim.", "success");
                startProfileOTPTimer();
            } catch (error) {
                showToast(
                    error.message || "Gagal mengirim ulang OTP.",
                    "danger",
                );
                btnResend.textContent = "Minta Ulang Kode";
                btnResend.classList.remove("disabled");
            }
        });
    }

    const verifyProfileOTP = async () => {
        const otp = Array.from(otpInputs)
            .map((i) => i.value)
            .join("");
        if (otp.length !== 6 || !currentUpdatePayload) return;
        const finalPayload = { ...currentUpdatePayload, otp: otp };
        otpInputs.forEach((i) => (i.disabled = true));
        if (otpLoadingDiv) otpLoadingDiv.style.display = "block";
        try {
            const res = await api.updateProfileWithOTP(finalPayload);
            showToast(
                res.message || "Berhasil menyimpan perubahan!",
                "success",
            );
            profileModal.hide();
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            if (otpErrorDiv) {
                otpErrorDiv.textContent =
                    error.message || "Verifikasi OTP gagal.";
                otpErrorDiv.classList.remove("hidden");
            }
            otpInputs.forEach((i) => {
                i.classList.add("border-danger", "text-danger");
                i.value = "";
                i.disabled = false;
            });
            otpInputs[0].focus();
        } finally {
            if (otpLoadingDiv) otpLoadingDiv.style.display = "none";
        }
    };
    if (otpInputs.length > 0) {
        otpInputs.forEach((input, index) => {
            input.addEventListener("input", () => {
                if (otpErrorDiv) otpErrorDiv.classList.add("hidden");
                otpInputs.forEach((i) =>
                    i.classList.remove(
                        "border-danger",
                        "text-danger",
                        "is-invalid",
                    ),
                );
                input.value = input.value.replace(/[^0-9]/g, "");
                if (input.value !== "") {
                    if (index < otpInputs.length - 1) {
                        otpInputs[index + 1].focus();
                    } else {
                        verifyProfileOTP();
                    }
                }
            });
            input.addEventListener("keydown", (e) => {
                if (e.key === "Backspace" && input.value === "" && index > 0) {
                    otpInputs[index - 1].focus();
                }
            });
        });
        otpInputs[0].addEventListener("paste", (e) => {
            e.preventDefault();
            const pastedData = (
                e.clipboardData || window.clipboardData
            ).getData("text");
            const otpCode = pastedData.replace(/[^0-9]/g, "").slice(0, 6);
            if (otpCode.length > 0) {
                if (otpErrorDiv) otpErrorDiv.classList.add("hidden");
                otpInputs.forEach((i) =>
                    i.classList.remove(
                        "border-danger",
                        "text-danger",
                        "is-invalid",
                    ),
                );
                otpCode.split("").forEach((char, i) => {
                    if (i < otpInputs.length) {
                        otpInputs[i].value = char;
                    }
                });
                if (otpCode.length === 6) {
                    verifyProfileOTP();
                } else {
                    otpInputs[otpCode.length].focus();
                }
            }
        });
    }
};
const startProfilePage = () => {
    if (window.layoutsReady) {
        initProfilePage();
        setupProfileEvents();
    } else {
        document.addEventListener(
            "layoutsLoaded",
            () => {
                initProfilePage();
                setupProfileEvents();
            },
            { once: true },
        );
    }
};
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startProfilePage);
} else {
    startProfilePage();
}
