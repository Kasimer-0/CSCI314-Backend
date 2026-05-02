// US #7-12 — Fundraiser dashboard listing their own campaigns with KPI strip and status chips.
// Combines screen 13 (default view) and screen 14 (filtered view). The filter chip is reflected
// in the URL (?status=Ongoing) so deep-links from elsewhere land on the right view.

// ---------- Resolve viewing fundraiser ----------
const session = window.FS.getSession();
const fundraiserId = (session && session.userId) || 7; // default to Marcus Steele for demo
const fundraiser = window.FS.findUserById(fundraiserId);

const myCampaigns = campaignsData.filter(c => c.fundraiser_id === fundraiserId);

if (fundraiser) {
    document.getElementById('logoutTrigger').textContent = window.FS.initials(fundraiser.username);
    document.getElementById('navProfile').href = `s3-view-profile.html?userId=${fundraiser.user_id}`;
    document.getElementById('pageSubtitle').textContent = `Track and manage all your fundraising campaigns`;
}

// ---------- KPI strip ----------
const totalRaised = myCampaigns.reduce((s, c) => s + c.raised_amount, 0);
const ongoingCount = myCampaigns.filter(c => c.status === 'Ongoing').length;
const totalSupporters = myCampaigns.reduce((s, c) => s + (c.supporters || 0), 0);
const avgCompletion = (() => {
    if (!myCampaigns.length) return 0;
    const sum = myCampaigns.reduce((s, c) => s + Math.min(100, window.FS.percent(c.raised_amount, c.goal_amount)), 0);
    return Math.round(sum / myCampaigns.length);
})();

document.getElementById('kpiRaised').textContent = window.FS.formatCurrency(totalRaised, 'USD');
document.getElementById('kpiActive').textContent = ongoingCount.toString();
document.getElementById('kpiSupporters').textContent = totalSupporters.toLocaleString('en-US');
document.getElementById('kpiAvg').textContent = `${avgCompletion}%`;

// Made-up but consistent week-over-week deltas (driven by the data so it doesn't feel canned)
document.getElementById('kpiRaisedDelta').textContent = `↗ +${window.FS.formatCurrency(Math.round(totalRaised * 0.04), 'USD')} this week`;
document.getElementById('kpiActiveDelta').textContent = `↗ +${Math.max(1, Math.round(ongoingCount * 0.2))} this week`;
document.getElementById('kpiSupportersDelta').textContent = `↗ +${Math.round(totalSupporters * 0.05)} this week`;
document.getElementById('kpiAvgDelta').textContent = `↗ +${Math.max(1, Math.round(avgCompletion * 0.04))}% this week`;

// ---------- Filter chips ----------
const STATUSES = ['All', 'Ongoing', 'Completed', 'Closed', 'Draft'];
let activeStatus = (new URLSearchParams(window.location.search).get('status')) || 'All';
if (!STATUSES.includes(activeStatus)) activeStatus = 'All';

function chipsHTML() {
    return STATUSES.map(s => {
        const count = s === 'All' ? myCampaigns.length : myCampaigns.filter(c => c.status === s).length;
        const isActive = s === activeStatus;
        const tone = (() => {
            if (isActive) return 'bg-blue-600 text-white border-blue-600';
            return 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50';
        })();
        const countTone = isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700';
        return `
            <button data-status="${s}" class="chip-btn flex items-center gap-2 border ${tone} px-3.5 py-1.5 rounded-full text-sm font-semibold transition">
                <span>${s}</span>
                <span class="text-[11px] ${countTone} rounded-full px-2 py-0.5 font-bold">${count}</span>
            </button>`;
    }).join('');
}

const chipStrip = document.getElementById('chipStrip');
chipStrip.innerHTML = chipsHTML();
chipStrip.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip-btn');
    if (!btn) return;
    activeStatus = btn.dataset.status;
    const url = new URL(window.location.href);
    if (activeStatus === 'All') url.searchParams.delete('status');
    else url.searchParams.set('status', activeStatus);
    window.history.replaceState(null, '', url);
    chipStrip.innerHTML = chipsHTML();
    renderCards();
});

// ---------- Sort ----------
const sortSelect = document.getElementById('sortSelect');
sortSelect.addEventListener('change', renderCards);

// ---------- Cards ----------
const cardsGrid = document.getElementById('cardsGrid');
const emptyState = document.getElementById('emptyState');
const resultsLine = document.getElementById('resultsLine');

function visibleCampaigns() {
    let list = activeStatus === 'All' ? myCampaigns.slice() : myCampaigns.filter(c => c.status === activeStatus);
    const sort = sortSelect.value;
    if (sort === 'goal') list.sort((a, b) => window.FS.percent(b.raised_amount, b.goal_amount) - window.FS.percent(a.raised_amount, a.goal_amount));
    else if (sort === 'raised') list.sort((a, b) => b.raised_amount - a.raised_amount);
    else list.sort((a, b) => new Date(b.start_date || 0) - new Date(a.start_date || 0));
    return list;
}

function statusPillHTML(status) {
    const tones = {
        Ongoing: 'bg-blue-50 text-blue-700',
        Completed: 'bg-emerald-50 text-emerald-700',
        Closed: 'bg-slate-100 text-slate-600',
        Draft: 'bg-amber-50 text-amber-700'
    };
    const dot = {
        Ongoing: 'bg-blue-500',
        Completed: 'bg-emerald-500',
        Closed: 'bg-slate-400',
        Draft: 'bg-amber-500'
    }[status];
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${tones[status]}"><span class="w-1.5 h-1.5 rounded-full ${dot}"></span>${status}</span>`;
}

function progressBar(c) {
    const pct = Math.min(100, window.FS.percent(c.raised_amount, c.goal_amount));
    const tone = c.status === 'Closed' ? 'bg-slate-400' : (c.status === 'Completed' ? 'bg-emerald-500' : 'bg-blue-600');
    return `
        <div class="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-3">
            <div class="${tone} h-full rounded-full" style="width:${pct}%"></div>
        </div>`;
}

function footerLine(c) {
    const raised = window.FS.formatCurrency(c.raised_amount, c.currency);
    const goal = window.FS.formatCurrency(c.goal_amount, c.currency);
    const pct = window.FS.percent(c.raised_amount, c.goal_amount);
    if (c.status === 'Ongoing') {
        const days = window.FS.daysLeft(c.end_date);
        return `${raised} raised of ${goal} goal · ${pct}% · ${days} days left`;
    }
    if (c.status === 'Completed') {
        return `${raised} raised of ${goal} goal · ${pct}% · Closed ${window.FS.formatDate(c.closed_on || c.end_date)}`;
    }
    if (c.status === 'Closed') {
        return `${raised} raised of ${goal} goal · ${pct}% · Closed ${window.FS.formatDate(c.closed_on || c.end_date)}`;
    }
    return `${window.FS.formatCurrency(0, c.currency)} raised of ${goal} goal · 0% · Not yet launched`;
}

function actionPair(c) {
    const view = `<a href="s20-campaign-detail.html?campaignId=${c.campaign_id}" class="text-slate-600 hover:text-slate-900 font-medium">View</a>`;
    const right = (() => {
        if (c.status === 'Ongoing')   return `<a href="s16-edit-campaign.html?campaignId=${c.campaign_id}" class="text-blue-600 hover:text-blue-800 font-semibold">Manage →</a>`;
        if (c.status === 'Completed') return `<a href="#" class="text-emerald-600 hover:text-emerald-800 font-semibold">Report →</a>`;
        if (c.status === 'Closed')    return `<a href="#" class="text-slate-500 hover:text-slate-700 font-semibold">Archive →</a>`;
        return `<a href="s16-edit-campaign.html?campaignId=${c.campaign_id}" class="text-blue-600 hover:text-blue-800 font-semibold">Continue editing →</a>`;
    })();
    const left = c.status === 'Draft' ? `<span class="text-slate-500 font-medium">Preview</span>` : view;
    return `<div class="flex items-center justify-between text-sm pt-3 border-t border-slate-100">${left}${right}</div>`;
}

function cardHTML(c) {
    const cover = window.FS.coverPalette[c.cover_color] || window.FS.coverPalette.blue;
    const catTone = window.FS.categoryStyles[c.category] || 'bg-slate-100 text-slate-700';
    return `
        <article class="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div class="${cover.bg} h-32 relative flex items-center justify-center">
                <span class="${cover.icon} text-5xl">🖼</span>
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
    const niceStatus = activeStatus === 'All' ? 'campaigns' : `${activeStatus.toLowerCase()} campaigns`;
    resultsLine.textContent = `Showing ${list.length} ${niceStatus}`;

    if (list.length === 0) {
        cardsGrid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');
    cardsGrid.innerHTML = list.map(cardHTML).join('');
}

renderCards();
