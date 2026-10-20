document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const loginUsernameInput = document.getElementById("login-username");
    if (loginUsernameInput) {
        loginUsernameInput.addEventListener("input", function (e) {
            this.value = this.value.replace(/[^a-zA-Z0-9\s\.\-\_\+]/g, "");
        });
    }
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btnLogin = document.getElementById("btn-login");
            const originalText = btnLogin.innerHTML;
            let usernameInput = document
                .getElementById("login-username")
                .value.trim();
            const passwordInput =
                document.getElementById("login-password").value;
            if (/^[0-9\-\s\+]+$/.test(usernameInput)) {
                let cleanWA = usernameInput.replace(/\D/g, ""); // buang semua kecuali angka
                if (cleanWA.startsWith("0")) {
                    cleanWA = "62" + cleanWA.substring(1);
                }
                if (cleanWA.length > 5) {
                    usernameInput = "+" + cleanWA;
                }
            } else {
                usernameInput = usernameInput.toLowerCase();
            }
            const username = usernameInput;
            const password = passwordInput;
            const errDiv = document.getElementById("login-error");
            const usernameInputEl = document.getElementById("login-username");
            const passwordInputEl = document.getElementById("login-password");
            btnLogin.innerHTML =
                '<span class="spinner-border spinner-border-sm me-2"></span>Memproses...';
            btnLogin.disabled = true;
            usernameInputEl.classList.remove(
                "border-danger",
                "text-danger",
                "is-invalid",
            );
            passwordInputEl.classList.remove(
                "border-danger",
                "text-danger",
                "is-invalid",
            );
            if (errDiv) errDiv.classList.add("hidden");
            try {
                const response = await api.login(username, password);
                localStorage.setItem("access_token", response.access_token);
                showToast(
                    "Login Berhasil! Mengalihkan ke Dashboard...",
                    "success",
                );
                setTimeout(() => {
                    window.location.href = "/";
                }, 1500);
            } catch (error) {
                usernameInputEl.classList.add("border-danger", "text-danger");
                passwordInputEl.classList.add("border-danger", "text-danger");
                if (errDiv) {
                    errDiv.textContent = error.message;
                    errDiv.classList.remove("hidden");
                }
                showToast("Gagal Login: " + error.message, "danger");
            } finally {
                btnLogin.innerHTML = originalText;
                btnLogin.disabled = false;
            }
        });
        document
            .getElementById("login-username")
            .addEventListener("input", function () {
                this.classList.remove(
                    "border-danger",
                    "text-danger",
                    "is-invalid",
                );
                document
                    .getElementById("login-password")
                    .classList.remove(
                        "border-danger",
                        "text-danger",
                        "is-invalid",
                    );
                const errDiv = document.getElementById("login-error");
                if (errDiv) errDiv.classList.add("hidden");
            });
        document
            .getElementById("login-password")
            .addEventListener("input", function () {
                this.classList.remove(
                    "border-danger",
                    "text-danger",
                    "is-invalid",
                );
                document
                    .getElementById("login-username")
                    .classList.remove(
                        "border-danger",
                        "text-danger",
                        "is-invalid",
                    );
                const errDiv = document.getElementById("login-error");
                if (errDiv) errDiv.classList.add("hidden");
            });
    }
    const registerForm = document.getElementById("register-form");
    const otpForm = document.getElementById("otp-form");
    let tempUsername = "";
    const regNamaInput = document.getElementById("reg-nama");
    if (regNamaInput) {
        regNamaInput.addEventListener("input", function () {
            this.value = this.value.replace(/[^a-zA-Z0-9\s\.\,\']/g, "");
        });
    }
    const regUsername = document.getElementById("reg-username");
    let usernameTimeout;
    if (regUsername) {
        regUsername.addEventListener("input", function () {
            clearTimeout(usernameTimeout);
            this.value = this.value.toLowerCase();
            const val = this.value;
            const isValidChars = /^[a-z0-9._-]+$/.test(val);
            const isValidLength = val.length >= 3;
            const startChar = val.charAt(0);
            const endChar = val.charAt(val.length - 1);
            const hasInvalidEdges =
                startChar === "." ||
                startChar === "-" ||
                endChar === "." ||
                endChar === "-";
            const feedback = this.nextElementSibling;
            if (val.length === 0) {
                this.classList.remove("is-invalid", "is-valid");
            } else if (!isValidChars || !isValidLength || hasInvalidEdges) {
                this.classList.add("border-danger", "text-danger");
                this.classList.remove("is-valid");
                if (feedback)
                    feedback.textContent =
                        "Username hanya boleh berisi huruf kecil, angka, titik (.), strip (-), atau underscore (_). Titik dan strip tidak boleh di awal/akhir. Minimal 3 karakter.";
            } else {
                usernameTimeout = setTimeout(async () => {
                    const res = await api.checkUsername(val);
                    if (!res.available) {
                        this.classList.add("border-danger", "text-danger");
                        this.classList.remove("is-valid");
                        if (feedback)
                            feedback.textContent =
                                "Maaf, username ini sudah digunakan oleh orang lain.";
                    } else {
                        this.classList.remove(
                            "border-danger",
                            "text-danger",
                            "is-invalid",
                        );
                        this.classList.add("is-valid");
                    }
                }, 500); // Tunggu 500ms setelah selesai mengetik
            }
        });
    }
    const regWa = document.getElementById("reg-nowa");
    let waTimeout;
    if (regWa) {
        regWa.addEventListener("input", function () {
            clearTimeout(waTimeout);
            const val = this.value.replace(/\D/g, "");
            const feedback =
                this.parentElement.querySelector(".invalid-feedback");
            if (val.length > 8) {
                waTimeout = setTimeout(async () => {
                    const no_wa_db = "+" + val;
                    const res = await api.checkWA(no_wa_db);
                    if (!res.available) {
                        this.classList.add("border-danger", "text-danger");
                        this.classList.remove("is-valid");
                        if (feedback)
                            feedback.textContent =
                                "Nomor WhatsApp ini sudah terdaftar sebelumnya.";
                    } else {
                        this.classList.remove(
                            "border-danger",
                            "text-danger",
                            "is-invalid",
                        );
                        this.classList.add("is-valid");
                    }
                }, 500);
            } else {
                this.classList.remove("is-invalid", "is-valid");
            }
        });
    }
    const regPassword = document.getElementById("reg-password");
    if (regPassword) {
        regPassword.addEventListener("input", function () {
            const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
            if (this.value.length === 0) {
                this.classList.remove("is-invalid", "is-valid");
            } else if (!regex.test(this.value)) {
                this.classList.add("border-danger", "text-danger");
                this.classList.remove("is-valid");
            } else {
                this.classList.remove(
                    "border-danger",
                    "text-danger",
                    "is-invalid",
                );
                this.classList.add("is-valid");
            }
        });
    }
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btnReg = document.getElementById("btn-register");
            const originalText = btnReg.innerHTML;
            const password = document.getElementById("reg-password").value;
            const confirmPassword = document.getElementById(
                "reg-password-confirm",
            ).value;
            const showError = (msg, el) => {
                if (el) {
                    el.classList.add("border-danger", "text-danger");
                    const feedback =
                        el.parentElement.querySelector(".invalid-feedback");
                    if (feedback) feedback.textContent = msg;
                    el.focus();
                } else {
                    showToast(msg, "danger");
                }
            };
            if (
                regUsername &&
                regUsername.classList.contains("border-danger")
            ) {
                showError(
                    "Format Username tidak valid atau sudah terdaftar.",
                    regUsername,
                );
                return;
            }
            if (regWa && regWa.classList.contains("border-danger")) {
                showError(
                    "Nomor WhatsApp tidak valid atau sudah terdaftar.",
                    regWa,
                );
                return;
            }
            if (
                regPassword &&
                regPassword.classList.contains("border-danger")
            ) {
                showError(
                    "Password belum memenuhi standar keamanan.",
                    regPassword,
                );
                return;
            }
            if (password !== confirmPassword) {
                showError(
                    "Konfirmasi password tidak cocok! Silakan periksa kembali.",
                    document.getElementById("reg-password-confirm"),
                );
                return;
            }
            const userData = {
                nama_lengkap: document.getElementById("reg-nama").value,
                username: document.getElementById("reg-username").value,
                no_wa:
                    "+" +
                    document
                        .getElementById("reg-nowa")
                        .value.replace(/\D/g, ""),
                password: password,
            };
            try {
                btnReg.innerHTML =
                    '<span class="spinner-border spinner-border-sm"></span> Memproses...';
                btnReg.disabled = true;
                const response = await api.register(userData);
                tempUsername = userData.username;
                document
                    .getElementById("register-step-1")
                    .classList.add("hidden");
                document
                    .getElementById("register-step-2")
                    .classList.remove("hidden");
                showToast(
                    "Pendaftaran tahap awal berhasil! Silakan periksa WhatsApp Anda untuk kode OTP.",
                    "success",
                );
                startOTPTimer();
            } catch (error) {
                showToast(`Gagal Registrasi: ${error.message}`, "danger");
            } finally {
                btnReg.innerHTML = originalText;
                btnReg.disabled = false;
            }
        });
    }
    let otpTimerInterval;
    function startOTPTimer() {
        const timerSpan = document.getElementById("otp-timer");
        const timerText = document.getElementById("otp-timer-text");
        const btnResend = document.getElementById("btn-resend-otp");
        if (!timerSpan || !timerText || !btnResend) return;
        let timeLeft = 120;
        timerText.classList.remove("hidden");
        btnResend.classList.add("disabled");
        timerSpan.textContent = timeLeft;
        clearInterval(otpTimerInterval);
        otpTimerInterval = setInterval(() => {
            timeLeft--;
            timerSpan.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(otpTimerInterval);
                timerText.classList.add("hidden");
                btnResend.classList.remove("disabled");
            }
        }, 1000);
    }
    const btnResend = document.getElementById("btn-resend-otp");
    if (btnResend) {
        btnResend.addEventListener("click", async () => {
            if (btnResend.classList.contains("disabled")) return;
            try {
                btnResend.innerHTML =
                    '<span class="spinner-border spinner-border-sm"></span> Mengirim...';
                btnResend.classList.add("disabled");
                await api.resendOTP(tempUsername);
                showToast(
                    "Kode OTP baru telah dikirim ke WhatsApp Anda.",
                    "success",
                );
                btnResend.innerHTML = "Minta Ulang Kode";
                startOTPTimer();
            } catch (error) {
                showToast(
                    `Gagal mengirim ulang OTP: ${error.message}`,
                    "danger",
                );
                btnResend.innerHTML = "Minta Ulang Kode";
                btnResend.classList.remove("disabled");
            }
        });
    }
    const otpInputs = document.querySelectorAll(".rotp-input");
    const rotpInputs = document.querySelectorAll(".rotp-input");
    const hiddenOtpInput = document.getElementById("reg-otp");
    function updateHiddenOtp() {
        if (hiddenOtpInput) {
            hiddenOtpInput.value = Array.from(otpInputs)
                .map((inp) => inp.value)
                .join("");
        }
    }
    async function verifyOTPSubmit() {
        updateHiddenOtp();
        const otpCode = hiddenOtpInput.value;
        if (otpCode.length !== 6) return;
        try {
            otpInputs.forEach((i) => (i.disabled = true));
            await api.verifyOTP(tempUsername, otpCode);
            showToast("Verifikasi Berhasil! Akun Anda telah aktif.", "success");
            setTimeout(() => {
                window.location.href = "/login";
            }, 1500);
        } catch (error) {
            showToast("Gagal Verifikasi: " + error.message, "danger");
            const regOtpError = document.getElementById("reg-otp-error");
            if (regOtpError) {
                regOtpError.textContent = error.message;
                regOtpError.classList.remove("hidden");
            }
            rotpInputs.forEach((i) => {
                i.classList.add("border-danger", "text-danger");
                i.value = "";
                i.disabled = false;
            });
            if (rotpInputs[0]) rotpInputs[0].focus();
            updateHiddenOtp();
        }
    }
    if (rotpInputs.length > 0) {
        const regOtpError = document.getElementById("reg-otp-error");
        rotpInputs.forEach((input, index) => {
            input.addEventListener("input", async () => {
                if (regOtpError) regOtpError.classList.add("hidden");
                rotpInputs.forEach((i) =>
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
                        verifyOTPSubmit();
                    }
                }
                updateHiddenOtp();
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
                otpCode.split("").forEach((char, i) => {
                    if (i < otpInputs.length) {
                        otpInputs[i].value = char;
                    }
                });
                updateHiddenOtp();
                if (otpCode.length === 6) {
                    verifyOTPSubmit();
                } else {
                    otpInputs[otpCode.length].focus();
                }
            }
        });
    }
    if (otpForm) {
        otpForm.addEventListener("submit", (e) => {
            e.preventDefault();
            verifyOTPSubmit();
        });
    }

    // --- FORGOT PASSWORD LOGIC ---
    const forgotForm = document.getElementById("forgot-password-form");
    let resetWaTemp = "";

    if (forgotForm) {
        forgotForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btnReset = document.getElementById("btn-reset");
            const originalText = btnReset.innerHTML;
            let waInput = document
                .getElementById("reset-wa")
                .value.replace(/\D/g, "");
            if (waInput.startsWith("0")) {
                waInput = "62" + waInput.substring(1);
            } else if (waInput.startsWith("8")) {
                waInput = "62" + waInput;
            }
            resetWaTemp = "+" + waInput;

            try {
                btnReset.innerHTML =
                    '<span class="spinner-border spinner-border-sm"></span> Memproses...';
                btnReset.disabled = true;
                await api.forgotPasswordRequestOTP(resetWaTemp);
                document.getElementById("reset-step-1").classList.add("hidden");
                document
                    .getElementById("reset-step-2")
                    .classList.remove("hidden");
                startResetOTPTimer();
            } catch (error) {
                showToast(error.message || "Gagal meminta OTP.", "danger");
            } finally {
                btnReset.innerHTML = originalText;
                btnReset.disabled = false;
            }
        });
    }

    let resetOtpTimer;
    function startResetOTPTimer() {
        const btnResend = document.getElementById("btn-resend-reset");
        if (!btnResend) return;
        let timeLeft = 120;
        btnResend.classList.add("disabled");
        clearInterval(resetOtpTimer);
        resetOtpTimer = setInterval(() => {
            timeLeft--;
            const m = Math.floor(timeLeft / 60);
            const s = timeLeft % 60;
            btnResend.textContent = `Tunggu ${m}:${s < 10 ? "0" : ""}${s}`;
            if (timeLeft <= 0) {
                clearInterval(resetOtpTimer);
                btnResend.textContent = "Kirim Ulang Kode";
                btnResend.classList.remove("disabled");
            }
        }, 1000);
    }

    const btnResendReset = document.getElementById("btn-resend-reset");
    if (btnResendReset) {
        btnResendReset.addEventListener("click", async () => {
            if (btnResendReset.classList.contains("disabled")) return;
            try {
                btnResendReset.innerHTML =
                    '<span class="spinner-border spinner-border-sm"></span> Mengirim...';
                btnResendReset.classList.add("disabled");
                await api.forgotPasswordRequestOTP(resetWaTemp);
                showToast("Kode OTP baru telah dikirim.", "success");
                startResetOTPTimer();
            } catch (error) {
                showToast(
                    error.message || "Gagal mengirim ulang OTP.",
                    "danger",
                );
                btnResendReset.textContent = "Kirim Ulang Kode";
                btnResendReset.classList.remove("disabled");
            }
        });
    }

    const resetOtpInputs = document.querySelectorAll(".reset-otp-input");
    const hiddenResetOtp = document.getElementById("reset-otp-val");

    async function verifyResetOTP() {
        const otpCode = Array.from(resetOtpInputs)
            .map((inp) => inp.value)
            .join("");
        if (otpCode.length !== 6) return;

        try {
            resetOtpInputs.forEach((i) => (i.disabled = true));
            await api.forgotPasswordVerifyOTP(resetWaTemp, otpCode);
            showToast("OTP Valid! Silakan masukkan password baru.", "success");
            document.getElementById("reset-step-2").classList.add("hidden");
            document.getElementById("reset-step-3").classList.remove("hidden");
            if (hiddenResetOtp) hiddenResetOtp.value = otpCode;
        } catch (error) {
            const errDiv = document.getElementById("reset-otp-error");
            if (errDiv) {
                errDiv.textContent = error.message;
                errDiv.classList.remove("hidden");
            }
            resetOtpInputs.forEach((i) => {
                i.classList.add("border-danger", "text-danger");
                i.value = "";
                i.disabled = false;
            });
            resetOtpInputs[0].focus();
        }
    }

    if (resetOtpInputs.length > 0) {
        resetOtpInputs.forEach((input, index) => {
            input.addEventListener("input", () => {
                const errDiv = document.getElementById("reset-otp-error");
                if (errDiv) errDiv.classList.add("hidden");
                resetOtpInputs.forEach((i) =>
                    i.classList.remove(
                        "border-danger",
                        "text-danger",
                        "is-invalid",
                    ),
                );
                input.value = input.value.replace(/[^0-9]/g, "");

                if (input.value !== "") {
                    if (index < resetOtpInputs.length - 1) {
                        resetOtpInputs[index + 1].focus();
                    } else {
                        verifyResetOTP();
                    }
                }
            });
            input.addEventListener("keydown", (e) => {
                if (e.key === "Backspace" && input.value === "" && index > 0) {
                    resetOtpInputs[index - 1].focus();
                }
            });
        });
        resetOtpInputs[0].addEventListener("paste", (e) => {
            e.preventDefault();
            const pastedData = (
                e.clipboardData || window.clipboardData
            ).getData("text");
            const otpCode = pastedData.replace(/[^0-9]/g, "").slice(0, 6);
            if (otpCode.length > 0) {
                otpCode.split("").forEach((char, i) => {
                    if (i < resetOtpInputs.length)
                        resetOtpInputs[i].value = char;
                });
                if (otpCode.length === 6) verifyResetOTP();
            }
        });
    }

    const resetNewPwForm = document.getElementById("reset-new-password-form");
    if (resetNewPwForm) {
        resetNewPwForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const pw = document.getElementById("reset-new-pw").value;
            const pwc = document.getElementById("reset-new-pw-confirm").value;
            if (pw !== pwc) {
                showToast("Konfirmasi password tidak cocok.", "danger");
                return;
            }
            const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
            if (!regex.test(pw)) {
                showToast(
                    "Password harus 8 karakter, mengandung huruf besar, kecil, dan angka.",
                    "danger",
                );
                return;
            }

            const btnSave = document.getElementById("btn-save-password");
            const originalText = btnSave.innerHTML;

            try {
                btnSave.innerHTML =
                    '<span class="spinner-border spinner-border-sm"></span> Menyimpan...';
                btnSave.disabled = true;
                const otpCode = hiddenResetOtp ? hiddenResetOtp.value : "";
                await api.forgotPasswordReset(resetWaTemp, otpCode, pw);
                showToast(
                    "Password berhasil diubah! Mengalihkan ke login...",
                    "success",
                );
                setTimeout(() => {
                    window.location.href = "/login";
                }, 2000);
            } catch (error) {
                showToast(error.message || "Gagal mereset password.", "danger");
                btnSave.innerHTML = originalText;
                btnSave.disabled = false;
            }
        });
    }
});
