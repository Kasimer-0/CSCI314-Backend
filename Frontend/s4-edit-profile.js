// s4-edit-profile.js
const API_BASE_URL = 'http://127.0.0.1:8000';
const token = localStorage.getItem('fs_token') || sessionStorage.getItem('fs_token');
if (!token) window.location.href = 's1-login.html';

const roleId = parseInt(localStorage.getItem('fs_role_id') || '1', 10);
const initials = localStorage.getItem('fs_initials') || 'US';

// ==========================
// 1. 动态生成头部导航栏
// ==========================
function renderDynamicHeader() {
    const header = document.getElementById('dynamicHeader');
    if (!header) return;

    if (roleId === 2) {
        // Fundraiser 视角
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
                    <a href="s3-view-profile.html" class="hover:text-slate-900 transition-colors">Profile</a>
                </nav>
            </div>
            <div class="flex items-center gap-4">
                <a href="s15-launch-campaign.html" class="hidden md:flex bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition">＋ New Campaign</a>
                <button id="logoutTrigger" class="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shadow-sm">${initials}</button>
            </div>
        `;
    } else {
        // Donee 视角
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
                    <a href="s3-view-profile.html" class="hover:text-slate-900 transition-colors">Profile</a>
                </nav>
            </div>
            <div class="flex items-center gap-3">
                <button id="logoutTrigger" class="w-9 h-9 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold text-xs shadow-sm">${initials}</button>
            </div>
        `;
    }

    setTimeout(() => {
        document.getElementById('logoutTrigger')?.addEventListener('click', () => {
            document.getElementById('logoutModal')?.classList.remove('hidden');
        });
    }, 100);
}

// ==========================
// 2. 加载当前资料并处理表单
// ==========================
async function init() {
    renderDynamicHeader();
    
    try {
        const res = await fetch(`${API_BASE_URL}/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const user = await res.json();

        document.getElementById('usernameInput').value = user.username;
        document.getElementById('phoneInput').value = user.phone_number || '';
        
        // 更新导航栏头像
        const trigger = document.getElementById('logoutTrigger');
        if(trigger) trigger.textContent = user.username.substring(0, 2).toUpperCase();

    } catch (e) {
        console.error("Failed to load user data");
    }
}

document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const payload = {
        username: document.getElementById('usernameInput').value.trim(),
        phone_number: document.getElementById('phoneInput').value.trim()
    };

    try {
        const res = await fetch(`${API_BASE_URL}/profile`, {
            method: 'PATCH',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error();
        
        // 更新缓存里的首字母，防止导航栏没更新
        localStorage.setItem('fs_initials', payload.username.substring(0, 2).toUpperCase());
        
        window.location.href = 's3-view-profile.html';
    } catch (err) {
        alert("Update failed");
        btn.disabled = false;
        btn.textContent = 'Save Changes';
    }
});

init();