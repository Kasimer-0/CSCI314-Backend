// s9-Registration.js - 完美对接 FastAPI 真实后端版
const API_BASE_URL = 'http://127.0.0.1:8000'; // FastAPI 默认端口

// ====== DOM Elements ======
const regName = document.getElementById('regName');
const regEmail = document.getElementById('regEmail');
const regPassword = document.getElementById('regPassword');
const regRole = document.getElementById('regRole');
const privacyCheck = document.getElementById('privacyCheck');

const registerBtn = document.getElementById('registerBtn');
const errorBox = document.getElementById('errorBox');
const errorText = document.getElementById('errorText');

// Modal Elements
const termsModal = document.getElementById('termsModal');
const openTermsBtn = document.getElementById('openTermsBtn');
const closeTermsBtn = document.getElementById('closeTermsBtn');
const acceptTermsBtn = document.getElementById('acceptTermsBtn');

// Success & Encryption State
const encryptionOverlay = document.getElementById('encryptionOverlay');
const toastSuccess = document.getElementById('toastSuccess');
const toastSubtext = document.getElementById('toastSubtext');

// ====== Utility Functions ======
function showError(message) {
    errorText.textContent = message;
    errorBox.classList.remove('hidden');
    errorBox.classList.add('animate-pulse');
    setTimeout(() => errorBox.classList.remove('animate-pulse'), 500);
}

function hideError() {
    errorBox.classList.add('hidden');
}

// ====== Privacy Terms Logic ======
openTermsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    termsModal.classList.remove('hidden');
});

closeTermsBtn.addEventListener('click', () => {
    termsModal.classList.add('hidden');
});

acceptTermsBtn.addEventListener('click', () => {
    privacyCheck.checked = true;
    termsModal.classList.add('hidden');
    hideError();
});

// ====== Registration Logic ======
registerBtn.addEventListener('click', async () => {
    hideError();

    const name = regName.value.trim();
    const email = regEmail.value.trim();
    const password = regPassword.value;
    const roleText = regRole.value;
    
    // 基础验证
    if (!name || !email || !password) {
        showError("Missing Information: Please fill out all required basic info and password.");
        return;
    }

    if (!email.includes('@')) {
        showError("Invalid Email: Please enter a valid email format.");
        return;
    }

    if (!privacyCheck.checked) {
        showError("Agreement Required: You must accept the Privacy Terms to register.");
        return;
    }

    // 根据 schemas.py 中的定义：1: Donor/Donee, 2: Organization/Fundraiser
    const role_id = (roleText === 'Fundraiser') ? 2 : 1;

    // 显示加密动画
    encryptionOverlay.classList.remove('hidden');

    try {
        // 请求后端的 /auth/register 接口
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: name,
                email: email,
                password: password,
                role_id: role_id
            })
        });

        const data = await response.json();

        if (!response.ok) {
            // 如果后端抛出 HTTPException，提取 detail 信息
            throw new Error(data.detail || 'Registration failed. Please try again.');
        }

        // 注册成功，隐藏动画
        encryptionOverlay.classList.add('hidden');

        // 显示成功提示框并动态替换名字
        toastSubtext.textContent = `Welcome ${name}! Your sensitive data was encrypted and saved.`;
        toastSuccess.classList.remove('hidden');

        // 清空表单
        regName.value = '';
        regEmail.value = '';
        regPassword.value = '';
        privacyCheck.checked = false;

        // 延迟 2.5 秒后跳转到登录页面
        setTimeout(() => {
            window.location.href = 's1-login.html';
        }, 2500);

    } catch (err) {
        // 发生错误时隐藏动画并显示错误框
        encryptionOverlay.classList.add('hidden');
        showError(err.message);
    }
});