//包含S27和S28的前端代码，展示在s14-fundraiser-dashboard.html中
const API_BASE_URL = 'http://127.0.0.1:8000';
const token = localStorage.getItem('fs_token') || sessionStorage.getItem('fs_token');
if (!token) window.location.href = 's1-login.html';

async function init() {
    renderDynamicHeader(); // 使用之前定义的统一导航栏函数
    
    try {
        const res = await fetch(`${API_BASE_URL}/fundraiser/activities/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const activities = await res.json();
        
        renderTable(activities);
        updateKPIs(activities);
    } catch (err) {
        console.error("Failed to load dashboard data", err);
    }
}

function renderTable(activities) {
    const tbody = document.getElementById('campaignTableBody');
    tbody.innerHTML = activities.map(act => `
        <tr class="hover:bg-slate-50 transition">
            <td class="px-6 py-5">
                <div class="font-bold text-slate-800">${act.title}</div>
                <div class="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">ID: ${act.activity_id}</div>
            </td>
            <!-- S27: Total Views -->
            <td class="px-6 py-5 text-center bg-blue-50/10 font-bold text-blue-700">
                ${(act.view_count || 0).toLocaleString()}
            </td>
            <!-- S28: Total Bookmarks (Potential Interests) -->
            <td class="px-6 py-5 text-center bg-rose-50/10 font-bold text-rose-600">
                ${(act.shortlist_count || 0).toLocaleString()}
            </td>
            <td class="px-6 py-5">
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${act.status === 'Ongoing' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}">
                    ${act.status}
                </span>
            </td>
            <td class="px-6 py-5 text-right">
                <a href="s16-edit-campaign.html?campaignId=${act.activity_id}" class="text-blue-600 font-bold hover:underline">Manage</a>
            </td>
        </tr>
    `).join('');
}

function updateKPIs(activities) {
    const totalViews = activities.reduce((sum, a) => sum + (a.view_count || 0), 0);
    const totalBookmarks = activities.reduce((sum, a) => sum + (a.shortlist_count || 0), 0);
    const convRate = totalViews > 0 ? ((totalBookmarks / totalViews) * 100).toFixed(1) : 0;

    document.getElementById('totalViewsKpi').textContent = totalViews.toLocaleString();
    document.getElementById('totalBookmarksKpi').textContent = totalBookmarks.toLocaleString();
    document.getElementById('avgConvKpi').textContent = `${convRate}%`;
}

// 统一导航栏函数（复用之前的代码）
function renderDynamicHeader() {
    const header = document.getElementById('dynamicHeader');
    const initials = localStorage.getItem('fs_initials') || 'FD';
    header.innerHTML = `
        <div class="flex items-center gap-8">
            <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">FS</div>
                <span class="text-base font-bold text-slate-900">Fundraiser Workspace</span>
            </div>
            <nav class="hidden md:flex gap-6 text-sm text-slate-600 font-medium">
                <a href="#" class="text-blue-600 font-semibold border-b-2 border-blue-600 pb-4 -mb-4 transition-colors">Dashboard</a>
                <a href="s13-my-activities.html" class="hover:text-slate-900 transition-colors">My Campaigns</a>
                <a href="#" class="hover:text-slate-900 transition-colors">Donors & Reports</a>
                <a href="s3-view-profile.html" class="hover:text-slate-900 transition-colors">Profile</a>
            </nav>
        </div>
        <div class="flex items-center gap-4">
            <a href="s15-launch-campaign.html" class="hidden md:flex bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition">＋ New Campaign</a>
            <button id="logoutTrigger" class="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shadow-sm">${initials}</button>
        </div>
    `;
    document.getElementById('logoutTrigger').onclick = () => document.getElementById('logoutModal').classList.remove('hidden');
}

init();