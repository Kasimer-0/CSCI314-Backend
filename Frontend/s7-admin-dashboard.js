// US — Admin landing page (replaces the legacy "users table as dashboard").
// Reads usersData + logsData and renders KPI tiles, the top-3 pending registrations, recent
// audit events, and a role-mix breakdown. All data is shared with index-UC57 / uc60 / uc62.

const session = window.FS.getSession();
const admin = (session && window.FS.findUserById(session.userId)) || usersData.find(u => window.FS.isAdminRole(u.role_name));

if (admin) {
    document.getElementById('navAvatar').textContent = window.FS.initials(admin.username);
    document.getElementById('welcomeLine').textContent = `Welcome back, ${admin.first_name || admin.username.split(' ')[0]} — here's what needs your attention.`;
}

// ---------- KPI tiles ----------
const total = usersData.length;
const active = usersData.filter(u => u.status === 'Active').length;
const pending = usersData.filter(u => u.status === 'Pending').length;
const suspended = usersData.filter(u => u.status === 'Suspended').length;

// "Audit events today" — relative to FS.NOW so the number stays meaningful against seeded data
const todayYmd = new Date(window.FS.NOW).toISOString().slice(0, 10);
const auditToday = logsData.filter(l => (l.created_at || '').startsWith(todayYmd)).length;

document.getElementById('kpiTotal').textContent = total.toLocaleString('en-US');
document.getElementById('kpiActive').textContent = active.toLocaleString('en-US');
document.getElementById('kpiPending').textContent = pending.toString();
document.getElementById('kpiSuspended').textContent = suspended.toString();
document.getElementById('kpiAudit').textContent = auditToday > 0 ? `${auditToday} today` : `${logsData.length} total`;

// ---------- Pending registrations (top 3) ----------
const pendingList = document.getElementById('pendingList');
const pendingEmpty = document.getElementById('pendingEmpty');
const pendingUsers = usersData.filter(u => u.status === 'Pending').slice(0, 3);

if (!pendingUsers.length) {
    pendingEmpty.classList.remove('hidden');
} else {
    pendingList.innerHTML = pendingUsers.map(u => {
        const tone = u.role_name === 'Donee' ? 'bg-violet-100 text-violet-700'
                   : u.role_name === 'Fundraiser' ? 'bg-amber-100 text-amber-700'
                   : 'bg-blue-100 text-blue-700';
        return `
            <li class="flex items-center justify-between py-3 gap-3">
                <div class="flex items-center gap-3 min-w-0">
                    <span class="w-9 h-9 rounded-full ${tone} flex items-center justify-center text-[11px] font-bold flex-shrink-0">${window.FS.initials(u.username)}</span>
                    <div class="min-w-0">
                        <p class="text-sm font-semibold text-slate-900 truncate">${u.username}</p>
                        <p class="text-xs text-slate-500 truncate">${u.email} · requested ${u.role_name}</p>
                    </div>
                </div>
                <a href="uc60.html" class="text-sm font-semibold text-blue-600 hover:underline flex-shrink-0">Review →</a>
            </li>`;
    }).join('');
}

// ---------- Role mix ----------
const ROLE_ORDER = ['Donee', 'Fundraiser', 'User Admin', 'Platform Admin', 'Super Admin', 'Platform Manager'];
const counts = {};
ROLE_ORDER.forEach(r => counts[r] = 0);
usersData.forEach(u => { if (counts[u.role_name] != null) counts[u.role_name]++; else counts[u.role_name] = 1; });
const roleColors = {
    'Donee':            'bg-violet-500',
    'Fundraiser':       'bg-amber-500',
    'User Admin':       'bg-blue-500',
    'Platform Admin':   'bg-indigo-500',
    'Super Admin':      'bg-rose-500',
    'Platform Manager': 'bg-yellow-500'
};
document.getElementById('roleMix').innerHTML = ROLE_ORDER.filter(r => counts[r] > 0).map(r => {
    const pct = total ? Math.round((counts[r] / total) * 100) : 0;
    return `
        <li>
            <div class="flex items-center justify-between text-xs text-slate-600 font-medium">
                <span class="flex items-center gap-2"><span class="w-2 h-2 rounded-full ${roleColors[r] || 'bg-slate-400'}"></span>${r}</span>
                <span>${counts[r]} <span class="text-slate-400">· ${pct}%</span></span>
            </div>
            <div class="h-1 w-full bg-slate-100 rounded-full overflow-hidden mt-1">
                <div class="h-full ${roleColors[r] || 'bg-slate-400'}" style="width:${pct}%"></div>
            </div>
        </li>`;
}).join('');

// ---------- Recent audit (top 5) ----------
const auditList = document.getElementById('auditList');
const auditEmpty = document.getElementById('auditEmpty');
const recent = logsData.slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 5);

if (!recent.length) {
    auditEmpty.classList.remove('hidden');
} else {
    auditList.innerHTML = recent.map(l => {
        const target = window.FS.findUserById(l.target_user_id);
        const targetName = target ? target.username : `Unknown (ID ${l.target_user_id})`;
        const tone = (l.action_type.includes('Suspended') || l.action_type.includes('Failed')) ? 'bg-rose-100 text-rose-700'
                   : l.action_type.includes('Reactivated') ? 'bg-emerald-100 text-emerald-700'
                   : l.action_type.includes('Updated') ? 'bg-blue-100 text-blue-700'
                   : 'bg-slate-100 text-slate-700';
        return `
            <li class="flex items-center justify-between py-3 gap-3">
                <div class="min-w-0">
                    <p class="text-sm text-slate-800"><span class="font-semibold">${targetName}</span> — <span class="text-slate-500">${l.details || ''}</span></p>
                    <p class="text-xs text-slate-400 mt-0.5">${l.created_at}${l.ip_address ? ' · ' + l.ip_address : ''}</p>
                </div>
                <span class="text-[11px] font-semibold px-2 py-0.5 rounded ${tone} flex-shrink-0">${l.action_type}</span>
            </li>`;
    }).join('');
}
