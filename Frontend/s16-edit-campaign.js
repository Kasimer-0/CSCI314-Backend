// US — Modify an existing campaign + Manually close it (screens 16 & 17).
// Reuses the launch form layout, pre-fills values from ?campaignId, mutates campaignsData on save.
// The "Close campaign" button in the editing context bar opens the screen-17 confirmation modal.

const params = new URLSearchParams(window.location.search);
const campaignId = parseInt(params.get('campaignId'), 10);
const campaign = campaignId ? window.FS.findCampaignById(campaignId) : null;

const session = window.FS.getSession();
const fundraiser = (session && window.FS.findUserById(session.userId)) || window.FS.findUserById(7);
if (fundraiser) {
    document.getElementById('logoutTrigger').textContent = window.FS.initials(fundraiser.username);
    document.getElementById('navProfile').href = `s3-view-profile.html?userId=${fundraiser.user_id}`;
}

const errorBox = document.getElementById('errorBox');
const notFoundBox = document.getElementById('notFoundBox');
const formArea = document.getElementById('formArea');

const inputs = {
    title: document.getElementById('title'),
    tagline: document.getElementById('tagline'),
    description: document.getElementById('description'),
    target: document.getElementById('target'),
    currency: document.getElementById('currency'),
    startDate: document.getElementById('startDate'),
    endDate: document.getElementById('endDate'),
    category: document.getElementById('category')
};

if (!campaign) {
    notFoundBox.textContent = `No campaign found for ID ${params.get('campaignId') || ''}. Pick one from the dashboard.`;
    notFoundBox.classList.remove('hidden');
    formArea.classList.add('opacity-50', 'pointer-events-none');
} else {
    inputs.title.value = campaign.title;
    inputs.tagline.value = campaign.tagline;
    inputs.description.value = campaign.description || '';
    inputs.target.value = campaign.goal_amount;
    inputs.currency.value = campaign.currency;
    inputs.startDate.value = campaign.start_date || '';
    inputs.endDate.value = campaign.end_date || '';
    inputs.category.value = campaign.category;

    const ctx = document.getElementById('contextBar');
    ctx.classList.remove('hidden');
    document.getElementById('ctxTitle').textContent = `Editing: ${campaign.title}`;

    const statusTone = window.FS.STATUS_TONES[campaign.status] || 'bg-slate-100 text-slate-700';
    document.getElementById('ctxStatus').outerHTML =
        `<span class="ml-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusTone}">${campaign.status}</span>`;

    const meta = [
        `${window.FS.formatCurrency(campaign.raised_amount, campaign.currency)} of ${window.FS.formatCurrency(campaign.goal_amount, campaign.currency)} raised`,
        `${campaign.supporters} supporters`,
        campaign.last_donation_at ? `Last donation ${window.FS.relativeTime(campaign.last_donation_at)}` : 'No donations yet'
    ].join(' · ');
    document.getElementById('ctxMeta').textContent = meta;

    document.getElementById('viewPublicLink').href = `s20-campaign-detail.html?campaignId=${campaign.campaign_id}`;
    document.getElementById('visibilityLink').href = `s18-visibility.html?campaignId=${campaign.campaign_id}`;
    if (campaign.status === 'Ongoing') {
        document.getElementById('closeCampaignBtn').classList.remove('hidden');
    }

    renderPreview();
}

function showError(msg) { errorBox.textContent = msg; errorBox.classList.remove('hidden'); window.scrollTo({top:0,behavior:'smooth'}); }
function hideError() { errorBox.classList.add('hidden'); }

// ---------- Preview rail ----------
function renderPreview() {
    const cat = inputs.category.value;
    const coverKey = ({Education:'blue','Disaster Relief':'rose',Healthcare:'mint',Animals:'yellow',Environment:'mint',Community:'violet'})[cat] || (campaign && campaign.cover_color) || 'blue';
    const cover = window.FS.coverPalette[coverKey];
    const tone = window.FS.categoryStyles[cat] || 'bg-slate-100 text-slate-700';

    document.getElementById('previewCover').className = `${cover.bg} h-44 flex items-center justify-center ${cover.icon} text-5xl`;
    const catEl = document.getElementById('previewCategory');
    catEl.className = `inline-flex w-fit px-2.5 py-1 rounded-full text-[11px] font-semibold ${tone}`;
    catEl.textContent = cat;

    document.getElementById('previewTitle').textContent = inputs.title.value.trim() || (campaign ? campaign.title : 'Your campaign title appears here');
    document.getElementById('previewTagline').textContent = inputs.tagline.value.trim() || (campaign ? campaign.tagline : 'A short tagline shows on the campaign card to grab attention.');

    const goal = Number(inputs.target.value) || 0;
    const raised = campaign ? campaign.raised_amount : 0;
    const pct = window.FS.percent(raised, goal);
    document.getElementById('previewProgress').style.width = `${Math.min(100, pct)}%`;
    const days = window.FS.daysLeft(inputs.endDate.value);
    document.getElementById('previewMeta').textContent =
        `${window.FS.formatCurrency(raised, inputs.currency.value)} raised of ${window.FS.formatCurrency(goal, inputs.currency.value)} goal · ${pct}% · ${days != null ? days + ' days left' : 'no end date'}`;
}

Object.values(inputs).forEach(el => {
    el.addEventListener('input', renderPreview);
    el.addEventListener('change', renderPreview);
});

document.getElementById('coverDrop').addEventListener('click', () => {
    showError('Cover image upload is mocked — pick a Category to set the preview tone.');
    setTimeout(hideError, 2200);
});

// ---------- Save / Discard ----------
document.getElementById('campaignForm').addEventListener('submit', (e) => {
    e.preventDefault();
    hideError();
    if (!campaign) return;
    const goal = Number(inputs.target.value) || 0;
    if (!inputs.title.value.trim() || !inputs.tagline.value.trim()) {
        showError('Title and tagline can\'t be empty.');
        return;
    }
    if (goal < campaign.raised_amount) {
        showError(`Target can't be below the amount already raised (${window.FS.formatCurrency(campaign.raised_amount, campaign.currency)}).`);
        return;
    }

    campaign.title = inputs.title.value.trim();
    campaign.tagline = inputs.tagline.value.trim();
    campaign.description = inputs.description.value.trim();
    campaign.goal_amount = goal;
    campaign.currency = inputs.currency.value;
    campaign.start_date = inputs.startDate.value || campaign.start_date;
    campaign.end_date = inputs.endDate.value || campaign.end_date;
    campaign.category = inputs.category.value;

    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '✓ Saved';
    setTimeout(() => { window.location.href = 's13-my-activities.html'; }, 600);
});

document.getElementById('discardBtn').addEventListener('click', () => {
    window.location.href = 's13-my-activities.html';
});

// ---------- Close campaign modal (screen 17) ----------
const closeModal = document.getElementById('closeModal');
const closeBtn = document.getElementById('closeCampaignBtn');
const closeBody = document.getElementById('closeBody');
const closeCancel = document.getElementById('closeCancel');
const closeConfirm = document.getElementById('closeConfirm');

if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        if (!campaign) return;
        const pct = window.FS.percent(campaign.raised_amount, campaign.goal_amount);
        closeBody.textContent = `${campaign.title} has raised ${window.FS.formatCurrency(campaign.raised_amount, campaign.currency)} of ${window.FS.formatCurrency(campaign.goal_amount, campaign.currency)} goal (${pct}%) from ${campaign.supporters} supporters.`;
        closeModal.classList.remove('hidden');
    });
}
if (closeCancel) closeCancel.addEventListener('click', () => closeModal.classList.add('hidden'));
closeModal.addEventListener('click', (e) => { if (e.target === closeModal) closeModal.classList.add('hidden'); });

if (closeConfirm) {
    closeConfirm.addEventListener('click', () => {
        if (!campaign) return;
        campaign.status = 'Closed';
        campaign.closed_on = new Date(window.FS.NOW).toISOString().slice(0, 10);
        // The thank-you email checkbox is purely demonstrative — no email is sent in this mock.
        closeModal.classList.add('hidden');
        window.location.href = `s13-my-activities.html?status=Closed`;
    });
}
