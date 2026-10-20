const initMonitoringDetail = async () => {
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
        if (record.created_at) {
            const ca = new Date(record.created_at);
            createdAtStr = ca.toLocaleDateString("id-ID", {day: "2-digit", month: "2-digit"}) + " " + ca.toLocaleTimeString("id-ID", {hour: "2-digit", minute: "2-digit"}).replace(/\./g, ":");
        }

        document.getElementById('detail-tanggal').textContent = dateStr;
        document.getElementById('detail-pukul').textContent = timeStr;
        document.getElementById('detail-waktu-masuk').textContent = createdAtStr;
        document.getElementById('detail-aktual').textContent = (record.tinggi_air ?? "-") + " cm";
        document.getElementById('detail-hujan').textContent = (record.hujan ?? "-") + " mm";
        
    } catch (e) {
        document.querySelector('body').innerHTML = '<div class="alert alert-danger">Gagal memuat data.</div>';
    }
};

if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", initMonitoringDetail);
} else {
    initMonitoringDetail();
}
