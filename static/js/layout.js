// --- SECURITY: Wajib Login ---
const token = localStorage.getItem("access_token");
if (!token) {
    window.location.href = "/login";
}

// Prevent CSS transitions on initial page load to avoid layout flash
const preloadStyle = document.createElement("style");
preloadStyle.id = "prevent-transitions";
preloadStyle.innerHTML =
    "*, *::before, *::after { transition: none !important; }";
document.head.appendChild(preloadStyle);

function parseJwt(token) {
    try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map(function (c) {
                    return (
                        "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
                    );
                })
                .join(""),
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

async function loadLayouts() {
    try {
        const cacheBuster = "?v=" + new Date().getTime();
        const payload = parseJwt(token);
        const isAdmin = payload && payload.role === "Admin";

        // Hide role-specific items synchronously to prevent flashing
        if (!isAdmin) {
            const roleStyle = document.createElement("style");
            roleStyle.innerHTML = ".admin-only { display: none !important; }";
            document.head.appendChild(roleStyle);
        } else {
            const roleStyle = document.createElement("style");
            roleStyle.innerHTML = ".user-only { display: none !important; }";
            document.head.appendChild(roleStyle);
        }

        let sidebar = await fetch("/layouts/sidebar.html" + cacheBuster).then(
            (r) => r.text(),
        );
        if (localStorage.getItem("sidebar-mini") === "true") {
            sidebar = sidebar.replace(
                /class="pc-sidebar"/g,
                'class="pc-sidebar mini-sidebar"',
            );
        }
        document.getElementById("sidebar-container").outerHTML = sidebar;
        const header = await fetch("/layouts/header.html" + cacheBuster).then(
            (r) => r.text(),
        );
        document.getElementById("header-container").outerHTML = header;

        
        // --- PINDAHKAN JUDUL HALAMAN KE HEADER ---
        const headerTitleDest = document.getElementById('header-page-title');
        
        
        // 1. Tentukan Judul Utama berdasarkan URL
        const path = window.location.pathname;
        let mainTitle = "";
        if (path === "/") mainTitle = "Dashboard";
        else if (path.startsWith("/monitoring")) mainTitle = "Riwayat Monitoring";
        else if (path.startsWith("/prediction")) mainTitle = "Riwayat Prediksi AI";
        else if (path.startsWith("/users")) mainTitle = "Kelola Pengguna";
        else if (path.startsWith("/notifications/error") || path.startsWith("/system-error")) mainTitle = "Riwayat Sistem";
        else if (path.startsWith("/notifications/warning") || path.startsWith("/notification")) mainTitle = "Riwayat Peringatan";
        else if (path.startsWith("/profile")) mainTitle = "Profil Saya";

        
        // Jika tidak dikenali dari URL, coba ambil dari page-header
        const pageTitleEl = document.querySelector('.page-header-title h2, .page-header-title h3, .page-header-title h4, .page-header-title h5, .page-header-title h1');
        
        if (window.innerWidth < 768) {
            // PADA MOBILE
            if (headerTitleDest) {
                headerTitleDest.innerHTML = '<div class="d-flex align-items-center gap-2"><span class="fw-bold" style="letter-spacing: -0.5px; font-size: 1.2rem; color: #334155;">River Water Level</span><span id="system-iot-status-dot-mobile" class="rounded-circle bg-secondary shadow-sm" style="width: 10px; height: 10px; display: inline-block;"></span></div>';
            }
            
            // Biarkan page-header tetap tampil
            const pageHeader = document.querySelector('.page-header');
            if (pageHeader) {
                pageHeader.style.display = '';
            }

            // Jika halaman tidak memiliki page-header (seperti Kelola Pengguna), buat judul manual
            const pcContent = document.querySelector('.pc-content');
            if (pcContent && !pageHeader && !document.getElementById('mobile-dynamic-title')) {
                const h2 = document.createElement('h4');
                h2.id = 'mobile-dynamic-title';
                h2.className = 'fw-bold mb-4';
                h2.textContent = mainTitle || (pageTitleEl ? pageTitleEl.textContent.trim() : "");
                pcContent.insertBefore(h2, pcContent.firstChild);
            }

        } else {
            // PADA DESKTOP
            if (headerTitleDest) {
                headerTitleDest.innerHTML = mainTitle || (pageTitleEl ? pageTitleEl.innerHTML : "");
            }
            
            // Sembunyikan page-header HANYA jika BUKAN halaman detail
            const isDetail = (pageTitleEl && pageTitleEl.innerHTML.toLowerCase().includes("detail")) || path.split('/').filter(Boolean).length > 1;
            
            if (!isDetail) {
                const pageHeader = document.querySelector('.page-header');
                if (pageHeader) {
                    pageHeader.style.display = 'none';
                }
            }
        }



        if (localStorage.getItem("sidebar-mini") === "true") {
            const icon = document.getElementById("sidebar-toggle-icon");
            if (icon) {
                icon.classList.remove("ti-chevron-left");
                icon.classList.add("ti-chevron-right");
            }
        }
        const footerEl = document.getElementById("footer-container");
        if (footerEl) {
            const footer = await fetch(
                "/layouts/footer.html" + cacheBuster,
            ).then((r) => r.text());
            footerEl.outerHTML = footer;
        }
        if (typeof change_box_container === "function")
            change_box_container("false");
        if (typeof layout_caption_change === "function")
            layout_caption_change("true");
        if (typeof layout_rtl_change === "function") layout_rtl_change("false");
        if (typeof preset_change === "function") preset_change("preset-1");
        if (typeof feather !== "undefined") feather.replace();
        window.layoutsReady = true;
        document.dispatchEvent(new Event("layoutsLoaded"));

        // Re-enable CSS transitions after layout is fully rendered
        setTimeout(() => {
            const preventStyle = document.getElementById("prevent-transitions");
            if (preventStyle) preventStyle.remove();

            // Fade out pre-loader smoothly now that layouts are ready and transitions are back
            const loader = document.querySelector(".loader-bg");
            if (loader) {
                loader.style.transition = "opacity 0.3s ease";
                loader.style.opacity = "0";
                setTimeout(() => loader.remove(), 300);
            }
        }, 50);

        await initializeSidebarProfile();
        await initializeHeaderNotifications();
        initializeNavbarStatus();
    } catch (e) {
        console.error("Gagal meload layout:", e);
    }
}
async function initializeSidebarProfile() {
    const sidebarInitial = document.getElementById("header-user-initial");
    const dropdownAvatar = document.getElementById("dropdown-user-avatar");
    const sidebarName = document.getElementById("header-user-name");
    const sidebarRole = document.getElementById("header-user-role");
    const sidebarTitleName = document.getElementById("sidebar-user-name");

    if (!sidebarInitial || !sidebarName || !sidebarRole) {
        return;
    }

    const cachedInitial = localStorage.getItem("cache_user_initial");
    const cachedName = localStorage.getItem("cache_user_name");
    const cachedRole = localStorage.getItem("cache_user_role");

    if (cachedInitial) {
        sidebarInitial.textContent = cachedInitial;
        if (dropdownAvatar) dropdownAvatar.textContent = cachedInitial;
    }
    if (cachedName) {
        sidebarName.textContent = cachedName;
        if (sidebarTitleName) sidebarTitleName.textContent = cachedName;
    }
    if (cachedRole) sidebarRole.textContent = cachedRole;

    try {
        const user = await api.getCurrentUser();
        if (!user) {
            window.location.href = "/login";
            return;
        }
        const displayName = user.nama_lengkap || user.username || "Pengguna";
        const displayRole = user.role || "Pengguna";
        const initial = displayName ? displayName.charAt(0).toUpperCase() : "?";

        sidebarInitial.textContent = initial;
        if (dropdownAvatar) dropdownAvatar.textContent = initial;
        sidebarName.textContent = displayName;
        sidebarRole.textContent = displayRole;
        if (sidebarTitleName) sidebarTitleName.textContent = displayName;

        localStorage.setItem("cache_user_initial", initial);
        localStorage.setItem("cache_user_name", displayName);
        localStorage.setItem("cache_user_role", displayRole);

        // --- ADMIN ROLE CHECK ---
        if (user.role !== "Admin") {
            const adminMenus = document.querySelectorAll(".admin-only");
            adminMenus.forEach((menu) => (menu.style.display = "none"));

            const currentPath = window.location.pathname;
            if (
                currentPath === "/users" ||
                currentPath === "/users/" ||
                currentPath.includes("/notifications/error")
            ) {
                window.location.href = "/403";
            }
        }
    } catch (error) {
        console.error("Sidebar profile load error:", error);
        sidebarInitial.textContent = "?";
        sidebarName.textContent = "Pengguna";
        sidebarRole.textContent = "";
    }
}
async function initializeHeaderNotifications() {
    const bellItem = document.getElementById("header-notification-item");
    const badgeEl = document.getElementById("header-notification-badge");
    const listEl = document.getElementById("header-notification-items");
    const emptyEl = document.getElementById("header-notification-empty");
    if (!bellItem || !badgeEl || !listEl || !emptyEl) {
        return;
    }
    try {
        const user = await api.getCurrentUser();
        if (!user || user.role !== "Admin") {
            bellItem.style.display = "none";
            return;
        }
        const errors = await api.getSystemErrors(50, 0, true);
        const currentHash = JSON.stringify(errors);
        if (window.lastNotificationHash === currentHash) return;
        window.lastNotificationHash = currentHash;
        const unreadCount = errors.filter(
            (item) => item.is_read === false,
        ).length;
        const badgeCount = unreadCount || errors.length;
        badgeEl.textContent = badgeCount > 0 ? badgeCount : "";
        if (errors.length === 0) {
            listEl.innerHTML = "";
            emptyEl.style.display = "block";
            return;
        }
        emptyEl.style.display = "none";
        listEl.innerHTML = errors
            .map((item) => {
                const d = new Date(item.created_at);
                const timestamp =
                    d
                        .toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                        })
                        .replace(/\./g, ":") + " WIB";

                const statusClass =
                    item.status_alat.toUpperCase() === "OFFLINE"
                        ? "bg-danger"
                        : item.status_alat.toUpperCase() === "WARNING"
                          ? "bg-warning"
                          : "bg-success";

                return `
                <div class="card mb-2 notification-card" data-id="${item.id}" data-time="${timestamp}" data-status="${item.status_alat}" data-status-class="${statusClass}" data-pesan="${(item.pesan || "-").replace(/"/g, "&quot;")}" style="cursor: pointer; transition: background 0.2s;">
                    <div class="card-body p-2 px-3">
                        <div class="d-flex align-items-center justify-content-between">
                            <span class="fw-bold text-dark" style="font-size: 0.85rem;">${timestamp}</span>
                            <span class="badge ${statusClass} rounded-pill px-3 shadow-sm">${item.status_alat}</span>
                        </div>
                    </div>
                </div>
            `;
            })
            .join("");
        lucide.createIcons();
    } catch (error) {
        console.error("Header notification load error:", error);
        bellItem.style.display = "none";
    }
}

function initializeNavbarStatus() {
    const updateTime = () => {
        const now = new Date();
        const options = {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        };
        const timeStr = now
            .toLocaleTimeString("id-ID", options)
            .replace(/\./g, ":");

        const timeEls = document.querySelectorAll("#system-time");
        timeEls.forEach((el) => (el.textContent = timeStr));
    };
    updateTime();
    setInterval(updateTime, 1000);

    const updateDOM = (idPrefix, html, className) => {
        const els = document.querySelectorAll(
            `#${idPrefix}, #${idPrefix}-mobile`,
        );
        els.forEach((el) => {
            el.innerHTML = html;
            if (className) el.className = className;
        });
    };

    const cachedIoT = localStorage.getItem("cache_iot_status");
    const cachedIoTClass = localStorage.getItem("cache_iot_class");
    if (cachedIoT) updateDOM("system-iot-status-dot", "", cachedIoTClass);

    const cachedPred = localStorage.getItem("cache_pred_status");
    const cachedPredClass = localStorage.getItem("cache_pred_class");
    if (cachedPred)
        updateDOM("system-pred-status", cachedPred, cachedPredClass);

    const updateStatus = async () => {
        try {
            const latest = await api.getMonitoringLatest();
            if (latest) {
                const lastTime = new Date(latest.created_at).getTime();
                const now = new Date().getTime();
                const diffSeconds = (now - lastTime) / 1000;

                if (diffSeconds > 45) {
                    updateDOM(
                        "system-iot-status-dot",
                        "",
                        "rounded-circle bg-danger shadow-sm",
                    );
                    updateDOM(
                        "system-pred-status",
                        "-",
                        "badge bg-secondary py-1 px-2 shadow-sm",
                    );
                    localStorage.setItem("cache_iot_status", "Offline");
                    localStorage.setItem(
                        "cache_iot_class",
                        "rounded-circle bg-danger shadow-sm",
                    );
                    localStorage.setItem("cache_pred_status", "-");
                    localStorage.setItem(
                        "cache_pred_class",
                        "badge bg-secondary py-1 px-2 shadow-sm",
                    );
                } else {
                    updateDOM(
                        "system-iot-status-dot",
                        "",
                        "rounded-circle bg-success shadow-sm",
                    );
                    localStorage.setItem("cache_iot_status", "Online");
                    localStorage.setItem(
                        "cache_iot_class",
                        "rounded-circle bg-success shadow-sm",
                    );

                    try {
                        const pred = await api.getPredictionLatest();
                        if (pred) {
                            const evalVal = pred.prediksi;
                            let label = "Aman";
                            let bg = "bg-success";
                            if (evalVal >= 25) {
                                label = "Bahaya";
                                bg = "bg-danger";
                            } else if (evalVal >= 15) {
                                label = "Waspada";
                                bg = "bg-warning";
                            }

                            const className = `badge ${bg} py-1 px-2 shadow-sm`;
                            updateDOM("system-pred-status", label, className);
                            localStorage.setItem("cache_pred_status", label);
                            localStorage.setItem("cache_pred_class", className);
                        } else {
                            updateDOM(
                                "system-pred-status",
                                "-",
                                "badge bg-secondary py-1 px-2 shadow-sm",
                            );
                            localStorage.setItem("cache_pred_status", "-");
                            localStorage.setItem(
                                "cache_pred_class",
                                "badge bg-secondary py-1 px-2 shadow-sm",
                            );
                        }
                    } catch (e) {
                        updateDOM(
                            "system-pred-status",
                            "-",
                            "badge bg-secondary py-1 px-2 shadow-sm",
                        );
                        localStorage.setItem("cache_pred_status", "-");
                        localStorage.setItem(
                            "cache_pred_class",
                            "badge bg-secondary py-1 px-2 shadow-sm",
                        );
                    }
                }
            } else {
                if (!cachedIoT)
                    updateDOM(
                        "system-iot-status-dot",
                        "",
                        "rounded-circle bg-secondary shadow-sm",
                    );
                if (!cachedPred)
                    updateDOM(
                        "system-pred-status",
                        "Menunggu...",
                        "badge bg-secondary py-1 px-2 shadow-sm",
                    );
            }
        } catch (e) {
            updateDOM(
                "system-iot-status-dot",
                "",
                "rounded-circle bg-danger shadow-sm",
            );
            updateDOM(
                "system-pred-status",
                "-",
                "badge bg-secondary py-1 px-2 shadow-sm",
            );
            localStorage.setItem("cache_iot_status", "Offline");
            localStorage.setItem(
                "cache_iot_class",
                "rounded-circle bg-danger shadow-sm",
            );
            localStorage.setItem("cache_pred_status", "-");
            localStorage.setItem(
                "cache_pred_class",
                "badge bg-secondary py-1 px-2 shadow-sm",
            );
        }
    };
    updateStatus();
    setInterval(updateStatus, 2500);
}

document.addEventListener("click", function (e) {
    if (e.target.closest("#sidebar-hide")) {
        e.preventDefault();
        const sidebar = document.querySelector(".pc-sidebar");
        if (sidebar) sidebar.classList.toggle("pc-sidebar-hide");
    }
    if (e.target.closest("#mobile-collapse")) {
        e.preventDefault();
        const sidebar = document.querySelector(".pc-sidebar");
        if (sidebar) {
            sidebar.classList.toggle("mob-sidebar-active");
            if (sidebar.classList.contains("mob-sidebar-active")) {
                if (!document.querySelector(".pc-menu-overlay")) {
                    sidebar.insertAdjacentHTML(
                        "beforeend",
                        '<div class="pc-menu-overlay"></div>',
                    );
                }
            } else {
                const overlay = document.querySelector(".pc-menu-overlay");
                if (overlay) overlay.remove();
            }
        }
    }
    if (e.target.closest("#header-logout")) {
        e.preventDefault();
        api.logout();
        return;
    }
    if (e.target.classList.contains("pc-menu-overlay")) {
        const sidebar = document.querySelector(".pc-sidebar");
        if (sidebar) sidebar.classList.remove("mob-sidebar-active");
        e.target.remove();
    }
    const pcLink = e.target.closest(".pc-hasmenu > .pc-link");
    if (pcLink) {
        e.preventDefault();
        const menu = pcLink.parentElement;
        const submenu = menu.querySelector(".pc-submenu");
        if (submenu) {
            const isVisible = submenu.style.display === "block";
            document.querySelectorAll(".pc-submenu").forEach((sub) => {
                sub.style.display = "none";
            });
            if (isVisible) {
                submenu.style.display = "none";
            } else {
                submenu.style.display = "block";
            }
        }
    }
    const notifCard = e.target.closest(".notification-card");
    if (notifCard) {
        e.preventDefault();
        e.stopPropagation();

        const id = notifCard.getAttribute("data-id");
        const ds = notifCard.dataset;

        // Populate and show Modal
        document.getElementById("header-notif-time").textContent = ds.time;
        document.getElementById("header-notif-status").innerHTML =
            `<span class="badge ${ds.statusClass} rounded-pill px-3 shadow-sm">${ds.status}</span>`;
        document.getElementById("header-notif-message").innerHTML = (
            ds.pesan || "-"
        ).replace(/\n/g, "<br>");

        const modal = new bootstrap.Modal(
            document.getElementById("headerNotificationModal"),
        );
        modal.show();

        // Hide the dropdown so it doesn't stay open behind the modal
        const dropdownEl = document.querySelector(
            "#header-notification-item .dropdown-menu",
        );
        if (dropdownEl) {
            dropdownEl.classList.remove("show");
            document
                .querySelector("#header-notification-item .dropdown-toggle")
                .classList.remove("show");
        }

        if (id) {
            const badgeEl = document.getElementById(
                "header-notification-badge",
            );
            if (badgeEl) {
                const currentCount = parseInt(badgeEl.textContent) || 0;
                if (currentCount > 1) badgeEl.textContent = currentCount - 1;
                else badgeEl.textContent = "";
            }
            api.markSystemErrorRead(id)
                .then(() => {
                    if (typeof renderErrors === "function") renderErrors(); // Refresh table if on error page

                    // Fetch new list (which will exclude this read item)
                    api.getSystemErrors(50, 0, true).then((errors) => {
                        window.lastNotificationHash = JSON.stringify(errors);
                        if (typeof initializeHeaderNotifications === "function")
                            initializeHeaderNotifications();
                    });
                })
                .catch(console.error);
        }
    }
    if (e.target.id === "btn-mark-all-read") {
        e.preventDefault();
        e.stopPropagation();
        api.markAllSystemErrorsRead()
            .then(() => {
                if (typeof initializeHeaderNotifications === "function")
                    initializeHeaderNotifications();
                if (typeof renderErrors === "function") renderErrors();
            })
            .catch(console.error);
    }
});

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadLayouts);
} else {
    loadLayouts();
}

setInterval(() => {
    if (typeof initializeHeaderNotifications === "function") {
        initializeHeaderNotifications();
    }
}, 2500);

// Mobile Bottom Tab Navigation Highlight
document.addEventListener("DOMContentLoaded", () => {
    const currentPath = window.location.pathname;

    // Default to dashboard
    let activeId = "tab-dashboard";

    if (currentPath.includes("/monitoring")) {
        activeId = "tab-monitoring";
    } else if (currentPath.includes("/prediction")) {
        activeId = "tab-prediction";
    } else if (currentPath.includes("/notifications/warning")) {
        activeId = "tab-warning";
    } else if (currentPath.includes("/users")) {
        activeId = "tab-users";
    } else if (currentPath.includes("/profile")) {
        activeId = "tab-profile";
    }

    const activeTab = document.getElementById(activeId);
    if (activeTab) {
        activeTab.classList.add("active-tab");
    }
});

// Mini sidebar state is now restored early in loadLayouts()

document.addEventListener("click", function (e) {
    if (e.target.closest("#sidebar-mini-toggle")) {
        e.preventDefault();
        const sidebar = document.querySelector(".pc-sidebar");
        if (sidebar) {
            const isMini = sidebar.classList.toggle("mini-sidebar");
            localStorage.setItem("sidebar-mini", isMini);
            const icon = document.getElementById("sidebar-toggle-icon");
            if (icon) {
                if (isMini) {
                    icon.classList.remove("ti-chevron-left");
                    icon.classList.add("ti-chevron-right");
                } else {
                    icon.classList.remove("ti-chevron-right");
                    icon.classList.add("ti-chevron-left");
                }
            }
        }
    }
});
