// s10-role_assignment-admin.js - 连接后端 API 版本
const API_BASE_URL = 'http://127.0.0.1:8000';
const token = localStorage.getItem('fs_token') || sessionStorage.getItem('fs_token');

if (!token) window.location.href = 's1-login.html';

// ====== DOM Elements ======
const tableBody = document.getElementById('tableBody');
const pendingCount = document.getElementById('pendingCount');

// Modal Elements
const reviewModal = document.getElementById('reviewModal');
const modalError = document.getElementById('modalError');
const reviewUserId = document.getElementById('reviewUserId');
const reviewName = document.getElementById('reviewName');
const reviewEmail = document.getElementById('reviewEmail');
const assignRole = document.getElementById('assignRole');

// Buttons
const rejectBtn = document.getElementById('rejectBtn');
const cancelBtn = document.getElementById('cancelBtn');
const approveBtn = document.getElementById('approveBtn');
const toastSuccess = document.getElementById('toastSuccess');
const toastMsg = document.getElementById('toastMsg');

let currentPendingUsers = [];

// ====== 1. 从后端获取 Pending 用户 ======
async function loadPendingUsers() {
    try {
        // 调用后端自带的过滤接口：只拿 Pending 的用户
        const response = await fetch(`${API_BASE_URL}/admin/users?status=Pending`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load pending users');
        
        currentPendingUsers = await response.json();
        renderPendingTable();
    } catch (err) {
        console.error(err);
        tableBody.innerHTML = `<tr><td colspan="3" class="text-center text-rose-500 py-4">Error loading data from server.</td></tr>`;
    }
}

// ====== 2. 渲染表格 ======
function renderPendingTable() {
    tableBody.innerHTML = '';
    
    // 更新左上角的数字角标
    pendingCount.textContent = `${currentPendingUsers.length} Pending`;

    if (currentPendingUsers.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" class="px-6 py-16 text-center">
                    <div class="flex flex-col items-center justify-center">
                        <svg class="w-12 h-12 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <p class="text-slate-500 text-sm font-medium">All caught up! No pending registration requests.</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    // 后端 role_id 映射
    const roleMap = { 0: 'Admin', 1: 'Donor/Donee', 2: 'Organization' };

    currentPendingUsers.forEach(user => {
        const roleName = roleMap[user.role_id] || 'Unknown';
        const row = `
            <tr class="hover:bg-slate-50 transition duration-150">
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <div class="h-10 w-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold border border-amber-200">
                            ${user.username ? user.username.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-bold text-slate-900">${user.username}</div>
                            <div class="text-sm text-slate-500">${user.email}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <span class="text-sm font-medium text-slate-600">${roleName}</span>
                    <span class="text-[10px] uppercase tracking-wider text-slate-400 ml-1">(Requested)</span>
                </td>
                <td class="px-6 py-4 text-right">
                    <button onclick="openReviewModal(${user.user_id})" class="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition">Review</button>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// ====== 3. 打开审查弹窗 ======
window.openReviewModal = function(userId) {
    const user = currentPendingUsers.find(u => u.user_id === userId);
    if (user) {
        reviewUserId.value = user.user_id;
        reviewName.textContent = user.username;
        reviewEmail.textContent = user.email;
        
        // 自动填入他申请的 Role
        if(user.role_id === 0) assignRole.value = 'User Admin';
        else if(user.role_id === 1) assignRole.value = 'Donee';
        else if(user.role_id === 2) assignRole.value = 'Fundraiser';
        else assignRole.value = '';
        
        modalError.classList.add('hidden');
        reviewModal.classList.remove('hidden');
    }
}

// ====== 4. 关闭弹窗 ======
cancelBtn.addEventListener('click', () => {
    reviewModal.classList.add('hidden');
});

// ====== 5. 批准通过并调用后端 API ======
approveBtn.addEventListener('click', async () => {
    const id = parseInt(reviewUserId.value);
    const selectedRole = assignRole.value;

    if (!selectedRole) {
        modalError.textContent = "Action Required: You must explicitly assign a system role before approving.";
        modalError.classList.remove('hidden');
        return;
    }

    approveBtn.disabled = true;
    approveBtn.textContent = 'Approving...';

    try {
        // 调用你后端写好的专门用于 Approve 的接口
        const response = await fetch(`${API_BASE_URL}/admin/approve/${id}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to approve user');

        closeAndShowToast("Success: User account approved and activated.");
        loadPendingUsers(); // 刷新表格，刚批准的人会消失

    } catch (err) {
        modalError.textContent = err.message;
        modalError.classList.remove('hidden');
    } finally {
        approveBtn.disabled = false;
        approveBtn.textContent = 'Approve & Activate';
    }
});

// ====== 6. 拒绝申请 (改为 Rejected 状态) ======
rejectBtn.addEventListener('click', async () => {
    const id = parseInt(reviewUserId.value);
    
    rejectBtn.disabled = true;
    rejectBtn.textContent = 'Rejecting...';

    try {
        // 调用更新接口，把状态改成 Rejected
        const response = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
            method: 'PATCH',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'Rejected' })
        });

        if (!response.ok) throw new Error('Failed to reject user');

        closeAndShowToast("Application rejected successfully.");
        loadPendingUsers(); // 刷新表格
    } catch (err) {
        modalError.textContent = err.message;
        modalError.classList.remove('hidden');
    } finally {
        rejectBtn.disabled = false;
        rejectBtn.textContent = 'Reject Application';
    }
});

// 提示组件
function closeAndShowToast(message) {
    reviewModal.classList.add('hidden');
    toastMsg.textContent = message;
    toastSuccess.classList.remove('hidden');
    setTimeout(() => toastSuccess.classList.add('hidden'), 4000);
}

// 启动！
loadPendingUsers();