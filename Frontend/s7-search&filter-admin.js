// s7-search&filter-admin.js - 连接后端 API 版本
const API_BASE_URL = 'http://127.0.0.1:8000';
const token = localStorage.getItem('fs_token') || sessionStorage.getItem('fs_token');

const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const roleFilter = document.getElementById('roleFilter');
const searchBtn = document.getElementById('searchBtn');
const clearBtn = document.getElementById('clearBtn');

// 检查是否登录
if (!token) {
    window.location.href = 's1-login.html';
}

// 渲染表格的函数
function renderTable(dataArray) {
    tableBody.innerHTML = '';

    if (dataArray.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-16 text-center">
                    <div class="flex flex-col items-center justify-center">
                        <svg class="w-12 h-12 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        <p class="text-slate-500 text-sm font-medium">No users found matching your criteria</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    // 后端 Role ID 到名称的映射
    const roleMap = { 0: 'Admin', 1: 'Donor/Donee', 2: 'Organization' };

    dataArray.forEach(user => {
        let statusBadge = `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>${user.status}</span>`;
        if (user.status === 'Active') {
            statusBadge = `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>Active</span>`;
        } else if (user.status === 'Suspended' || user.is_suspended) {
            statusBadge = `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700"><span class="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>Suspended</span>`;
        }

        let roleName = roleMap[user.role_id] || 'Unknown';
        let roleBadge = `<span class="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">${roleName}</span>`;

        // 修改按钮链接，使用你原本的 HTML 结构，但指向正确的页面和附带真实的 userId
        let actionButtons = `
        <a href="s8-update_user_info-admin.html?userId=${user.user_id}" class="text-blue-600 font-semibold text-sm hover:bg-blue-50 px-3 py-1.5 rounded transition">Edit</a>
        <a href="s11-account_suspension-admin.html?userId=${user.user_id}" class="${user.status === 'Suspended' || user.is_suspended ? 'text-emerald-600 hover:bg-emerald-50' : 'text-rose-600 hover:bg-rose-50'} font-semibold text-sm px-3 py-1.5 rounded transition">
                ${user.status === 'Suspended' || user.is_suspended ? 'Reactivate' : 'Suspend'}
        </a>
        `;

        const row = `
            <tr class="hover:bg-slate-50 transition duration-150 ease-in-out">
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold border border-blue-200">
                            ${user.username ? user.username.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-semibold text-slate-900">${user.username}</div>
                            <div class="text-sm text-slate-500">${user.email}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">${roleBadge}</td>
                <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                    ${actionButtons}
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// 获取后端数据
async function loadUsers(searchEmail = '', searchUsername = '') {
    try {
        // 构造带参数的 URL
        let url = `${API_BASE_URL}/admin/users?`;
        if (searchEmail) url += `email=${encodeURIComponent(searchEmail)}&`;
        if (searchUsername) url += `username=${encodeURIComponent(searchUsername)}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                alert("You don't have Admin permissions or token expired.");
                window.location.href = 's1-login.html';
                return;
            }
            throw new Error('Failed to fetch users');
        }

        const data = await response.json();
        renderTable(data);
    } catch (err) {
        console.error(err);
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-red-500 py-4">Error loading data.</td></tr>`;
    }
}

// 搜索逻辑
handleSearch = () => {
    const searchVal = searchInput.value.trim();
    // 因为后端 API 支持按 username 搜索，我们把输入的值当作 username 去搜索
    loadUsers('', searchVal); 
}

searchBtn.addEventListener('click', handleSearch);

clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    roleFilter.value = 'all';
    loadUsers(); // 重新加载全部
});

// 页面初始化加载全部数据
loadUsers();