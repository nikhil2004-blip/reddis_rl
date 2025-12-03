const API_URL = '/api';
let token = localStorage.getItem('token');
let timerInterval;

const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const protectedBtn = document.getElementById('protected-btn');
const spamBtn = document.getElementById('spam-btn');
const authStatus = document.getElementById('auth-status');
const protectedResult = document.getElementById('protected-result');
const spamResult = document.getElementById('spam-result');
const protectedActions = document.getElementById('protected-actions');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const sessionTimer = document.getElementById('session-timer');
const countdownSpan = document.getElementById('countdown');

function updateUI() {
    if (token) {
        loginBtn.classList.add('hidden');
        logoutBtn.classList.remove('hidden');
        protectedActions.classList.remove('hidden');
        usernameInput.classList.add('hidden');
        passwordInput.classList.add('hidden');
        authStatus.textContent = 'Authenticated via Redis Session';
        authStatus.style.color = 'var(--success)';
        sessionTimer.classList.remove('hidden');
    } else {
        loginBtn.classList.remove('hidden');
        logoutBtn.classList.add('hidden');
        protectedActions.classList.add('hidden');
        usernameInput.classList.remove('hidden');
        passwordInput.classList.remove('hidden');
        authStatus.textContent = 'Not Logged In';
        authStatus.style.color = 'var(--text-secondary)';
        protectedResult.textContent = '';
        sessionTimer.classList.add('hidden');
        clearInterval(timerInterval);
    }
}

function startTimer(seconds) {
    clearInterval(timerInterval);
    let timeLeft = seconds;
    countdownSpan.textContent = timeLeft;

    timerInterval = setInterval(() => {
        timeLeft--;
        countdownSpan.textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            authStatus.textContent = 'Session Expired (Redis Key Deleted) - Logging out...';
            authStatus.style.color = 'var(--danger)';
            countdownSpan.textContent = '0';

            // Auto logout after 2 seconds so user sees the message
            setTimeout(() => {
                localStorage.removeItem('token');
                token = null;
                updateUI();
            }, 2000);
        }
    }, 1000);
}

loginBtn.addEventListener('click', async () => {
    const username = usernameInput.value;
    const password = passwordInput.value;

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (res.ok) {
            token = data.token;
            localStorage.setItem('token', token);
            updateUI();
            if (data.expiresIn) {
                startTimer(data.expiresIn);
            }
        } else {
            alert(data.error);
        }
    } catch (err) {
        console.error(err);
    }
});

logoutBtn.addEventListener('click', async () => {
    if (token) {
        await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        localStorage.removeItem('token');
        token = null;
        updateUI();
    }
});

protectedBtn.addEventListener('click', async () => {
    try {
        const res = await fetch(`${API_URL}/auth/protected`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (res.ok) {
            protectedResult.textContent = JSON.stringify(data, null, 2);
            protectedResult.style.color = 'var(--success)';
        } else {
            protectedResult.textContent = `Error: ${data.message}`;
            protectedResult.style.color = 'var(--danger)';
            if (res.status === 401) {
                // Token might be expired or revoked in Redis
                authStatus.textContent = 'Session Expired / Invalid';
                authStatus.style.color = 'var(--danger)';
                clearInterval(timerInterval);
            }
        }
    } catch (err) {
        protectedResult.textContent = 'Network Error';
    }
});

let rlTimerInterval;
const rlCountSpan = document.getElementById('rl-count');
const rlTimerSpan = document.getElementById('rl-timer');

function startRlTimer(seconds) {
    clearInterval(rlTimerInterval);
    let timeLeft = seconds;
    rlTimerSpan.textContent = timeLeft + 's';

    // Only run timer if there is time left
    if (timeLeft > 0) {
        rlTimerInterval = setInterval(() => {
            timeLeft--;
            rlTimerSpan.textContent = timeLeft + 's';
            if (timeLeft <= 0) {
                clearInterval(rlTimerInterval);
                rlTimerSpan.textContent = '10s (Reset)';
                rlCountSpan.textContent = '0 / 5';
            }
        }, 1000);
    }
}

spamBtn.addEventListener('click', async () => {
    const start = Date.now();
    try {
        const res = await fetch(`${API_URL}/spam`);
        const data = await res.json();
        const duration = Date.now() - start;

        // Read Headers
        const limit = res.headers.get('X-RateLimit-Limit');
        const remaining = res.headers.get('X-RateLimit-Remaining');
        const reset = res.headers.get('X-RateLimit-Reset');

        // Update Stats
        if (limit) {
            const used = limit - remaining;
            rlCountSpan.textContent = `${used} / ${limit}`;

            // Start timer if we have a reset value
            if (reset) {
                // If reset is very small (e.g. 0 or 1), it might mean it just reset or is about to.
                // The backend returns TTL in seconds.
                startRlTimer(parseInt(reset));
            }
        }

        if (res.ok) {
            spamResult.textContent = `Success (${duration}ms): ${data.message}`;
            spamResult.style.color = 'var(--success)';
        } else {
            spamResult.textContent = `BLOCKED (${duration}ms): ${data.message}`;
            spamResult.style.color = 'var(--danger)';
        }
    } catch (err) {
        console.error(err);
        spamResult.textContent = 'Error contacting server';
    }
});

// Init
updateUI();
