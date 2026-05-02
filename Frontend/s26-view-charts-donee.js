/* ========================================================
   S26 - View Category Popularity Charts (Donee)
   ======================================================== */

// --- 1. System Mock Data (Categorized aggregation representations) ---
const dbDataMocks = {
    allTime: { 'Medical': 150, 'Disaster Relief': 120, 'Education': 90, 'Animal Welfare': 30, 'Environment': 15 },
    last30Days: { 'Medical': 60, 'Disaster Relief': 80, 'Education': 20, 'Animal Welfare': 5, 'Environment': 0 },
    last7Days: { 'Medical': 10, 'Disaster Relief': 45, 'Education': 2, 'Animal Welfare': 0, 'Environment': 0 }
};

// --- 2. DOM & Chart Scope ---
const timeframeFilter = document.getElementById('timeframeFilter');
const loadingOverlay = document.getElementById('loadingOverlay');
const emptyStateBox = document.getElementById('emptyStateBox');
const errorStateBox = document.getElementById('errorStateBox');
const chartContainer = document.getElementById('chartContainer');

let myChartInstance = null; // Store chart globally to destroy/re-render

// --- 3. Core Engine: Fetch & Render (Normal Flow 2-5) ---
function loadChartData(timeframe) {
    // Show Loading Spinner first
    loadingOverlay.classList.remove('hidden');
    emptyStateBox.classList.add('hidden');
    errorStateBox.classList.add('hidden');
    chartContainer.style.opacity = '0'; // Hide old chart softly

    // Mock Backend Network/Processing Delay (System calculating proportion ranking...)
    setTimeout(() => {
        // --- Alternative Flow 1: Insufficient Data Collection ---
        if (timeframe === 'emptyTest') {
            loadingOverlay.classList.add('hidden');
            emptyStateBox.classList.remove('hidden');
            return;
        }

        // --- Alternative Flow 2: Aggregation Timeout / Server Overload ---
        if (timeframe === 'errorTest') {
            loadingOverlay.classList.add('hidden');
            errorStateBox.classList.remove('hidden');
            return;
        }

        // --- Normal Flow: Process Data ---
        const rawData = dbDataMocks[timeframe];
        const labels = Object.keys(rawData);
        const dataValues = Object.values(rawData);
        
        // Calculate Total purely for Sub-flow 1a mathematical presentation
        const totalCampaigns = dataValues.reduce((a, b) => a + b, 0);

        renderPieChart(labels, dataValues, totalCampaigns);

        loadingOverlay.classList.add('hidden');
        chartContainer.style.opacity = '1';

    }, 800); // 0.8s fake massive server aggregation delay
}

// --- 4. Post-Condition 2 & Sub-Flow 1a: Chart.js Configuration ---
function renderPieChart(labels, dataValues, totalSum) {
    const ctx = document.getElementById('popularityChart').getContext('2d');

    // Destroy old chart instance to avoid overlap ghosting
    if (myChartInstance) {
        myChartInstance.destroy();
    }

    // Modern color palette definition
    const bgColors = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6'];
    const hoverColors = ['#4f46e5', '#e11d48', '#059669', '#d97706', '#7c3aed'];

    // Instantiating the third-party charting library
    myChartInstance = new Chart(ctx, {
        type: 'doughnut', // 'doughnut' looks far more modern than 'pie' in UI dashboards
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: bgColors,
                hoverBackgroundColor: hoverColors,
                borderWidth: 3,
                borderColor: '#ffffff',
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%', // Thins out the donut ring
            plugins: {
                legend: {
                    position: 'right',
                    labels: { font: { family: 'Inter, sans-serif', size: 13, weight: '500' }, color: '#475569', padding: 20 }
                },
                // SUB-FLOW 1A: Interact with Chart Tooltips
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleFont: { family: 'Inter, sans-serif', size: 14 },
                    bodyFont: { family: 'Inter, sans-serif', size: 13, weight: 'bold' },
                    padding: 16,
                    cornerRadius: 12,
                    displayColors: true,
                    callbacks: {
                        // Dynamically generates an overlay tooltip displaying exact hard numbers
                        label: function(context) {
                            const value = context.raw;
                            const percentage = ((value / totalSum) * 100).toFixed(1);
                            // Output Format e.g., " Disaster Relief: 35%, 150 active campaigns"
                            return ` ${percentage}%, ${value} active campaigns`;
                        }
                    }
                }
            },
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    });
}

// --- 5. Sub-Flow 1b: Filter by Timeframe ---
timeframeFilter.addEventListener('change', (e) => {
    loadChartData(e.target.value);
});

// Initial Page Load Pipeline
loadChartData('allTime');