/**
 * results.js
 * TripMitra AI - Personalised Recommendations & Timeline Itinerary Renderer.
 * De-cluttered Segmented Tabs, Day Filter Buttons, 5-Slot Daily Timetables.
 */

let cachedRecommendations = [];
let cachedItinerary = [];
let activeDayFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    initViewTabs();
    loadAndRenderResults();
});

function initViewTabs() {
    document.querySelectorAll('.results-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            document.querySelectorAll('.results-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.results-tab-panel').forEach(p => p.classList.remove('active'));

            btn.classList.add('active');

            if (targetTab === 'recommendations') {
                const panel = document.getElementById('tabRecommendations');
                if (panel) panel.classList.add('active');
            } else if (targetTab === 'itinerary') {
                const panel = document.getElementById('tabItinerary');
                if (panel) panel.classList.add('active');
            } else if (targetTab === 'breakdown') {
                const panel = document.getElementById('tabBreakdown');
                if (panel) panel.classList.add('active');
            }
        });
    });
}

function loadAndRenderResults() {
    const rawData = localStorage.getItem('tripmitra_ai_recommendations') || localStorage.getItem('nagpur_ai_recommendations');
    const container = document.getElementById('resultsContainer');
    const noDataState = document.getElementById('noDataState');

    if (!rawData) {
        if (noDataState) noDataState.style.display = 'block';
        if (container) container.style.display = 'none';
        return;
    }

    try {
        const data = JSON.parse(rawData);
        if (container) container.style.display = 'block';
        if (noDataState) noDataState.style.display = 'none';

        cachedRecommendations = data.recommendations || [];
        cachedItinerary = data.itinerary || [];

        renderDashboardStats(data);
        renderRecommendations(cachedRecommendations);
        renderDayFilterNav(cachedItinerary);
        renderItinerary(cachedItinerary, activeDayFilter);
        renderVectorBreakdown(cachedRecommendations, data.user_prefs);
    } catch (e) {
        console.error("Error parsing recommendations:", e);
        if (noDataState) noDataState.style.display = 'block';
    }
}

function renderDashboardStats(data) {
    const prefs = data.user_prefs || {};
    const stats = data.stats || {};

    const prefSummaryEl = document.getElementById('prefSummaryText');
    if (prefSummaryEl) {
        const interestsStr = (prefs.interests || []).join(', ');
        const budgetLabel = prefs.budget_amount ? `Rs. ${parseInt(prefs.budget_amount).toLocaleString()}` : (prefs.budget || '').replace('_', ' ').toUpperCase();
        const distLabel = prefs.max_distance ? `${prefs.max_distance} km Radius` : prefs.distance_pref;
        const daysLabel = prefs.num_days ? `${prefs.num_days} Days Trip` : (prefs.duration || '').replace('_', ' ');

        prefSummaryEl.innerHTML = `
            <strong>Configured Travel Profile:</strong> Budget: <em>${budgetLabel}</em> | 
            Radius: <em>${distLabel}</em> | Interests: <em>${interestsStr}</em> | Group: <em>${prefs.group_type}</em> | 
            Duration: <em>${daysLabel}</em>
        `;
    }

    const totalAnalyzedEl = document.getElementById('statAnalyzed');
    if (totalAnalyzedEl) totalAnalyzedEl.innerText = stats.analyzed_count || 23;

    const topScoreEl = document.getElementById('statTopScore');
    if (topScoreEl) topScoreEl.innerText = (stats.top_score || 0) + '%';

    const avgScoreEl = document.getElementById('statAvgScore');
    if (avgScoreEl) avgScoreEl.innerText = (stats.avg_score || 0) + '%';
}

function renderRecommendations(recommendations) {
    const spotlightContainer = document.getElementById('spotlightContainer');
    const recsGrid = document.getElementById('recommendationsGrid');

    if (!spotlightContainer || !recsGrid) return;

    if (recommendations.length === 0) {
        recsGrid.innerHTML = `<p style="color: var(--text-secondary);">No matching destinations found.</p>`;
        return;
    }

    // 1. RENDER TOP SPOTLIGHT RECOMMENDATION (#1)
    const topPick = recommendations[0];
    const topTags = topPick.tags ? topPick.tags.split(',').map(t => `<span class="tag-pill">${t.trim()}</span>`).join('') : '';

    spotlightContainer.innerHTML = `
        <div class="card spotlight-card">
            <div class="card-img-wrapper" style="height: 100%; min-height: 320px;">
                <img src="${topPick.image_url}" alt="${topPick.name}" class="card-img">
                <span class="spotlight-badge"><i class="fa-solid fa-crown"></i> #1 Top AI Pick</span>
                <span class="match-badge" style="top: 1.25rem; right: 1.25rem;"><i class="fa-solid fa-bolt"></i> ${topPick.match_percentage}% Match</span>
            </div>
            <div class="card-body" style="padding: 2.25rem;">
                <span class="card-category-badge" style="position: static; display: inline-block; width: fit-content; margin-bottom: 0.75rem;"><i class="fa-solid fa-tag"></i> ${topPick.category}</span>
                <h3 class="card-title" style="font-size: 1.8rem; margin-bottom: 0.75rem;">${topPick.name}</h3>
                <p class="card-desc" style="font-size: 0.95rem; -webkit-line-clamp: 4; margin-bottom: 1.25rem;">${topPick.description}</p>
                
                <div class="tag-pills">${topTags}</div>

                <div class="rationale-box">
                    <div class="rationale-header"><i class="fa-solid fa-brain"></i> AI Rationale Explanation</div>
                    <div>${topPick.rationale}</div>
                </div>

                <div class="card-meta" style="margin-top: auto;">
                    <div class="meta-item"><i class="fa-solid fa-wallet"></i> Rs. ${topPick.estimated_budget}</div>
                    <div class="meta-item"><i class="fa-solid fa-clock"></i> ${topPick.ideal_duration_hours}h</div>
                    <div class="meta-item"><i class="fa-solid fa-star" style="color: var(--amber-warning);"></i> ${topPick.rating}</div>
                    <div class="meta-item"><i class="fa-solid fa-route"></i> ${topPick.distance_from_nagpur_center} km</div>
                </div>

                <button class="btn btn-primary" style="width: 100%; margin-top: 1.5rem;" onclick="openDestinationModal(${topPick.id})">
                    <i class="fa-solid fa-circle-info"></i> View Destination Details & Map Placeholder
                </button>
            </div>
        </div>
    `;

    // 2. RENDER REMAINING RECOMMENDATIONS (#2 to #5)
    const remainingPicks = recommendations.slice(1);

    recsGrid.innerHTML = remainingPicks.map((dest, idx) => {
        const tags = dest.tags ? dest.tags.split(',').map(t => `<span class="tag-pill">${t.trim()}</span>`).join('') : '';

        return `
            <div class="card">
                <div class="card-img-wrapper">
                    <img src="${dest.image_url}" alt="${dest.name}" class="card-img">
                    <span class="card-category-badge"><i class="fa-solid fa-award"></i> Pick #${idx + 2} • ${dest.category}</span>
                    <span class="match-badge"><i class="fa-solid fa-bolt"></i> ${dest.match_percentage}% Match</span>
                </div>
                <div class="card-body">
                    <h3 class="card-title">${dest.name}</h3>
                    <p class="card-desc">${dest.description}</p>
                    
                    <div class="tag-pills">${tags}</div>

                    <div class="rationale-box">
                        <div class="rationale-header"><i class="fa-solid fa-brain"></i> AI Rationale</div>
                        <div>${dest.rationale}</div>
                    </div>

                    <div class="card-meta">
                        <div class="meta-item"><i class="fa-solid fa-wallet"></i> Rs. ${dest.estimated_budget}</div>
                        <div class="meta-item"><i class="fa-solid fa-clock"></i> ${dest.ideal_duration_hours}h</div>
                        <div class="meta-item"><i class="fa-solid fa-star" style="color: var(--amber-warning);"></i> ${dest.rating}</div>
                    </div>

                    <button class="btn btn-secondary" style="width: 100%; margin-top: 1.25rem;" onclick="openDestinationModal(${dest.id})">
                        <i class="fa-solid fa-circle-info"></i> View Details
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderDayFilterNav(itinerary) {
    const dayNav = document.getElementById('dayFilterNav');
    if (!dayNav) return;

    if (itinerary.length <= 1) {
        dayNav.style.display = 'none';
        return;
    }

    dayNav.style.display = 'flex';
    let html = `<button class="day-filter-btn active" data-day="all"><i class="fa-solid fa-calendar"></i> All Days (${itinerary.length})</button>`;
    
    itinerary.forEach(item => {
        html += `<button class="day-filter-btn" data-day="${item.day}">Day ${item.day}</button>`;
    });

    dayNav.innerHTML = html;

    dayNav.querySelectorAll('.day-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            dayNav.querySelectorAll('.day-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeDayFilter = btn.getAttribute('data-day');
            renderItinerary(cachedItinerary, activeDayFilter);
        });
    });
}

function renderItinerary(itinerary, filterDay = 'all') {
    const itineraryContainer = document.getElementById('itineraryTimelineContainer');
    if (!itineraryContainer) return;

    if (itinerary.length === 0) {
        itineraryContainer.innerHTML = `<p style="color: var(--text-secondary);">No itinerary generated.</p>`;
        return;
    }

    let filteredList = itinerary;
    if (filterDay !== 'all') {
        const dNum = parseInt(filterDay);
        filteredList = itinerary.filter(item => item.day === dNum);
    }

    let html = '';

    filteredList.forEach(dayItem => {
        html += `
            <div style="margin-bottom: 3rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.75rem;">
                    <h3 style="color: var(--cyan-primary); font-size: 1.35rem; display: flex; align-items: center; gap: 0.6rem;">
                        <i class="fa-solid fa-calendar-day"></i> ${dayItem.title}
                    </h3>
                    <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">${dayItem.schedule.length} Time Slots</span>
                </div>

                <div class="timeline">
        `;

        dayItem.schedule.forEach(slot => {
            const detailBtn = slot.destination_id 
                ? `<button class="btn btn-outline" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; margin-top: 0.6rem;" onclick="openDestinationModal(${slot.destination_id})"><i class="fa-solid fa-circle-info"></i> Spot Details</button>` 
                : '';

            html += `
                <div class="timeline-item">
                    <div class="timeline-icon"><i class="fa-solid fa-location-dot"></i></div>
                    <div class="timeline-content">
                        <div style="flex: 1;">
                            <div style="display: flex; gap: 0.75rem; align-items: center; margin-bottom: 0.4rem; flex-wrap: wrap;">
                                <span class="timeline-time"><i class="fa-solid fa-clock"></i> ${slot.time}</span>
                                <span style="font-size: 0.75rem; color: var(--cyan-primary); background: rgba(6,182,212,0.1); padding: 0.2rem 0.6rem; border-radius: 4px; font-weight: 700;">${slot.period}</span>
                                <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">${slot.category}</span>
                            </div>
                            <h4 style="font-size: 1.2rem; color: #ffffff; margin-bottom: 0.35rem;">${slot.destination_name}</h4>
                            <p style="color: #cbd5e1; font-size: 0.9rem; line-height: 1.5;">${slot.activity}</p>
                            <p style="color: var(--text-secondary); font-size: 0.82rem; margin-top: 0.5rem; display: flex; align-items: center; gap: 0.4rem; background: rgba(255,255,255,0.03); padding: 0.5rem 0.75rem; border-radius: 6px;">
                                <i class="fa-solid fa-lightbulb" style="color: var(--amber-warning);"></i> <em>${slot.tip}</em>
                            </p>
                            ${detailBtn}
                        </div>
                        <img src="${slot.image_url}" alt="${slot.destination_name}" class="timeline-img">
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    itineraryContainer.innerHTML = html;
}

function renderVectorBreakdown(recommendations, prefs) {
    const container = document.getElementById('vectorBreakdownContent');
    if (!container) return;

    if (!recommendations || recommendations.length === 0) return;

    let html = `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">`;

    recommendations.forEach(dest => {
        html += `
            <div style="background: rgba(11, 15, 25, 0.6); border: 1px solid var(--border-subtle); padding: 1.25rem; border-radius: 12px;">
                <h4 style="font-size: 1.1rem; color: #ffffff; margin-bottom: 0.5rem;">${dest.name}</h4>
                <div style="font-size: 0.85rem; color: var(--cyan-primary); font-weight: 700; margin-bottom: 0.75rem;">Match Percentage: ${dest.match_percentage}%</div>

                <div style="margin-bottom: 0.5rem;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--text-secondary);">
                        <span>Interest Similarity</span>
                        <span>${dest.interest_match_score}%</span>
                    </div>
                    <div style="background: #1e2d4a; height: 6px; border-radius: 3px; overflow: hidden; margin-top: 0.2rem;">
                        <div style="background: var(--cyan-primary); height: 100%; width: ${dest.interest_match_score}%;"></div>
                    </div>
                </div>

                <div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--text-secondary);">
                        <span>Budget Compatibility</span>
                        <span>${dest.budget_match_score}%</span>
                    </div>
                    <div style="background: #1e2d4a; height: 6px; border-radius: 3px; overflow: hidden; margin-top: 0.2rem;">
                        <div style="background: var(--emerald-success); height: 100%; width: ${dest.budget_match_score}%;"></div>
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}
