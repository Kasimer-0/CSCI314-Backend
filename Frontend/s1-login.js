// s1-login.js - 连接后端API版本
const API_BASE_URL = 'http://127.0.0.1:8000'; // 后端地址

const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const rememberCheckbox = document.getElementById('rememberMe');
const signInBtn = document.getElementById('signInBtn');
const errorBox = document.getElementById('errorBox');
const errorText = document.getElementById('errorText');

function showError(message) {
    errorText.textContent = message;
    errorBox.classList.remove('hidden');
}
function hideError() {
    errorBox.classList.add('hidden');
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showError('Enter both your email and password to continue.');
        return;
    }

    signInBtn.disabled = true;
    signInBtn.textContent = 'Signing in…';

    try {
        // 1. 调用后端登录接口
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Incorrect email or password.');
        }

        // 2. 登录成功，保存 Token (根据是否勾选Remember me决定存储位置)
        const token = data.access_token;
        const store = rememberCheckbox.checked ? localStorage : sessionStorage;
        store.setItem('fs_token', token);

        // 3. 获取个人信息以判断角色，决定跳转页面
        const profileRes = await fetch(`${API_BASE_URL}/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const user = await profileRes.json();
        store.setItem('fs_user', JSON.stringify(user));

        // 3. 获取个人信息以判断角色，决定跳转页面
        
        localStorage.setItem('fs_role_id', user.role_id);

        // 判断角色，决定跳转页面
        if (user.role_id === 0) {
            window.location.href = 's7-admin-dashboard.html'; 
        } else if (user.role_id === 1) {
            window.location.href = 's2-donee-dashboard.html'; 
        } else {
            window.location.href = 's14-fundraiser-dashboard.html'; 
        }
    } catch (err) {
        showError(err.message);
        signInBtn.disabled = false;
        signInBtn.textContent = 'Sign in';
    }
});

document.getElementById('googleBtn').addEventListener('click', () => {
    showError('Single sign-on with Google is not configured in this demo.');
});