// s16-edit-campaign.js - 完美对接 FastAPI 真实后端版
const API_BASE_URL = 'http://127.0.0.1:8000';
const token = localStorage.getItem('fs_token') || sessionStorage.getItem('fs_token');
if (!token) window.location.href = 's1-login.html';

const params = new URLSearchParams(window.location.search);
const campaignId = parseInt(params.get('campaignId'), 10);
let campaign = null;

const categoryMapReverse = { 1: 'Education', 2: 'Disaster Relief', 3: 'Healthcare', 4: 'Animals', 5: 'Environment', 6: 'Community' };

const inputs = {
    title: document.getElementById('title'),
    tagline: document.getElementById('tagline'),
    description: document.getElementById('description'),
    target: document.getElementById('target'),
    currency: document.getElementById('currency'),
    category: document.getElementById('category')
};

async function init() {
    try {
        // 1. 获取用户信息
        const profileRes = await fetch(`${API_BASE_URL}/profile`, { headers: { 'Authorization': `Bearer ${token}` }});
        if (profileRes.ok) {
            const fundraiser = await profileRes.json();
            document.getElementById('logoutTrigger').textContent = window.FS ? window.FS.initials(fundraiser.username) : fundraiser.username.substring(0,2).toUpperCase();
            document.getElementById('navProfile').href = `s3-view-profile.html?userId=${fundraiser.user_id}`;
        }

        // 2. 获取当前项目详情 (调用 donee.py 里的公共查询接口)
        const campRes = await fetch(`${API_BASE_URL}/activities/${campaignId}`);
        if (!campRes.ok) throw new Error();
        const rawData = await campRes.json();
        
        // 翻译后端数据为前端可用的格式
        campaign = {
            campaign_id: rawData.activity_id,
            title: rawData.title,
            description: rawData.description,
            goal_amount: rawData.target_amount,
            raised_amount: rawData.current_amount || 0,
            currency: 'USD',
            category: categoryMapReverse[rawData.category_id] || 'Education',
            status: rawData.is_private ? 'Draft' : rawData.status,
            supporters: rawData.view_count || 0 // 暂用浏览量代替支持者数量展示
        };
        
        populateForm();
    } catch (err) {
        document.getElementById('notFoundBox').textContent = `No campaign found.`;
        document.getElementById('notFoundBox').classList.remove('hidden');
        document.getElementById('formArea').classList.add('opacity-50', 'pointer-events-none');
    }
}

function populateForm() {
    inputs.title.value = campaign.title;
    inputs.tagline.value = campaign.description.substring(0, 50) + '...'; // 提取前段作为 tagline
    inputs.description.value = campaign.description;
    inputs.target.value = campaign.goal_amount;
    inputs.currency.value = campaign.currency;
    inputs.category.value = campaign.category;

    const ctx = document.getElementById('contextBar');
    ctx.classList.remove('hidden');
    document.getElementById('ctxTitle').textContent = `Editing: ${campaign.title}`;

    const statusTone = window.FS ? window.FS.STATUS_TONES[campaign.status] : 'bg-slate-100 text-slate-700';
    document.getElementById('ctxStatus').outerHTML = `<span class="ml-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusTone}">${campaign.status}</span>`;

    const raisedFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(campaign.raised_amount);
    const goalFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(campaign.goal_amount);
    document.getElementById('ctxMeta').textContent = `${raisedFmt} of ${goalFmt} raised`;
    document.getElementById('viewPublicLink').href = `s20-campaign-detail.html?campaignId=${campaign.campaign_id}`;
    document.getElementById('visibilityLink').href = `s18-visibility.html?campaignId=${campaign.campaign_id}`;

    // 后端目前不支持更新类别和时间，将这些输入框变灰锁定
    inputs.category.disabled = true;
    inputs.category.classList.add('bg-slate-50', 'cursor-not-allowed');
    document.getElementById('startDate').disabled = true;
    document.getElementById('endDate').disabled = true;

    if (campaign.status === 'Ongoing') {
        document.getElementById('closeCampaignBtn').classList.remove('hidden');
    }

    renderPreview();
}

function renderPreview() {
    const cat = inputs.category.value;
    const coverMap = {Education:'blue', 'Disaster Relief':'rose', Healthcare:'mint', Animals:'yellow', Environment:'mint', Community:'violet'};
    const coverKey = coverMap[cat] || 'blue';
    
    if (window.FS && window.FS.coverPalette) {
        const cover = window.FS.coverPalette[coverKey];
        document.getElementById('previewCover').className = `${cover.bg} h-44 flex items-center justify-center ${cover.icon} text-5xl`;
    }
    
    document.getElementById('previewCategory').textContent = cat;
    document.getElementById('previewTitle').textContent = inputs.title.value.trim() || 'Your campaign title appears here';
    document.getElementById('previewTagline').textContent = inputs.tagline.value.trim() || '';

    const goal = Number(inputs.target.value) || 0;
    const pct = Math.min(100, Math.round((campaign.raised_amount / (goal || 1)) * 100));
    document.getElementById('previewProgress').style.width = `${pct}%`;
    document.getElementById('previewMeta').textContent = `$${campaign.raised_amount.toLocaleString()} raised of $${goal.toLocaleString()} goal · ${pct}%`;
}

Object.values(inputs).forEach(el => { el.addEventListener('input', renderPreview); el.addEventListener('change', renderPreview); });

const errorBox = document.getElementById('errorBox');
function showError(msg) { errorBox.textContent = msg; errorBox.classList.remove('hidden'); window.scrollTo({top:0,behavior:'smooth'}); }
function hideError() { errorBox.classList.add('hidden'); }

// ========================
// 保存编辑逻辑 (PATCH 请求)
// ========================
document.getElementById('campaignForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    if (!campaign) return;
    
    const goal = Number(inputs.target.value) || 0;
    const desc = inputs.description.value.trim();

    if (!inputs.title.value.trim()) { showError("Title cannot be empty."); return; }
    if (desc.length < 20) { showError("Description must be at least 20 characters long."); return; }
    if (goal <= 10) { showError("Target amount must be greater than $10."); return; }

    // 严格按照 ActivityUpdate Schema 组装
    const payload = {
        title: inputs.title.value.trim(),
        description: desc,
        target_amount: goal
    };

    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = 'Saving...';

    try {
        const res = await fetch(`${API_BASE_URL}/fundraiser/activities/${campaignId}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        let data;
        try { data = await res.json(); } catch(e) { data = { detail: "Server error" }; }

        if (!res.ok) {
            if (res.status === 422 && data.detail && Array.isArray(data.detail)) {
                throw new Error(`Validation Error: ${data.detail[0].msg}`);
            }
            throw new Error(data.detail || `HTTP Error ${res.status}`);
        }

        window.location.href = 's13-my-activities.html';
    } catch (err) {
        showError(err.message);
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<span>✓</span> Save changes';
    }
});

document.getElementById('discardBtn').addEventListener('click', () => window.location.href = 's13-my-activities.html');

// ========================
// 关闭活动逻辑 (POST 请求)
// ========================
const closeModal = document.getElementById('closeModal');
const closeConfirm = document.getElementById('closeConfirm');

document.getElementById('closeCampaignBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!campaign) return;
    document.getElementById('closeBody').textContent = `${campaign.title} has raised $${campaign.raised_amount} so far.`;
    closeModal.classList.remove('hidden');
});

document.getElementById('closeCancel')?.addEventListener('click', () => closeModal.classList.add('hidden'));

closeConfirm?.addEventListener('click', async () => {
    closeConfirm.disabled = true;
    closeConfirm.textContent = 'Closing...';
    try {
        const res = await fetch(`${API_BASE_URL}/fundraiser/activities/${campaignId}/close`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        let data;
        try { data = await res.json(); } catch(e) { data = {}; }

        if (!res.ok) throw new Error(data.detail || 'Failed to close campaign');
        window.location.href = `s13-my-activities.html`;
    } catch (err) {
        alert(err.message);
        closeConfirm.disabled = false;
        closeConfirm.textContent = '⚑ Close campaign';
    }
});

init();