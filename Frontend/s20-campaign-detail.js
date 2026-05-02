// US — Donor view of a single campaign (screen 20).
// Loads the campaign by ?campaignId, hydrates the detail card and recent-supporters list, and
// the right rail handles a (mock) donation: amount + message + anonymous flag → bumps
// raised_amount/supporters in campaignsData and shows a toast.

const params = new URLSearchParams(window.location.search);
const campaignId = parseInt(params.get('campaignId'), 10);
const campaign = campaignId ? window.FS.findCampaignById(campaignId) : null;

const session = window.FS.getSession();
const viewer = (session && window.FS.findUserById(session.userId)) || window.FS.findUserById(6); // default Aisha for demo
if (viewer) {
    document.getElementById('logoutTrigger').textContent = window.FS.initials(viewer.username);
    document.getElementById('navProfile').href = `s3-view-profile.html?userId=${viewer.user_id}`;
}

if (!campaign) {
    const notFound = document.getElementById('notFoundBox');
    notFound.textContent = `Campaign ${params.get('campaignId') || ''} not found. Pick a campaign from the dashboard.`;
    notFound.classList.remove('hidden');
} else {
    renderDetail();
}

function renderDetail() {
    document.getElementById('layout').classList.remove('hidden');
    document.getElementById('layout').classList.add('grid');

    // Cover hero
    const cover = window.FS.coverPalette[campaign.cover_color] || window.FS.coverPalette.blue;
    const hero = document.getElementById('hero');
    const heroIcon = ({Education:'📖','Disaster Relief':'⛑',Healthcare:'🏥',Animals:'🐾',Environment:'🌿',Community:'🏘'})[campaign.category] || '📷';
    hero.className = `rounded-2xl h-72 flex items-center justify-center text-7xl ${cover.bg} ${cover.icon}`;
    hero.textContent = heroIcon;

    // Breadcrumb
    document.getElementById('crumbCategory').textContent = campaign.category;
    document.getElementById('crumbCampaign').textContent = campaign.title;

    // Pill, title, fundraiser
    const pill = document.getElementById('categoryPill');
    pill.className = `inline-flex w-fit px-2.5 py-1 rounded-full text-[11px] font-semibold ${window.FS.categoryStyles[campaign.category] || 'bg-slate-100 text-slate-700'}`;
    pill.textContent = campaign.category;

    document.getElementById('title').textContent = campaign.title;
    const fundraiser = window.FS.findUserById(campaign.fundraiser_id);
    if (fundraiser) {
        document.getElementById('creatorAvatar').textContent = window.FS.initials(fundraiser.username);
        document.getElementById('creatorName').textContent = fundraiser.username;
    }
    if (campaign.verified) {
        document.getElementById('verifiedPill').classList.remove('hidden');
        document.getElementById('verifiedCallout').classList.remove('hidden');
    }

    // Money + progress
    refreshProgress();

    // Meta line
    document.getElementById('metaSupporters').textContent = `${campaign.supporters} supporters`;
    const days = window.FS.daysLeft(campaign.end_date);
    if (campaign.status === 'Ongoing' && days != null) {
        document.getElementById('metaTime').textContent = `${days} days left`;
    } else if (campaign.closed_on) {
        document.getElementById('metaTime').textContent = `Closed ${window.FS.formatDate(campaign.closed_on)}`;
    } else {
        document.getElementById('metaTimeWrap').classList.add('hidden');
    }
    if (campaign.location) {
        document.getElementById('metaLocation').textContent = campaign.location;
    } else {
        document.getElementById('metaLocationWrap').classList.add('hidden');
    }

    // Description, bullets, closing
    document.getElementById('description').textContent = campaign.description || '';
    if (campaign.bullet_points && campaign.bullet_points.length) {
        document.getElementById('bulletWrap').classList.remove('hidden');
        document.getElementById('bulletList').innerHTML = campaign.bullet_points.map(p => `<li>${p}</li>`).join('');
    }
    if (campaign.closing_note) {
        const cn = document.getElementById('closingNote');
        cn.textContent = campaign.closing_note;
        cn.classList.remove('hidden');
    }

    // Recent supporters
    if (campaign.recent_supporters && campaign.recent_supporters.length) {
        document.getElementById('supportersCard').classList.remove('hidden');
        document.getElementById('viewAllLink').textContent = `View all ${campaign.supporters} →`;
        document.getElementById('supportersList').innerHTML = campaign.recent_supporters.map(supporterRow).join('');
    }

    // Donate rail state — only Ongoing accepts donations
    if (campaign.status !== 'Ongoing') {
        document.getElementById('donationStateBlock').classList.add('hidden');
        const dis = document.getElementById('donationDisabled');
        dis.classList.remove('hidden');
        document.getElementById('disabledMsg').textContent = ({
            Completed: 'This campaign has reached its goal — no longer accepting donations.',
            Closed: 'This campaign has been closed by the fundraiser.',
            Draft: 'This campaign is still a draft and not yet open for donations.'
        })[campaign.status] || 'Donations are not available for this campaign.';
    }
}

function supporterRow(s) {
    const avatarTone = s.anonymous ? 'bg-violet-100 text-violet-700'
                                   : (s.name === 'David Johnson' ? 'bg-amber-100 text-amber-700'
                                   : s.name === 'Priya Iyer' ? 'bg-violet-100 text-violet-700'
                                   : s.name === 'Tomás Reyes' ? 'bg-emerald-100 text-emerald-700'
                                   : s.name === 'Linh Nguyen' ? 'bg-rose-100 text-rose-700'
                                   : 'bg-blue-100 text-blue-700');
    const avatarText = s.anonymous ? 'AN' : window.FS.initials(s.name);
    return `
        <li class="flex items-start justify-between py-3 gap-3">
            <div class="flex items-start gap-3">
                <span class="w-9 h-9 rounded-full ${avatarTone} flex items-center justify-center text-[11px] font-bold flex-shrink-0">${avatarText}</span>
                <div>
                    <p class="text-sm"><span class="font-semibold text-slate-900">${s.anonymous ? 'Anonymous' : s.name}</span> <span class="text-slate-400 mx-1">·</span> <span class="text-slate-700 font-semibold">${window.FS.formatCurrency(s.amount, campaign.currency)}</span></p>
                    ${s.message ? `<p class="text-xs italic text-slate-500 mt-1">${s.message}</p>` : ''}
                </div>
            </div>
            <span class="text-xs text-slate-400 flex-shrink-0">${s.when || ''}</span>
        </li>`;
}

function refreshProgress() {
    const raised = window.FS.formatCurrency(campaign.raised_amount, campaign.currency);
    const goal = window.FS.formatCurrency(campaign.goal_amount, campaign.currency);
    const pct = window.FS.percent(campaign.raised_amount, campaign.goal_amount);
    document.getElementById('raisedFigure').textContent = raised;
    document.getElementById('raisedSub').textContent = `raised of ${goal} goal`;
    document.getElementById('percentFigure').textContent = `${pct}%`;
    document.getElementById('progressBar').style.width = `${Math.min(100, pct)}%`;
    document.getElementById('metaSupporters').textContent = `${campaign.supporters} supporters`;
}

// ---------- Donate flow ----------
const amountInput = document.getElementById('amount');
const presetButtons = Array.from(document.querySelectorAll('.preset'));
const messageInput = document.getElementById('message');
const anonCheck = document.getElementById('anonCheck');
const donateBtn = document.getElementById('donateBtn');
const toast = document.getElementById('donateToast');
const toastMsg = document.getElementById('donateToastMsg');

function paintPresets() {
    const v = Number(amountInput.value);
    presetButtons.forEach(btn => {
        const isActive = Number(btn.dataset.amount) === v;
        btn.className = isActive
            ? 'preset border rounded-lg px-2 py-1.5 text-xs font-semibold border-blue-500 bg-blue-50 text-blue-700'
            : 'preset border rounded-lg px-2 py-1.5 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-50';
    });
}
amountInput.addEventListener('input', paintPresets);
presetButtons.forEach(btn => btn.addEventListener('click', () => {
    amountInput.value = btn.dataset.amount;
    paintPresets();
}));
paintPresets();

donateBtn && donateBtn.addEventListener('click', () => {
    if (!campaign) return;
    const amt = Math.max(1, Math.floor(Number(amountInput.value) || 0));
    if (!amt) return;

    campaign.raised_amount += amt;
    campaign.supporters += 1;
    campaign.last_donation_at = new Date().toISOString();
    if (Array.isArray(campaign.recent_supporters)) {
        campaign.recent_supporters.unshift({
            name: anonCheck.checked ? 'Anonymous' : (viewer ? viewer.username : 'You'),
            amount: amt,
            message: messageInput.value.trim() || undefined,
            when: 'Just now',
            anonymous: anonCheck.checked
        });
        document.getElementById('supportersList').innerHTML = campaign.recent_supporters.slice(0, 5).map(supporterRow).join('');
        document.getElementById('supportersCard').classList.remove('hidden');
        document.getElementById('viewAllLink').textContent = `View all ${campaign.supporters} →`;
    }

    refreshProgress();
    messageInput.value = '';
    toastMsg.textContent = `Thanks! Your ${window.FS.formatCurrency(amt, campaign.currency)} donation went through.`;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2800);
});
