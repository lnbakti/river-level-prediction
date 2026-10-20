document.addEventListener("DOMContentLoaded", async () => {
    const usersTableBody = document.getElementById("users-table-body");
    const usersTableInfo = document.getElementById("users-table-info");
    const detailInitial = document.getElementById("detail-user-initial");
    const detailFullname = document.getElementById("detail-user-fullname");
    const detailUsername = document.getElementById("detail-user-username");
    const detailAddress = document.getElementById("detail-user-address");
    const detailWa = document.getElementById("detail-user-wa");
    const detailStatus = document.getElementById("detail-user-status");
    const detailLastLogin = document.getElementById("detail-user-last-login");
    const editForm = document.getElementById("edit-user-form");
    const editNameInput = document.getElementById("edit-user-name");
    const editUsernameInput = document.getElementById("edit-user-username");
    const editWaInput = document.getElementById("edit-user-wa");
    const editAddressInput = document.getElementById("edit-user-address");
    const editStatusSelect = document.getElementById("edit-user-status");
    const confirmDeleteButton = document.getElementById("confirm-delete-user");
    let users = [];
    let selectedUserId = null;
    if (!usersTableBody || !usersTableInfo) {
        return;
    }
    const formatTimestamp = (value) => {
        if (!value) return "-";
        return new Date(value).toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    };
    let currentPage = 1;
    let rowsPerPage = 10;
    let searchQuery = "";
    let statusFilter = "Semua Status";
    const renderUsers = () => {
        usersTableBody.innerHTML = "";
        let filteredUsers = users.filter((user) => {
            const q = searchQuery.toLowerCase();
            const matchSearch =
                (user.nama_lengkap || "").toLowerCase().includes(q) ||
                (user.username || "").toLowerCase().includes(q) ||
                (user.no_wa || "").toLowerCase().includes(q) ||
                (user.role || "").toLowerCase().includes(q) ||
                (user.status_akun || "").toLowerCase().includes(q) ||
                (user.email || "").toLowerCase().includes(q);
            const matchStatus =
                statusFilter === "Semua Status" ||
                user.status_akun === statusFilter;
            return matchSearch && matchStatus;
        });
        const totalPages = Math.ceil(filteredUsers.length / rowsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        const startIdx = (currentPage - 1) * rowsPerPage;
        const endIdx = startIdx + rowsPerPage;
        const paginatedUsers = filteredUsers.slice(startIdx, endIdx);
        if (paginatedUsers.length === 0) {
            usersTableBody.innerHTML = `
                <tr>
                    <td class="text-center" colspan="6">Tidak ada data pengguna.</td>
                </tr>
            `;
            usersTableInfo.textContent =
                "Tidak ada pengguna untuk ditampilkan.";
        } else {
            paginatedUsers.forEach((user, index) => {
                const statusClass =
                    user.status_akun === "Aktif" ? "bg-success" : "bg-danger";
                const row = document.createElement("tr");
                row.style.cursor = "pointer";
                
                
                row.setAttribute("data-user-id", user.id);
                row.setAttribute("data-action", "view");
                const formattedWaDisplay = window.formatWaNumber
                    ? window.formatWaNumber(user.no_wa)
                    : user.no_wa || "-";
                row.innerHTML = `
                    <td data-label="No" class="text-center">${startIdx + index + 1}</td>
                    <td data-label="Nama Lengkap">
                        <h6 class="mb-0 fw-bold">${user.nama_lengkap || "-"}</h6>
                        <div class="text-muted d-md-none" style="font-size: 0.75rem;">@${user.username || "-"}</div>
                    </td>
                    <td data-label="Username">${user.username || "-"}</td>
                    <td data-label="WhatsApp">${formattedWaDisplay}</td>
                    <td data-label="Status" class="text-center"><span class="badge ${statusClass} rounded-pill px-3 shadow-sm">${user.status_akun || "Tidak Diketahui"}</span></td>
                    <td data-label="Aksi" class="text-center">
                        <div class="d-flex justify-content-center gap-2">
                            <button class="btn btn-sm btn-light-primary btn-action-edit" data-user-id="${user.id}" title="Edit Pengguna">
                                <i class="ti ti-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-light-danger btn-action-delete" data-user-id="${user.id}" title="Hapus Pengguna">
                                <i class="ti ti-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                usersTableBody.appendChild(row);
            });
            const currentCount = paginatedUsers.length;
            usersTableInfo.textContent = `Menampilkan ${startIdx + 1} sampai ${startIdx + currentCount} dari ${filteredUsers.length} pengguna`;
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
        renderUsers();
    });

    const searchInput = document.getElementById("filter-search");
    searchInput?.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        currentPage = 1;
        renderUsers();
    });

    document
        .getElementById("btn-apply-filter")
        ?.addEventListener("click", (e) => {
            statusFilter =
                document.getElementById("filter-status")?.value ||
                "Semua Status";
            currentPage = 1;
            renderUsers();
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
                renderUsers();
            }
        });

    try {
        const fetchAndRender = async () => {
            try {
                users = await api.getUsers(1000);
                renderUsers();
            } catch (error) {
                console.error("Error fetching users:", error);
                usersTableBody.innerHTML = `<tr><td class="text-center text-danger" colspan="6">Gagal memuat data pengguna.</td></tr>`;
                usersTableInfo.textContent =
                    "Terjadi kesalahan saat mengambil data.";
            }
        };
        await fetchAndRender();
        setInterval(fetchAndRender, 2500);

        if (usersTableBody) {
            usersTableBody.addEventListener("click", (event) => {
                const btnEdit = event.target.closest(".btn-action-edit");
                const btnDelete = event.target.closest(".btn-action-delete");
                
                if (btnEdit || btnDelete) {
                    event.stopPropagation();
                    const userId = (btnEdit || btnDelete).dataset.userId;
                    const user = users.find(u => u.id == userId);
                    if (!user) return;
                    
                    const ds = {
                        id: user.id,
                        raw_username: user.username,
                        raw_wa: user.no_wa,
                        raw_status: user.status_akun,
                        fullname: user.nama_lengkap || "-",
                        username: "@" + user.username,
                        wa: window.formatWaNumber(user.no_wa),
                        address: user.alamat || "-",
                        statusText: user.status_akun === "Aktif" ? "Aktif" : "Nonaktif",
                        statusClass: user.status_akun === "Aktif" ? "bg-success" : "bg-danger"
                    };
                    sessionStorage.setItem('detailUserData', JSON.stringify(ds));
                    
                    if (btnEdit) {
                        window.location.href = '/users/edit';
                    } else if (btnDelete) {
                        selectedUserId = user.id;
                        document.getElementById("delete-user-name-target").textContent = ds.fullname !== "-" ? ds.fullname : ds.username;
                        const modal = new bootstrap.Modal(document.getElementById("deleteUserModal"));
                        modal.show();
                    }
                    return;
                }
                
                const button = event.target.closest("[data-action='view']");
                if (!button) return;
                const userId = button.dataset.userId;
                selectedUserId = userId;
                const user = users.find((u) => u.id == userId);
                if (!user) return;
                
                const ds = {
                    id: user.id,
                    raw_username: user.username,
                    raw_wa: user.no_wa,
                    raw_status: user.status_akun,
                    fullname: user.nama_lengkap || "-",
                    username: "@" + user.username,
                    wa: window.formatWaNumber(user.no_wa),
                    address: user.alamat || "-",
                    statusText: user.status_akun === "Aktif" ? "Aktif" : "Nonaktif",
                    statusClass: user.status_akun === "Aktif" ? "bg-success" : "bg-danger"
                };

                if (window.innerWidth >= 768) {
                    sessionStorage.setItem('detailUserData', JSON.stringify(ds));
                    window.location.href = '/users/detail';
                    return;
                }

                // Show mobile detail modal manually since we removed data-bs-toggle
                const detailModal = new bootstrap.Modal(document.getElementById("detailUserModal"));
                detailModal.show();

                if (detailInitial)
                    detailInitial.textContent = user.nama_lengkap
                        ? user.nama_lengkap.charAt(0).toUpperCase()
                        : "?";
                if (detailFullname)
                    detailFullname.textContent = user.nama_lengkap || "-";
                if (detailUsername)
                    detailUsername.textContent = user.username
                        ? `@${user.username}`
                        : "-";
                if (detailAddress)
                    detailAddress.textContent =
                        user.alamat || "Tidak ada alamat";
                if (detailWa)
                    detailWa.textContent = window.formatWaNumber
                        ? window.formatWaNumber(user.no_wa)
                        : user.no_wa || "-";
                const detailTanggalLogin = document.getElementById(
                    "detail-user-tanggal-login",
                );
                const detailPukulLogin = document.getElementById(
                    "detail-user-pukul-login",
                );
                if (user.last_login) {
                    const d = new Date(user.last_login);
                    if (detailTanggalLogin)
                        detailTanggalLogin.textContent = d.toLocaleDateString(
                            "id-ID",
                            {
                                day: "2-digit",
                                month: "2-digit",
                                year: "2-digit",
                            },
                        );
                    if (detailPukulLogin)
                        detailPukulLogin.textContent = d
                            .toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                            })
                            .replace(/\./g, ":");
                } else {
                    if (detailTanggalLogin)
                        detailTanggalLogin.textContent = "Belum pernah login";
                    if (detailPukulLogin) detailPukulLogin.textContent = "-";
                }

                if (detailStatus) {
                    detailStatus.textContent =
                        user.status_akun || "Tidak Diketahui";
                    detailStatus.className = `badge ${user.status_akun === "Aktif" ? "bg-success" : "bg-danger"} rounded-pill px-3 shadow-sm`;
                }

                if (editNameInput)
                    editNameInput.value = user.nama_lengkap || "";
                if (editUsernameInput)
                    editUsernameInput.value = user.username || "";
                if (editWaInput)
                    editWaInput.value = window.formatWaNumber
                        ? window.formatWaNumber(user.no_wa)
                        : user.no_wa || "";
                if (editAddressInput)
                    editAddressInput.value = user.alamat || "";
                if (editStatusSelect)
                    editStatusSelect.value = user.status_akun || "Aktif";
            });
        }

        if (editForm) {
            editWaInput.addEventListener("input", window.handlePhoneInput);

            editForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                if (!selectedUserId) return;

                const btnSubmit = editForm.querySelector(
                    'button[type="submit"]',
                );
                const btnSave = document.getElementById("btn-save-edit");
                const origText = btnSubmit.innerHTML;
                btnSubmit.innerHTML =
                    '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Menyimpan...';
                btnSubmit.disabled = true;

                try {
                    const payload = {
                        nama_lengkap: editNameInput.value,
                        username: editUsernameInput.value,
                        no_wa: editWaInput.value
                            ? "+" + editWaInput.value.replace(/\D/g, "")
                            : "",
                        alamat: editAddressInput.value,
                        status_akun: editStatusSelect.value,
                    };
                    await api.updateUser(selectedUserId, payload);

                    const modalEl = document.getElementById("editUserModal");
                    if (modalEl && typeof bootstrap !== "undefined") {
                        const inst = bootstrap.Modal.getInstance(modalEl);
                        if (inst) inst.hide();
                    }
                    await fetchAndRender();

                    const successModalMsg = document.getElementById("success-modal-msg");
                    if (successModalMsg) {
                        successModalMsg.textContent = "Data pengguna berhasil diperbarui.";
                        const successModalEl = document.getElementById("successModal");
                        if (successModalEl && typeof bootstrap !== "undefined") {
                            new bootstrap.Modal(successModalEl).show();
                        }
                    }
                } catch (error) {
                    alert("Gagal memperbarui pengguna: " + error.message);
                } finally {
                    btnSubmit.innerHTML = origText;
                    btnSubmit.disabled = false;
                }
            });
        }

        
        const btnModalEdit = document.getElementById("btn-modal-edit-user");
        const btnModalDelete = document.getElementById("btn-modal-delete-user");
        if (btnModalEdit) {
            btnModalEdit.addEventListener("click", () => {
                if (selectedUserId) {
                    const detailModalEl = document.getElementById("detailUserModal");
                    if (detailModalEl && typeof bootstrap !== "undefined") {
                        bootstrap.Modal.getInstance(detailModalEl)?.hide();
                    }
                    const modal = new bootstrap.Modal(document.getElementById("editUserModal"));
                    modal.show();
                }
            });
        }
        if (btnModalDelete) {
            btnModalDelete.addEventListener("click", () => {
                if (selectedUserId) {
                    const user = users.find(u => u.id == selectedUserId);
                    if (user) {
                        const ds = {
                            fullname: user.nama_lengkap || "-",
                            username: "@" + user.username
                        };
                        document.getElementById("delete-user-name-target").textContent = ds.fullname !== "-" ? ds.fullname : ds.username;
                        const detailModalEl = document.getElementById("detailUserModal");
                        if (detailModalEl && typeof bootstrap !== "undefined") {
                            bootstrap.Modal.getInstance(detailModalEl)?.hide();
                        }
                        const modal = new bootstrap.Modal(document.getElementById("deleteUserModal"));
                        modal.show();
                    }
                }
            });
        }

        if (confirmDeleteButton) {
            confirmDeleteButton.addEventListener("click", async () => {
                if (!selectedUserId) return;

                const origText = confirmDeleteButton.innerHTML;
                confirmDeleteButton.innerHTML =
                    '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Menghapus...';
                confirmDeleteButton.disabled = true;

                try {
                    await api.deleteUser(selectedUserId);
                    const modalEl = document.getElementById("deleteUserModal");
                    if (modalEl && typeof bootstrap !== "undefined") {
                        bootstrap.Modal.getInstance(modalEl)?.hide();
                    }
                    const detailModalEl =
                        document.getElementById("detailUserModal");
                    if (detailModalEl && typeof bootstrap !== "undefined") {
                        bootstrap.Modal.getInstance(detailModalEl)?.hide();
                    }
                    await fetchAndRender();

                    const toastMsg = document.getElementById("toast-message");
                    if (toastMsg) {
                        toastMsg.textContent = "Pengguna berhasil dihapus.";
                        const toastEl = document.getElementById("systemToast");
                        if (toastEl && typeof bootstrap !== "undefined") {
                            new bootstrap.Toast(toastEl).show();
                        }
                    }
                } catch (error) {
                    alert("Gagal menghapus pengguna: " + error.message);
                } finally {
                    confirmDeleteButton.innerHTML = origText;
                    confirmDeleteButton.disabled = false;
                }
            });
        }
    } catch (error) {
        console.error("Initialization error:", error);
    }
});
