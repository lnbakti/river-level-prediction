document.addEventListener("DOMContentLoaded", async () => {
    const tableBody = document.getElementById("system-error-table-body");
    const infoText = document.getElementById("system-error-table-info");
    const modalTitle = document.getElementById("detail-error-title");
    const modalStatus = document.getElementById("detail-error-status");
    const modalTime = document.getElementById("detail-error-time");
    const modalLog = document.getElementById("detail-error-log");
    if (!tableBody || !infoText) {
        return;
    }
    let systemErrors = [];
    let currentPage = 1;
    let rowsPerPage = 10;
    let searchQuery = "";
    let statusFilter = "Semua Error";
    let dateStart = "";
    let dateEnd = "";
    const formatTimestamp = (dateStr) => {
        return new Date(dateStr).toLocaleString("id-ID", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };
    const getTypeClass = (type) => {
        if (!type) return "bg-secondary";
        const t = type.toUpperCase();
        switch (t) {
            case "OFFLINE":
                return "bg-danger";
            case "ERROR":
                return "bg-danger";
            case "WARNING":
                return "bg-warning";
            case "ONLINE":
                return "bg-success";
            default:
                return "bg-success";
        }
    };
    const renderErrors = () => {
        tableBody.innerHTML = "";
        let filtered = systemErrors.filter((item) => {
            const q = searchQuery.toLowerCase();
            const matchSearch =
                (item.pesan || "").toLowerCase().includes(q) ||
                (item.status_alat || "").toLowerCase().includes(q) ||
                (item.created_at || "").toLowerCase().includes(q);
            const matchStatus =
                statusFilter === "Semua Error" ||
                item.status_alat === statusFilter;
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
            tableBody.innerHTML = `<tr><td class="text-center" colspan="6">Tidak ada data sistem error.</td></tr>`;
            infoText.textContent = "Tidak ada sistem error untuk ditampilkan.";
        } else {
            let tableHTML = "";
            paginated.forEach((item, index) => {
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
                const badgeClass = getTypeClass(item.status_alat);
                const badgeLabel = item.status_alat;

                tableHTML += `
                    <tr data-action="view" data-index="${systemErrors.indexOf(item)}" data-bs-toggle="modal" data-bs-target="#detailErrorModal" style="cursor: pointer;">
                        <td data-label="No" class="text-center">${startIdx + index + 1}</td>
                        <td data-label="Tanggal" class="text-center d-none d-md-table-cell text-nowrap">${dateStr}</td>
<td data-label="Pukul" class="text-center d-none d-md-table-cell text-nowrap">${timeStr}</td>
<td data-label="Waktu" class="text-center d-md-none fw-medium text-dark text-nowrap" style="font-size: 0.9rem;">
    ${mobileDisplay}
</td>
                        <td data-label="Pesan">
                            <div class="text-muted" style="font-size: 0.75rem;">
                                ${(item.pesan || "-").length > 45 ? (item.pesan || "-").substring(0, 45) + "..." : item.pesan || "-"}
                            </div>
                        </td>
                        <td data-label="Status Alat" class="text-center"><span class="badge ${badgeClass} rounded-pill px-3 shadow-sm">${badgeLabel}</span></td>
                    </tr>
                `;
            });
            tableBody.innerHTML = tableHTML;
            lucide.createIcons();
            infoText.textContent = `Menampilkan ${startIdx + 1} hingga ${startIdx + paginated.length} dari ${filtered.length} riwayat`;
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

        lucide.createIcons();
    };
    const limitSelect = document.getElementById("filter-limit");
    limitSelect?.addEventListener("change", (e) => {
        rowsPerPage = parseInt(e.target.value);
        currentPage = 1;
        renderErrors();
    });
    const searchInput = document.getElementById("filter-search");
    searchInput?.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        currentPage = 1;
        renderErrors();
    });
    document
        .getElementById("btn-apply-filter")
        ?.addEventListener("click", (e) => {
            statusFilter =
                document.getElementById("filter-status")?.value ||
                "Semua Error";
            dateStart =
                document.getElementById("filter-date-start")?.value || "";
            dateEnd = document.getElementById("filter-date-end")?.value || "";
            currentPage = 1;
            renderErrors();
            const applyBtn = e.currentTarget;
            const dropdownEl = applyBtn.closest(".dropdown-menu");
            if (dropdownEl && dropdownEl.classList.contains("show")) {
                const btnToggle = applyBtn
                    .closest(".dropdown")
                    .querySelector('[data-bs-toggle="dropdown"]');
                if (btnToggle && typeof bootstrap !== "undefined") {
                    bootstrap.Dropdown.getInstance(btnToggle)?.hide();
                }
            }
        });
    document
        .getElementById("pagination-container")
        ?.addEventListener("click", (e) => {
            e.preventDefault();
            if (e.target.dataset.page) {
                currentPage = parseInt(e.target.dataset.page);
                renderErrors();
            }
        });
    try {
        const fetchAndRender = async () => {
            const history = await api.getSystemErrors(100, 0);
            const currentHash = JSON.stringify(history);
            if (window.lastErrorsHash === currentHash) return;
            window.lastErrorsHash = currentHash;
            systemErrors = history;
            renderErrors();
        };
        await fetchAndRender();
        setInterval(fetchAndRender, 2500);
        document.addEventListener("click", (e) => {
            if (e.target.closest('[data-action="view"]')) {
                const btn = e.target.closest('[data-action="view"]');
                const index = btn.dataset.index;
                const item = systemErrors[index];
                if (!item) return;
                
                const d = new Date(item.created_at);
                const ds = {
                    tanggal: d.toLocaleDateString("id-ID", {day:"2-digit", month:"long", year:"numeric"}),
                    pukul: d.toLocaleTimeString("id-ID", {hour:"2-digit", minute:"2-digit"}).replace(/\./g, ":"),
                    log: item.pesan,
                    statusClass: getTypeClass(item.status_alat),
                    statusLabel: item.status_alat || "Unknown"
                };

                if (window.innerWidth >= 768) {
                    sessionStorage.setItem('detailErrorData', JSON.stringify(ds));
                    window.location.href = '/notifications/error/detail';
                    return;
                }
                
                const badgeClass = getTypeClass(item.status_alat);
                const badgeLabel = item.status_alat || "Unknown";
                if (modalTitle)
                    modalTitle.textContent = `Detail Error #${parseInt(index) + 1}`;
                const elTanggal = document.getElementById(
                    "detail-error-tanggal",
                );
                const elPukul = document.getElementById("detail-error-pukul");
                if (elTanggal && item.created_at) {
                    const d = new Date(item.created_at);
                    elTanggal.textContent = d.toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                    });
                } else if (elTanggal) {
                    elTanggal.textContent = "-";
                }

                if (elPukul && item.created_at) {
                    const d = new Date(item.created_at);
                    elPukul.textContent = d
                        .toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                        })
                        .replace(/\./g, ":");
                } else if (elPukul) {
                    elPukul.textContent = "-";
                }
                if (modalLog) {
                    modalLog.textContent = item.pesan ?? "-";
                }
                const modalSummary = document.getElementById(
                    "detail-error-summary",
                );
                if (modalSummary) {
                    modalSummary.textContent =
                        item.status_alat === "OFFLINE"
                            ? "Perangkat IoT Offline"
                            : item.status_alat === "WARNING"
                              ? "Perangkat dalam status peringatan"
                              : "Perangkat online dan terhubung";
                }
                const modalBadge =
                    document.getElementById("detail-error-badge");
                if (modalBadge) {
                    modalBadge.innerHTML = `<span class="badge ${badgeClass} rounded-pill px-3 shadow-sm">${badgeLabel}</span>`;
                }
            }
        });
    } catch (error) {
        console.error("System error page error:", error);
        tableBody.innerHTML = `
            <tr>
                <td class="text-center text-danger" colspan="6">Gagal memuat riwayat sistem error. ${error.message}</td>
            </tr>
        `;
    }
});
