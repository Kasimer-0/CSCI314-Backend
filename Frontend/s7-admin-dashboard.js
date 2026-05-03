// s7-admin-dashboard.js - 对接后端 API 版本
const API_BASE_URL = 'http://127.0.0.1:8000';
const token = localStorage.getItem('fs_token') || sessionStorage.getItem('fs_token');

if (!token) window.location.href = 's1-login.html';

async function initDashboard() {
    try {
        // 1. 获取 Admin 个人信息显示欢迎语
        const profileRes = await fetch(`${API_BASE_URL}/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (profileRes.ok) {
            const admin = await profileRes.json();
            document.getElementById('navAvatar').textContent = admin.username.substring(0, 2).toUpperCase();
            document.getElementById('welcomeLine').textContent = `Welcome back, ${admin.username.split(' ')[0]} — here's what needs your attention.`;
        }

        // 2. 获取 User 数据
        const usersRes = await fetch(`${API_BASE_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!usersRes.ok) throw new Error('Failed to fetch users');
        const usersData = await usersRes.json();

        // 计算 KPI (加入 .toLowerCase() 防止后端大小写不一致导致匹配不到)
        const total = usersData.length;
        const active = usersData.filter(u => (u.status || '').toLowerCase() === 'active').length;
        const pendingUsers = usersData.filter(u => (u.status || '').toLowerCase() === 'pending');
        const pendingCount = pendingUsers.length;
        const suspended = usersData.filter(u => (u.status || '').toLowerCase() === 'suspended' || u.is_suspended).length;

        document.getElementById('kpiTotal').textContent = total.toLocaleString();
        document.getElementById('kpiActive').textContent = active.toLocaleString();
        document.getElementById('kpiPending').textContent = pendingCount.toString();
        document.getElementById('kpiSuspended').textContent = suspended.toString();

        // 渲染 Pending 列表
        const pendingList = document.getElementById('pendingList');
        const pendingEmpty = document.getElementById('pendingEmpty');
        const topPending = pendingUsers.slice(0, 3);

        if (topPending.length === 0) {
            pendingEmpty.classList.remove('hidden');
        } else {
            pendingEmpty.classList.add('hidden');
            pendingList.innerHTML = topPending.map(u => {
                let requestedRole = u.role_id === 0 ? 'Admin' : (u.role_id === 1 ? 'Donor/Donee' : 'Organization');
                return `
                    <li class="flex items-center justify-between py-3 gap-3">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[11px] font-bold flex-shrink-0">${u.username.substring(0, 2).toUpperCase()}</span>
                            <div class="min-w-0">
                                <p class="text-sm font-semibold text-slate-900 truncate">${u.username}</p>
                                <p class="text-xs text-slate-500 truncate">${u.email} · requested ${requestedRole}</p>
                            </div>
                        </div>
                        <a href="s10-role_assignment-admin.html" class="text-sm font-semibold text-blue-600 hover:underline flex-shrink-0">Review →</a>
                    </li>`;
            }).join('');
        }

        // 渲染角色比例 (Role Mix)
        const roleCounts = { 'User Admin': 0, 'Donee': 0, 'Fundraiser': 0 };
        usersData.forEach(u => {
            if(u.role_id === 0) roleCounts['User Admin']++;
            else if(u.role_id === 1) roleCounts['Donee']++;
            else if(u.role_id === 2) roleCounts['Fundraiser']++;
        });

        document.getElementById('roleMix').innerHTML = Object.keys(roleCounts).map(r => {
            if(roleCounts[r] === 0) return '';
            const pct = Math.round((roleCounts[r] / total) * 100);
            const color = r === 'User Admin' ? 'bg-blue-500' : (r === 'Fundraiser' ? 'bg-amber-500' : 'bg-violet-500');
            return `
                <li>
                    <div class="flex items-center justify-between text-xs text-slate-600 font-medium">
                        <span class="flex items-center gap-2"><span class="w-2 h-2 rounded-full ${color}"></span>${r}</span>
                        <span>${roleCounts[r]} <span class="text-slate-400">· ${pct}%</span></span>
                    </div>
                    <div class="h-1 w-full bg-slate-100 rounded-full overflow-hidden mt-1">
                        <div class="h-full ${color}" style="width:${pct}%"></div>
                    </div>
                </li>`;
        }).join('');

        // 3. 尝试获取 Audit Logs 数据更新 KPI
        try {
            const logsRes = await fetch(`${API_BASE_URL}/admin/audit-logs`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (logsRes.ok) {
                const logsData = await logsRes.json();
                document.getElementById('kpiAudit').textContent = logsData.length.toString();
            }
        } catch (e) { console.log("Audit logs endpoint not ready yet."); }

    } catch (err) {
        console.error("Dashboard initialization failed:", err);
    }
}

initDashboard();