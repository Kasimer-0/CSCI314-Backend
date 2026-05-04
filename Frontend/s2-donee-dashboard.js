const API_BASE_URL = 'http://127.0.0.1:8000';
const token = localStorage.getItem('fs_token') || sessionStorage.getItem('fs_token');
if (!token) window.location.href = 's1-login.html';

let bookmarkedIds = new Set();
let isShowingOnlyFavorites = false;

// 1. 动态头部渲染
function renderDynamicHeader() {
    const header = document.getElementById('dynamicHeader');
    if (!header) return;
    const roleId = parseInt(localStorage.getItem('fs_role_id') || '1', 10);
    const initials = localStorage.getItem('fs_initials') || 'DN'; // 可以在 s1-login 存一下名字

    header.innerHTML = `
        <div class="flex items-center gap-8">
            <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">FS</div>
                <span class="text-base font-bold text-slate-900">Fundraising System</span>
                <span class="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ml-1">Donee</span>
            </div>
            <nav class="hidden md:flex gap-6 text-sm text-slate-600 font-medium">
                <a href="#" class="text-blue-600 font-semibold border-b-2 border-blue-600 pb-4 -mb-4 transition-colors">Discover</a>
                <a href="s26-view-charts-donee.html" class="hover:text-slate-900 transition-colors">Platform Insights</a>
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

// 2. 获取用户现有的收藏列表
async function fetchBookmarks() {
    try {
        const res = await fetch(`${API_BASE_URL}/donee/bookmarks`, { headers: { 'Authorization': `Bearer ${token}` }});
        if (res.ok) {
            const data = await res.json();
            bookmarkedIds = new Set(data.map(b => b.activities.activity_id));
            document.getElementById('favCount').textContent = bookmarkedIds.size;
        }
    } catch (e) { console.error(e); }
}

// 3. 请求接口：组合搜索、分类、排序
async function fetchActivities() {
    const grid = document.getElementById('activitiesGrid');
    const emptyState = document.getElementById('emptyStateMsg');
    
    // 获取表单参数
    const keyword = document.getElementById('searchInput').value.trim();
    const catId = document.getElementById('categoryFilter').value;
    const sortVal = document.getElementById('sortFilter').value.split('-'); // e.g. ["created_at", "True"]
    const sortBy = sortVal[0];
    const sortDesc = sortVal[1];

    let url = `${API_BASE_URL}/activities?sort_by=${sortBy}&sort_desc=${sortDesc}`;
    if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
    if (catId) url += `&category_id=${catId}`;

    try {
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` }});
        if (!res.ok) throw new Error("Failed to fetch activities");
        let activities = await res.json();

        // 如果开启了只看收藏模式，在前端进行过滤
        if (isShowingOnlyFavorites) {
            activities = activities.filter(act => bookmarkedIds.has(act.activity_id));
        }

        grid.innerHTML = '';
        if (activities.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }
        emptyState.classList.add('hidden');

        const categoryMapReverse = { 1: 'Education', 2: 'Disaster Relief', 3: 'Healthcare', 4: 'Animals', 5: 'Environment', 6: 'Community' };
        
        activities.forEach(act => {
            const catName = categoryMapReverse[act.category_id] || 'Community';
            const progress = Math.min(100, Math.round(((act.current_amount || 0) / act.target_amount) * 100));
            const isFaved = bookmarkedIds.has(act.activity_id);
            
            // 收藏爱心 SVG
            const heartSvg = isFaved 
                ? `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" class="w-6 h-6 text-rose-500 transition-colors drop-shadow-sm"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>`
                : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-6 h-6 text-slate-400 group-hover:text-rose-400 transition-colors"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>`;

            const card = `
                <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition duration-300 flex flex-col h-full cursor-pointer relative" onclick="window.location.href='s20-campaign-detail.html?campaignId=${act.activity_id}'">
                    
                    <button class="heart-trigger absolute top-3 right-3 p-2.5 bg-white/90 backdrop-blur rounded-full shadow-sm hover:bg-rose-50 hover:scale-110 transition z-10 group" 
                            data-id="${act.activity_id}">
                        ${heartSvg}
                    </button>

                    <div class="h-32 bg-slate-50 flex items-center justify-center text-4xl border-b border-slate-100">🖼</div>
                    <div class="p-5 flex flex-col flex-grow">
                        <span class="bg-blue-50 text-blue-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded w-max mb-2">${catName}</span>
                        <h3 class="text-base font-bold text-slate-900 mb-1 leading-tight">${act.title}</h3>
                        <div class="mt-auto pt-4">
                            <div class="flex justify-between items-center text-[11px] font-bold mb-2">
                                <span class="text-blue-600">$${(act.current_amount || 0).toLocaleString()} raised</span>
                                <span class="text-slate-500">$${act.target_amount.toLocaleString()} goal</span>
                            </div>
                            <div class="w-full bg-slate-100 rounded-full h-1.5">
                                <div class="bg-blue-500 h-1.5 rounded-full" style="width: ${progress}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            grid.insertAdjacentHTML('beforeend', card);
        });

        // 绑定收藏点击事件
        document.querySelectorAll('.heart-trigger').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation(); // 阻止卡片本身的点击跳转
                const actId = parseInt(btn.getAttribute('data-id'));
                toggleBookmark(actId);
            });
        });

    } catch (err) {
        console.error(err);
    }
}

// 4. 发送书签请求
async function toggleBookmark(activityId) {
    try {
        const res = await fetch(`${API_BASE_URL}/donee/bookmarks`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ activity_id: activityId })
        });
        
        if (res.ok) {
            const data = await res.json();
            if (data.is_bookmarked) {
                bookmarkedIds.add(activityId);
            } else {
                bookmarkedIds.delete(activityId);
            }
            document.getElementById('favCount').textContent = bookmarkedIds.size;
            fetchActivities(); // 刷新视图
        }
    } catch (e) { console.error(e); }
}

// 5. 事件监听器绑定
document.getElementById('searchInput').addEventListener('input', () => { setTimeout(fetchActivities, 400); });
document.getElementById('categoryFilter').addEventListener('change', fetchActivities);
document.getElementById('sortFilter').addEventListener('change', fetchActivities);

document.getElementById('toggleFavViewBtn').addEventListener('click', (e) => {
    isShowingOnlyFavorites = !isShowingOnlyFavorites;
    const btn = e.currentTarget;
    if (isShowingOnlyFavorites) {
        btn.classList.replace('bg-rose-50', 'bg-rose-600');
        btn.classList.replace('text-rose-600', 'text-white');
    } else {
        btn.classList.replace('bg-rose-600', 'bg-rose-50');
        btn.classList.replace('text-white', 'text-rose-600');
    }
    fetchActivities();
});

// 初始化
renderDynamicHeader();
fetchBookmarks().then(() => fetchActivities());