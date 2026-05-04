// s20-campaign-detail.js
const API_BASE_URL = 'http://127.0.0.1:8000';
const token = localStorage.getItem('fs_token') || sessionStorage.getItem('fs_token');
const params = new URLSearchParams(window.location.search);
const campaignId = parseInt(params.get('campaignId'), 10);
let campaign = null;

// ==========================
// 1. 动态生成头部导航栏
// ==========================
function renderDynamicHeader() {
    const header = document.getElementById('dynamicHeader');
    if (!header) return;

    if (!token) {
        header.innerHTML = `
            <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">FS</div>
                <span class="text-base font-bold text-slate-900">Fundraising System</span>
            </div>
            <a href="s1-login.html" class="bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-semibold">Log in</a>
        `;
        return;
    }

    const roleId = parseInt(localStorage.getItem('fs_role_id') || '1', 10);
    const initials = localStorage.getItem('fs_initials') || 'US';

    if (roleId === 2) {
        header.innerHTML = `
            <div class="flex items-center gap-8">
                <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">FS</div>
                    <span class="text-base font-bold text-slate-900">Fundraiser Workspace</span>
                </div>
                <nav class="hidden md:flex gap-6 text-sm text-slate-600 font-medium">
                    <a href="s14-fundraiser-dashboard.html" class="hover:text-slate-900 transition-colors">Dashboard</a>
                    <a href="s13-my-activities.html" class="hover:text-slate-900 transition-colors">My Campaigns</a>
                    <a href="s3-view-profile.html" class="hover:text-slate-900 transition-colors">Profile</a>
                </nav>
            </div>
            <div class="flex items-center gap-4">
                <a href="s15-launch-campaign.html" class="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold">＋ New Campaign</a>
                <button id="logoutTrigger" class="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">${initials}</button>
            </div>
        `;
    } else {
        header.innerHTML = `
            <div class="flex items-center gap-8">
                <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">FS</div>
                    <span class="text-base font-bold text-slate-900 font-bold">Fundraising System</span>
                    <span class="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ml-1">Donee</span>
                </div>
                <nav class="hidden md:flex gap-6 text-sm text-slate-600 font-medium">
                    <a href="s2-donee-dashboard.html" class="hover:text-slate-900 transition-colors">Discover</a>
                    <a href="#" class="hover:text-slate-900 transition-colors">History</a>
                    <a href="s3-view-profile.html" class="hover:text-slate-900 transition-colors">Profile</a>
                </nav>
            </div>
            <div class="flex items-center gap-3">
                <button id="logoutTrigger" class="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shadow-sm">${initials}</button>
            </div>
        `;
    }

    setTimeout(() => {
        document.getElementById('logoutTrigger')?.addEventListener('click', () => {
            document.getElementById('logoutModal')?.classList.remove('hidden');
        });
    }, 100);
}

// ==========================
// 2. 初始化页面数据
// ==========================
async function init() {
    renderDynamicHeader();
    
    try {
        const campRes = await fetch(`${API_BASE_URL}/activities/${campaignId}`);
        if (!campRes.ok) throw new Error();
        const rawData = await campRes.json();
        
        const categoryMapReverse = { 1: 'Education', 2: 'Disaster Relief', 3: 'Healthcare', 4: 'Animals', 5: 'Environment', 6: 'Community' };

        campaign = {
            title: rawData.title,
            description: rawData.description,
            category: categoryMapReverse[rawData.category_id] || 'Community',
            raised_amount: parseFloat(rawData.current_amount) || 0,
            goal_amount: parseFloat(rawData.target_amount),
            status: rawData.status,
            currency: 'USD',
            supporters: rawData.view_count || 0
        };
        
        if (rawData.users) {
            document.getElementById('creatorName').textContent = rawData.users.username;
            document.getElementById('creatorAvatar').textContent = rawData.users.username.substring(0,1).toUpperCase();
            document.getElementById('verifiedPill').classList.remove('hidden');
        }

        renderDetail();
    } catch (err) {
        console.error(err);
        document.getElementById('notFoundBox').classList.remove('hidden');
        document.getElementById('notFoundBox').textContent = "Campaign not found.";
    }
}

function renderDetail() {
    document.getElementById('layout').classList.remove('hidden');
    document.getElementById('layout').classList.add('grid');

    const catIcons = { 'Education':'📖', 'Disaster Relief':'⛑', 'Healthcare':'🏥', 'Animals':'🐾', 'Environment':'🌿', 'Community':'🏘' };
    const catStyles = { 'Education':'bg-blue-50 text-blue-700', 'Disaster Relief':'bg-rose-50 text-rose-700', 'Healthcare':'bg-emerald-50 text-emerald-700' };
    
    document.getElementById('hero').textContent = catIcons[campaign.category] || '🌟';
    document.getElementById('crumbCategory').textContent = campaign.category;
    document.getElementById('crumbCampaign').textContent = campaign.title;

    const pill = document.getElementById('categoryPill');
    pill.className = `inline-flex px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${catStyles[campaign.category] || 'bg-slate-100 text-slate-600'}`;
    pill.textContent = campaign.category;
    
    document.getElementById('title').textContent = campaign.title;
    document.getElementById('description').textContent = campaign.description || '';
    
    refreshProgress();

    if (campaign.status !== 'Ongoing') {
        document.getElementById('donationStateBlock').classList.add('hidden');
        document.getElementById('donationDisabled').classList.remove('hidden');
        document.getElementById('disabledMsg').textContent = 'This campaign is no longer accepting donations.';
    }
}

function refreshProgress() {
    const raisedFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(campaign.raised_amount);
    const goalFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(campaign.goal_amount);
    const pct = Math.min(100, Math.round((campaign.raised_amount / campaign.goal_amount) * 100));
    
    document.getElementById('raisedFigure').textContent = raisedFmt;
    document.getElementById('raisedSub').textContent = `raised of ${goalFmt} goal`;
    document.getElementById('percentFigure').textContent = `${pct}%`;
    document.getElementById('progressBar').style.width = `${pct}%`;
    document.getElementById('metaSupporters').textContent = campaign.supporters;
}

// 捐款操作
const amountInput = document.getElementById('amount');
const presetButtons = document.querySelectorAll('.preset');
const donateBtn = document.getElementById('donateBtn');

presetButtons.forEach(btn => btn.addEventListener('click', () => {
    amountInput.value = btn.dataset.amount;
}));

donateBtn?.addEventListener('click', async () => {
    if (!token) { alert("Please login to donate."); return; }
    const amt = parseFloat(amountInput.value);
    if (amt <= 0) return;

    donateBtn.disabled = true;
    donateBtn.textContent = 'Processing...';

    try {
        const res = await fetch(`${API_BASE_URL}/activities/${campaignId}/donate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ amount: amt, anonymous: document.getElementById('anonCheck').checked })
        });

        if (!res.ok) throw new Error();

        campaign.raised_amount += amt;
        refreshProgress();
        
        const toast = document.getElementById('donateToast');
        document.getElementById('donateToastMsg').textContent = `Success! Thanks for donating $${amt}.`;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3500);
        
    } catch (err) {
        alert("Donation failed. Please try again.");
    } finally {
        donateBtn.disabled = false;
        donateBtn.textContent = '♡ Donate now';
    }
});

init();