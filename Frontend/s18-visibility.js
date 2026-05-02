// US — Manage campaign visibility settings (screen 18).
// Three independent toggles persist back to campaign.visibility. The right rail mirrors how the
// campaign would render for two viewer types (logged-in vs. anonymous) so the fundraiser can
// see the impact of toggling visibility off before saving.

const params = new URLSearchParams(window.location.search);
const campaignId = parseInt(params.get('campaignId'), 10);
const campaign = campaignId ? window.FS.findCampaignById(campaignId) : null;

const session = window.FS.getSession();
const fundraiser = (session && window.FS.findUserById(session.userId)) || window.FS.findUserById(7);
if (fundraiser) {
    document.getElementById('logoutTrigger').textContent = window.FS.initials(fundraiser.username);
    document.getElementById('navProfile').href = `s3-view-profile.html?userId=${fundraiser.user_id}`;
}

const togglePublic = document.getElementById('togglePublic');
const toggleIndex = document.getElementById('toggleIndex');
const toggleShare = document.getElementById('toggleShare');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const featureBanner = document.getElementById('featureBanner');
const featureLine = document.getElementById('featureLine');
const savedToast = document.getElementById('savedToast');

if (!campaign) {
    document.getElementById('notFoundBox').textContent = `No campaign found for ID ${params.get('campaignId') || ''}.`;
    document.getElementById('notFoundBox').classList.remove('hidden');
    document.getElementById('layout').classList.add('opacity-50', 'pointer-events-none');
} else {
    document.getElementById('campTitle').textContent = campaign.title;
    document.getElementById('crumbCampaign').textContent = campaign.title;
    document.getElementById('crumbCampaign').href = `s16-edit-campaign.html?campaignId=${campaign.campaign_id}`;
    document.getElementById('navDetails').href = `s16-edit-campaign.html?campaignId=${campaign.campaign_id}`;

    const v = campaign.visibility || { public: true, indexable: true, share: true };
    togglePublic.checked = !!v.public;
    toggleIndex.checked = !!v.indexable;
    toggleShare.checked = !!v.share;

    // Cover tones for the preview cards
    const cover = window.FS.coverPalette[campaign.cover_color] || window.FS.coverPalette.blue;
    ['prevAuthCover', 'prevVisitCover'].forEach(id => {
        document.getElementById(id).className = `h-14 ${cover.bg}`;
    });
    ['prevAuthTitle', 'prevVisitTitle'].forEach(id => {
        document.getElementById(id).textContent = campaign.title;
    });
    const pct = Math.min(100, window.FS.percent(campaign.raised_amount, campaign.goal_amount));
    document.getElementById('prevAuthBar').style.width = `${pct}%`;
    document.getElementById('prevVisitBar').style.width = `${pct}%`;

    refreshSavedState();
    [togglePublic, toggleIndex, toggleShare].forEach(t => t.addEventListener('change', refreshSavedState));
}

function refreshSavedState() {
    if (!campaign) return;
    // Visitor preview — depends on the public + indexable toggles
    const visitCard = document.getElementById('prevVisitCard');
    const visitLabel = document.getElementById('prevVisitLabel');
    const visitFoot = document.getElementById('prevVisitFootnote');
    if (togglePublic.checked) {
        visitCard.className = 'bg-white rounded-2xl border border-slate-200 overflow-hidden';
        visitLabel.className = 'text-xs font-semibold text-slate-500 mb-2';
        visitLabel.textContent = '○ Visitors (no account)';
        visitFoot.textContent = toggleShare.checked ? 'Share buttons enabled · Sign in required to donate'
                                                   : 'Sign in required to donate';
    } else {
        visitCard.className = 'bg-white rounded-2xl border border-slate-200 overflow-hidden opacity-50';
        visitLabel.className = 'text-xs font-semibold text-rose-500 mb-2';
        visitLabel.textContent = '⊘ Hidden from visitors';
        visitFoot.textContent = 'Visitors will see a "Page not found" instead.';
    }

    // Featuring eligibility — public AND indexable AND share AND high completion
    const pct = window.FS.percent(campaign.raised_amount, campaign.goal_amount);
    const eligible = togglePublic.checked && toggleIndex.checked && toggleShare.checked && pct >= 40 && (campaign.verified || false);
    if (eligible) {
        featureBanner.className = 'mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3';
        featureLine.textContent = 'Your campaign meets criteria to be featured in Discover.';
        featureBanner.querySelector('span').textContent = '✨';
    } else {
        featureBanner.className = 'mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3';
        featureLine.textContent = 'Featuring not active — turn on all visibility toggles and reach 40% of goal to qualify.';
        featureBanner.querySelector('span').textContent = '🛈';
    }
}

resetBtn.addEventListener('click', () => {
    if (!campaign) return;
    const v = campaign.visibility || {};
    togglePublic.checked = !!v.public;
    toggleIndex.checked = !!v.indexable;
    toggleShare.checked = !!v.share;
    refreshSavedState();
});

saveBtn.addEventListener('click', () => {
    if (!campaign) return;
    campaign.visibility = {
        public: togglePublic.checked,
        indexable: toggleIndex.checked,
        share: toggleShare.checked
    };
    savedToast.classList.remove('hidden');
    setTimeout(() => savedToast.classList.add('hidden'), 1800);
});
