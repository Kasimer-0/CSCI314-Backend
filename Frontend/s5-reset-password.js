// s5-reset-password.js - 连接后端API版本
const API_BASE_URL = 'http://127.0.0.1:8000';

const stateRequest = document.getElementById('stateRequest');
const stateSent = document.getElementById('stateSent');
const resetForm = document.getElementById('resetForm');
const resetEmailInput = document.getElementById('resetEmail');
const sendResetBtn = document.getElementById('sendResetBtn');
const errorBox = document.getElementById('errorBox');
const sentToEmail = document.getElementById('sentToEmail');

function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
}

resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');

    const email = resetEmailInput.value.trim();
    if (!email) {
        showError('Enter the email associated with your account.');
        return;
    }

    sendResetBtn.disabled = true;
    sendResetBtn.textContent = 'Sending…';

    try {
        const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });

        // 无论后端是否找到该邮箱，为了安全都不应该提示邮箱不存在，直接展示发送成功页面
        sentToEmail.textContent = email;
        stateRequest.classList.add('hidden');
        stateSent.classList.remove('hidden');
    } catch (err) {
        showError('Network error. Please try again later.');
        sendResetBtn.disabled = false;
        sendResetBtn.textContent = 'Send reset link';
    }
});