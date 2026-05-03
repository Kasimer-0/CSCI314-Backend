// s6-create-admin.js - 连接后端 API 版本
const API_BASE_URL = 'http://127.0.0.1:8000';
const token = localStorage.getItem('fs_token') || sessionStorage.getItem('fs_token');

const form = document.getElementById('createAdminForm');
const firstNameInput = document.getElementById('firstName');
const lastNameInput = document.getElementById('lastName');
const workEmailInput = document.getElementById('workEmail');
const phoneInput = document.getElementById('phone');
const submitBtn = document.getElementById('submitBtn');
const formError = document.getElementById('formError');

if (!token) window.location.href = 's1-login.html';

// 角色 UI 选中逻辑 (保留你原本漂亮的前端效果)
let selectedRole = 'User Admin';
document.getElementById('roleGrid').addEventListener('click', (e) => {
    const card = e.target.closest('.role-card');
    if (!card) return;
    selectedRole = card.dataset.role;
    
    document.querySelectorAll('.role-card').forEach(c => {
        const isSelected = c.dataset.role === selectedRole;
        c.className = `role-card bg-slate-800 ${isSelected ? 'border-blue-500' : 'border-slate-700'} border-2 rounded-xl p-4 cursor-pointer block`;
        const radio = c.querySelector('.role-radio');
        if (isSelected) {
            radio.className = 'role-radio w-4 h-4 rounded-full border-2 border-blue-500 flex items-center justify-center';
            radio.innerHTML = '<span class="w-2 h-2 rounded-full bg-blue-500"></span>';
        } else {
            radio.className = 'role-radio w-4 h-4 rounded-full border-2 border-slate-600';
            radio.innerHTML = '';
        }
    });
});

function showError(msg) {
    formError.textContent = msg;
    formError.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 提交表单创建 Admin
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.classList.add('hidden');

    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const workEmail = workEmailInput.value.trim();
    const phone = phoneInput.value.trim();

    if (!firstName || !lastName || !workEmail) {
        showError('First name, last name, and work email are required.');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';

    // 组合 username 和生成默认密码满足后端要求
    const fullName = `${firstName} ${lastName}`;
    const defaultPassword = "AdminTempPassword123!"; // 后端 schema 需要这个字段

    try {
        const response = await fetch(`${API_BASE_URL}/admin/create-admin`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: workEmail,
                username: fullName,
                password: defaultPassword,
                phone_number: phone || undefined
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Failed to create admin.');
        }

        submitBtn.innerHTML = '<span>✓</span> Admin Created';
        setTimeout(() => {
            // 修改这里，创建成功后返回 Dashboard
            window.location.href = 's7-admin-dashboard.html'; 
        }, 1000);

    } catch (err) {
        showError(err.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>✉</span> Create admin & send invite';
    }
});