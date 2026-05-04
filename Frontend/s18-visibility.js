// s18-visibility.js - 完美对接 FastAPI 的 is_private 字段
const API_BASE_URL = 'http://127.0.0.1:8000';
const token = localStorage.getItem('fs_token') || sessionStorage.getItem('fs_token');
if (!token) window.location.href = 's1-login.html';

const params = new URLSearchParams(window.location.search);
const campaignId = parseInt(params.get('campaignId'), 10);
let campaign = null;

const togglePublic = document.getElementById('togglePublic');
// 后端暂不支持 index 和 share 字段，保留前端 UI 作为占位符
const toggleIndex = document.getElementById('toggleIndex');
const toggleShare = document.getElementById('toggleShare');
const saveBtn = document.getElementById('saveBtn');

async function init() {
    try {
        const profileRes = await fetch(`${API_BASE_URL}/profile`, { headers: { 'Authorization': `Bearer ${token}` }});
        if (profileRes.ok) {
            const fundraiser = await profileRes.json();
            document.getElementById('logoutTrigger').textContent = window.FS ? window.FS.initials(fundraiser.username) : fundraiser.username.substring(0,2).toUpperCase();
            document.getElementById('navProfile').href = `s3-view-profile.html?userId=${fundraiser.user_id}`;
        }

        // 调用后端获取活动详情
        const campRes = await fetch(`${API_BASE_URL}/activities/${campaignId}`);
        if (!campRes.ok) throw new Error('Not found');
        campaign = await campRes.json();
        
        renderPage();
    } catch (err) {
        document.getElementById('notFoundBox').textContent = `No campaign found.`;
        document.getElementById('notFoundBox').classList.remove('hidden');
        document.getElementById('layout').classList.add('opacity-50', 'pointer-events-none');
    }
}

function renderPage() {
    document.getElementById('campTitle').textContent = campaign.title;
    document.getElementById('crumbCampaign').textContent = campaign.title;
    document.getElementById('crumbCampaign').href = `s16-edit-campaign.html?campaignId=${campaign.activity_id}`;
    document.getElementById('navDetails').href = `s16-edit-campaign.html?campaignId=${campaign.activity_id}`;

    // 关键逻辑：如果后端 is_private 为 false，说明对外公开 (Public = true)
    togglePublic.checked = !campaign.is_private;
    toggleIndex.checked = !campaign.is_private; // 连带效果
    toggleShare.checked = !campaign.is_private; // 连带效果

    const coverMap = { 1: 'blue', 2: 'rose', 3: 'mint', 4: 'yellow', 5: 'mint', 6: 'violet' };
    const coverKey = coverMap[campaign.category_id] || 'blue';
    const bg = window.FS ? window.FS.coverPalette[coverKey].bg : 'bg-blue-100';

    ['prevAuthCover', 'prevVisitCover'].forEach(id => { document.getElementById(id).className = `h-14 ${bg}`; });
    ['prevAuthTitle', 'prevVisitTitle'].forEach(id => { document.getElementById(id).textContent = campaign.title; });
    
    const goal = campaign.target_amount || 1;
    const raised = campaign.current_amount || 0;
    const pct = Math.min(100, Math.round((raised / goal) * 100));
    document.getElementById('prevAuthBar').style.width = `${pct}%`;
    document.getElementById('prevVisitBar').style.width = `${pct}%`;

    refreshSavedState();
    [togglePublic, toggleIndex, toggleShare].forEach(t => t.addEventListener('change', refreshSavedState));
}

function refreshSavedState() {
    if (!campaign) return;
    const visitCard = document.getElementById('prevVisitCard');
    const visitLabel = document.getElementById('prevVisitLabel');
    if (togglePublic.checked) {
        visitCard.className = 'bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all';
        visitLabel.className = 'text-xs font-semibold text-slate-500 mb-2 transition-colors';
        visitLabel.textContent = '○ Visitors (no account)';
    } else {
        visitCard.className = 'bg-white rounded-2xl border border-slate-200 overflow-hidden opacity-50 grayscale transition-all';
        visitLabel.className = 'text-xs font-semibold text-rose-500 mb-2 transition-colors';
        visitLabel.textContent = '⊘ Hidden from visitors (Private)';
    }
}

document.getElementById('resetBtn').addEventListener('click', renderPage);

saveBtn.addEventListener('click', async () => {
    if (!campaign) return;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        // 将前端的 Toggle 状态转换为后端的 is_private 布尔值
        // Public 勾选了 (true) = is_private (false)
        const isPrivate = !togglePublic.checked; 

        const res = await fetch(`${API_BASE_URL}/fundraiser/activities/${campaignId}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_private: isPrivate })
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.detail || 'Failed to save settings');
        }

        // 更新本地状态并显示提示
        campaign.is_private = isPrivate;
        const toast = document.getElementById('savedToast');
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 2000);
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save settings';
    }
});

init();