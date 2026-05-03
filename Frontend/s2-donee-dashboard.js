// s2-donee-dashboard.js - 连接后端 API
const API_BASE_URL = 'http://127.0.0.1:8000';
const token = localStorage.getItem('fs_token') || sessionStorage.getItem('fs_token');

// 权限拦截：如果没有 Token，退回登录页
if (!token) {
    window.location.href = 's1-login.html';
} else {
    initDashboard();
}

async function initDashboard() {
    try {
        // 请求后端获取当前登录用户信息
        const response = await fetch(`${API_BASE_URL}/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            // 如果 Token 失效，清理并跳转
            if (response.status === 401) {
                localStorage.removeItem('fs_token');
                sessionStorage.removeItem('fs_token');
                window.location.href = 's1-login.html';
            }
            throw new Error('Failed to fetch user data');
        }

        const user = await response.json();
        
        // 动态更新页面上的用户信息
        // 1. 更新欢迎语的名字
        const greetingName = document.getElementById('greetingName');
        if (greetingName) {
            // 提取名字的第一个单词（First Name）
            const firstName = user.username.split(' ')[0];
            greetingName.textContent = firstName;
        }

        // 2. 更新右上角头像圈圈里的首字母
        const navAvatar = document.getElementById('logoutTrigger');
        if (navAvatar) {
            navAvatar.textContent = user.username.substring(0, 2).toUpperCase();
        }

    } catch (error) {
        console.error("Dashboard initialization error:", error);
    }
}