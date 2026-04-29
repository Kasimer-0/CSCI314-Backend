// s8-update_user_info-admin.js - 连接后端 API 版本
const API_BASE_URL = 'http://127.0.0.1:8000';
const token = localStorage.getItem('fs_token') || sessionStorage.getItem('fs_token');

const editUsername = document.getElementById('editUsername');
const editEmail = document.getElementById('editEmail');
const editRole = document.getElementById('editRole');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');

const urlParams = new URLSearchParams(window.location.search);
const targetUserId = urlParams.get('userId');

if (!token) window.location.href = 's1-login.html';

// 页面加载时获取该用户信息
async function fetchUserDetails() {
    if (!targetUserId) {
        showError("No user selected.");
        saveBtn.disabled = true;
        return;
    }

    try {
        // 由于后端没有专门的 GET /user/{id} 接口，我们获取所有用户并在前端找出这个人
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const users = await response.json();
        const currentUser = users.find(u => u.user_id == targetUserId);

        if (currentUser) {
            editUsername.value = currentUser.username;
            editEmail.value = currentUser.email; // 仅做展示
            editEmail.disabled = true; // 后端 schema 不允许改 email，所以置灰
            
            // 映射 role_id
            if(currentUser.role_id === 0) editRole.value = 'User Admin';
            else if(currentUser.role_id === 1) editRole.value = 'Donee';
            else editRole.value = 'Fundraiser';
            
            editRole.disabled = true; // 后端 schema 不允许改 role，置灰
        } else {
            showError("User not found in database.");
        }
    } catch (err) {
        showError("Failed to fetch user details.");
    }
}

function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.classList.remove('hidden');
}

// 保存修改
saveBtn.addEventListener('click', async () => {
    const newName = editUsername.value.trim();
    errorMessage.classList.add('hidden');

    if (!newName) {
        showError("Username is required.");
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        // 调用后端 PATCH 接口
        const response = await fetch(`${API_BASE_URL}/admin/users/${targetUserId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: newName
                // 注意：由于后端 schemas.AdminUserUpdate 不接受 email，这里不传
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update user.');
        }

        successMessage.classList.remove('hidden');
        setTimeout(() => {
            window.location.href = 's7-search&filter-admin.html'; // 返回表格页
        }, 1500);

    } catch (err) {
        showError(err.message);
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
    }
});

cancelBtn.addEventListener('click', () => {
    window.location.href = 's7-search&filter-admin.html'; 
});

fetchUserDetails();