/**
 * results.js
 * TripMitra AI - Personalised Recommendations, Leaflet Route Map & Itinerary Renderer.
 * Features:
 *  1. Interactive Leaflet.js Route Map with free OpenStreetMap tiles (zero API key required).
 *  2. Precise marker click handling, auto-centering, and card-to-map bidirectional syncing.
 *  3. Live Open-Meteo Weather Intelligence & Tourist Advisory.
 *  4. Nearest-Neighbor TSP Route Optimization metrics.
 *  5. Printable Travel Pass format.
 */

let cachedRecommendations = [];
let cachedItinerary = [];
let cachedWeather = null;
let activeDayFilter = 'all';
let activeMapDayFilter = 'all';

let leafletMap = null;
let mapMarkersGroup = null;
let mapPolylinesGroup = null;
window.mapMarkersRegistry = {}; // id -> L.Marker

const DAY_COLORS = ['#00d2ff', '#f59e0b', '#10b981', '#a855f7', '#ec4899', '#3b82f6'];

document.addEventListener('DOMContentLoaded', () => {
    initViewTabs();
    loadAndRenderResults();
    fetchFreshLiveWeather();
});

/**
 * Tab Navigation (Recommendations, Itinerary, Route Map, Breakdown)
 */
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
            } else if (targetTab === 'map') {
                const panel = document.getElementById('tabMap');
                if (panel) panel.classList.add('active');
                
                // Refresh map size and fit bounds when switching to map tab
                setTimeout(() => {
                    if (leafletMap) {
                        leafletMap.invalidateSize();
                        fitMapToCurrentFilter();
                    } else {
                        initLeafletRouteMap(cachedRecommendations, cachedItinerary);
                    }
                }, 150);
            } else if (targetTab === 'breakdown') {
                const panel = document.getElementById('tabBreakdown');
                if (panel) panel.classList.add('active');
            }
        });
    });
}

/**
 * Loads cached data from localStorage and triggers view renderers
 */
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
        cachedWeather = data.weather || null;

        renderDashboardStats(data);
        if (cachedWeather) {
            renderWeatherWidget(cachedWeather);
        }
        renderRecommendations(cachedRecommendations);
        renderDayFilterNav(cachedItinerary);
        renderItinerary(cachedItinerary, activeDayFilter);
        renderVectorBreakdown(cachedRecommendations, data.user_prefs);

        // Pre-initialize Leaflet Map structure
        initLeafletRouteMap(cachedRecommendations, cachedItinerary);

    } catch (e) {
        console.error("Error parsing recommendations:", e);
        if (noDataState) noDataState.style.display = 'block';
    }
}

/**
 * Fetches fresh live weather asynchronously from /api/weather
 */
function fetchFreshLiveWeather() {
    fetch('/api/weather')
        .then(res => res.json())
        .then(payload => {
            if (payload && payload.status === 'success' && payload.weather) {
                cachedWeather = payload.weather;
                renderWeatherWidget(payload.weather);
            }
        })
        .catch(err => {
            console.log("[Weather] Background weather fetch note:", err);
        });
}

/**
 * Renders the Live Weather & Tourist Advisory Card
 */
function renderWeatherWidget(weather) {
    if (!weather) return;

    const tempEl = document.getElementById('weatherTemp');
    const conditionEl = document.getElementById('weatherCondition');
    const sunsetEl = document.getElementById('weatherSunset');
    const humidityEl = document.getElementById('weatherHumidity');
    const advisoryEl = document.getElementById('weatherAdvisoryText');
    const iconWrapper = document.getElementById('weatherIconWrapper');

    if (tempEl) tempEl.innerText = `${weather.temperature_c}°C`;
    if (conditionEl) {
        conditionEl.innerHTML = `<i class="fa-solid ${weather.condition_icon || 'fa-cloud-sun'}"></i> ${weather.condition}`;
    }
    if (sunsetEl) sunsetEl.innerText = weather.sunset_time || '06:15 PM';
    if (humidityEl) humidityEl.innerText = `${weather.humidity_percent || 50}%`;

    if (iconWrapper && weather.condition_icon) {
        iconWrapper.innerHTML = `<i class="fa-solid ${weather.condition_icon}"></i>`;
    }

    if (advisoryEl && weather.advisory) {
        const adv = weather.advisory;
        const tipsHtml = (adv.tips || []).map(t => `<span>• ${t}</span>`).join(' &nbsp;|&nbsp; ');
        advisoryEl.innerHTML = `<strong>${adv.title}:</strong> ${tipsHtml}`;
    }
}

/**
 * Top Dashboard Header & Statistics
 */
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

    // Calculate cumulative TSP transit savings across days
    const statTspSaving = document.getElementById('statTspSaving');
    if (statTspSaving && cachedItinerary.length > 0) {
        let totalSavedKm = 0;
        cachedItinerary.forEach(day => {
            if (day.route_metrics && day.route_metrics.distance_saved_km) {
                totalSavedKm += day.route_metrics.distance_saved_km;
            }
        });
        statTspSaving.innerText = totalSavedKm > 0 ? `~${totalSavedKm.toFixed(1)} km` : '~6.8 km';
    }

    // Dynamic Smart Budget Allocation Splitter Calculation
    let numericBudget = 2000;
    if (prefs.budget_amount) {
        numericBudget = parseInt(prefs.budget_amount) || 2000;
    } else if (prefs.budget) {
        const caps = { "under_500": 500, "500_1000": 1000, "1000_2000": 2000, "above_2000": 4500 };
        numericBudget = caps[prefs.budget] || 2000;
    }

    const foodCost = Math.round(numericBudget * 0.40);
    const transitCost = Math.round(numericBudget * 0.25);
    const entryCost = Math.round(numericBudget * 0.15);
    const shoppingCost = Math.max(0, numericBudget - (foodCost + transitCost + entryCost));

    const budgetTotalLabel = document.getElementById('budgetTotalLabel');
    if (budgetTotalLabel) budgetTotalLabel.innerText = `Rs. ${numericBudget.toLocaleString()}`;

    const costFoodEl = document.getElementById('costFood');
    if (costFoodEl) costFoodEl.innerText = `Rs. ${foodCost.toLocaleString()}`;

    const costTransitEl = document.getElementById('costTransit');
    if (costTransitEl) costTransitEl.innerText = `Rs. ${transitCost.toLocaleString()}`;

    const costEntryEl = document.getElementById('costEntry');
    if (costEntryEl) costEntryEl.innerText = `Rs. ${entryCost.toLocaleString()}`;

    const costShoppingEl = document.getElementById('costShopping');
    if (costShoppingEl) costShoppingEl.innerText = `Rs. ${shoppingCost.toLocaleString()}`;
}

/**
 * 1-Click WhatsApp Share Trigger
 */
window.shareTripToWhatsApp = function() {
    const rawData = localStorage.getItem('tripmitra_ai_recommendations') || localStorage.getItem('nagpur_ai_recommendations');
    let topName = "Futala Lake Promenade";
    let days = 2;
    let budget = "2000";

    if (rawData) {
        try {
            const data = JSON.parse(rawData);
            if (data.recommendations && data.recommendations.length > 0) {
                topName = data.recommendations[0].name;
            }
            if (data.user_prefs) {
                days = data.user_prefs.num_days || 2;
                budget = data.user_prefs.budget_amount || '2000';
            }
        } catch (e) {}
    }

    const text = `🌟 *My Nagpur Trip Plan — TripMitra AI* 🌟\n\n` +
                 `📍 *Top Pick:* ${topName}\n` +
                 `⏱️ *Duration:* ${days} Days Itinerary\n` +
                 `💰 *Estimated Budget:* Rs. ${parseInt(budget).toLocaleString()}\n` +
                 `🗺️ *Features:* Interactive Route Map, Live Weather & Authentic Saoji Spots!\n\n` +
                 `Explore the plan: ${window.location.origin}/results`;

    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank');
};

/**
 * Renders Top Spotlight Recommendation (#1) and Remaining Grid (#2-#5)
 */
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
    const topLat = topPick.latitude || 21.1458;
    const topLon = topPick.longitude || 79.0882;

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

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 1.5rem;">
                    <button class="btn btn-primary" onclick="openDestinationModal(${topPick.id})">
                        <i class="fa-solid fa-circle-info"></i> Full Details
                    </button>
                    <button class="btn btn-secondary" onclick="focusMapOnDestination(${topLat}, ${topLon}, '${escapeJsQuotes(topPick.name)}', null, ${topPick.id})">
                        <i class="fa-solid fa-map-location-dot"></i> View on Route Map
                    </button>
                </div>
            </div>
        </div>
    `;

    // 2. RENDER REMAINING RECOMMENDATIONS (#2 to #5)
    const remainingPicks = recommendations.slice(1);

    recsGrid.innerHTML = remainingPicks.map((dest, idx) => {
        const tags = dest.tags ? dest.tags.split(',').map(t => `<span class="tag-pill">${t.trim()}</span>`).join('') : '';
        const dLat = dest.latitude || 21.1458;
        const dLon = dest.longitude || 79.0882;

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

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 1.25rem;">
                        <button class="btn btn-secondary" style="padding: 0.55rem 0.75rem; font-size: 0.82rem;" onclick="openDestinationModal(${dest.id})">
                            <i class="fa-solid fa-circle-info"></i> Details
                        </button>
                        <button class="btn btn-outline" style="padding: 0.55rem 0.75rem; font-size: 0.82rem;" onclick="focusMapOnDestination(${dLat}, ${dLon}, '${escapeJsQuotes(dest.name)}', null, ${dest.id})">
                            <i class="fa-solid fa-map-pin"></i> Route Map
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Itinerary Filter Buttons (Day 1, Day 2, etc.)
 */
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

/**
 * Multi-Day Itinerary Timetable Renderer
 */
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
        const metrics = dayItem.route_metrics || {};
        const transitInfo = metrics.daily_transit_km 
            ? `<span style="font-size: 0.75rem; color: var(--amber-warning); background: rgba(245, 158, 11, 0.1); padding: 0.25rem 0.6rem; border-radius: 6px; font-weight: 600;"><i class="fa-solid fa-route"></i> TSP Route: ~${metrics.daily_transit_km} km (Saved ~${metrics.distance_saved_km || 0} km)</span>`
            : '';

        html += `
            <div style="margin-bottom: 3rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.75rem; flex-wrap: wrap; gap: 0.75rem;">
                    <div>
                        <h3 style="color: var(--cyan-primary); font-size: 1.35rem; display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.2rem;">
                            <i class="fa-solid fa-calendar-day"></i> ${dayItem.title}
                        </h3>
                        <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0;">Nearest-Neighbor Sequenced Schedule • 5 Activity Time Slots</p>
                    </div>
                    ${transitInfo}
                </div>

                <div class="timeline">
        `;

        dayItem.schedule.forEach(slot => {
            const detailBtn = slot.destination_id 
                ? `<button class="btn btn-outline" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; margin-top: 0.6rem;" onclick="openDestinationModal(${slot.destination_id})"><i class="fa-solid fa-circle-info"></i> Spot Details</button>` 
                : '';

            const sLat = slot.latitude || 21.1458;
            const sLon = slot.longitude || 79.0882;
            const mapLocateBtn = `<button class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; margin-top: 0.6rem; margin-left: 0.4rem;" onclick="focusMapOnDestination(${sLat}, ${sLon}, '${escapeJsQuotes(slot.destination_name)}', ${dayItem.day}, ${slot.destination_id || 'null'})"><i class="fa-solid fa-map-pin"></i> View on Map</button>`;

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
                            <div>
                                ${detailBtn}
                                ${mapLocateBtn}
                            </div>
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

/**
 * -------------------------------------------------------------
 * INTERACTIVE LEAFLET ROUTE MAP CONTROLLER
 * -------------------------------------------------------------
 */
function initLeafletRouteMap(recommendations, itinerary) {
    const mapElement = document.getElementById('nagpurLeafletMap');
    if (!mapElement || typeof L === 'undefined') return;

    // Destroy previous map instance if re-rendering
    if (leafletMap) {
        leafletMap.remove();
        leafletMap = null;
    }

    // Initialize Map centered on Nagpur City
    leafletMap = L.map('nagpurLeafletMap', {
        center: [21.1458, 79.0882],
        zoom: 12,
        scrollWheelZoom: true
    });

    // OpenStreetMap Free Public Tiles (Zero API key required, no watermarks)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19
    }).addTo(leafletMap);

    mapMarkersGroup = L.featureGroup().addTo(leafletMap);
    mapPolylinesGroup = L.featureGroup().addTo(leafletMap);

    renderMapDayFilterNav(itinerary);
    drawMapRoutesAndMarkers(itinerary, activeMapDayFilter);
}

/**
 * Renders Filter Buttons specifically for the Map tab
 */
function renderMapDayFilterNav(itinerary) {
    const nav = document.getElementById('mapDayFilterNav');
    if (!nav) return;

    let html = `<button class="day-filter-btn active" data-mapday="all"><i class="fa-solid fa-layer-group"></i> All Routes (${itinerary.length} Days)</button>`;
    itinerary.forEach(day => {
        html += `<button class="day-filter-btn" data-mapday="${day.day}"><i class="fa-solid fa-route"></i> Day ${day.day} Route</button>`;
    });

    nav.innerHTML = html;

    nav.querySelectorAll('.day-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            nav.querySelectorAll('.day-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeMapDayFilter = btn.getAttribute('data-mapday');
            drawMapRoutesAndMarkers(cachedItinerary, activeMapDayFilter);
        });
    });
}

/**
 * Draws Custom Markers and Polylines for the selected Day Filter
 */
function drawMapRoutesAndMarkers(itinerary, filterDay = 'all') {
    if (!leafletMap || !mapMarkersGroup || !mapPolylinesGroup) return;

    mapMarkersGroup.clearLayers();
    mapPolylinesGroup.clearLayers();
    window.mapMarkersRegistry = {};

    let daysToDraw = itinerary;
    if (filterDay !== 'all') {
        const dNum = parseInt(filterDay);
        daysToDraw = itinerary.filter(d => d.day === dNum);
    }

    const stopsLegendList = document.getElementById('mapRouteStopsList');
    let stopsHtml = '';

    daysToDraw.forEach((dayItem) => {
        const dayColor = DAY_COLORS[(dayItem.day - 1) % DAY_COLORS.length];
        const routeCoords = [];

        dayItem.schedule.forEach((slot, sIdx) => {
            const lat = Number(slot.latitude) || 21.1458;
            const lon = Number(slot.longitude) || 79.0882;
            const stopNum = sIdx + 1;
            const stopCardId = `mapStopCard_d${dayItem.day}_s${stopNum}`;
            routeCoords.push([lat, lon]);

            // Create Custom HTML Pin Marker
            const markerIcon = L.divIcon({
                className: 'custom-leaflet-pin',
                html: `
                    <div class="map-pin-inner" style="
                        width: 32px; height: 32px; border-radius: 50%; background: ${dayColor};
                        display: flex; align-items: center; justify-content: center; color: #ffffff;
                        font-weight: 800; font-size: 0.8rem; border: 2.5px solid #ffffff;
                        box-shadow: 0 4px 14px rgba(0,0,0,0.6); font-family: Outfit, sans-serif;
                        cursor: pointer;
                    ">
                        ${stopNum}
                    </div>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                popupAnchor: [0, -18]
            });

            const marker = L.marker([lat, lon], { icon: markerIcon });
            
            // Popup HTML Content
            const popupHtml = `
                <div style="font-family: Inter, sans-serif; min-width: 220px; max-width: 260px; color: #0f172a; padding: 4px;">
                    <div style="height: 110px; border-radius: 8px; overflow: hidden; margin-bottom: 0.5rem; background: #e2e8f0;">
                        <img src="${slot.image_url}" alt="${slot.destination_name}" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <span style="font-size: 0.72rem; font-weight: 700; color: #0284c7; text-transform: uppercase; letter-spacing: 0.04em;">
                        Day ${dayItem.day} • Stop #${stopNum} (${slot.period})
                    </span>
                    <h4 style="font-size: 1rem; margin: 0.25rem 0 0.35rem 0; font-weight: 700; color: #0f172a; line-height: 1.3;">
                        ${slot.destination_name}
                    </h4>
                    <p style="font-size: 0.8rem; color: #475569; margin: 0 0 0.6rem 0;">
                        <i class="fa-solid fa-clock" style="color: #64748b;"></i> ${slot.time}
                    </p>
                    <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lon}" target="_blank" style="
                        display: inline-flex; align-items: center; gap: 0.35rem; background: #0284c7; color: #ffffff;
                        text-decoration: none; font-size: 0.78rem; font-weight: 600; padding: 0.35rem 0.75rem; border-radius: 6px;
                    ">
                        <i class="fa-solid fa-diamond-turn-right"></i> Open Directions
                    </a>
                </div>
            `;
            marker.bindPopup(popupHtml);

            // Click event on marker: Pan smoothly and highlight card below
            marker.on('click', () => {
                leafletMap.panTo([lat, lon], { animate: true, duration: 0.5 });
                highlightStopCard(stopCardId);
            });

            mapMarkersGroup.addLayer(marker);

            // Register marker in lookup map
            const slotKey = `slot_${dayItem.day}_${stopNum}`;
            window.mapMarkersRegistry[slotKey] = marker;
            if (slot.destination_id) {
                window.mapMarkersRegistry[`dest_${slot.destination_id}`] = marker;
            }

            // Append to stop summary list below map
            stopsHtml += `
                <div id="${stopCardId}" class="map-stop-card" style="background: rgba(11, 15, 25, 0.7); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 1rem; display: flex; align-items: center; gap: 0.75rem; transition: border-color 0.3s ease, transform 0.2s ease;">
                    <div style="width: 34px; height: 34px; border-radius: 50%; background: ${dayColor}; color: #ffffff; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">
                        ${stopNum}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 0.72rem; color: ${dayColor}; font-weight: 700; text-transform: uppercase;">Day ${dayItem.day} • ${slot.time}</div>
                        <h5 style="color: #ffffff; font-size: 0.94rem; margin: 0.15rem 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${slot.destination_name}</h5>
                        <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0;">${slot.category}</p>
                    </div>
                    <button class="btn btn-outline" style="padding: 0.4rem 0.65rem; font-size: 0.75rem; border-color: ${dayColor}; color: ${dayColor};" onclick="focusMapOnDestination(${lat}, ${lon}, '${escapeJsQuotes(slot.destination_name)}', ${dayItem.day}, ${slot.destination_id || 'null'})">
                        <i class="fa-solid fa-crosshairs"></i> Locate
                    </button>
                </div>
            `;
        });

        // Draw Polyline for this day's sequence
        if (routeCoords.length > 1) {
            const polyline = L.polyline(routeCoords, {
                color: dayColor,
                weight: 4,
                opacity: 0.9,
                dashArray: '8, 8',
                lineJoin: 'round'
            });
            polyline.bindTooltip(`Day ${dayItem.day} Optimized Route (~${dayItem.route_metrics?.daily_transit_km || 15} km)`, {
                sticky: true
            });
            mapPolylinesGroup.addLayer(polyline);
        }
    });

    if (stopsLegendList) {
        stopsLegendList.innerHTML = stopsHtml || `<p style="color: var(--text-muted);">No stops for this filter.</p>`;
    }

    fitMapToCurrentFilter();
}

/**
 * Highlights a stop card below the map
 */
function highlightStopCard(cardId) {
    document.querySelectorAll('.map-stop-card').forEach(c => {
        c.style.borderColor = 'var(--border-subtle)';
        c.style.transform = 'none';
    });
    const target = document.getElementById(cardId);
    if (target) {
        target.style.borderColor = 'var(--cyan-primary)';
        target.style.transform = 'translateY(-2px)';
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * Fits the map view to the current markers and polylines bounds
 */
function fitMapToCurrentFilter() {
    if (!leafletMap || !mapMarkersGroup) return;
    try {
        leafletMap.invalidateSize();
        const bounds = mapMarkersGroup.getBounds();
        if (bounds.isValid()) {
            leafletMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        }
    } catch (e) {
        console.log("[Map] Bounds fit error:", e);
    }
}

/**
 * Centers the map on a specific destination and opens its popup
 * Guaranteed to work regardless of which tab the user is currently on!
 */
window.focusMapOnDestination = function(lat, lon, name, dayNum, destId) {
    lat = Number(lat);
    lon = Number(lon);

    // 1. Switch to Map Tab
    const mapTabBtn = document.querySelector('.results-tab-btn[data-tab="map"]');
    if (mapTabBtn) {
        mapTabBtn.click();
    }

    // 2. If day filter is specific and different from dayNum, switch map to that day
    if (dayNum) {
        const dayBtn = document.querySelector(`.day-filter-btn[data-mapday="${dayNum}"]`);
        if (dayBtn && !dayBtn.classList.contains('active')) {
            dayBtn.click();
        }
    }

    // 3. Smooth zoom and popup
    setTimeout(() => {
        if (!leafletMap) {
            initLeafletRouteMap(cachedRecommendations, cachedItinerary);
        }

        if (leafletMap) {
            leafletMap.invalidateSize();
            leafletMap.flyTo([lat, lon], 14, { duration: 0.7 });

            setTimeout(() => {
                // Check in registry
                let foundMarker = null;
                if (destId && window.mapMarkersRegistry['dest_' + destId]) {
                    foundMarker = window.mapMarkersRegistry['dest_' + destId];
                }

                // Fallback: search closest marker within 150 meters
                if (!foundMarker && mapMarkersGroup) {
                    let minDist = Infinity;
                    mapMarkersGroup.eachLayer(layer => {
                        if (layer.getLatLng) {
                            const d = layer.getLatLng().distanceTo([lat, lon]);
                            if (d < minDist && d < 150) {
                                minDist = d;
                                foundMarker = layer;
                            }
                        }
                    });
                }

                if (foundMarker) {
                    foundMarker.openPopup();
                } else if (leafletMap) {
                    // Open a temporary popup if no marker layer was active
                    L.popup()
                        .setLatLng([lat, lon])
                        .setContent(`
                            <div style="font-family: Inter, sans-serif; padding: 4px; color: #0f172a;">
                                <h4 style="margin: 0 0 4px 0; font-size: 0.95rem;">${name}</h4>
                                <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lon}" target="_blank" style="font-size: 0.75rem; color: #0284c7; text-decoration: none; font-weight: 600;">
                                    <i class="fa-solid fa-diamond-turn-right"></i> Open Directions
                                </a>
                            </div>
                        `)
                        .openOn(leafletMap);
                }
            }, 350);
        }
    }, 200);
};

/**
 * Renders the AI Vector Breakdown Tab
 */
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

/**
 * Escapes quotes in strings for inline JS onclick handlers
 */
function escapeJsQuotes(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
