// s3-view-profile.js - 完整修复版
const API_BASE_URL = 'http://127.0.0.1:8000';
const token = localStorage.getItem('fs_token') || sessionStorage.getItem('fs_token');
if (!token) window.location.href = 's1-login.html';

const roleId = parseInt(localStorage.getItem('fs_role_id') || '1', 10);
const initials = localStorage.getItem('fs_initials') || 'US';

// ==========================
// 1. 动态生成正确的头部导航栏
// ==========================
function renderDynamicHeader() {
    const header = document.getElementById('dynamicHeader');
    if (!header) return;

    if (roleId === 2) {
        // Fundraiser 导航栏
        header.innerHTML = `
            <div class="flex items-center gap-8">
                <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">FS</div>
                    <span class="text-base font-bold text-slate-900">Fundraiser Workspace</span>
                </div>
                <nav class="hidden md:flex gap-6 text-sm text-slate-600 font-medium">
                    <a href="s14-fundraiser-dashboard.html" class="hover:text-slate-900 transition-colors">Dashboard</a>
                    <a href="s13-my-activities.html" class="hover:text-slate-900 transition-colors">My Campaigns</a>
                    <a href="#" class="hover:text-slate-900 transition-colors">Donors & Reports</a>
                    <a href="s3-view-profile.html" class="text-blue-600 font-semibold border-b-2 border-blue-600 pb-4 -mb-4 transition-colors">Profile</a>
                </nav>
            </div>
            <div class="flex items-center gap-4">
                <a href="s15-launch-campaign.html" class="hidden md:flex bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition">＋ New Campaign</a>
                <button class="text-slate-400 hover:text-slate-700">🔔</button>
                <button id="logoutTrigger" class="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shadow-sm">${initials}</button>
            </div>
        `;
    } else {
        // Donee 导航栏
        header.innerHTML = `
            <div class="flex items-center gap-8">
                <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">FS</div>
                    <span class="text-base font-bold text-slate-900">Fundraising System</span>
                    <span class="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ml-1">Donee</span>
                </div>
                <nav class="hidden md:flex gap-6 text-sm text-slate-600 font-medium">
                    <a href="s2-donee-dashboard.html" class="hover:text-slate-900 transition-colors">Discover</a>
                    <a href="#" class="hover:text-slate-900 transition-colors">History</a>
                    <a href="s3-view-profile.html" class="text-blue-600 font-semibold border-b-2 border-blue-600 pb-4 -mb-4 transition-colors">Profile</a>
                </nav>
            </div>
            <div class="flex items-center gap-3">
                <button class="text-slate-400 hover:text-slate-700">🔔</button>
                <button id="logoutTrigger" class="w-9 h-9 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold text-xs shadow-sm">${initials}</button>
            </div>
        `;
    }

    // 绑定退出登录事件
    setTimeout(() => {
        const btn = document.getElementById('logoutTrigger');
        if(btn) btn.addEventListener('click', () => {
            const modal = document.getElementById('logoutModal');
            if(modal) modal.classList.remove('hidden');
        });
    }, 100);
}

// ==========================
// 2. 加载用户真实数据
// ==========================
async function loadProfile() {
    try {
        const res = await fetch(`${API_BASE_URL}/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to load profile");
        const user = await res.json();

        document.getElementById('crumbName').textContent = user.username;
        document.getElementById('titleName').textContent = user.username;
        document.getElementById('cardName').textContent = user.username;
        document.getElementById('cardEmail').textContent = user.email;
        
        document.getElementById('infoName').textContent = user.username;
        document.getElementById('infoEmail').textContent = user.email;
        if (user.phone_number) document.getElementById('infoPhone').textContent = user.phone_number;
        
        const d = new Date(user.created_at);
        document.getElementById('infoDate').textContent = `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;

        const userInitials = user.username.substring(0, 2).toUpperCase();
        document.getElementById('avatarInitials').textContent = userInitials;
        const trigger = document.getElementById('logoutTrigger');
        if (trigger) trigger.textContent = userInitials;

        const roleMap = { 0: 'Admin', 1: 'Donor / Donee', 2: 'Organization' };
        document.getElementById('infoRole').textContent = roleMap[user.role_id] || 'User';

        const badge = document.getElementById('statusBadge');
        const statusTxt = document.getElementById('statusText');
        statusTxt.textContent = user.status;
        
        if (user.status === 'Pending') {
            badge.className = 'mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600';
            badge.querySelector('span').className = 'w-1.5 h-1.5 rounded-full bg-amber-500';
        } else if (user.status === 'Active') {
            badge.className = 'mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600';
            badge.querySelector('span').className = 'w-1.5 h-1.5 rounded-full bg-emerald-500';
        } else {
            badge.className = 'mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600';
            badge.querySelector('span').className = 'w-1.5 h-1.5 rounded-full bg-rose-500';
        }
    } catch (e) {
        console.error("Profile load error:", e);
        document.getElementById('cardName').textContent = "Error loading profile";
    }
}

// 执行初始化
renderDynamicHeader();
loadProfile();