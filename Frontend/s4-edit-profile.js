// s4-edit-profile.js - 彻底重写对接后端 API
const API_BASE_URL = 'http://127.0.0.1:8000';
const token = localStorage.getItem('fs_token') || sessionStorage.getItem('fs_token');

const errorBox = document.getElementById('errorBox');
const successBox = document.getElementById('successBox');
const navAvatar = document.getElementById('logoutTrigger');
const saveBtn = document.getElementById('saveBtn');
const form = document.getElementById('editForm');

const usernameInput = document.getElementById('usernameInput');
const emailInput = document.getElementById('emailInput');
const phoneInput = document.getElementById('phoneInput');

if (!token) {
    window.location.href = 's1-login.html';
} else {
    loadProfileData();
}

function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideError() { errorBox.classList.add('hidden'); }

async function loadProfileData() {
    try {
        const res = await fetch(`${API_BASE_URL}/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) throw new Error('Failed to load profile data.');

        const user = await res.json();
        
        // 预填表单数据
        usernameInput.value = user.username || '';
        emailInput.value = user.email || '';
        phoneInput.value = user.phone_number || '';

        // 更新右上角头像
        if (navAvatar) {
            navAvatar.textContent = user.username.substring(0, 2).toUpperCase();
        }
    } catch (err) {
        showError(err.message);
        saveBtn.disabled = true;
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const username = usernameInput.value.trim();
    const phone = phoneInput.value.trim();

    if (!username) {
        showError('Username / Full name is required.');
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        // 调用后端的更新接口 (根据你的 schema，目前支持修改 username 和 phone_number)
        const response = await fetch(`${API_BASE_URL}/profile`, {
            method: 'PATCH', // 使用 PATCH 或 PUT 更新，视你后端的路由而定
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                phone_number: phone || null
            })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.detail || 'Failed to update profile.');
        }

        successBox.classList.remove('hidden');
        saveBtn.textContent = 'Saved';
        
        // 成功后延迟 1.5 秒跳回 Profile 查看页
        setTimeout(() => {
            window.location.href = 's3-view-profile.html';
        }, 1500);

    } catch (err) {
        showError(err.message);
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save changes';
    }
});