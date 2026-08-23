/**
 * main.js
 * TripMitra AI - Core JavaScript Controller & Modal Manager.
 * Working Google Maps Integration, Spot Details & Nearby Food Recommendations.
 */

document.addEventListener('DOMContentLoaded', () => {
    initModals();
    initOptionCardSelections();
});

function initModals() {
    const modalOverlay = document.getElementById('detailsModal');
    const closeBtn = document.getElementById('modalCloseBtn');

    if (closeBtn && modalOverlay) {
        closeBtn.addEventListener('click', () => {
            closeDestinationModal();
        });

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeDestinationModal();
            }
        });
    }
}

function openDestinationModal(destId) {
    const modalOverlay = document.getElementById('detailsModal');
    const modalBody = document.getElementById('modalBodyContent');

    if (!modalOverlay || !modalBody) return;

    modalBody.innerHTML = `
        <div style="text-align: center; padding: 4rem 2rem;">
            <div class="spinner"></div>
            <p style="color: var(--text-secondary); font-weight: 500;">Retrieving destination intelligence & Google Maps data...</p>
        </div>
    `;
    modalOverlay.classList.add('active');

    fetch(`/api/destination/${destId}`)
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                renderModalContent(data.destination);
            } else {
                modalBody.innerHTML = `<p style="color: #ef4444;">Failed to load destination details.</p>`;
            }
        })
        .catch(err => {
            console.error(err);
            modalBody.innerHTML = `<p style="color: #ef4444;">Server connection error.</p>`;
        });
}

function closeDestinationModal() {
    const modalOverlay = document.getElementById('detailsModal');
    if (modalOverlay) {
        modalOverlay.classList.remove('active');
    }
}

function renderModalContent(dest) {
    const modalBody = document.getElementById('modalBodyContent');
    if (!modalBody) return;

    const tags = dest.tags ? dest.tags.split(',').map(t => `<span class="tag-pill">${t.trim()}</span>`).join(' ') : '';
    const lat = dest.latitude || 21.1458;
    const lng = dest.longitude || 79.0882;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    const embedUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=14&output=embed`;
    const foodId = dest.nearby_food_id || 'food-haldiram-shankar';
    const foodName = dest.nearby_food_name || "Haldiram's Shankar Nagar Food Hub";

    modalBody.innerHTML = `
        <div style="position: relative; margin: -2.25rem -2.25rem 1.75rem -2.25rem; height: 300px; overflow: hidden; border-radius: 16px 16px 0 0;">
            <img src="${dest.image_url}" alt="${dest.name}" style="width: 100%; height: 100%; object-fit: cover;">
            <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, #141e33, transparent); padding: 1.75rem;">
                <span class="card-category-badge"><i class="fa-solid fa-tag"></i> ${dest.category}</span>
                <h2 style="font-size: 2rem; margin-top: 0.5rem; color: #ffffff;">${dest.name}</h2>
            </div>
        </div>

        <p style="font-size: 1rem; color: #cbd5e1; margin-bottom: 1.75rem; line-height: 1.6;">${dest.description}</p>

        <!-- METRICS GRID -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1.25rem; background: rgba(11, 15, 25, 0.6); padding: 1.5rem; border-radius: 12px; margin-bottom: 1.75rem; border: 1px solid var(--border-subtle);">
            <div>
                <strong style="color: var(--text-muted); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 0.3rem;"><i class="fa-solid fa-wallet"></i> Estimated Budget</strong>
                <p style="font-size: 1.2rem; color: var(--cyan-primary); font-weight: 700; margin-top: 0.2rem;">Rs. ${dest.estimated_budget}</p>
            </div>
            <div>
                <strong style="color: var(--text-muted); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 0.3rem;"><i class="fa-solid fa-clock"></i> Recommended Time</strong>
                <p style="font-size: 1.2rem; color: #ffffff; font-weight: 700; margin-top: 0.2rem;">${dest.ideal_duration_hours} Hours</p>
            </div>
            <div>
                <strong style="color: var(--text-muted); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 0.3rem;"><i class="fa-solid fa-star"></i> User Rating</strong>
                <p style="font-size: 1.2rem; color: var(--amber-warning); font-weight: 700; margin-top: 0.2rem;">${dest.rating} / 5.0</p>
            </div>
            <div>
                <strong style="color: var(--text-muted); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 0.3rem;"><i class="fa-solid fa-route"></i> Center Distance</strong>
                <p style="font-size: 1.2rem; color: #ffffff; font-weight: 700; margin-top: 0.2rem;">${dest.distance_from_nagpur_center} km</p>
            </div>
        </div>

        <!-- GOOGLE MAPS EMBED & DIRECT DIRECTIONS BUTTON -->
        <div style="margin-bottom: 2rem; background: rgba(11, 15, 25, 0.8); border: 1px solid var(--cyan-primary); border-radius: 12px; overflow: hidden; padding: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                <h4 style="color: #ffffff; font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fa-solid fa-map-location-dot" style="color: var(--cyan-primary);"></i> Google Maps Location & Directions
                </h4>
                <a href="${mapsUrl}" target="_blank" class="btn btn-primary" style="padding: 0.55rem 1.25rem; font-size: 0.88rem;">
                    <i class="fa-solid fa-diamond-turn-right"></i> Open in Google Maps
                </a>
            </div>

            <!-- EMBEDDED MAP IFRAME -->
            <div style="position: relative; width: 100%; height: 220px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-subtle);">
                <iframe src="${embedUrl}" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy"></iframe>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.6rem;">Coordinates: ${lat}, ${lng} | Location: ${dest.location}</p>
        </div>

        <!-- NEARBY RECOMMENDED FOOD & RESTAURANT LINK CARD -->
        <div style="margin-bottom: 2rem; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
                <div>
                    <span style="font-size: 0.75rem; color: var(--amber-warning); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.2rem;">
                        <i class="fa-solid fa-utensils"></i> NEARBY RECOMMENDED FOOD SPOT
                    </span>
                    <h4 style="font-size: 1.15rem; color: #ffffff; margin-bottom: 0.2rem;">${foodName}</h4>
                    <p style="font-size: 0.85rem; color: var(--text-secondary);">Spicy Saoji curries, Tarri Poha & local Nagpur sweets near this spot.</p>
                </div>
                <a href="/food#${foodId}" class="btn btn-secondary" style="padding: 0.6rem 1.25rem; font-size: 0.88rem; border-color: var(--amber-warning); color: var(--amber-warning);">
                    <i class="fa-solid fa-arrow-right"></i> View Food Details & Map
                </a>
            </div>
        </div>

        <div style="margin-bottom: 1.5rem;">
            <h4 style="margin-bottom: 0.4rem; color: #ffffff; font-size: 1.1rem;"><i class="fa-solid fa-bullseye" style="color: var(--cyan-primary);"></i> Best Suited For</h4>
            <p style="color: var(--text-secondary); font-size: 0.95rem;">${dest.best_for}</p>
        </div>

        <div style="margin-bottom: 1.5rem;">
            <h4 style="margin-bottom: 0.4rem; color: #ffffff; font-size: 1.1rem;"><i class="fa-solid fa-lightbulb" style="color: var(--amber-warning);"></i> Key Historical Fact</h4>
            <p style="color: var(--text-secondary); font-size: 0.9rem; font-style: italic; background: rgba(255,255,255,0.03); padding: 0.85rem 1rem; border-radius: 8px; border-left: 3px solid var(--amber-warning);">"${dest.interesting_facts}"</p>
        </div>

        <div style="margin-bottom: 1.5rem;">
            <h4 style="margin-bottom: 0.4rem; color: #ffffff; font-size: 1.1rem;"><i class="fa-solid fa-clock" style="color: var(--cyan-primary);"></i> Opening Hours & Visiting Hours</h4>
            <p style="color: var(--text-secondary); font-size: 0.9rem;"><strong>Address:</strong> ${dest.location}</p>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.25rem;"><strong>Hours:</strong> ${dest.opening_hours}</p>
        </div>

        <div style="margin-bottom: 1.75rem;">
            <div class="tag-pills">${tags}</div>
        </div>
    `;
}

function initOptionCardSelections() {
    document.querySelectorAll('.option-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const input = card.querySelector('input');
            if (!input) return;

            if (input.type === 'radio') {
                const groupName = input.name;
                document.querySelectorAll(`input[name="${groupName}"]`).forEach(radio => {
                    const parentCard = radio.closest('.option-card');
                    if (parentCard) parentCard.classList.remove('selected');
                });
                input.checked = true;
                card.classList.add('selected');
            } else if (input.type === 'checkbox') {
                input.checked = !input.checked;
                if (input.checked) {
                    card.classList.add('selected');
                } else {
                    card.classList.remove('selected');
                }
            }
        });
    });
}
