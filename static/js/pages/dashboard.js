document.addEventListener("DOMContentLoaded", async () => {
    let charts = {
        prediction: null,
        realtime: null,
        rain: null,
        monitoring: null,
        rainfall: null,
    };

    const predictionValue = document.getElementById("dashboard-prediksi-value");
    const predictionTag = document.getElementById("dashboard-prediksi-tag");
    const aktualValue = document.getElementById("dashboard-aktual-value");
    const aktualTag = document.getElementById("dashboard-aktual-tag");
    const rainValue = document.getElementById("dashboard-rain-value");
    const rainTag = document.getElementById("dashboard-rain-tag");

    const thresholdBadge = document.getElementById("dashboard-threshold-value");
    const rainTotalBadge = document.getElementById("dashboard-rain-total");
    const monitoringAktualGraph = document.getElementById("monitoring-aktual-graph");
    const predictionOnlyGraph = document.getElementById("prediction-only-graph");


    const loadAdminStats = async () => {
        try {
            const user = await api.getCurrentUser();

            if (user) {
                const welcomeName =
                    document.getElementById("welcome-user-name");
                if (welcomeName)
                    welcomeName.textContent =
                        user.nama_lengkap || user.username || "Pengguna";
            }

            if (!user || user.role !== "Admin") {
                const chartCol = document.getElementById("charts-column");
                if (chartCol) {
                    chartCol.className = "col-12";
                }
            }
        } catch (e) {
            console.error(e);
        }
    };
    loadAdminStats();

    const createProgressBar = (value, max, color) => {
        const percent = Math.min(
            100,
            max === 0 ? 0 : Math.round((value / max) * 100),
        );
        return `
            <div class="progress" style="height: 12px; border-radius: 8px; overflow: hidden; background: #f1f5f9;">
                <div class="progress-bar ${color}" role="progressbar" style="width: ${percent}%;" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
            <div class="small text-muted mt-2">${value} dari ${max} (${percent}%)</div>
        `;
    };
    const loadDashboard = async () => {
        try {
            const [prediction, history] = await Promise.all([
                api.getPredictionLatest(),
                api.getMonitoringHistory(60),
            ]);
            const currentHash =
                JSON.stringify(prediction) + JSON.stringify(history);
            if (window.lastDashboardHash === currentHash) return;
            window.lastDashboardHash = currentHash;
            const predictedLevel = prediction?.prediksi ?? null;
            const predictedStatus = prediction?.status
                ? prediction.status.toUpperCase()
                : null;
            const predictionCardStatus = predictedStatus || "TIDAK ADA DATA";

            // Update Public Status Card
            const publicCard = document.getElementById("public-status-card");
            const publicTitle = document.getElementById("public-status-title");
            const publicDesc = document.getElementById("public-status-desc");
            const publicLevel = document.getElementById(
                "public-status-waterlevel",
            );
            const publicLevelMain = document.getElementById(
                "public-status-waterlevel-main",
            );
            const publicRain = document.getElementById("public-status-rain");
            const latest = history[0] ?? null;

            if (publicLevel) {
                publicLevel.textContent = latest
                    ? `${latest.tinggi_air} cm`
                    : "- cm";
            }
            if (publicLevelMain) {
                publicLevelMain.textContent =
                    predictedLevel !== null ? `${predictedLevel} cm` : "- cm";
            }
            if (publicRain) {
                publicRain.textContent = latest
                    ? `${latest.hujan ?? 0} mm`
                    : "- mm";
            }

            if (publicCard && publicTitle && publicDesc) {
                const publicIcon = document.getElementById("public-status-icon");
                const publicIconBg = document.getElementById("public-status-icon-bg");

                if (predictionCardStatus === "BAHAYA") {
                    publicCard.style.background = "linear-gradient(135deg, #dc3545, #c82333)";
                    publicTitle.textContent = "BAHAYA";
                    publicTitle.style.color = "#fff";
                    publicDesc.textContent = "Tinggi air mencapai batas kritis! Segera evakuasi.";
                    if (publicIcon) { publicIcon.className = "ti ti-alert-octagon text-white text-opacity-75"; }
                    
                } else if (predictionCardStatus === "WASPADA") {
                    publicCard.style.background = "linear-gradient(135deg, #fd7e14, #d9690d)";
                    publicTitle.textContent = "WASPADA";
                    publicTitle.style.color = "#fff";
                    publicDesc.textContent = "Tinggi air meningkat signifikan. Harap waspada.";
                    if (publicIcon) { publicIcon.className = "ti ti-alert-triangle text-white text-opacity-75"; }
                    
                } else if (predictionCardStatus === "AMAN") {
                    publicCard.style.background = "linear-gradient(135deg, #28a745, #1e7e34)";
                    publicTitle.textContent = "AMAN";
                    publicTitle.style.color = "#fff";
                    publicDesc.textContent = "Kondisi air sungai normal. Tidak ada potensi banjir.";
                    if (publicIcon) { publicIcon.className = "ti ti-shield-check text-white text-opacity-75"; }
                    
                } else {
                    publicCard.style.background = "linear-gradient(135deg, #6c757d, #495057)";
                    publicTitle.textContent = "MEMUAT...";
                    publicTitle.style.color = "#fff";
                    publicDesc.textContent = "Sistem sedang mengambil data...";
                    if (publicIcon) { publicIcon.className = "ti ti-help text-white text-opacity-75"; }
                    
                }
            }

            if (predictionValue) {
                predictionValue.textContent =
                    predictedLevel !== null ? `${predictedLevel} cm` : "-";
            }
            if (predictionTag) {
                if (predictionCardStatus === "BAHAYA") {
                    predictionTag.textContent = "Darurat";
                    predictionTag.className = "text-danger mb-0";
                } else if (predictionCardStatus === "WASPADA") {
                    predictionTag.textContent = "Waspada";
                    predictionTag.className = "text-warning mb-0";
                } else if (predictionCardStatus === "AMAN") {
                    predictionTag.textContent = "Aman";
                    predictionTag.className = "text-success mb-0";
                } else {
                    predictionTag.textContent = "Belum tersedia";
                    predictionTag.className = "text-secondary mb-0";
                }
            }

            if (latest && aktualValue) {
                aktualValue.textContent = `${latest.tinggi_air ?? "-"} cm`;
            } else if (aktualValue) {
                aktualValue.textContent = "-";
            }
            if (latest && aktualTag) {
                aktualTag.textContent =
                    latest.tinggi_air >= 16 ? "Naik Tajam" : "Naik";
            } else if (aktualTag) {
                aktualTag.textContent = "Tidak ada data";
            }
            if (latest && rainValue) {
                rainValue.textContent = `${latest.hujan ?? 0} mm/jam`;
            } else if (rainValue) {
                rainValue.textContent = "-";
            }
            if (latest && rainTag) {
                rainTag.textContent = latest.hujan >= 10 ? "Deras" : "Ringan";
            } else if (rainTag) {
                rainTag.textContent = "Tidak ada data";
            }
            if (thresholdBadge) {
                thresholdBadge.textContent = "100 cm";
            }
            if (rainTotalBadge) {
                const totalRain = history.reduce(
                    (sum, item) => sum + Number(item.hujan ?? 0),
                    0,
                );
                rainTotalBadge.textContent =
                    history.length > 0 ? `${totalRain.toFixed(1)} mm` : "-";
            }
            const formatTime = (timestamp) => {
                const date = new Date(timestamp);
                const dd = String(date.getDate()).padStart(2, "0");
                const MM = String(date.getMonth() + 1).padStart(2, "0");
                const yyyy = date.getFullYear();
                const HH = String(date.getHours()).padStart(2, "0");
                const mm = String(date.getMinutes()).padStart(2, "0");
                const ss = String(date.getSeconds()).padStart(2, "0");
                return `${dd}/${MM}/${yyyy} ${HH}:${mm}:${ss}`;
            };
            const renderCombinedChart = (
                element,
                categories,
                seriesArr,
                chartKey
            ) => {
                if (!element) return;
                if (typeof ApexCharts === "undefined") return;
                
                const colors = seriesArr.map(s => s.color);

                if (charts[chartKey]) {
                    charts[chartKey].updateOptions({ 
                        xaxis: { 
                            categories,
                            labels: {
                                formatter: function(val) {
                                    if (typeof val === 'string' && val.includes(':')) {
                                        const parts = val.split(' ');
                                        if (parts.length > 1) {
                                            const timeStr = parts[1];
                                            const timeParts = timeStr.split(':');
                                            if (timeParts.length >= 3) {
                                                const sec = parseInt(timeParts[2], 10);
                                                if (sec % 10 === 0) {
                                                    return timeStr;
                                                } else {
                                                    return ' ';
                                                }
                                            }
                                        }
                                    }
                                    return val;
                                }
                            }
                        } 
                    });
                    charts[chartKey].updateSeries(seriesArr.map(s => ({
                        name: s.name,
                        type: s.type,
                        data: s.data
                    })));
                } else {
                    element.innerHTML = "";
                    const options = {
                        chart: {
                            fontFamily: "Inter var, sans-serif",
                            type: "area",
                            height: window.innerWidth < 768 ? 250 : 400,
                            toolbar: { show: false },
                            animations: {
                                enabled: true,
                                easing: "linear",
                                dynamicAnimation: { speed: 1200 },
                            },
                        },
                        colors: colors,
                        dataLabels: { enabled: false },
                        legend: { 
                            show: true,
                            position: 'top',
                            horizontalAlign: 'right'
                        },
                        stroke: {
                            curve: "smooth",
                            width: [3, 3],
                            dashArray: [0, 5]
                        },
                        markers: {
                            size: 0,
                            discrete: [
                                {
                                    seriesIndex: 0,
                                    dataPointIndex: categories.length - 2,
                                    fillColor: colors[0],
                                    strokeColor: "#fff",
                                    size: 5
                                },
                                {
                                    seriesIndex: 1,
                                    dataPointIndex: categories.length - 1,
                                    fillColor: colors[1],
                                    strokeColor: "#fff",
                                    size: 5
                                }
                            ],
                            hover: { size: 7 },
                        },
                        dropShadow: {
                            enabled: true,
                            top: 3,
                            left: 2,
                            blur: 4,
                            opacity: 0.2,
                        },
                        fill: {
                            type: ['gradient', 'solid'],
                            gradient: {
                                shadeIntensity: 1,
                                opacityFrom: 0.5,
                                opacityTo: 0.1,
                                stops: [0, 100]
                            },
                        },
                        grid: {
                            show: true,
                            borderColor: "#F3F5F7",
                            strokeDashArray: 2,
                            padding: { top: 10, right: 10, bottom: 15, left: 10 }
                        },
                        series: seriesArr.map(s => ({
                            name: s.name,
                            type: s.type,
                            data: s.data
                        })),
                        xaxis: {
                            type: 'category',
                            categories: categories,
                            axisBorder: { show: true },
                            axisTicks: { show: true },
                            labels: {
                                rotate: 0,
                                hideOverlappingLabels: false,
                                offsetY: 5,
                                style: { cssClass: "chart-xaxis-label" },
                                formatter: function(val) {
                                    if (typeof val === 'string' && val.includes(':')) {
                                        const parts = val.split(' ');
                                        if (parts.length > 1) {
                                            const timeStr = parts[1];
                                            const timeParts = timeStr.split(':');
                                            if (timeParts.length >= 3) {
                                                const sec = parseInt(timeParts[2], 10);
                                                if (sec % 10 === 0) {
                                                    return timeStr; // Tampilkan HH:mm:ss
                                                } else {
                                                    return ' '; // Spasi agar garis grid tetap ada tapi tanpa label
                                                }
                                            }
                                        }
                                    }
                                    return val;
                                }
                            }
                        },
                        yaxis: {
                            min: 0,
                            max: 20,
                            tickAmount: 2,
                            stepSize: 10,
                            labels: {
                                show: true,
                                formatter: (val) => val.toFixed(0) + " cm"
                            },
                        },
                        annotations: {
                            position: "back",
                            yaxis: [
                                { y: 0, y2: 10, fillColor: "#2ca87f", opacity: 0.05, strokeDashArray: 0, borderColor: "transparent" },
                                { y: 10, y2: 16, fillColor: "#e58a00", opacity: 0.1, strokeDashArray: 4, borderColor: "#e58a00" },
                                { y: 16, y2: 20, fillColor: "#dc2626", opacity: 0.1, strokeDashArray: 4, borderColor: "#dc2626" },
                            ],
                        },
                        tooltip: {
                            shared: true,
                            intersect: false,
                            x: {
                                formatter: function (val, opts) {
                                    if (opts && opts.dataPointIndex !== undefined) {
                                        return categories[opts.dataPointIndex];
                                    }
                                    return val;
                                }
                            },
                            y: {
                                formatter: function (val) {
                                    if (val === null || val === undefined) return "-";
                                    if (val >= 16) return val.toFixed(1) + " cm (BAHAYA)";
                                    if (val >= 10) return val.toFixed(1) + " cm (WASPADA)";
                                    return val.toFixed(1) + " cm (Aman)";
                                },
                            },
                        },
                    };
                    charts[chartKey] = new ApexCharts(element, options);
                    charts[chartKey].render();
                }
            };

            const combinedGraph = document.getElementById("combined-graph");
            if (combinedGraph) {
                const categories = history.map((item) => formatTime(item.timestamp)).reverse();
                categories.push("+30 Mnt");

                const actualsData = history.map(item => item.tinggi_air ?? 0).reverse();
                const lastActual = actualsData.length > 0 ? actualsData[actualsData.length - 1] : 0;
                actualsData.push(null);

                const predictionsData = new Array(actualsData.length).fill(null);
                predictionsData[predictionsData.length - 2] = lastActual; // Sambung dari ujung aktual
                predictionsData[predictionsData.length - 1] = predictedLevel !== null ? parseFloat(predictedLevel) : null;

                if (categories.length > 0) {
                    renderCombinedChart(
                        combinedGraph,
                        categories,
                        [
                            { name: "Aktual (saat ini)", type: "area", data: actualsData, color: "#4680ff" },
                            { name: "Prediksi (tiba +30 Mnt)", type: "line", data: predictionsData, color: "#ff8f00" }
                        ],
                        "combined"
                    );
                }
            }

                // --- ANIMASI SAHAM / CRYPTO dihapus karena data sudah riil-time ---
                if (window.cryptoChartInterval) {
                    clearInterval(window.cryptoChartInterval);
                    window.cryptoChartInterval = null;
                }
        } catch (error) {
            console.error("Dashboard page error:", error);
        }
    };
    loadDashboard();
    setInterval(loadDashboard, 1500);
});
