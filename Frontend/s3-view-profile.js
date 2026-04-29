// s3-view-profile.js - 连接后端API版本
const API_BASE_URL = 'http://127.0.0.1:8000';
const errorBox = document.getElementById('errorBox');
const profileBody = document.getElementById('profileBody');
const editLink = document.getElementById('editLink');

// 从缓存获取 Token
const token = localStorage.getItem('fs_token') || sessionStorage.getItem('fs_token');

if (!token) {
    // 如果没有Token，说明没登录，踢回登录页
    window.location.href = 's1-login.html';
} else {
    loadProfile();
}

function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
    profileBody.classList.add('hidden');
}

async function loadProfile() {
    try {
        const res = await fetch(`${API_BASE_URL}/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            if (res.status === 401) {
                // Token过期或无效
                localStorage.removeItem('fs_token');
                sessionStorage.removeItem('fs_token');
                window.location.href = 's1-login.html';
                return;
            }
            throw new Error('Failed to load profile data.');
        }

        const user = await res.json();
        renderUser(user);
    } catch (err) {
        showError(err.message);
    }
}

function renderUser(user) {
    document.getElementById('crumbName').textContent = user.username;
    document.getElementById('pageTitle').textContent = user.username + "'s Profile";
    document.getElementById('userFullName').textContent = user.username;
    document.getElementById('userEmailDisplay').textContent = user.email;

    // 映射 Role ID 到文本 (根据你在 schemas.py 里的定义)
    const roleMap = { 0: 'Admin', 1: 'Donor/Donee', 2: 'Organization' };
    const roleName = roleMap[user.role_id] || 'Unknown';

    // Status pill
    const pill = document.getElementById('statusPill');
    if (user.status === 'Active') {
        pill.className = 'mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700';
        pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Active`;
    } else {
        pill.className = 'mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700';
        pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>${user.status}`;
    }

    // Personal information
    document.getElementById('fldFullName').textContent = user.username;
    document.getElementById('fldEmail').textContent = user.email;
    document.getElementById('fldPhone').textContent = user.phone_number || '—';
    document.getElementById('fldRole').innerHTML = `<span class="inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">${roleName}</span>`;

    // Account
    document.getElementById('fldMemberSince').textContent = new Date(user.created_at).toLocaleDateString();
    
    // 初始化右上角头像图标
    const navBtn = document.getElementById('logoutTrigger');
    if (navBtn) navBtn.textContent = user.username.substring(0, 2).toUpperCase();
}