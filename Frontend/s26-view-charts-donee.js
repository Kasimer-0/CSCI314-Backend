// s26-view-charts-donee.js
const API_BASE_URL = 'http://127.0.0.1:8000';
const token = localStorage.getItem('fs_token') || sessionStorage.getItem('fs_token');
if (!token) window.location.href = 's1-login.html';

const roleId = parseInt(localStorage.getItem('fs_role_id') || '1', 10);
const initials = localStorage.getItem('fs_initials') || 'US';

let myChartInstance = null;

// 1. 动态生成头部导航栏 (同步系统中已有的 Donee 样式)
function renderDynamicHeader() {
    const header = document.getElementById('dynamicHeader');
    if (!header) return;

    header.innerHTML = `
        <div class="flex items-center gap-8">
            <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">FS</div>
                <span class="text-base font-bold text-slate-900 font-bold">Fundraising System</span>
                <span class="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ml-1">Donee</span>
            </div>
            <nav class="hidden md:flex gap-6 text-sm text-slate-600 font-medium">
                <a href="s2-donee-dashboard.html" class="hover:text-slate-900 transition-colors">Discover</a>
                <a href="#" class="text-blue-600 font-semibold border-b-2 border-blue-600 pb-4 -mb-4 transition-colors">Platform Insights</a>
                <a href="s3-view-profile.html" class="hover:text-slate-900 transition-colors">Profile</a>
            </nav>
        </div>
        <div class="flex items-center gap-3">
            <button id="logoutTrigger" class="w-9 h-9 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold text-xs shadow-sm">${initials}</button>
        </div>
    `;

    setTimeout(() => {
        document.getElementById('logoutTrigger')?.addEventListener('click', () => {
            document.getElementById('logoutModal')?.classList.remove('hidden');
        });
    }, 100);
}

// 2. 调用后端接口获取真实统计数据
async function fetchPopularityData() {
    const loading = document.getElementById('loadingOverlay');
    loading.classList.remove('hidden');

    try {
        const res = await fetch(`${API_BASE_URL}/donee/dashboard/category-popularity`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to load chart data");
        
        const data = await res.json();
        const labels = data.chart_data.labels;
        const values = data.chart_data.activity_counts;
        
        if (labels.length === 0) {
            document.getElementById('emptyStateBox').classList.remove('hidden');
        } else {
            renderDoughnutChart(labels, values);
        }
    } catch (err) {
        console.error(err);
    } finally {
        loading.classList.add('hidden');
    }
}

// 3. 渲染 Chart.js
function renderDoughnutChart(labels, dataValues) {
    const ctx = document.getElementById('popularityChart').getContext('2d');
    if (myChartInstance) myChartInstance.destroy();

    const totalSum = dataValues.reduce((a, b) => a + b, 0);

    myChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#0ea5e9'],
                borderWidth: 2,
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'right', labels: { font: { weight: '600' }, padding: 20 } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const val = context.raw;
                            const pct = ((val / totalSum) * 100).toFixed(1);
                            return ` ${pct}% (${val} activities)`;
                        }
                    }
                }
            }
        }
    });
}

// 初始化
renderDynamicHeader();
fetchPopularityData();