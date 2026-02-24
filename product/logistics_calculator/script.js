/**
 * 物流コスト・シミュレーター - Main Script v2.0
 */

// ===== State =====
const state = {
    csvData: null,
    csvFilename: '', // Track loaded filename
    calcMode: 'full', // 'full' or 'deliveryOnly'
    // Partial sums
    totalPc: 0,
    totalCs: 0,
    totalParcels: 0,

    // Calculated Costs
    calculatedDeliveryCost: 0, // Sum from CSV row-by-row

    // Defaults for manual input
    manualMonthlyCs: 5000,
    manualMonthlyPc: 25000,
    manualMonthlyParcels: 3000,
};

// ===== DOM Elements (initialized after DOM loads) =====
let elements = {};

function initElements() {
    elements = {
        // CSV
        csvDropzone: document.getElementById('csvDropzone'),
        csvInput: document.getElementById('csvInput'),
        csvStats: document.getElementById('csvStats'),
        statRows: document.getElementById('statRows'),
        statTotalPc: document.getElementById('statTotalPc'),
        statTotalCs: document.getElementById('statTotalCs'),
        statTotalParcels: document.getElementById('statTotalParcels'),

        // Manual Input
        inputMonthlyCs: document.getElementById('inputMonthlyCs'),
        inputMonthlyPc: document.getElementById('inputMonthlyPc'),
        inputMonthlyParcels: document.getElementById('inputMonthlyParcels'),

        // Storage
        stockWeeks: document.getElementById('stockWeeks'),
        weeksLabel: document.getElementById('weeksLabel'),
        csPerTsubo: document.getElementById('csPerTsubo'),
        storageTsuboPrice: document.getElementById('storageTsuboPrice'),

        // Working Space
        workingTsubo: document.getElementById('workingTsubo'),
        workingTsuboPrice: document.getElementById('workingTsuboPrice'),

        // Labor
        hourlyWage: document.getElementById('hourlyWage'),
        inboundProductivity: document.getElementById('inboundProductivity'),
        pickingProductivity: document.getElementById('pickingProductivity'),
        packingProductivity: document.getElementById('packingProductivity'),

        // Consumables
        consumablesPerParcel: document.getElementById('consumablesPerParcel'),

        // Area Prices Inputs
        areaInputs: document.querySelectorAll('.area-price'),

        // Management
        warehouseMgmtRate: document.getElementById('warehouseMgmtRate'),
        deliveryMgmtRate: document.getElementById('deliveryMgmtRate'),

        // Results - Main
        totalCost: document.getElementById('totalCost'),
        costPerParcel: document.getElementById('costPerParcel'),

        // Results - Quick Stats
        costStorageQuick: document.getElementById('costStorageQuick'),
        costWorkingQuick: document.getElementById('costWorkingQuick'),
        costLaborQuick: document.getElementById('costLaborQuick'),
        costConsumablesQuick: document.getElementById('costConsumablesQuick'),
        costDeliveryQuick: document.getElementById('costDeliveryQuick'),
        costManagementQuick: document.getElementById('costManagementQuick'),

        // Results - Table
        costStorage: document.getElementById('costStorage'),
        costWorking: document.getElementById('costWorking'),
        costLabor: document.getElementById('costLabor'),
        costConsumables: document.getElementById('costConsumables'),
        costDelivery: document.getElementById('costDelivery'),
        costManagement: document.getElementById('costManagement'),
        ratioStorage: document.getElementById('ratioStorage'),
        ratioWorking: document.getElementById('ratioWorking'),
        ratioLabor: document.getElementById('ratioLabor'),
        ratioConsumables: document.getElementById('ratioConsumables'),
        ratioDelivery: document.getElementById('ratioDelivery'),
        ratioManagement: document.getElementById('ratioManagement'),
    };
}

// ===== Area Mapping =====
const prefectureMap = {
    "北海道": "hokkaido",
    "青森県": "tohoku", "岩手県": "tohoku", "宮城県": "tohoku", "秋田県": "tohoku", "山形県": "tohoku", "福島県": "tohoku",
    "茨城県": "kanto", "栃木県": "kanto", "群馬県": "kanto", "埼玉県": "kanto", "千葉県": "kanto", "東京都": "kanto", "神奈川県": "kanto", "山梨県": "kanto",
    "新潟県": "chubu", "富山県": "chubu", "石川県": "chubu", "福井県": "chubu", "長野県": "chubu", "岐阜県": "chubu", "静岡県": "chubu", "愛知県": "chubu",
    "三重県": "kinki", "滋賀県": "kinki", "京都府": "kinki", "大阪府": "kinki", "兵庫県": "kinki", "奈良県": "kinki", "和歌山県": "kinki",
    "鳥取県": "chugoku", "島根県": "chugoku", "岡山県": "chugoku", "広島県": "chugoku", "山口県": "chugoku",
    "徳島県": "shikoku", "香川県": "shikoku", "愛媛県": "shikoku", "高知県": "shikoku",
    "福岡県": "kyushu", "佐賀県": "kyushu", "長崎県": "kyushu", "熊本県": "kyushu", "大分県": "kyushu", "宮崎県": "kyushu", "鹿児島県": "kyushu",
    "沖縄県": "okinawa"
};

// ===== Chart =====
let costChart = null;

function initChart() {
    const chartElement = document.getElementById('costChart');
    if (!chartElement) return;

    const ctx = chartElement.getContext('2d');
    costChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['保管スペース', '作業スペース', '作業人件費', '消耗品', '配送費', '管理費'],
            datasets: [{
                data: [0, 0, 0, 0, 0, 0],
                backgroundColor: [
                    '#7c3aed',
                    '#8b5cf6',
                    '#06b6d4',
                    '#22c55e',
                    '#f59e0b',
                    '#ef4444'
                ],
                borderColor: '#1a1a2e',
                borderWidth: 4,
                hoverOffset: 16,
                hoverBorderWidth: 2,
                hoverBorderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#a1a1aa',
                        padding: 20,
                        font: {
                            size: 12,
                            family: "'Inter', sans-serif",
                            weight: 500
                        },
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(30, 30, 60, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(124, 58, 237, 0.5)',
                    borderWidth: 1,
                    cornerRadius: 12,
                    padding: 14,
                    titleFont: { size: 14, weight: 600 },
                    bodyFont: { size: 13 },
                    callbacks: {
                        label: function (context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `¥${value.toLocaleString()} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '65%',
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    });
}

// ===== Format Currency =====
function formatCurrency(value) {
    return `¥${value.toLocaleString()}`;
}

// ===== Get Area Prices =====
function getAreaPrices() {
    const prices = {};
    elements.areaInputs.forEach(input => {
        const area = input.getAttribute('data-area');
        prices[area] = parseInt(input.value) || 0;
    });
    return prices;
}

// ===== Calculation Logic =====
function calculate() {
    // 1. Volumes
    let monthlyCs, monthlyPc, monthlyParcels;

    if (state.csvData) {
        monthlyCs = state.totalCs;
        monthlyPc = state.totalPc;
        monthlyParcels = state.totalParcels;
    } else {
        monthlyCs = parseInt(elements.inputMonthlyCs.value) || 0;
        monthlyPc = parseInt(elements.inputMonthlyPc.value) || 0;
        monthlyParcels = parseInt(elements.inputMonthlyParcels.value) || 0;
    }

    const monthlyInboundCs = monthlyCs; // Simple assumption

    // 2. Parameters
    const stockWeeks = parseInt(elements.stockWeeks.value) || 4;
    const csPerTsubo = parseInt(elements.csPerTsubo.value) || 50;
    const storageTsuboPrice = parseInt(elements.storageTsuboPrice.value) || 5500;

    const workingTsubo = parseInt(elements.workingTsubo.value) || 20;
    const workingTsuboPrice = parseInt(elements.workingTsuboPrice.value) || 5500;

    const hourlyWage = parseInt(elements.hourlyWage.value) || 1300;
    const inboundProductivity = parseInt(elements.inboundProductivity.value) || 200;
    const pickingProductivity = parseInt(elements.pickingProductivity.value) || 150;
    const packingProductivity = parseInt(elements.packingProductivity.value) || 30;

    const consumablesPerParcel = parseInt(elements.consumablesPerParcel.value) || 50;


    // ===== A. 保管スペース費 =====
    // If we have 0 Cases, then 0 Cost (Partial support)
    // Also skip if deliveryOnly mode
    let costStorage = 0;
    if (state.calcMode !== 'deliveryOnly' && monthlyCs > 0) {
        const avgStorageCs = (monthlyCs / 4) * stockWeeks;
        const storageTsubo = Math.ceil(avgStorageCs / csPerTsubo);
        costStorage = storageTsubo * storageTsuboPrice;
    }

    // ===== B. 作業スペース費 =====
    let costWorking = 0;
    if (state.calcMode !== 'deliveryOnly') {
        costWorking = workingTsubo * workingTsuboPrice;
    }

    // ===== C. 作業人件費 =====
    let costLabor = 0;
    if (state.calcMode !== 'deliveryOnly') {
        if (monthlyPc > 0 || monthlyInboundCs > 0 || monthlyParcels > 0) {
            const inboundHours = monthlyInboundCs > 0 ? monthlyInboundCs / inboundProductivity : 0;
            const pickingHours = monthlyPc > 0 ? monthlyPc / pickingProductivity : 0;
            const packingHours = monthlyParcels > 0 ? monthlyParcels / packingProductivity : 0;
            const totalLaborHours = inboundHours + pickingHours + packingHours;
            costLabor = Math.ceil(totalLaborHours * hourlyWage);
        }
    }

    // ===== D. 事務消耗品費 =====
    const costConsumables = monthlyParcels * consumablesPerParcel;

    // ===== E. 配送費 =====
    let costDelivery = 0;
    if (state.csvData) {
        // Use pre-calculated sum if CSV is loaded (because it uses row-by-row area logic)
        // However, if we change the area prices in the UI, we need to RE-CALCULATE based on the CSV data and new prices.
        // So we should re-scan the CSV data here using current UI prices.
        const areaPrices = getAreaPrices();
        let tempDeliveryCost = 0;

        state.csvData.forEach(row => {
            const pref = row['都道府県'] || '';
            // Determine parcels for this row
            let p = parseInt(row['総個口数'] || row['total_parcels'] || 0);
            if (p === 0) {
                // Fallback if not specified, try to calc from total_cs
                const total_cs = parseInt(row['総cs数'] || 0);
                const total_pc = parseInt(row['総pc数'] || row['total_pc'] || row['PC'] || 0);
                const qty = parseInt(row['入数'] || row['qty_per_case'] || 1);

                let cs = total_cs;
                if (cs === 0 && total_pc > 0 && qty > 0) {
                    cs = Math.ceil(total_pc / qty);
                }
                if (cs > 0) p = Math.ceil(cs * 0.8);
            }

            if (p > 0) {
                // Determine Zone
                const zone = prefectureMap[pref] || 'kanto'; // Default to Kanto if unknown
                const unitPrice = areaPrices[zone] || areaPrices['kanto'] || 600;
                tempDeliveryCost += (p * unitPrice);
            }
        });
        costDelivery = tempDeliveryCost;

    } else {
        // Manual Input Mode - Use weighted average? Or just Kanto price?
        // Let's use Kanto price as "Standard" for manual input
        const areaPrices = getAreaPrices();
        const unitPrice = areaPrices['kanto'] || 600;
        costDelivery = monthlyParcels * unitPrice;
    }

    // ===== F. 管理費（庫内・配送を分けて計算） =====
    const warehouseMgmtRate = parseInt(elements.warehouseMgmtRate?.value) || 10;
    const deliveryMgmtRate = parseInt(elements.deliveryMgmtRate?.value) || 5;

    // 庫内費用合計 = 保管 + 作業スペース + 人件費 + 消耗品
    const warehouseSubtotal = costStorage + costWorking + costLabor + costConsumables;
    const warehouseMgmtCost = Math.ceil(warehouseSubtotal * (warehouseMgmtRate / 100));

    // 配送管理費 = 配送費 × 配送管理費率
    const deliveryMgmtCost = Math.ceil(costDelivery * (deliveryMgmtRate / 100));

    const costManagement = warehouseMgmtCost + deliveryMgmtCost;

    // ===== Total =====
    const totalCost = costStorage + costWorking + costLabor + costConsumables + costDelivery + costManagement;
    const perParcelCost = monthlyParcels > 0 ? Math.ceil(totalCost / monthlyParcels) : 0;

    // ===== Update UI - Main =====
    elements.totalCost.textContent = formatCurrency(totalCost);
    elements.costPerParcel.textContent = formatCurrency(perParcelCost);

    // ===== Update UI - Quick Stats =====
    elements.costStorageQuick.textContent = formatCurrency(costStorage);
    elements.costWorkingQuick.textContent = formatCurrency(costWorking);
    elements.costLaborQuick.textContent = formatCurrency(costLabor);
    elements.costConsumablesQuick.textContent = formatCurrency(costConsumables);
    elements.costDeliveryQuick.textContent = formatCurrency(costDelivery);
    elements.costManagementQuick.textContent = formatCurrency(costManagement);

    // ===== Update UI - Table (if elements exist) =====
    if (elements.costStorage) elements.costStorage.textContent = formatCurrency(costStorage);
    if (elements.costWorking) elements.costWorking.textContent = formatCurrency(costWorking);
    if (elements.costLabor) elements.costLabor.textContent = formatCurrency(costLabor);
    if (elements.costConsumables) elements.costConsumables.textContent = formatCurrency(costConsumables);
    if (elements.costDelivery) elements.costDelivery.textContent = formatCurrency(costDelivery);
    if (elements.costManagement) elements.costManagement.textContent = formatCurrency(costManagement);

    // Ratios (if elements exist)
    const calcRatio = (val) => totalCost > 0 ? ((val / totalCost) * 100).toFixed(1) + '%' : '0%';
    if (elements.ratioStorage) elements.ratioStorage.textContent = calcRatio(costStorage);
    if (elements.ratioWorking) elements.ratioWorking.textContent = calcRatio(costWorking);
    if (elements.ratioLabor) elements.ratioLabor.textContent = calcRatio(costLabor);
    if (elements.ratioConsumables) elements.ratioConsumables.textContent = calcRatio(costConsumables);
    if (elements.ratioDelivery) elements.ratioDelivery.textContent = calcRatio(costDelivery);
    if (elements.ratioManagement) elements.ratioManagement.textContent = calcRatio(costManagement);

    // Update Chart (if it exists)
    if (costChart) {
        costChart.data.datasets[0].data = [
            costStorage,
            costWorking,
            costLabor,
            costConsumables,
            costDelivery,
            costManagement
        ];
        costChart.update('active');
    }

    // Store calculation details for breakdown panel
    state.breakdown = {
        storage: {
            title: '🏢 保管スペース費',
            items: [
                { label: '月間CS数', value: monthlyCs.toLocaleString() + ' CS' },
                { label: '在庫保有週数', value: stockWeeks + ' 週間' },
                { label: '平均保管CS', value: Math.ceil((monthlyCs / 4) * stockWeeks).toLocaleString() + ' CS' },
                { label: '1坪あたりCS', value: csPerTsubo.toLocaleString() + ' CS' },
                { label: '必要坪数', value: Math.ceil(((monthlyCs / 4) * stockWeeks) / csPerTsubo).toLocaleString() + ' 坪' },
                { label: '坪単価', value: formatCurrency(storageTsuboPrice) }
            ],
            formula: '(月間CS ÷ 4 × 週数) ÷ 坪CS × 坪単価',
            result: costStorage
        },
        working: {
            title: '🔧 作業スペース費',
            items: [
                { label: '作業坪数', value: workingTsubo.toLocaleString() + ' 坪' },
                { label: '坪単価', value: formatCurrency(workingTsuboPrice) }
            ],
            formula: '作業坪数 × 坪単価',
            result: costWorking
        },
        labor: {
            title: '👷 作業人件費',
            items: [
                { label: '時給', value: formatCurrency(hourlyWage) },
                { label: '入荷: CS数÷生産性', value: `${monthlyCs.toLocaleString()} ÷ ${inboundProductivity} = ${(monthlyCs / inboundProductivity).toFixed(1)}時間` },
                { label: 'ピッキング: PC数÷生産性', value: `${monthlyPc.toLocaleString()} ÷ ${pickingProductivity} = ${(monthlyPc / pickingProductivity).toFixed(1)}時間` },
                { label: '梱包: 個口÷生産性', value: `${monthlyParcels.toLocaleString()} ÷ ${packingProductivity} = ${(monthlyParcels / packingProductivity).toFixed(1)}時間` },
                { label: '合計時間', value: ((monthlyCs / inboundProductivity) + (monthlyPc / pickingProductivity) + (monthlyParcels / packingProductivity)).toFixed(1) + ' 時間' }
            ],
            formula: '(入荷+ピッキング+梱包)時間 × 時給',
            result: costLabor
        },
        consumables: {
            title: '📦 消耗品費',
            items: [
                { label: '月間個口数', value: monthlyParcels.toLocaleString() + ' 個口' },
                { label: '資材単価', value: formatCurrency(consumablesPerParcel) + '/個口' }
            ],
            formula: '個口数 × 資材単価',
            result: costConsumables
        },
        delivery: {
            title: '🚚 配送費',
            items: [
                { label: '月間個口数', value: monthlyParcels.toLocaleString() + ' 個口' },
                { label: '配送計算', value: state.csvData ? 'CSVの都道府県×地域単価で計算' : '関東単価で概算' }
            ],
            formula: 'Σ(地域別個口数 × 地域単価)',
            result: costDelivery
        },
        management: {
            title: '📋 管理費',
            items: [
                { label: '庫内費用合計', value: formatCurrency(warehouseSubtotal) },
                { label: '庫内管理費率', value: warehouseMgmtRate + '%' },
                { label: '庫内管理費', value: formatCurrency(warehouseMgmtCost) },
                { label: '配送費合計', value: formatCurrency(costDelivery) },
                { label: '配送管理費率', value: deliveryMgmtRate + '%' },
                { label: '配送管理費', value: formatCurrency(deliveryMgmtCost) }
            ],
            formula: '庫内費用×庫内率 + 配送費×配送率',
            result: costManagement
        }
    };
}

// ===== Show Breakdown =====
function showBreakdown(costType) {
    const content = document.getElementById('breakdownContent');
    if (!content || !state.breakdown || !state.breakdown[costType]) return;

    const data = state.breakdown[costType];

    let html = `
        <div class="breakdown-formula">
            <div class="breakdown-title">${data.title}</div>
            ${data.items.map(item => `
                <div class="formula-row">
                    <span class="formula-label">${item.label}</span>
                    <span class="formula-value">${item.value}</span>
                </div>
            `).join('')}
        </div>
        <div class="formula-result">
            <div class="formula-row">
                <span class="formula-label">計算式</span>
                <span class="formula-value" style="font-size: 0.9rem;">${data.formula}</span>
            </div>
            <div class="formula-row">
                <span class="formula-label">合計金額</span>
                <span class="formula-value">${formatCurrency(data.result)}</span>
            </div>
        </div>
    `;

    content.innerHTML = html;

    // Update active state on cards
    document.querySelectorAll('.stat-card.clickable').forEach(card => {
        card.classList.remove('active');
    });
    const activeCard = document.querySelector(`.stat-card[data-cost="${costType}"]`);
    if (activeCard) {
        activeCard.classList.add('active');
    }
}

// ===== CSV Handling =====
function handleCSV(file) {
    state.csvFilename = file.name; // Store filename

    // Show loading indication on dropzone
    const dropzone = document.getElementById('csvDropzone');
    const filenameDisplay = document.getElementById('filenameDisplay');
    if (filenameDisplay) {
        filenameDisplay.textContent = '読み込み中: ' + file.name;
    }

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            state.csvData = results.data;
            processCSVData(results.data, file.name);
        },
        error: function (err) {
            alert('CSVの読み込みに失敗しました: ' + err.message);
            if (filenameDisplay) {
                filenameDisplay.textContent = '✖ 読み込み失敗';
            }
        }
    });
}

function processCSVData(data, filename) {
    let tPc = 0;
    let tCs = 0;
    let tParcels = 0;

    data.forEach(row => {
        // PC Sum
        const pc = parseInt(row['総pc数'] || row['total_pc'] || row['PC'] || 0);
        tPc += pc;

        // CS Sum
        let cs = parseInt(row['総cs数'] || row['total_cs'] || 0);
        if (cs === 0) {
            const qty = parseInt(row['入数'] || row['qty_per_case'] || 0);
            if (pc > 0 && qty > 0) {
                cs = Math.ceil(pc / qty);
            }
        }
        tCs += cs;

        // Parcel Sum
        let p = parseInt(row['総個口数'] || row['total_parcels'] || 0);
        if (p === 0 && cs > 0) {
            // Fallback
            p = Math.ceil(cs * 0.8);
        }
        tParcels += p;
    });

    state.totalPc = tPc;
    state.totalCs = tCs;
    state.totalParcels = tParcels;

    // Update UI Stats
    elements.csvStats.style.display = 'block';
    elements.statRows.textContent = data.length.toLocaleString();
    elements.statTotalPc.textContent = tPc.toLocaleString();
    elements.statTotalCs.textContent = tCs.toLocaleString();
    elements.statTotalParcels.textContent = tParcels.toLocaleString();

    // ===== Show Success Banner =====
    const successBanner = document.getElementById('uploadSuccessBanner');
    const successFilename = document.getElementById('successFilename');
    const dropzone = document.getElementById('csvDropzone');
    const dropzoneIcon = document.getElementById('dropzoneIcon');
    const dropzoneText = document.getElementById('dropzoneText');
    const csvLoadedHint = document.getElementById('csvLoadedHint');

    if (successBanner) {
        successBanner.style.display = 'flex';
    }
    if (successFilename) {
        successFilename.textContent = filename || state.csvFilename;
    }
    if (dropzone) {
        dropzone.classList.add('success');
    }
    // Update dropzone to show filename directly
    if (dropzoneIcon) {
        dropzoneIcon.textContent = '✅';
    }
    if (dropzoneText) {
        dropzoneText.innerHTML = '<strong>読込完了:</strong> ' + (filename || state.csvFilename);
    }

    // Show CSV loaded hint and add body class
    if (csvLoadedHint) {
        csvLoadedHint.style.display = 'block';
    }
    document.body.classList.add('csv-loaded');

    // Don't auto-calculate, wait for user to click 'Start Calculation'
}

// ===== Event Listeners =====
function setupEventListeners() {
    // CSV Drag & Drop
    elements.csvDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.csvDropzone.classList.add('drag-over');
    });

    elements.csvDropzone.addEventListener('dragleave', () => {
        elements.csvDropzone.classList.remove('drag-over');
    });

    elements.csvDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.csvDropzone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.csv')) {
            handleCSV(file);
        }
    });

    elements.csvInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleCSV(file);
        }
    });

    // Slider label update
    elements.stockWeeks.addEventListener('input', () => {
        elements.weeksLabel.textContent = elements.stockWeeks.value + '週間';
        calculate();
    });

    // All inputs trigger recalculation
    const allInputs = document.querySelectorAll('input[type="number"], input[type="range"]');
    allInputs.forEach(input => {
        input.addEventListener('input', calculate);
    });

    // Cost Card Click Handlers
    document.querySelectorAll('.stat-card.clickable').forEach(card => {
        card.addEventListener('click', () => {
            const costType = card.getAttribute('data-cost');
            showBreakdown(costType);
        });
    });
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM elements first
    initElements();

    initChart();
    setupEventListeners();

    // Mode selection
    const modeRadios = document.querySelectorAll('input[name="calcMode"]');
    modeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.calcMode = e.target.value;
            // Toggle body class for CSS visibility
            if (e.target.value === 'deliveryOnly') {
                document.body.classList.add('delivery-only-mode');
            } else {
                document.body.classList.remove('delivery-only-mode');
            }
        });
    });

    // Start Calculation Button
    const startBtn = document.getElementById('startCalcBtn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            calculate();
            // Scroll to results
            document.querySelector('.results-top').scrollIntoView({ behavior: 'smooth' });
        });
    }

    // Cost Card Click Handlers (added here to ensure they work)
    document.querySelectorAll('.stat-card.clickable').forEach(card => {
        card.addEventListener('click', () => {
            const costType = card.getAttribute('data-cost');
            console.log('Card clicked:', costType); // Debug log
            showBreakdown(costType);
        });
    });

    // Initial calculation with default values
    calculate();
});
