const initPredictionDetail = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (!id) {
        document.querySelector('body').innerHTML = '<div class="alert alert-danger">ID tidak ditemukan.</div>';
        return;
    }

    try {
        const record = await api.getMonitoringById(id);
        
        const d = new Date(record.timestamp);
        const dateStr = d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
        const timeStr = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(/\./g, ":");
        
        let createdAtStr = "-";
        if (record.prediksi_created_at) {
            const ca = new Date(record.prediksi_created_at);
            createdAtStr = ca.toLocaleDateString("id-ID", {day: "2-digit", month: "2-digit"}) + " " + ca.toLocaleTimeString("id-ID", {hour: "2-digit", minute: "2-digit"}).replace(/\./g, ":");
        }
        
        let hasPred = record.prediksi_tinggi_air !== undefined && record.prediksi_tinggi_air !== null;
        let statusLabel = "MENUNGGU";
        let statusClass = "bg-secondary";
        
        if (hasPred && record.status_prediksi) {
            statusLabel = record.status_prediksi.toUpperCase();
            if (statusLabel === "AMAN") statusClass = "bg-success";
            else if (statusLabel === "WASPADA") statusClass = "bg-warning text-dark";
            else if (statusLabel === "BAHAYA") statusClass = "bg-danger";
        }

        document.getElementById('detail-tanggal').textContent = dateStr;
        document.getElementById('detail-pukul').textContent = timeStr;
        document.getElementById('detail-waktu-prediksi').textContent = createdAtStr;
        document.getElementById('detail-prediksi').textContent = hasPred ? record.prediksi_tinggi_air + " cm" : "-";
        
        document.getElementById('detail-status-wrapper').innerHTML = `<span class="badge ${statusClass} fs-6 rounded-pill px-3 py-2">${statusLabel}</span>`;
        
    } catch (e) {
        document.querySelector('body').innerHTML = '<div class="alert alert-danger">Gagal memuat data.</div>';
    }
};

if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", initPredictionDetail);
} else {
    initPredictionDetail();
}
