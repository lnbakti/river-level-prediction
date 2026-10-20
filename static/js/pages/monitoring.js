document.addEventListener("DOMContentLoaded", async () => {
    const sensorTableBody = document.getElementById("sensor-table-body");
    const sensorTableInfo = document.getElementById("sensor-table-info");
    if (!sensorTableBody || !sensorTableInfo) {
        return;
    }
    let sensorHistory = [];
    let currentPage = 1;
    let rowsPerPage = 10;
    let searchQuery = "";
    let statusFilter = "Semua Status";
    let dateStart = "";
    let dateEnd = "";
    // Status logika di ambil dari prediksi
    const getStatusLabel = (prediksi) => {
        const val = parseFloat(prediksi) || 0;
        if (val >= 15) return "Bahaya";
        if (val >= 10) return "Waspada";
        return "Aman";
    };
    const renderSensors = () => {
        sensorTableBody.innerHTML = "";
        let filtered = sensorHistory.filter((record) => {
            const q = searchQuery.toLowerCase();
            const recordStatus = record.status_prediksi
                ? record.status_prediksi.toUpperCase()
                : "MENUNGGU";
            const recordStatusLbl = recordStatus.toLowerCase();
            const matchSearch =
                String(record.tinggi_air || "")
                    .toLowerCase()
                    .includes(q) ||
                String(record.hujan || "")
                    .toLowerCase()
                    .includes(q) ||
                String(record.prediksi_tinggi_air || "")
                    .toLowerCase()
                    .includes(q) ||
                recordStatusLbl.includes(q) ||
                (record.timestamp || "").toLowerCase().includes(q);
            const matchStatus =
                statusFilter === "Semua Status" ||
                recordStatus === statusFilter.toUpperCase();
            let matchDate = true;
            if (dateStart || dateEnd) {
                const itemDate = new Date(record.timestamp);
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
            sensorTableBody.innerHTML = `<tr><td class="text-center" colspan="8">Tidak ada data sensor.</td></tr>`;
            sensorTableInfo.textContent =
                "Tidak ada riwayat sensor untuk ditampilkan.";
        } else {
            let tableHTML = "";
            paginated.forEach((record, index) => {
                const d = new Date(record.timestamp);
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
                const hasPred =
                    record.prediksi_tinggi_air !== undefined &&
                    record.prediksi_tinggi_air !== null;
                let statusClass = "bg-secondary";
                let textColor = "text-muted";
                let statusLabel = "MENUNGGU";
                if (hasPred && record.status_prediksi) {
                    statusLabel = record.status_prediksi.toUpperCase();
                    if (statusLabel === "BAHAYA") {
                        statusClass = "bg-danger";
                        textColor = "text-danger";
                    } else if (statusLabel === "WASPADA") {
                        statusClass = "bg-warning";
                        textColor = "text-warning";
                    } else {
                        statusClass = "bg-success";
                        textColor = "text-success";
                    }
                }
                const hujan = parseFloat(record.hujan) || 0;
                let rainIcon = "cloud";
                let rainColor = "text-muted";
                if (hujan > 0 && hujan < 100) {
                    rainIcon = "cloud-drizzle";
                    rainColor = "text-info";
                } else if (hujan >= 100 && hujan < 200) {
                    rainIcon = "cloud-rain";
                    rainColor = "text-primary";
                } else if (hujan >= 200) {
                    rainIcon = "cloud-lightning";
                    rainColor = "text-danger";
                }

                let createdAtStr = "-";
                if (record.created_at) {
                    const ca = new Date(record.created_at);
                    createdAtStr = ca.toLocaleDateString("id-ID", {day: "2-digit", month: "2-digit"}) + " " + ca.toLocaleTimeString("id-ID", {hour: "2-digit", minute: "2-digit"}).replace(/\./g, ":");
                }

                tableHTML += `
                    <tr data-action="view" data-tanggal="${dateStr}" data-pukul="${timeStr}" data-waktu-masuk="${createdAtStr}" data-aktual="${record.tinggi_air ?? "-"} cm" data-hujan="${record.hujan ?? "-"} mm" data-prediksi="${record.prediksi_tinggi_air !== undefined && record.prediksi_tinggi_air !== null ? record.prediksi_tinggi_air + " cm" : "-"}" data-status-label="${statusLabel}" data-status-class="${statusClass}" data-id="${record.id}" style="cursor: pointer;">
                        <td data-label="No" class="text-center">${startIdx + index + 1}</td>
                        <td data-label="Tanggal" class="text-center d-none d-md-table-cell text-nowrap">${dateStr}</td>
<td data-label="Pukul" class="text-center d-none d-md-table-cell text-nowrap">${timeStr}</td>
<td data-label="Waktu" class="text-center d-md-none fw-medium text-dark text-nowrap" style="font-size: 0.9rem;">
    ${mobileDisplay}
</td>
                        <td data-label="Tinggi Air" class="text-center fw-bold text-primary">${record.tinggi_air ?? "-"} cm</td>
                        <td data-label="Curah Hujan" class="text-center fw-bold ${rainColor}">${record.hujan ?? "-"} mm</td>
                    </tr>
                `;
            });
            sensorTableBody.innerHTML = tableHTML;
            lucide.createIcons();
            sensorTableInfo.textContent = `Menampilkan ${startIdx + 1} hingga ${startIdx + paginated.length} dari ${filtered.length} riwayat`;
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
        renderSensors();
    });
    const searchInput = document.getElementById("filter-search");
    searchInput?.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        currentPage = 1;
        renderSensors();
    });
    document
        .getElementById("btn-apply-filter")
        ?.addEventListener("click", (e) => {
            statusFilter =
                document.getElementById("filter-status")?.value ||
                "Semua Status";
            dateStart =
                document.getElementById("filter-date-start")?.value || "";
            dateEnd = document.getElementById("filter-date-end")?.value || "";
            currentPage = 1;
            renderSensors();
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
            const link = e.target.closest("a");
            if (link && link.dataset.page) {
                currentPage = parseInt(link.dataset.page);
                renderSensors();
            }
        });
    try {
        const fetchAndRender = async () => {
            const history = await api.getMonitoringHistory(100);
            const currentHash = JSON.stringify(history);
            if (window.lastSensorsHash === currentHash) return;
            window.lastSensorsHash = currentHash;
            sensorHistory = history;
            renderSensors();
        };
        await fetchAndRender();
        setInterval(fetchAndRender, 1500);
    } catch (error) {
        console.error("Sensor page error:", error);
        sensorTableBody.innerHTML = `
            <tr>
                <td class="text-center text-danger" colspan="8">Gagal memuat data sensor. ${error.message}</td>
            </tr>
        `;
        sensorTableInfo.textContent = "Terjadi kesalahan saat mengambil data.";
    }
    if (sensorTableBody) {
        sensorTableBody.addEventListener("click", (event) => {
            const button = event.target.closest("[data-action='view']");
            if (!button) return;
            const ds = button.dataset;
            if (window.innerWidth >= 768) {
                window.location.href = `/monitoring/detail?id=${ds.id}`;
                return;
            }
            
            if(document.getElementById("modal-monitoring-tanggal")) document.getElementById("modal-monitoring-tanggal").textContent = ds.tanggal;
            if(document.getElementById("modal-monitoring-pukul")) document.getElementById("modal-monitoring-pukul").textContent = ds.pukul;
            if(document.getElementById("modal-monitoring-waktu-masuk")) document.getElementById("modal-monitoring-waktu-masuk").textContent = ds.waktuMasuk;
            if(document.getElementById("modal-monitoring-aktual")) document.getElementById("modal-monitoring-aktual").textContent = ds.aktual;
            if(document.getElementById("modal-monitoring-hujan")) document.getElementById("modal-monitoring-hujan").textContent = ds.hujan;
            
            const modalEl = document.getElementById('detailMonitoringModal');
            if (modalEl && typeof bootstrap !== 'undefined') {
                const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                modal.show();
            }
        });
    }
});
