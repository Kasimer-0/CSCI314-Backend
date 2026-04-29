// s12-audit_log_review-admin.js - 连接真实后端 API 版本
const API_BASE_URL = 'http://127.0.0.1:8000';
const token = localStorage.getItem('fs_token') || sessionStorage.getItem('fs_token');

const logsTableBody = document.getElementById('logsTableBody');
const logSearchInput = document.getElementById('logSearchInput');
const actionFilter = document.getElementById('actionFilter');
const dateFilter = document.getElementById('dateFilter');
const searchLogsBtn = document.getElementById('searchLogsBtn');
const clearLogsBtn = document.getElementById('clearLogsBtn');
const systemMsgBox = document.getElementById('systemMsgBox');

if (!token) window.location.href = 's1-login.html';

let allLogs = [];
let allUsers = [];

// 1. 同时拉取用户列表(为了显示名字)和审计日志
async function loadAuditData() {
    try {
        const [usersRes, logsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE_URL}/admin/audit-logs`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (!usersRes.ok || !logsRes.ok) throw new Error("Failed to load audit data");

        allUsers = await usersRes.json();
        allLogs = await logsRes.json();

        renderLogs(allLogs);
    } catch (err) {
        systemMsgBox.innerHTML = `<strong>Error:</strong> ${err.message}`;
        systemMsgBox.className = "mb-6 p-4 rounded-xl text-sm border bg-rose-50 text-rose-700 border-rose-200";
        systemMsgBox.classList.remove('hidden');
    }
}

// 2. 渲染日志表格
function renderLogs(logsArray) {
    logsTableBody.innerHTML = '';
    systemMsgBox.classList.add('hidden');

    if (logsArray.length === 0) {
        logsTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-20 text-center">
                    <div class="flex flex-col items-center justify-center">
                        <svg class="w-12 h-12 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                        <p class="text-slate-600 text-base font-bold">No logs found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    logsArray.forEach(log => {
        const targetUser = allUsers.find(u => u.user_id === log.target_user_id);
        const userName = targetUser ? targetUser.username : `Unknown (ID: ${log.target_user_id})`;
        const userEmail = targetUser ? targetUser.email : 'N/A';

        // 格式化时间
        const dateObj = new Date(log.created_at);
        const dateStr = dateObj.toLocaleDateString();
        const timeStr = dateObj.toLocaleTimeString();

        // 动态样式：根据后端的 action 字段变色
        let actionStyle = 'bg-slate-100 text-slate-700'; 
        if (log.action.includes('SUSPEND') || log.action.includes('REJECT')) {
            actionStyle = 'bg-rose-100 text-rose-700 border border-rose-200';
        } else if (log.action.includes('REACTIVATE') || log.action.includes('APPROVE')) {
            actionStyle = 'bg-emerald-100 text-emerald-700 border border-emerald-200';
        } else if (log.action.includes('UPDATE')) {
            actionStyle = 'bg-blue-100 text-blue-700 border border-blue-200';
        }

        const row = `
            <tr class="hover:bg-slate-50 transition duration-150">
                <td class="px-6 py-4 align-top">
                    <p class="font-bold text-slate-800">${dateStr}</p>
                    <p class="text-xs text-slate-500 mt-1">${timeStr}</p>
                    <p class="text-[11px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded mt-2 inline-block">Admin ID: ${log.admin_id}</p>
                </td>
                <td class="px-6 py-4 align-top">
                    <p class="font-bold text-slate-900">${userName}</p>
                    <p class="text-xs text-slate-500 leading-relaxed mt-0.5">${userEmail}</p>
                </td>
                <td class="px-6 py-4 align-top">
                    <span class="inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold shadow-sm uppercase ${actionStyle}">
                        ${log.action.replace(/_/g, ' ')}
                    </span>
                </td>
                <td class="px-6 py-4 align-top">
                    <p class="text-sm text-slate-600 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">${log.details || 'No additional details.'}</p>
                </td>
            </tr>
        `;
        logsTableBody.innerHTML += row;
    });
}

// 3. 搜索与过滤
function handleLogSearch() {
    const searchVal = logSearchInput.value.toLowerCase().trim();
    const actionVal = actionFilter.value;
    const dateVal = dateFilter.value; // YYYY-MM-DD

    systemMsgBox.classList.add('hidden');

    let matchedUserIds = [];
    if (searchVal) {
        const matchedUsers = allUsers.filter(u => 
            (u.username && u.username.toLowerCase().includes(searchVal)) || 
            (u.email && u.email.toLowerCase().includes(searchVal))
        );
        
        if (matchedUsers.length === 0) {
            systemMsgBox.innerHTML = `<strong>Search Error:</strong> No target user found matching "${searchVal}".`;
            systemMsgBox.className = "mb-6 p-4 rounded-xl text-sm border bg-amber-50 text-amber-700 border-amber-200 font-medium";
            systemMsgBox.classList.remove('hidden');
            renderLogs([]);
            return;
        }
        matchedUserIds = matchedUsers.map(u => u.user_id);
    }

    const filteredLogs = allLogs.filter(log => {
        const matchesUser = searchVal === '' || matchedUserIds.includes(log.target_user_id);
        
        // 匹配你的后端 Action
        let matchesAction = true;
        if (actionVal !== 'all') {
            if (actionVal === 'Suspended') matchesAction = log.action.includes('SUSPEND');
            else if (actionVal === 'Reactivated') matchesAction = log.action.includes('REACTIVATE');
            else matchesAction = false; 
        }

        const logDateStr = log.created_at.split('T')[0];
        const matchesDate = dateVal === '' || logDateStr === dateVal;

        return matchesUser && matchesAction && matchesDate;
    });

    renderLogs(filteredLogs);
}

searchLogsBtn.addEventListener('click', handleLogSearch);

clearLogsBtn.addEventListener('click', () => {
    logSearchInput.value = '';
    actionFilter.value = 'all';
    dateFilter.value = '';
    systemMsgBox.classList.add('hidden');
    renderLogs(allLogs);
});

// 页面加载时拉取数据
loadAuditData();