// US — Launch a new fundraising campaign (Fundraiser-only).
// The right rail re-renders as the form changes. ?suggest=1 (screen 19) injects the AI banner
// — the "Recommended target" stats are computed from past campaigns of the chosen category so
// the suggestion is internally consistent with the seeded data.

const params = new URLSearchParams(window.location.search);
const showSuggest = params.get('suggest') === '1';

const session = window.FS.getSession();
const fundraiserId = (session && session.userId) || 7;
const fundraiser = window.FS.findUserById(fundraiserId);

if (fundraiser) {
    document.getElementById('logoutTrigger').textContent = window.FS.initials(fundraiser.username);
    document.getElementById('navProfile').href = `s3-view-profile.html?userId=${fundraiser.user_id}`;
}

// ---------- Defaults & inputs ----------
const titleInput = document.getElementById('title');
const taglineInput = document.getElementById('tagline');
const descriptionInput = document.getElementById('description');
const targetInput = document.getElementById('target');
const currencyInput = document.getElementById('currency');
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const categoryInput = document.getElementById('category');

// Default the date pickers to a 60-day window starting today (matches the screenshot footer copy).
const today = new Date(window.FS.NOW);
const plus60 = new Date(today.getTime() + 60 * 86400000);
const fmt = d => d.toISOString().slice(0, 10);
startInput.value = fmt(today);
endInput.value = fmt(plus60);

// ---------- AI suggestion (screen 19) ----------
function computeSuggestion(category) {
    const peers = campaignsData.filter(c => c.category === category && (c.status === 'Completed' || c.status === 'Ongoing'));
    if (!peers.length) return null;
    const sortedRaised = peers.map(c => c.raised_amount).sort((a, b) => a - b);
    const median = sortedRaised[Math.floor(sortedRaised.length / 2)];
    const recommended = Math.round(median * 1.08 / 100) * 100; // 8% stretch on median, rounded to $100

    const supporters = peers.map(c => c.supporters || 0).sort((a, b) => a - b);
    const lowS = supporters[0];
    const highS = supporters[supporters.length - 1];

    const durations = peers.map(c => {
        if (!c.start_date || !c.end_date) return null;
        const ms = new Date(c.end_date) - new Date(c.start_date);
        return Math.round(ms / 86400000);
    }).filter(Boolean);
    const avgDays = durations.length ? Math.round(durations.reduce((s, n) => s + n, 0) / durations.length) : 45;

    return {
        recommended, median, avgDays,
        supporterRange: `${lowS} – ${highS}`,
        likelihood: 87 // not science — friendly demo number
    };
}

function renderSuggestion() {
    const section = document.getElementById('suggestSection');
    if (!showSuggest) {
        section.classList.add('hidden');
        document.getElementById('aiBadge').classList.add('hidden');
        document.getElementById('targetLabel').textContent = 'Target amount';
        document.getElementById('crumbLeaf').textContent = 'New Campaign';
        return;
    }
    document.getElementById('crumbLeaf').textContent = 'Smart suggestion';
    document.getElementById('aiBadge').classList.remove('hidden');
    document.getElementById('targetLabel').innerHTML = 'Target amount &nbsp;<span class="text-violet-600 text-xs font-medium">· AI-suggested</span>';
    section.classList.remove('hidden');

    const cat = categoryInput.value;
    const s = computeSuggestion(cat);
    if (!s) {
        section.innerHTML = `<div class="bg-violet-50 border border-violet-100 text-sm text-violet-700 rounded-xl p-4">No comparable past campaigns for <strong>${cat}</strong> yet — we'll suggest a target once we have more data.</div>`;
        return;
    }
    section.innerHTML = `
        <div class="bg-violet-50 border border-violet-200 rounded-2xl p-5">
            <div class="flex items-start justify-between flex-wrap gap-2">
                <div>
                    <p class="text-[11px] font-bold tracking-wider text-violet-700 uppercase">⚡ Smart Suggestion</p>
                    <p class="text-base font-bold text-slate-900 mt-1">Recommended target: ${window.FS.formatCurrency(s.recommended, 'USD')}</p>
                </div>
                <span class="text-xs font-bold text-violet-700 bg-white border border-violet-200 rounded-full px-3 py-1">${s.likelihood}% likelihood</span>
            </div>
            <p class="text-sm text-slate-600 mt-2">Based on past ${cat} campaigns of similar duration in the last 12 months, this target has an estimated ${s.likelihood}% likelihood of being met by your end date.</p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <div class="bg-white rounded-xl p-3 border border-violet-100">
                    <p class="text-[11px] text-slate-500 font-medium">Median raised</p>
                    <p class="text-lg font-bold text-slate-900">${window.FS.formatCurrency(s.median, 'USD')}</p>
                </div>
                <div class="bg-white rounded-xl p-3 border border-violet-100">
                    <p class="text-[11px] text-slate-500 font-medium">Avg. days to goal</p>
                    <p class="text-lg font-bold text-slate-900">${s.avgDays} days</p>
                </div>
                <div class="bg-white rounded-xl p-3 border border-violet-100">
                    <p class="text-[11px] text-slate-500 font-medium">Supporter range</p>
                    <p class="text-lg font-bold text-slate-900">${s.supporterRange}</p>
                </div>
            </div>
            <div class="flex flex-wrap items-center gap-3 mt-4">
                <button id="useSuggestionBtn" type="button" class="bg-violet-600 text-white text-sm px-4 py-2 rounded-xl font-semibold hover:bg-violet-700 transition flex items-center gap-2"><span>✓</span> Use this target</button>
                <button id="explainSuggestionBtn" type="button" class="text-sm text-violet-700 font-medium hover:underline">See how this was calculated</button>
            </div>
        </div>`;
    document.getElementById('useSuggestionBtn').addEventListener('click', () => {
        targetInput.value = s.recommended;
        renderPreview();
    });
    document.getElementById('explainSuggestionBtn').addEventListener('click', () => {
        alert(`Recommendation = round((median raised ${window.FS.formatCurrency(s.median, 'USD')}) × 1.08, $100). Comparable campaigns in the ${cat} category from the last 12 months.`);
    });
}

// ---------- Live preview ----------
function renderPreview() {
    const cat = categoryInput.value;
    const cover = window.FS.coverPalette[(({Education:'blue','Disaster Relief':'rose',Healthcare:'mint',Animals:'yellow',Environment:'mint',Community:'violet'})[cat]) || 'blue'];
    const tone = window.FS.categoryStyles[cat] || 'bg-slate-100 text-slate-700';

    document.getElementById('previewCover').className = `${cover.bg} h-44 flex items-center justify-center ${cover.icon} text-5xl`;
    const catEl = document.getElementById('previewCategory');
    catEl.className = `inline-flex w-fit px-2.5 py-1 rounded-full text-[11px] font-semibold ${tone}`;
    catEl.textContent = cat;

    document.getElementById('previewTitle').textContent = titleInput.value.trim() || 'Your campaign title appears here';
    document.getElementById('previewTagline').textContent = taglineInput.value.trim() || 'A short tagline shows on the campaign card to grab attention.';

    const goal = Number(targetInput.value) || 0;
    const days = window.FS.daysLeft(endInput.value);
    document.getElementById('previewMeta').textContent = `${window.FS.formatCurrency(0, currencyInput.value)} raised of ${window.FS.formatCurrency(goal, currencyInput.value)} goal · 0% · ${days != null ? days + ' days left' : 'no end date'}`;
}

[titleInput, taglineInput, targetInput, currencyInput, startInput, endInput, categoryInput].forEach(el => {
    el.addEventListener('input', renderPreview);
    el.addEventListener('change', renderPreview);
});
categoryInput.addEventListener('change', () => {
    if (showSuggest) renderSuggestion();
    renderPreview();
});

// ---------- Submit ----------
const errorBox = document.getElementById('errorBox');
function showError(msg) { errorBox.textContent = msg; errorBox.classList.remove('hidden'); window.scrollTo({top:0,behavior:'smooth'}); }
function hideError() { errorBox.classList.add('hidden'); }

function buildCampaign(status) {
    const goal = Number(targetInput.value) || 0;
    if (!titleInput.value.trim()) { showError('Give your campaign a title.'); return null; }
    if (!taglineInput.value.trim()) { showError('Add a short tagline donors will see on the card.'); return null; }
    if (goal < 100) { showError('Target amount must be at least $100.'); return null; }
    if (status === 'Ongoing' && (!startInput.value || !endInput.value)) { showError('Pick a start and end date before launching.'); return null; }

    const newId = campaignsData.reduce((m, c) => Math.max(m, c.campaign_id), 0) + 1;
    return {
        campaign_id: newId,
        fundraiser_id: fundraiserId,
        title: titleInput.value.trim(),
        tagline: taglineInput.value.trim(),
        description: descriptionInput.value.trim(),
        category: categoryInput.value,
        goal_amount: goal,
        raised_amount: 0,
        currency: currencyInput.value,
        start_date: startInput.value || '',
        end_date: endInput.value || '',
        status,
        supporters: 0,
        location: '',
        cover_color: ({Education:'blue','Disaster Relief':'rose',Healthcare:'mint',Animals:'yellow',Environment:'mint',Community:'violet'})[categoryInput.value] || 'blue',
        last_donation_at: null,
        visibility: { public: status === 'Ongoing', indexable: status === 'Ongoing', share: status === 'Ongoing' },
        verified: false
    };
}

document.getElementById('campaignForm').addEventListener('submit', (e) => {
    e.preventDefault();
    hideError();
    const c = buildCampaign('Ongoing');
    if (!c) return;
    campaignsData.push(c);
    window.location.href = `s13-my-activities.html?status=Ongoing`;
});

document.getElementById('draftBtn').addEventListener('click', () => {
    hideError();
    const c = buildCampaign('Draft');
    if (!c) return;
    campaignsData.push(c);
    window.location.href = `s13-my-activities.html?status=Draft`;
});

document.getElementById('coverDrop').addEventListener('click', () => {
    showError('Cover image upload is mocked — pick a Category to set the preview tone.');
    setTimeout(hideError, 2200);
});

renderSuggestion();
renderPreview();
