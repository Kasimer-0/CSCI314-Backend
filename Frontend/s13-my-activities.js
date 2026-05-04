// s13-my-activities.js - 完美映射 FastAPI 后端数据 + 归档功能
const API_BASE_URL = 'http://127.0.0.1:8000';
const token = localStorage.getItem('fs_token') || sessionStorage.getItem('fs_token');
if (!token) window.location.href = 's1-login.html';

let myCampaigns = [];
// 注意这里我们只展示下面这几种状态，Archived 状态不会在这里显示
const STATUSES = ['All', 'Ongoing', 'Completed', 'Closed', 'Draft'];
let activeStatus = (new URLSearchParams(window.location.search).get('status')) || 'All';
if (!STATUSES.includes(activeStatus)) activeStatus = 'All';

async function initDashboard() {
    try {
        // 1. 获取当前登录募捐者信息
        const profileRes = await fetch(`${API_BASE_URL}/profile`, { headers: { 'Authorization': `Bearer ${token}` }});
        if (profileRes.ok) {
            const fundraiser = await profileRes.json();
            document.getElementById('logoutTrigger').textContent = window.FS ? window.FS.initials(fundraiser.username) : fundraiser.username.substring(0,2).toUpperCase();
            document.getElementById('navProfile').href = `s3-view-profile.html?userId=${fundraiser.user_id}`;
        }

        // 2. 调用真实的后端活动列表接口
        const campRes = await fetch(`${API_BASE_URL}/fundraiser/activities/`, { headers: { 'Authorization': `Bearer ${token}` }});
        if (!campRes.ok) throw new Error('Failed to load campaigns');
        const rawData = await campRes.json();

        // 3. 数据翻译 (Mapping)
        const categoryMapReverse = { 1: 'Education', 2: 'Disaster Relief', 3: 'Healthcare', 4: 'Animals', 5: 'Environment', 6: 'Community' };
        const coverMap = { 'Education':'blue', 'Disaster Relief':'rose', 'Healthcare':'mint', 'Animals':'yellow', 'Environment':'mint', 'Community':'violet' };

        myCampaigns = rawData
            .filter(act => act.status !== 'Archived') // 确保刚加载时，已经被存档的项目就不显示了
            .map(act => {
                const catName = categoryMapReverse[act.category_id] || 'Community';
                return {
                    campaign_id: act.activity_id,
                    title: act.title,
                    tagline: act.description, 
                    raised_amount: act.current_amount || 0,
                    goal_amount: act.target_amount,
                    status: act.is_private ? 'Draft' : act.status, 
                    category: catName,
                    currency: 'USD',
                    cover_color: coverMap[catName] || 'blue',
                    supporters: act.shortlist_count || 0,
                    start_date: act.created_at,
                    end_date: new Date(new Date(act.created_at).getTime() + 60*86400000).toISOString()
                };
            });

        renderKPIs();
        renderChips();
        renderCards();
    } catch (err) {
        console.error("Dashboard init error:", err);
    }
}

function renderKPIs() {
    const totalRaised = myCampaigns.reduce((s, c) => s + c.raised_amount, 0);
    const ongoingCount = myCampaigns.filter(c => c.status === 'Ongoing').length;
    const totalSupporters = myCampaigns.reduce((s, c) => s + (c.supporters || 0), 0);
    const avgCompletion = (() => {
        if (!myCampaigns.length) return 0;
        const sum = myCampaigns.reduce((s, c) => s + Math.min(100, Math.round((c.raised_amount / c.goal_amount) * 100)), 0);
        return Math.round(sum / myCampaigns.length);
    })();

    document.getElementById('kpiRaised').textContent = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalRaised);
    document.getElementById('kpiActive').textContent = ongoingCount.toString();
    document.getElementById('kpiSupporters').textContent = totalSupporters.toLocaleString('en-US');
    document.getElementById('kpiAvg').textContent = `${avgCompletion}%`;
}

function renderChips() {
    const chipStrip = document.getElementById('chipStrip');
    chipStrip.innerHTML = STATUSES.map(s => {
        const count = s === 'All' ? myCampaigns.length : myCampaigns.filter(c => c.status === s).length;
        const isActive = s === activeStatus;
        const tone = isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50';
        const countTone = isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700';
        return `
            <button data-status="${s}" class="chip-btn flex items-center gap-2 border ${tone} px-3.5 py-1.5 rounded-full text-sm font-semibold transition">
                <span>${s}</span>
                <span class="text-[11px] ${countTone} rounded-full px-2 py-0.5 font-bold">${count}</span>
            </button>`;
    }).join('');
}

document.getElementById('chipStrip').addEventListener('click', (e) => {
    const btn = e.target.closest('.chip-btn');
    if (!btn) return;
    activeStatus = btn.dataset.status;
    const url = new URL(window.location.href);
    if (activeStatus === 'All') url.searchParams.delete('status');
    else url.searchParams.set('status', activeStatus);
    window.history.replaceState(null, '', url);
    renderChips();
    renderCards();
});

const sortSelect = document.getElementById('sortSelect');
sortSelect.addEventListener('change', renderCards);

const cardsGrid = document.getElementById('cardsGrid');
const emptyState = document.getElementById('emptyState');
const resultsLine = document.getElementById('resultsLine');

function visibleCampaigns() {
    let list = activeStatus === 'All' ? myCampaigns.slice() : myCampaigns.filter(c => c.status === activeStatus);
    const sort = sortSelect.value;
    if (sort === 'goal') list.sort((a, b) => (b.raised_amount/b.goal_amount) - (a.raised_amount/a.goal_amount));
    else if (sort === 'raised') list.sort((a, b) => b.raised_amount - a.raised_amount);
    else list.sort((a, b) => new Date(b.start_date || 0) - new Date(a.start_date || 0));
    return list;
}

function statusPillHTML(status) {
    const tones = { Ongoing: 'bg-blue-50 text-blue-700', Completed: 'bg-emerald-50 text-emerald-700', Closed: 'bg-slate-100 text-slate-600', Draft: 'bg-amber-50 text-amber-700' };
    const dot = { Ongoing: 'bg-blue-500', Completed: 'bg-emerald-500', Closed: 'bg-slate-400', Draft: 'bg-amber-500' }[status];
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${tones[status]}"><span class="w-1.5 h-1.5 rounded-full ${dot}"></span>${status}</span>`;
}

function progressBar(c) {
    const pct = Math.min(100, Math.round((c.raised_amount / c.goal_amount) * 100));
    const tone = c.status === 'Closed' ? 'bg-slate-400' : (c.status === 'Completed' ? 'bg-emerald-500' : 'bg-blue-600');
    return `<div class="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-3"><div class="${tone} h-full rounded-full" style="width:${pct}%"></div></div>`;
}

function footerLine(c) {
    const raised = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(c.raised_amount);
    const goal = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(c.goal_amount);
    const pct = Math.round((c.raised_amount / c.goal_amount) * 100);
    if (c.status === 'Ongoing') return `${raised} raised of ${goal} · ${pct}%`;
    if (c.status === 'Completed' || c.status === 'Closed') return `${raised} raised of ${goal} · ${pct}% · Closed`;
    return `$0 raised of ${goal} · 0% · Draft`;
}

function actionPair(c) {
    const right = (() => {
        if (c.status === 'Ongoing') return `<a href="s16-edit-campaign.html?campaignId=${c.campaign_id}" class="text-blue-600 hover:text-blue-800 font-semibold">Manage →</a>`;
        if (c.status === 'Completed') return `<a href="#" class="text-emerald-600 hover:text-emerald-800 font-semibold">Report →</a>`;
        // 🔥 这里改成了绑定点击事件的 Button
        if (c.status === 'Closed') return `<button onclick="archiveCampaign(${c.campaign_id})" class="text-slate-500 hover:text-slate-700 font-semibold transition hover:-translate-y-0.5">Archive →</button>`;
        return `<a href="s16-edit-campaign.html?campaignId=${c.campaign_id}" class="text-blue-600 hover:text-blue-800 font-semibold">Continue editing →</a>`;
    })();
    return `<div class="flex items-center justify-end text-sm pt-3 border-t border-slate-100">${right}</div>`;
}

function cardHTML(c) {
    const coverMap = {Education:'blue', 'Disaster Relief':'rose', Healthcare:'mint', Animals:'yellow', Environment:'mint', Community:'violet'};
    const coverKey = coverMap[c.category] || 'blue';
    const bg = window.FS ? window.FS.coverPalette[coverKey].bg : 'bg-blue-100';
    const icon = window.FS ? window.FS.coverPalette[coverKey].icon : '🖼';
    const catTone = window.FS ? window.FS.categoryStyles[c.category] : 'bg-slate-100 text-slate-700';
    
    return `
        <article class="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-sm hover:shadow transition-shadow">
            <div class="${bg} h-32 relative flex items-center justify-center">
                <span class="${icon} text-5xl">${icon}</span>
                <div class="absolute top-3 right-3">${statusPillHTML(c.status)}</div>
            </div>
            <div class="p-5 flex flex-col flex-1">
                <span class="inline-flex w-fit px-2.5 py-1 rounded-full text-[11px] font-semibold ${catTone}">${c.category}</span>
                <h3 class="text-base font-bold text-slate-900 mt-3 leading-snug">${c.title}</h3>
                <p class="text-sm text-slate-500 mt-1.5 line-clamp-2">${c.tagline || ''}</p>
                ${progressBar(c)}
                <p class="text-xs text-slate-500 mt-2">${footerLine(c)}</p>
                <div class="mt-auto pt-4">${actionPair(c)}</div>
            </div>
        </article>`;
}

function renderCards() {
    const list = visibleCampaigns();
    resultsLine.textContent = `Showing ${list.length} ${activeStatus === 'All' ? 'campaigns' : activeStatus.toLowerCase() + ' campaigns'}`;
    if (list.length === 0) {
        cardsGrid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');
    cardsGrid.innerHTML = list.map(cardHTML).join('');
}

// ========================
// 存档 (Archive) 核心逻辑
// ========================
window.archiveCampaign = async function(campaignId) {
    const confirmed = confirm("Are you sure you want to archive this campaign? It will be safely moved out of your active dashboard.");
    if (!confirmed) return;

    try {
        const res = await fetch(`${API_BASE_URL}/fundraiser/activities/${campaignId}/archive`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            let data = {};
            try { data = await res.json(); } catch(e){}
            throw new Error(data.detail || "Failed to archive campaign.");
        }

        // 存档成功！从前端的数据数组里把这个项目剔除掉
        myCampaigns = myCampaigns.filter(c => c.campaign_id !== campaignId);
        
        // 重新渲染页面
        renderKPIs();
        renderChips();
        renderCards();

    } catch (err) {
        alert("Error: " + err.message);
    }
};

initDashboard();