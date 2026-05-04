// s15-launch-campaign.js - 完美对接 FastAPI 真实后端版
const API_BASE_URL = 'http://127.0.0.1:8000';
const token = localStorage.getItem('fs_token') || sessionStorage.getItem('fs_token');
if (!token) window.location.href = 's1-login.html';

// 直接将开关设为 true，让智能推荐永久生效！
const showSuggest = true;

// DOM 元素绑定
const titleInput = document.getElementById('title');
const taglineInput = document.getElementById('tagline'); // 仅前端预览用
const descriptionInput = document.getElementById('description');
const targetInput = document.getElementById('target');
const currencyInput = document.getElementById('currency'); // 仅前端预览用
const startInput = document.getElementById('startDate'); // 仅前端预览用
const endInput = document.getElementById('endDate'); // 仅前端预览用
const categoryInput = document.getElementById('category');

// 前端 Category 字符串 -> 后端 Category ID 的映射字典
const categoryMap = {
    'Education': 1, 'Disaster Relief': 2, 'Healthcare': 3,
    'Animals': 4, 'Environment': 5, 'Community': 6
};

// 默认日期填充
const today = new Date();
const plus60 = new Date(today.getTime() + 60 * 86400000);
startInput.value = today.toISOString().slice(0, 10);
endInput.value = plus60.toISOString().slice(0, 10);

// 获取头像和资料
async function initProfile() {
    try {
        const profileRes = await fetch(`${API_BASE_URL}/profile`, { headers: { 'Authorization': `Bearer ${token}` }});
        if (profileRes.ok) {
            const fundraiser = await profileRes.json();
            document.getElementById('logoutTrigger').textContent = window.FS ? window.FS.initials(fundraiser.username) : fundraiser.username.substring(0,2).toUpperCase();
            document.getElementById('navProfile').href = `s3-view-profile.html?userId=${fundraiser.user_id}`;
        }
    } catch(e) { console.error(e); }
}

// ⚡ 对接后端的 AI 智能推荐目标接口
async function renderSuggestion() {
    const section = document.getElementById('suggestSection');
    if (!showSuggest) {
        section.classList.add('hidden');
        document.getElementById('aiBadge').classList.add('hidden');
        return;
    }
    
    document.getElementById('crumbLeaf').textContent = 'Smart suggestion';
    document.getElementById('aiBadge').classList.remove('hidden');
    document.getElementById('targetLabel').innerHTML = 'Target amount &nbsp;<span class="text-violet-600 text-xs font-medium">· AI-suggested</span>';
    section.classList.remove('hidden');

    const catId = categoryMap[categoryInput.value] || 1;
    
    try {
        // 请求后端的 suggest-target 接口
        const res = await fetch(`${API_BASE_URL}/fundraiser/activities/suggest-target?category_id=${catId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const s = await res.json(); 

        // 解析后端返回的推荐数据
        const recommended = s.suggested_target || 500;
        const records = s.based_on_records || 0;

        section.innerHTML = `
            <div class="bg-violet-50 border border-violet-200 rounded-2xl p-5">
                <div class="flex items-start justify-between flex-wrap gap-2">
                    <div>
                        <p class="text-[11px] font-bold tracking-wider text-violet-700 uppercase">⚡ Smart Suggestion</p>
                        <p class="text-base font-bold text-slate-900 mt-1">Recommended target: $${recommended.toLocaleString()}</p>
                    </div>
                    <span class="text-xs font-bold text-violet-700 bg-white border border-violet-200 rounded-full px-3 py-1">Data-Driven</span>
                </div>
                <p class="text-sm text-slate-600 mt-2">${s.message || `Calculated based on past campaigns.`}</p>
                <div class="flex flex-wrap items-center gap-3 mt-4">
                    <button id="useSuggestionBtn" type="button" class="bg-violet-600 text-white text-sm px-4 py-2 rounded-xl font-semibold hover:bg-violet-700 transition flex items-center gap-2"><span>✓</span> Use this target</button>
                </div>
            </div>`;
            
        document.getElementById('useSuggestionBtn').addEventListener('click', () => {
            targetInput.value = recommended;
            renderPreview();
        });
    } catch(err) {
        section.innerHTML = `<div class="bg-violet-50 border border-violet-100 text-sm text-violet-700 rounded-xl p-4">No comparable past campaigns for this category yet — we'll suggest a target once we have more data.</div>`;
    }
}

// 右侧动态预览面板
function renderPreview() {
    const cat = categoryInput.value;
    const coverMap = {Education:'blue','Disaster Relief':'rose',Healthcare:'mint',Animals:'yellow',Environment:'mint',Community:'violet'};
    const tone = window.FS ? window.FS.categoryStyles[cat] : 'bg-slate-100 text-slate-700';

    if (window.FS && window.FS.coverPalette) {
        const cover = window.FS.coverPalette[coverMap[cat] || 'blue'];
        document.getElementById('previewCover').className = `${cover.bg} h-44 flex items-center justify-center ${cover.icon} text-5xl`;
    }
    
    const catEl = document.getElementById('previewCategory');
    catEl.className = `inline-flex w-fit px-2.5 py-1 rounded-full text-[11px] font-semibold ${tone}`;
    catEl.textContent = cat;

    document.getElementById('previewTitle').textContent = titleInput.value.trim() || 'Your campaign title appears here';
    document.getElementById('previewTagline').textContent = taglineInput.value.trim() || 'A short tagline shows on the campaign card to grab attention.';

    const goal = Number(targetInput.value) || 0;
    const currency = currencyInput.value || 'USD';
    document.getElementById('previewMeta').textContent = `$0 raised of ${goal.toLocaleString()} ${currency} goal · 0%`;
}

// 绑定实时更新
[titleInput, taglineInput, targetInput, currencyInput, startInput, endInput, categoryInput].forEach(el => {
    el.addEventListener('input', renderPreview);
    el.addEventListener('change', renderPreview);
});
categoryInput.addEventListener('change', () => { if (showSuggest) renderSuggestion(); renderPreview(); });

// ========================
// 核心提交逻辑 (对接 FastAPI)
// ========================
const errorBox = document.getElementById('errorBox');
function showError(msg) { errorBox.textContent = msg; errorBox.classList.remove('hidden'); window.scrollTo({top:0,behavior:'smooth'}); }
function hideError() { errorBox.classList.add('hidden'); }

// 根据后端的 schemas.ActivityCreate 严格构造 Payload
function buildCampaignPayload(status) {
    const goal = Number(targetInput.value) || 0;
    if (!titleInput.value.trim()) { showError('Give your campaign a title.'); return null; }
    
    // 后端要求 description > 10 个字符
    const desc = descriptionInput.value.trim() || taglineInput.value.trim(); 
    if (desc.length < 10) { showError('Description must be at least 10 characters long.'); return null; }
    
    // 后端要求 target_amount > 10
    if (goal <= 10) { showError('Target amount must be greater than $10.'); return null; }

    return {
        title: titleInput.value.trim(),
        description: desc,
        category_id: categoryMap[categoryInput.value] || 1,
        target_amount: goal,
        is_private: status === 'Draft' // 草稿状态则设为 is_private
    };
}

async function submitCampaign(status, btnId, loadingText) {
    hideError();
    const payload = buildCampaignPayload(status);
    if (!payload) return;

    const btn = document.getElementById(btnId);
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = loadingText;

    try {
        // 对接你真实的路由: POST /fundraiser/activities
        const res = await fetch(`${API_BASE_URL}/fundraiser/activities`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(payload)
        });

        let data;
        try { data = await res.json(); } catch(e) { data = { detail: "Server error" }; }

        if (!res.ok) {
            // 解析 FastAPI 经典的 422 详细报错
            if (res.status === 422 && data.detail && Array.isArray(data.detail)) {
                const errorField = data.detail[0].loc[data.detail[0].loc.length - 1];
                const errorMsg = data.detail[0].msg;
                throw new Error(`Validation Error on [${errorField}]: ${errorMsg}`);
            }
            throw new Error(data.detail || `HTTP Error ${res.status}`);
        }

        // 成功！跳转回你的 My Campaigns 列表
        window.location.href = `s13-my-activities.html`;

    } catch (err) {
        showError(err.message);
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

document.getElementById('campaignForm').addEventListener('submit', (e) => {
    e.preventDefault();
    submitCampaign('Ongoing', 'launchBtn', 'Launching...');
});

document.getElementById('draftBtn').addEventListener('click', () => {
    submitCampaign('Draft', 'draftBtn', 'Saving...');
});

document.getElementById('coverDrop').addEventListener('click', () => {
    showError('Cover image upload is ready for backend integration.');
    setTimeout(hideError, 2200);
});

// 初始化
initProfile();
renderSuggestion();
renderPreview();