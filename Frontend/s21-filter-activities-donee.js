/* ========================================================
   S21 - Filter Activities by Category (Donee)
   ======================================================== */

// --- 1. Mock Database (Fundraising Activities) ---
// 为了触发分页(Pagination)，这里故意准备了更多数据
const activitiesDB = [
    { id: 1, title: 'Rebuild Hope Elementary', category: 'Education', raised: 15000, goal: 50000, img: '📚' },
    { id: 2, title: 'Cancer Treatment Fund', category: 'Medical', raised: 8000, goal: 20000, img: '🏥' },
    { id: 3, title: 'Flood Relief Initiative', category: 'Disaster Relief', raised: 32000, goal: 40000, img: '🌊' },
    { id: 4, title: 'Rural Library Books', category: 'Education', raised: 2000, goal: 5000, img: '📖' },
    { id: 5, title: 'Emergency Surgery Support', category: 'Medical', raised: 12000, goal: 15000, img: '💉' },
    { id: 6, title: 'Earthquake Recovery', category: 'Disaster Relief', raised: 5000, goal: 25000, img: '🏚️' },
    // 后面的数据用于测试下拉加载分页
    { id: 7, title: 'STEM Girls Scholarship', category: 'Education', raised: 300, goal: 10000, img: '🔬' },
    { id: 8, title: 'Free Wheelchair Provision', category: 'Medical', raised: 1500, goal: 3000, img: '♿' },
    { id: 9, title: 'Village Teacher Salary', category: 'Education', raised: 4500, goal: 6000, img: '👩‍🏫' },
    { id: 10, title: 'Hurricane Aid Kit', category: 'Disaster Relief', raised: 800, goal: 5000, img: '🌪️' }
];

// --- 2. DOM Elements ---
const categoryFilter = document.getElementById('categoryFilter');
const clearFilterBtn = document.getElementById('clearFilterBtn');
const activitiesGrid = document.getElementById('activitiesGrid');
const loadingIndicator = document.getElementById('loadingIndicator');
const emptyStateMsg = document.getElementById('emptyStateMsg');
const networkErrorToast = document.getElementById('networkErrorToast');

// --- 3. Pagination Configuration (Sub-Flow 1b) ---
let currentPage = 1;
const itemsPerPage = 4; // 每次只刷出 4 个卡片，滑到底部再刷后续的
let currentFilteredData = [];
let isFetching = false; // 防止滚动时重复请求

// --- 4. Render Engine (Normal Flow 6) ---
// 将数据渲染为卡片 UI HTML
function renderActivities(dataArray, append = false) {
    if (!append) activitiesGrid.innerHTML = '';
    
    dataArray.forEach(act => {
        const progressRaw = (act.raised / act.goal) * 100;
        const progress = progressRaw > 100 ? 100 : progressRaw.toFixed(1);

        const card = `
            <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition duration-300 flex flex-col h-full transform hover:-translate-y-1">
                <div class="h-32 bg-slate-50 flex items-center justify-center text-5xl border-b border-slate-100">
                    ${act.img}
                </div>
                <div class="p-5 flex flex-col flex-grow">
                    <span class="bg-emerald-50 text-emerald-700 text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded inline-block w-max mb-3 border border-emerald-100">
                        ${act.category}
                    </span>
                    <h3 class="text-lg font-bold text-slate-900 mb-4">${act.title}</h3>
                    
                    <div class="mt-auto">
                        <div class="flex justify-between text-xs text-slate-500 font-semibold mb-2">
                            <span>$${act.raised.toLocaleString()} raised</span>
                            <span>$${act.goal.toLocaleString()} goal</span>
                        </div>
                        <div class="w-full bg-slate-100 rounded-full h-2">
                            <div class="bg-emerald-500 h-2 rounded-full" style="width: ${progress}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        activitiesGrid.insertAdjacentHTML('beforeend', card);
    });
}

// --- 5. Core Logic: Search & Fetch (Normal & Alternative Flows) ---
function loadActivities(category, page = 1) {
    if (isFetching) return;
    
    isFetching = true;
    loadingIndicator.classList.remove('hidden');
    if (page === 1) { 
        activitiesGrid.innerHTML = ''; 
        emptyStateMsg.classList.add('hidden'); 
    }

    // 模拟真实的后台数据库查询连线延迟 (0.6秒)
    setTimeout(() => {
        // Alternative Flow 2: 模拟网络中断报错
        if (category === 'NetworkErrorTest') {
            loadingIndicator.classList.add('hidden');
            showNetworkError();
            isFetching = false;
            return;
        }

        // Normal Flow 5: system queries database based on category
        currentFilteredData = (category === 'all') 
            ? activitiesDB 
            : activitiesDB.filter(a => a.category === category);

        // Alternative Flow 1: Exact zero items found (e.g. if we add a new empty category later)
        if (currentFilteredData.length === 0) {
            loadingIndicator.classList.add('hidden');
            emptyStateMsg.classList.remove('hidden');
            isFetching = false;
            return;
        }

        // Sub-Flow 1b: Batching / Pagination logic
        const startIndex = (page - 1) * itemsPerPage;
        const pageData = currentFilteredData.slice(startIndex, startIndex + itemsPerPage);

        loadingIndicator.classList.add('hidden');
        renderActivities(pageData, page > 1); // 如果页数>1，就把卡片附在最下面
        isFetching = false;

    }, 600);
}

// --- 6. Triggers ---

// Normal Flow 4: Auto-submits upon selection
categoryFilter.addEventListener('change', (e) => {
    currentPage = 1;
    loadActivities(e.target.value, currentPage);
});

// Sub-Flow 1a: Clear Filter Button -> Default unbiased list
clearFilterBtn.addEventListener('click', () => {
    categoryFilter.value = 'all';
    currentPage = 1;
    loadActivities('all', currentPage);
});

// Sub-Flow 1b: Scroll to bottom of the filtered list to load next batch
window.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    // 当滚动条快到底部时触发 (离底部50px)
    if (scrollTop + clientHeight >= scrollHeight - 50 && !isFetching) {
        // 算出过滤后的数据总共分为几页
        const totalPages = Math.ceil(currentFilteredData.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            loadActivities(categoryFilter.value, currentPage);
        }
    }
});

// Utility: Show Network Toast
function showNetworkError() {
    networkErrorToast.classList.remove('hidden');
    setTimeout(() => { networkErrorToast.classList.add('hidden'); }, 3500);
}

// --- 7. Initial Load (Pre-Condition) ---
loadActivities('all', 1);