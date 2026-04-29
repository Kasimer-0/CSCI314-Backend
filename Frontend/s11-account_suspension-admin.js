// s11-account_suspension-admin.js - 连接后端 API 版本
const API_BASE_URL = 'http://127.0.0.1:8000';
const token = localStorage.getItem('fs_token') || sessionStorage.getItem('fs_token');

if (!token) window.location.href = 's1-login.html';

// 1. DOM 元素抓取
const targetName = document.getElementById('targetName');
const targetEmail = document.getElementById('targetEmail');
const currentStatusBadge = document.getElementById('currentStatusBadge');
const actionWarning = document.getElementById('actionWarning');
const reasonInput = document.getElementById('reasonInput');
const confirmBtn = document.getElementById('confirmBtn');
const cancelBtn = document.getElementById('cancelBtn');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');

// 2. 解析网址里的用户 ID
const urlParams = new URLSearchParams(window.location.search);
const targetUserId = urlParams.get('userId');

let currentUser = null;
let isSuspending = true; // 记录当前是封禁还是解封

// 3. 页面初始化加载真实数据
async function initPage() {
    if (!targetUserId) {
        showError("No target user selected. Please return to the User Management page.");
        disableForm();
        return;
    }

    try {
        // 从后端获取所有用户，找到目标用户
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const users = await response.json();
        currentUser = users.find(u => u.user_id == targetUserId);

        if (!currentUser) {
            showError("Error: The target user account cannot be found.");
            disableForm();
            return;
        }

        // 成功找到用户，渲染基本信息
        targetName.textContent = currentUser.username;
        targetEmail.textContent = currentUser.email;
        
        setupDynamicUI(currentUser.status);

    } catch (err) {
        showError("Failed to fetch user data from server.");
        disableForm();
    }
}

// 4. 根据用户当前状态，智能切换 UI 颜色和文案
function setupDynamicUI(status) {
    // 移除默认的禁用状态
    confirmBtn.classList.remove("opacity-50", "cursor-not-allowed");
    confirmBtn.disabled = false;
    reasonInput.disabled = false;

    if (status === 'Active' || status === 'Pending') {
        isSuspending = true;
        currentStatusBadge.innerHTML = `<span class="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">Current: ${status}</span>`;
        actionWarning.className = "p-4 rounded-xl text-sm font-medium border bg-rose-50 text-rose-700 border-rose-200";
        actionWarning.innerHTML = `<strong>Warning:</strong> You are about to SUSPEND this account. They will be restricted from platform functions.`;
        confirmBtn.textContent = "Suspend Account";
        confirmBtn.className = "px-6 py-2.5 text-sm font-semibold text-white rounded-xl transition shadow-sm bg-rose-600 hover:bg-rose-700";

    } else if (status === 'Suspended') {
        isSuspending = false;
        currentStatusBadge.innerHTML = `<span class="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-bold border border-rose-200">Current: Suspended</span>`;
        actionWarning.className = "p-4 rounded-xl text-sm font-medium border bg-emerald-50 text-emerald-700 border-emerald-200";
        actionWarning.innerHTML = `<strong>Notice:</strong> You are about to REACTIVATE this suspended account. They will regain platform access.`;
        confirmBtn.textContent = "Reactivate Account";
        confirmBtn.className = "px-6 py-2.5 text-sm font-semibold text-white rounded-xl transition shadow-sm bg-emerald-600 hover:bg-emerald-700";
    }
}

// 5. 确认操作并调用后端 API
confirmBtn.addEventListener('click', async () => {
    errorMessage.classList.add('hidden');
    const reasonText = reasonInput.value.trim();

    // 必须填写原因的验证
    if (!reasonText) {
        showError("Action Denied: You must provide a reason for the status change.");
        reasonInput.classList.add("border-rose-500", "ring-1", "ring-rose-500");
        setTimeout(() => reasonInput.classList.remove("border-rose-500", "ring-1", "ring-rose-500"), 2000);
        return;
    }

    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Processing...';

    try {
        // 根据状态决定调用 suspend 还是 reactivate 接口
        const endpoint = isSuspending ? `/admin/users/${targetUserId}/suspend` : `/admin/users/${targetUserId}/reactivate`;
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Failed to update account status.');
        }

        successMessage.textContent = `Success: Account status updated. Returning to User Management...`;
        successMessage.classList.remove('hidden');
        
        // 1.5 秒后跳回搜索页
        setTimeout(() => {
            window.location.href = 's7-search&filter-admin.html'; 
        }, 1500);

    } catch (err) {
        showError(err.message);
        confirmBtn.disabled = false;
        confirmBtn.textContent = isSuspending ? "Suspend Account" : "Reactivate Account";
    }
});

// 6. 取消操作
cancelBtn.addEventListener('click', () => {
    window.location.href = 's7-search&filter-admin.html'; 
});

function showError(msg) {
    errorMessage.innerHTML = msg;
    errorMessage.classList.remove('hidden');
}

function disableForm() {
    reasonInput.disabled = true;
    confirmBtn.disabled = true;
    confirmBtn.classList.add("opacity-50", "cursor-not-allowed");
}

// 启动页面
initPage();