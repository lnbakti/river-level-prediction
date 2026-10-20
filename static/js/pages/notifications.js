document.addEventListener("DOMContentLoaded", async () => {
    const notificationsTableBody = document.getElementById(
        "notifications-table-body",
    );
    const notificationsTableInfo = document.getElementById(
        "notifications-table-info",
    );
    const notifTime = document.getElementById("detail-notif-time");
    const notifName = document.getElementById("detail-notif-name");
    const notifUsername = document.getElementById("detail-notif-username");
    const notifWa = document.getElementById("detail-notif-wa");
    const notifStatusBadge = document.getElementById(
        "detail-notif-status-badge",
    );
    const notifMessage = document.getElementById("detail-notif-message");
    if (!notificationsTableBody || !notificationsTableInfo) {
        return;
    }
    let notifications = [];
    const formatTimestamp = (rawDate) => {
        if (!rawDate) return "-";
        return new Date(rawDate).toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    };
    const getStatusClass = (status) => {
        if (!status) return "bg-secondary";
        const s = status.toLowerCase();
        if (s === "terkirim") return "bg-success";
        if (s === "gagal") return "bg-danger";
        return "bg-secondary";
    };
    const populateModal = (item) => {
        if (item.created_at) {
            const d = new Date(item.created_at);
            const tStr = d
                .toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                })
                .replace(/\./g, ":");
            const dStr = d.toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
            });
            const elTanggal = document.getElementById("detail-notif-tanggal");
            const elPukul = document.getElementById("detail-notif-pukul");
            if (elTanggal) elTanggal.textContent = dStr;
            if (elPukul) elPukul.textContent = tStr;
        } else {
            const elTanggal = document.getElementById("detail-notif-tanggal");
            const elPukul = document.getElementById("detail-notif-pukul");
            if (elTanggal) elTanggal.textContent = "-";
            if (elPukul) elPukul.textContent = "-";
        }
        if (notifName) notifName.textContent = item.nama_lengkap ?? "-";
        if (notifUsername)
            notifUsername.textContent = item.username
                ? `@${item.username}`
                : "-";
        if (notifWa) notifWa.textContent = formatWaNumber(item.no_wa);
        if (notifStatusBadge) {
            const statusClass = getStatusClass(item.status);
            notifStatusBadge.innerHTML = `<span class="badge ${statusClass} rounded-pill px-3 shadow-sm">${item.status ?? "Tidak Diketahui"}</span>`;
        }
        if (notifMessage) {
            notifMessage.innerHTML = item.pesan
                ? item.pesan.replace(/\n/g, "<br>")
                : "-";
        }
    };
    let currentPage = 1;
    let rowsPerPage = 10;
    let searchQuery = "";
    let statusFilter = "Semua Status";
    let dateStart = "";
    let dateEnd = "";
    const renderNotifications = () => {
        notificationsTableBody.innerHTML = "";
        let filtered = notifications.filter((item) => {
            const q = searchQuery.toLowerCase();
            const matchSearch =
                (item.nama_lengkap || "").toLowerCase().includes(q) ||
                (item.username || "").toLowerCase().includes(q) ||
                (item.no_wa || "").toLowerCase().includes(q) ||
                (item.pesan || "").toLowerCase().includes(q) ||
                (item.status || "").toLowerCase().includes(q) ||
                (item.created_at || "").toLowerCase().includes(q);
            const matchStatus =
                statusFilter === "Semua Status" || item.status === statusFilter;
            let matchDate = true;
            if (dateStart || dateEnd) {
                const itemDate = new Date(item.created_at);
                itemDate.setHours(0, 0, 0, 0);
                if (dateStart) {
                    const start = new Date(dateStart);
                    start.setHours(0, 0, 0, 0);
                    if (itemDate < start) matchDate = false;
                }
                if (dateEnd) {
                    const end = new Date(dateEnd);
                    end.setHours(0, 0, 0, 0);
                    if (itemDate > end) matchDate = false;
                }
            }
            return matchSearch && matchStatus && matchDate;
        });
        const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        const startIdx = (currentPage - 1) * rowsPerPage;
        const endIdx = startIdx + rowsPerPage;
        const paginated = filtered.slice(startIdx, endIdx);
        if (paginated.length === 0) {
            notificationsTableBody.innerHTML = `
                <tr>
                    <td class="text-center" colspan="7">Tidak ada riwayat notifikasi.</td>
                </tr>
            `;
            notificationsTableInfo.textContent =
                "Tidak ada riwayat notifikasi untuk ditampilkan.";
        } else {
            paginated.forEach((item, index) => {
                const statusClass = getStatusClass(item.status);
                const d = new Date(item.created_at);
                const now = new Date();
                const isToday = d.toDateString() === now.toDateString();
                const timeStr = d
                    .toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                    })
                    .replace(/\./g, ":");
                const dateStr = d.toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                });
                const mobileDisplay = isToday ? timeStr : dateStr;
                const row = document.createElement("tr");
                const origIndex = notifications.indexOf(item);

                row.style.cursor = "pointer";
                row.setAttribute("data-bs-toggle", "modal");
                row.setAttribute("data-bs-target", "#detailNotifModal");
                row.setAttribute("data-notif-index", origIndex);
                row.setAttribute("data-action", "view");

                row.innerHTML = `
                    <td data-label="No" class="text-center">${startIdx + index + 1}</td>
                    <td data-label="Tanggal" class="text-center d-none d-md-table-cell text-nowrap">${dateStr}</td>
<td data-label="Pukul" class="text-center d-none d-md-table-cell text-nowrap">${timeStr}</td>
<td data-label="Waktu Kirim" class="text-center d-md-none fw-medium text-dark text-nowrap" style="font-size: 0.9rem;">
    ${mobileDisplay}
</td>
                    <td data-label="Nama Kontak">
                        <div class="fw-bold text-dark">${item.nama_lengkap || "-"}</div>
                        <div class="text-muted" style="font-size: 0.75rem;">@${item.username || "-"}</div>
                    </td>
                    <td data-label="Nomor WA">${window.formatWaNumber ? window.formatWaNumber(item.no_wa) : item.no_wa || "-"}</td>
                    <td data-label="Status" class="text-center"><span class="badge ${statusClass} rounded-pill px-3 shadow-sm">${item.status || "Tidak Diketahui"}</span></td>
                `;
                notificationsTableBody.appendChild(row);
            });
            const currentCount = paginated.length;
            notificationsTableInfo.textContent = `Menampilkan ${startIdx + 1} sampai ${startIdx + currentCount} dari ${filtered.length} notifikasi`;
        }
        renderPagination(totalPages);
    };
    const renderPagination = (totalPages) => {
        const paginationContainer = document.getElementById(
            "pagination-container",
        );
        if (!paginationContainer) return;
        paginationContainer.innerHTML = "";
        const prevLi = document.createElement("li");
        prevLi.className = `page-item ${currentPage === 1 ? "disabled" : ""}`;
        prevLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage - 1}">&laquo;</a>`;
        paginationContainer.appendChild(prevLi);

        let pages = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                pages = [1, 2, 3, "...", totalPages];
            } else if (currentPage >= totalPages - 2) {
                pages = [1, "...", totalPages - 2, totalPages - 1, totalPages];
            } else {
                pages = [1, "...", currentPage, "...", totalPages];
            }
        }

        pages.forEach((p) => {
            const li = document.createElement("li");
            if (p === "...") {
                li.className = "page-item disabled";
                li.innerHTML = `<a class="page-link" href="#">...</a>`;
            } else {
                li.className = `page-item ${currentPage === p ? "active" : ""}`;
                li.innerHTML = `<a class="page-link" href="#" data-page="${p}">${p}</a>`;
            }
            paginationContainer.appendChild(li);
        });

        const nextLi = document.createElement("li");
        nextLi.className = `page-item ${currentPage === totalPages || totalPages === 0 ? "disabled" : ""}`;
        nextLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage + 1}">&raquo;</a>`;
        paginationContainer.appendChild(nextLi);

        if (typeof lucide !== "undefined") lucide.createIcons();
    };
    const limitSelect = document.getElementById("filter-limit");
    if (limitSelect) {
        limitSelect.addEventListener("change", (e) => {
            rowsPerPage = parseInt(e.target.value);
            currentPage = 1;
            renderNotifications();
        });
    }
    const searchInput = document.getElementById("filter-search");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            searchQuery = e.target.value;
            currentPage = 1;
            renderNotifications();
        });
    }
    const applyFilterBtn = document.getElementById("btn-apply-filter");
    const statusSelect = document.getElementById("filter-status");
    const dateStartInput = document.getElementById("filter-date-start");
    const dateEndInput = document.getElementById("filter-date-end");
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener("click", () => {
            if (statusSelect) statusFilter = statusSelect.value;
            if (dateStartInput) dateStart = dateStartInput.value;
            if (dateEndInput) dateEnd = dateEndInput.value;
            currentPage = 1;
            renderNotifications();
            const dropdownEl = applyFilterBtn.closest(".dropdown-menu");
            if (dropdownEl && dropdownEl.classList.contains("show")) {
                const btnToggle = applyFilterBtn
                    .closest(".dropdown")
                    .querySelector('[data-bs-toggle="dropdown"]');
                if (btnToggle && typeof bootstrap !== "undefined") {
                    bootstrap.Dropdown.getInstance(btnToggle)?.hide();
                }
            }
        });
    }
    const paginationContainer = document.getElementById("pagination-container");
    if (paginationContainer) {
        paginationContainer.addEventListener("click", (e) => {
            e.preventDefault();
            if (e.target.tagName === "A" && e.target.dataset.page) {
                const newPage = parseInt(e.target.dataset.page);
                if (!isNaN(newPage)) {
                    currentPage = newPage;
                    renderNotifications();
                }
            }
        });
    }
    try {
        notifications = await api.getNotifications(100, 0); // Fetch up to 100
        renderNotifications();
        notificationsTableBody.addEventListener("click", (event) => {
            const target = event.target.closest("[data-notif-index]");
            if (!target) return;
            const index = Number(target.dataset.notifIndex);
            const item = notifications[index];
            if (!item) return;
            
            const d = new Date(item.created_at);
            const ds = {
                tanggal: d.toLocaleDateString("id-ID", {day:"2-digit", month:"long", year:"numeric"}),
                pukul: d.toLocaleTimeString("id-ID", {hour:"2-digit", minute:"2-digit"}).replace(/\./g, ":"),
                wa: window.formatWaNumber(item.no_wa),
                name: item.nama_lengkap,
                username: item.username,
                message: item.pesan,
                statusClass: item.status === "Terkirim" ? "bg-success" : "bg-danger",
                statusLabel: item.status
            };

            if (window.innerWidth >= 768) {
                sessionStorage.setItem('detailNotifData', JSON.stringify(ds));
                window.location.href = '/notifications/warning/detail';
                return;
            }
            
            populateModal(item);
        });
    } catch (error) {
        console.error("Notifications page error:", error);
        notificationsTableBody.innerHTML = `
            <tr>
                <td class="text-center text-danger" colspan="7">Gagal memuat riwayat notifikasi. ${error.message}</td>
            </tr>
        `;
        notificationsTableInfo.textContent =
            "Terjadi kesalahan saat mengambil data.";
    }
});
