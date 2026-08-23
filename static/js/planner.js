/**
 * planner.js
 * TripMitra AI - Progressive Travel Configurator Controller.
 * Interactive Budget Slider, Days Counter, Distance Radius Slider, 12+ Interest Chips, Live Preview Bar.
 */

let currentStep = 1;
const totalSteps = 4;

document.addEventListener('DOMContentLoaded', () => {
    const loadingState = document.getElementById('loadingState');
    const formWrapper = document.getElementById('formWrapper');
    if (loadingState) {
        loadingState.style.display = 'none';
    }
    if (formWrapper) {
        formWrapper.style.display = 'block';
    }
    initInteractiveSliders();
    initPresetPills();
    initInterestChips();
    initMultiStepPlanner();
    initDaysCounter();
    updateLiveSummaryBar();
});

/**
 * Days Counter Field Controls
 */
function initDaysCounter() {
    const daysInput = document.getElementById('numDaysInput');
    if (daysInput) {
        daysInput.addEventListener('input', () => {
            validateDaysInput();
            updateLiveSummaryBar();
        });
    }
}

function adjustDays(delta) {
    const daysInput = document.getElementById('numDaysInput');
    if (!daysInput) return;

    let val = parseInt(daysInput.value) || 2;
    val += delta;
    if (val < 1) val = 1;
    if (val > 10) val = 10;

    daysInput.value = val;
    validateDaysInput();
    updateLiveSummaryBar();
}

function validateDaysInput() {
    const daysInput = document.getElementById('numDaysInput');
    const unitLabel = document.getElementById('daysUnitLabel');
    if (!daysInput) return;

    let val = parseInt(daysInput.value);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 10) val = 10;
    daysInput.value = val;

    if (unitLabel) {
        unitLabel.innerText = `${val} ${val === 1 ? 'Day' : 'Days'}`;
    }
}

/**
 * Range Sliders (Budget & Distance) Event Handlers
 */
function initInteractiveSliders() {
    const budgetRange = document.getElementById('budgetRange');
    const budgetDisplay = document.getElementById('budgetValueDisplay');

    if (budgetRange && budgetDisplay) {
        budgetRange.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            budgetDisplay.innerText = `Rs. ${val.toLocaleString()}`;
            
            document.querySelectorAll('.preset-pill').forEach(pill => {
                const pVal = parseInt(pill.getAttribute('data-budget'));
                if (pVal === val) {
                    pill.classList.add('active');
                } else {
                    pill.classList.remove('active');
                }
            });

            updateLiveSummaryBar();
        });
    }

    const distanceRange = document.getElementById('distanceRange');
    const distanceDisplay = document.getElementById('distanceValueDisplay');
    const distanceZoneDisplay = document.getElementById('distanceZoneDisplay');

    if (distanceRange && distanceDisplay) {
        distanceRange.addEventListener('input', (e) => {
            const km = parseInt(e.target.value);
            distanceDisplay.innerText = `${km} km`;

            if (distanceZoneDisplay) {
                if (km <= 10) {
                    distanceZoneDisplay.innerHTML = `<i class="fa-solid fa-circle-info"></i> <strong>Selected Zone:</strong> Central City Core (Zero Mile, Sitabuldi Fort, Kasturchand Park, Deekshabhoomi).`;
                } else if (km <= 20) {
                    distanceZoneDisplay.innerHTML = `<i class="fa-solid fa-circle-info"></i> <strong>Selected Zone:</strong> Extended City Limits & Lakes (Futala, Ambazari, Seminary Hills, Raman Science, BAPS Temple).`;
                } else if (km <= 45) {
                    distanceZoneDisplay.innerHTML = `<i class="fa-solid fa-circle-info"></i> <strong>Selected Zone:</strong> Nagpur Suburbs & Temples (Dragon Palace Kamptee, Waki Woods, Adasa Ganesha Temple).`;
                } else {
                    distanceZoneDisplay.innerHTML = `<i class="fa-solid fa-circle-info"></i> <strong>Selected Zone:</strong> Regional Getaways & Wildlife Reserves (Pench Tiger Reserve, Khekranala Dam, Ramtek Fort, Umred Karhandla).`;
                }
            }

            updateLiveSummaryBar();
        });
    }
}

/**
 * Preset Budget Pills Click Handler
 */
function initPresetPills() {
    document.querySelectorAll('.preset-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const bVal = parseInt(pill.getAttribute('data-budget'));
            const budgetRange = document.getElementById('budgetRange');
            const budgetDisplay = document.getElementById('budgetValueDisplay');

            if (budgetRange && budgetDisplay) {
                budgetRange.value = bVal;
                budgetDisplay.innerText = `Rs. ${bVal.toLocaleString()}`;
            }

            document.querySelectorAll('.preset-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            updateLiveSummaryBar();
        });
    });
}

/**
 * Multi-Select Interest Chips Handler
 */
function initInterestChips() {
    document.querySelectorAll('.interest-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            const input = chip.querySelector('input[type="checkbox"]');
            if (!input) return;

            input.checked = !input.checked;
            if (input.checked) {
                chip.classList.add('selected');
            } else {
                chip.classList.remove('selected');
            }

            updateInterestCount();
            updateLiveSummaryBar();
        });
    });
}

function updateInterestCount() {
    const selected = document.querySelectorAll('input[name="interests"]:checked');
    const badge = document.getElementById('interestCountBadge');
    if (badge) {
        badge.innerText = `${selected.length} Selected`;
    }
}

/**
 * Live Summary Bar Updater
 */
function updateLiveSummaryBar() {
    const summaryText = document.getElementById('summaryText');
    if (!summaryText) return;

    const budgetVal = document.getElementById('budgetRange') ? document.getElementById('budgetRange').value : 1000;
    const distanceVal = document.getElementById('distanceRange') ? document.getElementById('distanceRange').value : 35;
    const selectedInterests = document.querySelectorAll('input[name="interests"]:checked');
    const daysVal = document.getElementById('numDaysInput') ? document.getElementById('numDaysInput').value : 2;

    summaryText.innerText = `Budget: Rs. ${parseInt(budgetVal).toLocaleString()} | Radius: ${distanceVal} km | ${selectedInterests.length} Interests | Duration: ${daysVal} Days`;
}

/**
 * Multi-Step Planner Form Navigation
 */
function initMultiStepPlanner() {
    const plannerForm = document.getElementById('plannerForm');
    if (!plannerForm) return;

    updateStepView();

    document.querySelectorAll('.btn-next-step').forEach(btn => {
        btn.addEventListener('click', () => {
            if (validateStep(currentStep)) {
                if (currentStep < totalSteps) {
                    currentStep++;
                    updateStepView();
                    window.scrollTo({ top: 180, behavior: 'smooth' });
                }
            }
        });
    });

    document.querySelectorAll('.btn-prev-step').forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep > 1) {
                currentStep--;
                updateStepView();
                window.scrollTo({ top: 180, behavior: 'smooth' });
            }
        });
    });

    plannerForm.addEventListener('submit', handlePlannerSubmission);
}

function updateStepView() {
    document.querySelectorAll('.planner-step-panel').forEach(panel => {
        panel.classList.remove('active');
    });

    const currentPanel = document.getElementById(`stepPanel${currentStep}`);
    if (currentPanel) currentPanel.classList.add('active');

    const progressFill = document.getElementById('progressBarFill');
    if (progressFill) {
        const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
        progressFill.style.width = `${percentage}%`;
    }

    document.querySelectorAll('.step-indicator').forEach(ind => {
        const stepNum = parseInt(ind.getAttribute('data-step'));
        ind.classList.remove('active', 'completed');
        if (stepNum === currentStep) {
            ind.classList.add('active');
        } else if (stepNum < currentStep) {
            ind.classList.add('completed');
        }
    });

    const formError = document.getElementById('formError');
    if (formError) formError.style.display = 'none';
}

function validateStep(step) {
    if (step === 1) {
        const budgetVal = document.getElementById('budgetRange') ? document.getElementById('budgetRange').value : null;
        const daysVal = document.getElementById('numDaysInput') ? document.getElementById('numDaysInput').value : null;
        if (!budgetVal || !daysVal || parseInt(daysVal) < 1) {
            showFormError("Please configure your Budget and enter a valid number of Trip Days (1 to 10).");
            return false;
        }
    } else if (step === 2) {
        const distance = document.getElementById('distanceRange') ? document.getElementById('distanceRange').value : null;
        if (!distance) {
            showFormError("Please select your Travel Radius.");
            return false;
        }
    } else if (step === 3) {
        const interests = document.querySelectorAll('input[name="interests"]:checked');
        if (interests.length === 0) {
            showFormError("Please select at least one interest category.");
            return false;
        }
    } else if (step === 4) {
        const group = document.querySelector('input[name="group_type"]:checked');
        const exp = document.querySelector('input[name="experience"]:checked');
        if (!group || !exp) {
            showFormError("Please select both your Group Type and Experience Style.");
            return false;
        }
    }
    return true;
}

function handlePlannerSubmission(e) {
    e.preventDefault();

    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) {
        return;
    }

    const budget_amount = parseInt(document.getElementById('budgetRange').value);
    const max_distance = parseInt(document.getElementById('distanceRange').value);
    const num_days = parseInt(document.getElementById('numDaysInput').value) || 2;
    const experience = document.querySelector('input[name="experience"]:checked').value;
    const group_type = document.querySelector('input[name="group_type"]:checked').value;

    const interestInputs = document.querySelectorAll('input[name="interests"]:checked');
    const selectedInterests = Array.from(interestInputs).map(cb => cb.value);

    let budgetTier = "under_500";
    if (budget_amount > 2000) budgetTier = "above_2000";
    else if (budget_amount > 1000) budgetTier = "1000_2000";
    else if (budget_amount > 500) budgetTier = "500_1000";

    const payload = {
        budget: budgetTier,
        budget_amount: budget_amount,
        max_distance: max_distance,
        duration: `${num_days}_days`,
        num_days: num_days,
        interests: selectedInterests,
        experience: experience,
        group_type: group_type,
        distance_pref: max_distance <= 15 ? "city" : (max_distance <= 60 ? "nearby" : "any")
    };

    const formWrapper = document.getElementById('formWrapper');
    const loadingState = document.getElementById('loadingState');

    if (formWrapper && loadingState) {
        formWrapper.style.display = 'none';
        loadingState.style.display = 'block';
        window.scrollTo({ top: 150, behavior: 'smooth' });
    }

    fetch('/api/recommend', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            localStorage.setItem('tripmitra_ai_recommendations', JSON.stringify(data));
            setTimeout(() => {
                window.location.href = '/results';
            }, 750);
        } else {
            if (formWrapper && loadingState) {
                formWrapper.style.display = 'block';
                loadingState.style.display = 'none';
            }
            showFormError(data.message || "Failed to generate recommendations. Please try again.");
        }
    })
    .catch(err => {
        console.error("API Error:", err);
        if (formWrapper && loadingState) {
            formWrapper.style.display = 'block';
            loadingState.style.display = 'none';
        }
        showFormError("Server connection error. Please verify Flask backend server is running.");
    });
}

function showFormError(msg) {
    const formError = document.getElementById('formError');
    if (formError) {
        formError.innerText = msg;
        formError.style.display = 'block';
        formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        alert(msg);
    }
}
