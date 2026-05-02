// US — Donee landing / Discover page.
// Lists every Ongoing campaign (any fundraiser), with category-chip filter, search, and sort.
// View → s20 detail. Donee KPIs come from user.stats; defaults to Aisha Mensah for the demo.

const session = window.FS.getSession();
const viewer = (session && window.FS.findUserById(session.userId)) || window.FS.findUserById(6);

if (viewer) {
    document.getElementById('logoutTrigger').textContent = window.FS.initials(viewer.username);
    document.getElementById('navProfile').href = `s3-view-profile.html?userId=${viewer.user_id}`;
    document.getElementById('greeting').textContent = `Welcome back, ${viewer.first_name || viewer.username.split(' ')[0]}`;
}

// ---------- KPIs ----------
const stats = (viewer && viewer.stats) || { donations: 0, saved: 0, active: 0 };
const ongoing = campaignsData.filter(c => c.status === 'Ongoing');
const distinctCats = new Set(ongoing.map(c => c.category));

document.getElementById('kpiDonations').textContent = stats.donations.toString();
document.getElementById('kpiSaved').textContent = stats.saved.toString();
document.getElementById('kpiActive').textContent = ongoing.length.toString();
document.getElementById('kpiCategories').textContent = distinctCats.size.toString();

// ---------- Featured (highest progress among Ongoing) ----------
if (ongoing.length) {
    const top = ongoing.slice().sort((a, b) =>
        window.FS.percent(b.raised_amount, b.goal_amount) - window.FS.percent(a.raised_amount, a.goal_amount)
    )[0];
    const card = document.getElementById('featuredCard');
    document.getElementById('featuredTitle').textContent = top.title;
    document.getElementById('featuredTagline').textContent = top.tagline || '';
    const days = window.FS.daysLeft(top.end_date);
    document.getElementById('featuredMeta').textContent =
        `${window.FS.formatCurrency(top.raised_amount, top.currency)} of ${window.FS.formatCurrency(top.goal_amount, top.currency)} raised · ${window.FS.percent(top.raised_amount, top.goal_amount)}% · ${days != null ? days + ' days left' : 'no end date'}`;
    document.getElementById('featuredCta').href = `s20-campaign-detail.html?campaignId=${top.campaign_id}`;
    card.classList.remove('hidden');
}

// ---------- Category chips ----------
const CATEGORIES = ['All', 'Education', 'Disaster Relief', 'Healthcare', 'Animals', 'Environment', 'Community'];
let activeCategory = (new URLSearchParams(window.location.search).get('category')) || 'All';
if (!CATEGORIES.includes(activeCategory)) activeCategory = 'All';
let searchQuery = '';

function chipsHTML() {
    return CATEGORIES.map(cat => {
        const isActive = cat === activeCategory;
        const tone = isActive ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50';
        return `<button data-cat="${cat}" class="cat-chip border ${tone} px-3.5 py-1.5 rounded-full text-sm font-semibold transition">${cat}</button>`;
    }).join('');
}
const chipStrip = document.getElementById('catChips');
chipStrip.innerHTML = chipsHTML();
chipStrip.addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-chip');
    if (!btn) return;
    activeCategory = btn.dataset.cat;
    const url = new URL(window.location.href);
    if (activeCategory === 'All') url.searchParams.delete('category');
    else url.searchParams.set('category', activeCategory);
    window.history.replaceState(null, '', url);
    chipStrip.innerHTML = chipsHTML();
    renderCards();
});

// ---------- Search & sort ----------
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', () => { searchQuery = searchInput.value.trim().toLowerCase(); renderCards(); });
const sortSelect = document.getElementById('sortSelect');
sortSelect.addEventListener('change', renderCards);

// ---------- Cards ----------
const cardsGrid = document.getElementById('cardsGrid');
const emptyState = document.getElementById('emptyState');
const resultsLine = document.getElementById('resultsLine');

function visibleCampaigns() {
    let list = ongoing.slice();
    if (activeCategory !== 'All') list = list.filter(c => c.category === activeCategory);
    if (searchQuery) {
        list = list.filter(c =>
            c.title.toLowerCase().includes(searchQuery) ||
            (c.tagline || '').toLowerCase().includes(searchQuery));
    }
    const sort = sortSelect.value;
    if (sort === 'goal') {
        list.sort((a, b) => window.FS.percent(b.raised_amount, b.goal_amount) - window.FS.percent(a.raised_amount, a.goal_amount));
    } else if (sort === 'ending') {
        list.sort((a, b) => (window.FS.daysLeft(a.end_date) || 0) - (window.FS.daysLeft(b.end_date) || 0));
    } else {
        list.sort((a, b) => new Date(b.start_date || 0) - new Date(a.start_date || 0));
    }
    return list;
}

function progressBar(c) {
    const pct = Math.min(100, window.FS.percent(c.raised_amount, c.goal_amount));
    return `
        <div class="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-3">
            <div class="bg-blue-600 h-full rounded-full" style="width:${pct}%"></div>
        </div>`;
}

function cardHTML(c) {
    const cover = window.FS.coverPalette[c.cover_color] || window.FS.coverPalette.blue;
    const catTone = window.FS.categoryStyles[c.category] || 'bg-slate-100 text-slate-700';
    const days = window.FS.daysLeft(c.end_date);
    return `
        <a href="s20-campaign-detail.html?campaignId=${c.campaign_id}" class="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col hover:shadow-md hover:border-blue-200 transition">
            <div class="${cover.bg} h-32 flex items-center justify-center ${cover.icon} text-5xl">🖼</div>
            <div class="p-5 flex flex-col flex-1">
                <span class="inline-flex w-fit px-2.5 py-1 rounded-full text-[11px] font-semibold ${catTone}">${c.category}</span>
                <h3 class="text-base font-bold text-slate-900 mt-3 leading-snug">${c.title}</h3>
                <p class="text-sm text-slate-500 mt-1.5 line-clamp-2">${c.tagline || ''}</p>
                ${progressBar(c)}
                <p class="text-xs text-slate-500 mt-2">${window.FS.formatCurrency(c.raised_amount, c.currency)} of ${window.FS.formatCurrency(c.goal_amount, c.currency)} raised · ${window.FS.percent(c.raised_amount, c.goal_amount)}%${days != null ? ' · ' + days + ' days left' : ''}</p>
                <div class="flex items-center justify-between text-sm pt-3 mt-auto border-t border-slate-100">
                    <span class="text-slate-500">${c.supporters} supporters</span>
                    <span class="text-blue-600 font-semibold">View →</span>
                </div>
            </div>
        </a>`;
}

function renderCards() {
    const list = visibleCampaigns();
    resultsLine.textContent = `Showing ${list.length} of ${ongoing.length} active campaigns${activeCategory !== 'All' ? ' in ' + activeCategory : ''}${searchQuery ? ' matching "' + searchQuery + '"' : ''}`;

    if (!list.length) {
        cardsGrid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');
    cardsGrid.innerHTML = list.map(cardHTML).join('');
}

renderCards();
