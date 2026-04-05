let appState = JSON.parse(localStorage.getItem('habitsync_state')) || {
    user: null,
    onboarded: false,
    score: 0,
    totalPoints: 340,
    streak: 12,
    tasks: null
};
if (!appState.tasks) {
    appState.tasks = [
        { id: 't1', title: 'Morning meditation', cat: 'habit', status: 'pending', recur: 'daily' },
        { id: 't2', title: '30-min deep work block', cat: 'focus', status: 'pending', recur: '' },
        { id: 't3', title: 'Review weekly goals', cat: 'focus', status: 'pending', recur: '' },
        { id: 't4', title: 'Evening walk — 20 min', cat: 'health', status: 'pending', recur: 'daily' }
    ];
}

var totalPoints = appState.totalPoints;
var obAnswers = {};
var currentObStep = 1;

function saveState() {
    // Sync points and streak
    appState.totalPoints = totalPoints;
    localStorage.setItem('habitsync_state', JSON.stringify(appState));
}

function initAppFlow() {
    if (!appState.user) {
        document.getElementById('auth-screen').classList.add('active');
        document.getElementById('onboarding-screen').classList.remove('active');
        document.getElementById('main-app').style.display = 'none';
    } else if (!appState.onboarded) {
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('onboarding-screen').classList.add('active');
        document.getElementById('main-app').style.display = 'none';
        var titleElem = document.getElementById('ob-title');
        if (titleElem) titleElem.textContent = 'Hi ' + appState.user.trim().split(' ')[0] + '!';
    } else {
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('onboarding-screen').classList.remove('active');
        document.getElementById('main-app').style.display = 'flex';
        // restore data to ui
        var uName = appState.user.trim().split(' ')[0];
        document.querySelectorAll('.user-name').forEach(e => e.textContent = appState.user);
        document.querySelectorAll('.page-title').forEach(e => {
            if (e.textContent.includes('Good morning')) {
                e.textContent = 'Good morning, ' + uName;
            }
        });
        document.getElementById('sidebar-pts').textContent = appState.totalPoints + ' pts';
        if (document.getElementById('m-pts')) document.getElementById('m-pts').textContent = appState.totalPoints;
        if (document.getElementById('prof-pts')) document.getElementById('prof-pts').textContent = appState.totalPoints;
        
        var initals = appState.user.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
        document.querySelectorAll('.topbar-avatar, .avatar-sm, .big-avatar').forEach(e => e.textContent = initals);
        renderTasks();
    }
}

function handleAuth() {
    var name = document.getElementById('auth-name').value.trim();
    if(!name) return;
    appState.user = name;
    saveState();
    initAppFlow();
}

function selectObOpt(step, val) {
    obAnswers[step] = val;
    var stepEl = document.getElementById('ob-step-' + step);
    if (!stepEl) return;
    stepEl.querySelectorAll('.ob-opt').forEach(btn => btn.classList.remove('selected'));
    event.target.classList.add('selected');
    document.getElementById('ob-next').disabled = false;
}

function nextObStep() {
    if(currentObStep === 3) {
        // calculate mental health score (out of 100) based on answers 1-5
        var sum = (obAnswers[1]||3) + (obAnswers[2]||3) + (obAnswers[3]||3);
        appState.score = Math.round((sum / 15) * 100);
        document.getElementById('ob-score-display').textContent = appState.score;
        saveState();
    }
    
    document.getElementById('ob-step-' + currentObStep).classList.remove('active');
    currentObStep++;
    var nextEl = document.getElementById('ob-step-' + currentObStep);
    if (nextEl) nextEl.classList.add('active');
    
    document.getElementById('ob-progress-fill').style.width = (currentObStep * 25) + '%';
    
    if(currentObStep > 1) document.getElementById('ob-prev').style.visibility = 'visible';
    
    if(currentObStep === 4) {
        document.getElementById('ob-nav').style.display = 'none';
        document.getElementById('ob-sub').textContent = 'Assessment complete.';
    } else {
        document.getElementById('ob-next').disabled = !obAnswers[currentObStep];
    }
}

function prevObStep() {
    document.getElementById('ob-step-' + currentObStep).classList.remove('active');
    currentObStep--;
    document.getElementById('ob-step-' + currentObStep).classList.add('active');
    
    document.getElementById('ob-progress-fill').style.width = (currentObStep * 25) + '%';
    document.getElementById('ob-next').disabled = !obAnswers[currentObStep];
    
    if(currentObStep === 1) document.getElementById('ob-prev').style.visibility = 'hidden';
}

function finishOnboarding() {
    appState.onboarded = true;
    saveState();
    initAppFlow();
}

window.addEventListener('DOMContentLoaded', initAppFlow);

// ── NAV ──
document.querySelectorAll('.nav-link').forEach(function (btn) {
    btn.addEventListener('click', function () {
        var page = this.dataset.page;
        document.querySelectorAll('.nav-link').forEach(function (b) { b.classList.remove('active'); });
        document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
        this.classList.add('active');
        document.getElementById('page-' + page).classList.add('active');
    });
});

// ── POINTS ──
function addPts(n, el) {
    totalPoints += n;
    document.getElementById('sidebar-pts').textContent = totalPoints + ' pts';
    document.getElementById('m-pts').textContent = totalPoints;
    if (document.getElementById('prof-pts')) document.getElementById('prof-pts').textContent = totalPoints;
    if (el) showPop(el, n > 0 ? '+' + n : n);
}

function showPop(el, text) {
    var r = el.getBoundingClientRect();
    var p = document.createElement('div');
    p.className = 'pts-pop ' + (text.toString().startsWith('+') || parseInt(text) > 0 ? 'pos' : 'neg');
    p.textContent = text;
    p.style.left = (r.left + r.width / 2 - 12) + 'px';
    p.style.top = (r.top - 10) + 'px';
    document.body.appendChild(p);
    setTimeout(function () { p.remove(); }, 800);
}

// ── TASKS LOGIC ──
function getCatClass(cat) { return cat === 'habit' ? 'cat-habit' : (cat === 'focus' ? 'cat-focus' : 'cat-health'); }

function renderTasks() {
    var dashContainer = document.getElementById('dash-tasks');
    var fullContainer = document.getElementById('full-tasks-list');
    if (!dashContainer || !fullContainer) return;
    
    dashContainer.innerHTML = '';
    fullContainer.innerHTML = '';
    
    // Dash tasks (first 4 pending)
    var pendingTasks = appState.tasks.filter(t => t.status === 'pending');
    pendingTasks.slice(0, 4).forEach(t => {
        dashContainer.innerHTML += `
            <div class="task-item" id="d-${t.id}">
                <div class="check-btn" onclick="actTask('${t.id}', 'done', this)"></div>
                <span class="task-label">${t.title}</span>
                <span class="task-cat ${getCatClass(t.cat)}">${t.cat}</span>
            </div>
        `;
    });
    // Add completed tasks to dash
    var doneTasks = appState.tasks.filter(t => t.status === 'done');
    doneTasks.slice(0, 4 - pendingTasks.length).forEach(t => {
        dashContainer.innerHTML += `
            <div class="task-item" id="d-${t.id}">
                <div class="check-btn done"><svg viewBox="0 0 10 10" stroke-width="2.5" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round"><polyline points="1.5,5 4,7.5 8.5,2.5"/></svg></div>
                <span class="task-label done">${t.title}</span>
                <span class="task-cat ${getCatClass(t.cat)}">${t.cat}</span>
            </div>
        `;
    });
    
    // Group tasks for full list
    ['habit', 'focus', 'health'].forEach(cat => {
        var groupTasks = appState.tasks.filter(t => t.cat === cat);
        if (groupTasks.length === 0) return;
        var groupHtml = `<div class="tasks-group"><div class="group-heading">${cat}</div>`;
        groupTasks.forEach(t => {
            var isDone = t.status === 'done';
            var isSkip = t.status === 'skipped';
            var stateClass = isDone || isSkip ? 'faded' : '';
            if (isSkip) stateClass += ' skipped';
            
            groupHtml += `
                <div class="task-row ${stateClass}" id="tr-${t.id}">
                    <div class="check-btn ${isDone?'done':''}" ${!isDone && !isSkip ? `onclick="actTask('${t.id}', 'done', this)"` : ''}>${isDone ? '<svg viewBox="0 0 10 10" stroke-width="2.5" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round"><polyline points="1.5,5 4,7.5 8.5,2.5"/></svg>' : ''}</div>
                    <div style="flex:1">
                        <div style="font-size:13px; ${isDone ? 'text-decoration:line-through;color:var(--text3)' : (isSkip ? 'color:var(--text3)' : '')}">${t.title}</div>
                    </div>
                    ${t.recur ? `<div class="recurring-tag">↻ ${t.recur}</div>` : ''}
                    ${isDone ? '<div style="font-size:11px;color:var(--green);font-family:var(--mono);margin-left:8px">+10 pts</div>' : (!isSkip ? `<button class="skip-btn" onclick="actTask('${t.id}', 'skip', this)">Skip</button>` : '<div style="font-size:11px;color:var(--red-text);margin-left:8px">-5 pts</div>')}
                </div>
            `;
        });
        groupHtml += `</div>`;
        fullContainer.innerHTML += groupHtml;
    });
}

function actTask(id, act, el) {
    var pts = act === 'done' ? 10 : -5;
    var task = appState.tasks.find(t => t.id === id);
    if (!task || task.status !== 'pending') return;
    
    task.status = act === 'done' ? 'done' : 'skipped';
    saveState();
    
    addPts(pts, el);
    renderTasks();
}

// ── ADD TASK ──
function openAddTask() { document.getElementById('addtask-modal').classList.add('open'); }
function closeAddTask() { document.getElementById('addtask-modal').classList.remove('open'); }
function addTask() {
    var title = document.getElementById('new-task-title').value.trim();
    if (!title) return;
    var cat = document.getElementById('new-task-cat').value;
    var recur = document.getElementById('new-task-recur').value;
    
    appState.tasks.unshift({
        id: 't-' + Date.now(),
        title: title,
        cat: cat,
        status: 'pending',
        recur: recur === 'FREQ=DAILY' ? 'daily' : (recur === 'FREQ=WEEKLY' ? 'weekly' : '')
    });
    saveState();
    
    document.getElementById('new-task-title').value = '';
    closeAddTask();
    renderTasks();
}

// ── CHECK-IN ──
function openCheckin() { document.getElementById('checkin-modal').classList.add('open'); }
function closeCheckin() { document.getElementById('checkin-modal').classList.remove('open'); }
function submitCheckin() {
    var banner = document.getElementById('checkin-banner');
    banner.style.background = 'var(--green-light)';
    banner.style.borderColor = 'var(--green-mid)';
    
    appState.streak += 1;
    saveState();
    banner.innerHTML = '<div><div style="font-size:13px;font-weight:500;color:var(--green-text)">Check-in complete!</div><div style="font-size:12px;color:var(--green-text);opacity:0.7;margin-top:2px">Streak extended to ' + (appState.streak) + ' days</div></div><div style="font-size:13px;font-weight:500;font-family:var(--mono);color:var(--green)">+5 pts</div>';
    
    addPts(5, banner);
    var streak = document.getElementById('m-streak');
    streak.innerHTML = appState.streak + ' <span>days</span>';
    if (document.getElementById('prof-streak')) document.getElementById('prof-streak').textContent = appState.streak;
    closeCheckin();
}


// ── COACH ──
var aiAnswers = [
    "Based on your data, your Thursday slump is linked to higher screen time the night before (Wed avg: 4.1h). Try a strict 9:30 PM screen cutoff on Wednesdays.",
    "Your morning meditation habit is your most consistent — 92% completion over 30 days. Try pairing it with a 5-minute journaling session to amplify the mood benefit.",
    "Your focus scores improve when you complete the deep work block before 11 AM. Protect that window rigorously — treat it like a meeting you can't cancel.",
    "Looking at your mood trend: screen time below 3 hours correlates with mood scores above 7.5. Every hour you save from screens, your mood improves by ~0.8 points.",
    "You're 7 days away from your longest streak record of 19 days. Keep your current pace and you'll hit a personal best this coming Saturday."
];
var aiIdx = 0;

function sendChat() {
    var inp = document.getElementById('chat-input');
    var msg = inp.value.trim();
    if (!msg) return;
    inp.value = '';
    var win = document.getElementById('chat-win');

    var userWrap = document.createElement('div');
    userWrap.className = 'msg-wrap user';
    userWrap.innerHTML = '<div class="bubble user">' + msg + '</div>';
    win.appendChild(userWrap);

    var aiWrap = document.createElement('div');
    aiWrap.className = 'msg-wrap';
    var bub = document.createElement('div');
    bub.className = 'bubble ai';
    bub.textContent = '';
    aiWrap.appendChild(bub);
    win.appendChild(aiWrap);
    win.scrollTop = win.scrollHeight;

    var reply = aiAnswers[aiIdx % aiAnswers.length]; aiIdx++;
    var i = 0;
    var iv = setInterval(function () {
        bub.textContent = reply.slice(0, i += 3);
        win.scrollTop = win.scrollHeight;
        if (i >= reply.length) { bub.textContent = reply; clearInterval(iv); }
    }, 18);
}

function quickChat(txt) {
    document.getElementById('chat-input').value = txt;
    sendChat();
}

// ── TOGGLE ──
var emailToggle = document.getElementById('toggle-email');
if (emailToggle) {
    emailToggle.addEventListener('change', function () {
        document.getElementById('toggle-track').style.background = this.checked ? 'var(--green)' : 'var(--border-med)';
        document.getElementById('toggle-thumb').style.transform = this.checked ? 'translateX(16px)' : 'translateX(0)';
    });
}

// ── CLOSE MODALS ON OVERLAY CLICK ──
document.querySelectorAll('.modal-overlay').forEach(function (ov) {
    ov.addEventListener('click', function (e) {
        if (e.target === ov) ov.classList.remove('open');
    });
});

// ── ANIMATED COUNTER ──
function animateCounter(el, target, duration) {
    var startTime = null;
    var suffix = el.querySelector('span') ? el.querySelector('span').outerHTML : '';
    var isFloat = target.toString().includes('.');
    function step(ts) {
        if (!startTime) startTime = ts;
        var progress = Math.min((ts - startTime) / duration, 1);
        var ease = 1 - Math.pow(1 - progress, 3);
        var val = isFloat ? (target * ease).toFixed(1) : Math.floor(target * ease);
        el.innerHTML = val + (suffix ? ' ' + suffix : '');
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// ── RE-ANIMATE PAGE ON NAV ──
document.querySelectorAll('.nav-link').forEach(function (btn) {
    btn.addEventListener('click', function () {
        var page = document.getElementById('page-' + this.dataset.page);
        if (page) {
            page.style.animation = 'none';
            requestAnimationFrame(function () {
                page.style.animation = '';
            });
            // Re-animate bar fills
            page.querySelectorAll('.bar-fill').forEach(function (b) {
                b.style.animation = 'none';
                requestAnimationFrame(function () { b.style.animation = ''; });
            });
            // Re-animate heatmap cells
            page.querySelectorAll('.hm-cell').forEach(function (c) {
                c.style.animation = 'none';
                requestAnimationFrame(function () { c.style.animation = ''; });
            });
            // Re-animate streak dots
            page.querySelectorAll('.s-dot').forEach(function (d) {
                d.style.animation = 'none';
                requestAnimationFrame(function () { d.style.animation = ''; });
            });
            // Re-animate insight cards
            page.querySelectorAll('.insight-card').forEach(function (ic) {
                ic.style.animation = 'none';
                requestAnimationFrame(function () { ic.style.animation = ''; });
            });
        }
    });
});

// ── RIPPLE ON BTN-PRIMARY ──
document.querySelectorAll('.btn-primary').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
        var r = document.createElement('span');
        var d = Math.max(btn.offsetWidth, btn.offsetHeight);
        r.style.cssText = 'position:absolute;border-radius:50%;background:rgba(255,255,255,0.35);width:' + d + 'px;height:' + d + 'px;left:' + (e.offsetX - d / 2) + 'px;top:' + (e.offsetY - d / 2) + 'px;transform:scale(0);animation:ripple 0.5s ease forwards;pointer-events:none';
        btn.appendChild(r);
        setTimeout(function () { r.remove(); }, 500);
    });
});
var rippleStyle = document.createElement('style');
rippleStyle.textContent = '@keyframes ripple{to{transform:scale(2.5);opacity:0}}';
document.head.appendChild(rippleStyle);

// ── DARK MODE TOGGLE ──
var isDark = localStorage.getItem('habitsync-theme') === 'dark';

function applyTheme() {
    document.body.classList.toggle('dark', isDark);
    var thumb = document.getElementById('theme-thumb');
    if (thumb) thumb.textContent = isDark ? '🌙' : '☀️';
}

function toggleTheme() {
    isDark = !isDark;
    localStorage.setItem('habitsync-theme', isDark ? 'dark' : 'light');
    applyTheme();
    var btn = document.getElementById('theme-toggle');
    btn.style.transform = 'scale(0.85)';
    setTimeout(function () { btn.style.transform = ''; }, 180);
}

applyTheme();

// ── MOOD CHART (Canvas) ──
var chartDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
var chartMoods = [6.8, 7.4, 8.1, 5.5, 7.0, 7.8, 7.2];
var hoveredDot = -1;

function drawChart() {
    var canvas = document.getElementById('mood-chart');
    if (!canvas) return;
    var dpr = window.devicePixelRatio || 1;
    var W = canvas.offsetWidth, H = canvas.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    var pad = { l: 8, r: 8, t: 12, b: 8 };
    var gW = W - pad.l - pad.r;
    var gH = H - pad.t - pad.b;
    var n = chartMoods.length;
    var minV = 1, maxV = 10;

    // compute pixel coords
    var pts = chartMoods.map(function (v, i) {
        return {
            x: pad.l + (i / (n - 1)) * gW,
            y: pad.t + (1 - (v - minV) / (maxV - minV)) * gH
        };
    });

    var isDarkMode = document.body.classList.contains('dark');
    var green = isDarkMode ? '#3DBA74' : '#1A7A4A';
    var greenAlpha = isDarkMode ? 'rgba(61,186,116,0.12)' : 'rgba(26,122,74,0.12)';

    // gradient fill
    var grad = ctx.createLinearGradient(0, pad.t, 0, H);
    grad.addColorStop(0, isDarkMode ? 'rgba(61,186,116,0.18)' : 'rgba(26,122,74,0.15)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) {
        var cp1x = (pts[i - 1].x + pts[i].x) / 2, cp1y = pts[i - 1].y;
        var cp2x = (pts[i - 1].x + pts[i].x) / 2, cp2y = pts[i].y;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, pts[i].x, pts[i].y);
    }
    ctx.lineTo(pts[n - 1].x, H);
    ctx.lineTo(pts[0].x, H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // line
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) {
        var cp1x = (pts[i - 1].x + pts[i].x) / 2, cp1y = pts[i - 1].y;
        var cp2x = (pts[i - 1].x + pts[i].x) / 2, cp2y = pts[i].y;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, pts[i].x, pts[i].y);
    }
    ctx.strokeStyle = green;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // dots
    pts.forEach(function (p, i) {
        var isHov = (i === hoveredDot);
        var isLast = (i === n - 1);
        ctx.beginPath();
        ctx.arc(p.x, p.y, isHov ? 7 : (isLast ? 5 : 4), 0, Math.PI * 2);
        ctx.fillStyle = isHov ? green : '#fff';
        ctx.strokeStyle = green;
        ctx.lineWidth = isHov ? 0 : 2;
        ctx.fill();
        if (!isHov) ctx.stroke();
        if (isHov) {
            ctx.shadowColor = green;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
            ctx.fillStyle = green;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    });

    return pts;
}

var chartPts = [];
function initChart() {
    var canvas = document.getElementById('mood-chart');
    if (!canvas) return;
    canvas.style.width = '100%';
    canvas.style.height = '110px';
    chartPts = drawChart() || [];

    var tip = document.getElementById('chart-tooltip');

    canvas.addEventListener('mousemove', function (e) {
        var rect = canvas.getBoundingClientRect();
        var mx = e.clientX - rect.left;
        var my = e.clientY - rect.top;
        var found = -1;
        chartPts.forEach(function (p, i) {
            var dx = mx - p.x, dy = my - p.y;
            if (Math.sqrt(dx * dx + dy * dy) < 16) found = i;
        });
        if (found !== hoveredDot) {
            hoveredDot = found;
            drawChart();
        }
        if (found >= 0) {
            canvas.style.cursor = 'pointer';
            tip.textContent = chartDays[found] + ' · Mood ' + chartMoods[found];
            tip.style.display = 'block';
            tip.style.left = chartPts[found].x + 'px';
            tip.style.top = (chartPts[found].y - 32) + 'px';
        } else {
            canvas.style.cursor = 'default';
            tip.style.display = 'none';
        }
    });

    canvas.addEventListener('mouseleave', function () {
        hoveredDot = -1;
        drawChart();
        tip.style.display = 'none';
    });

    canvas.addEventListener('click', function (e) {
        var rect = canvas.getBoundingClientRect();
        var mx = e.clientX - rect.left;
        var my = e.clientY - rect.top;
        chartPts.forEach(function (p, i) {
            var dx = mx - p.x, dy = my - p.y;
            if (Math.sqrt(dx * dx + dy * dy) < 16) openDayDetail(chartDays[i]);
        });
    });
}

window.addEventListener('load', function () {
    initChart();
    setTimeout(function () {
        animateCounter(document.getElementById('m-pts'), 340, 1000);
        animateCounter(document.getElementById('prof-pts'), 340, 1000);
    }, 300);
});
window.addEventListener('resize', function () { chartPts = drawChart() || []; });

// redraw chart on theme toggle so colors update
var _origToggle = toggleTheme;
toggleTheme = function () { _origToggle(); setTimeout(function () { chartPts = drawChart() || []; }, 50); };

// ── DAY DETAIL DATA ──
var dayData = {
    Monday: { mood: 6.8, screen: '3.1h', focus: 7.0, energy: '3/5', pts: '+25', tasks: [{ done: true, label: 'Morning meditation' }, { done: true, label: '30-min deep work' }, { done: true, label: 'Evening walk' }, { done: false, label: 'Read 20 pages' }] },
    Tuesday: { mood: 7.4, screen: '2.7h', focus: 7.5, energy: '4/5', pts: '+35', tasks: [{ done: true, label: 'Morning meditation' }, { done: true, label: '30-min deep work' }, { done: true, label: 'No social media before noon' }, { done: true, label: 'Evening walk' }] },
    Wednesday: { mood: 8.1, screen: '2.4h', focus: 8.2, energy: '4/5', pts: '+40', tasks: [{ done: true, label: 'Morning meditation' }, { done: true, label: '30-min deep work' }, { done: true, label: 'Read 20 pages' }, { done: true, label: 'Evening walk' }] },
    Thursday: { mood: 5.5, screen: '4.2h', focus: 5.0, energy: '2/5', pts: '+10', tasks: [{ done: true, label: 'Morning meditation' }, { done: false, label: '30-min deep work' }, { done: false, label: 'No social media before noon' }, { done: true, label: 'Evening walk' }] },
    Friday: { mood: 7.0, screen: '3.0h', focus: 6.8, energy: '3/5', pts: '+30', tasks: [{ done: true, label: 'Morning meditation' }, { done: true, label: '30-min deep work' }, { done: false, label: 'Read 20 pages' }, { done: true, label: 'Evening walk' }] },
    Saturday: { mood: 7.8, screen: '3.9h', focus: 6.5, energy: '4/5', pts: '+20', tasks: [{ done: true, label: 'Morning meditation' }, { done: true, label: 'Evening walk' }, { done: true, label: 'Read 20 pages' }, { done: false, label: 'Review weekly goals' }] },
    Sunday: { mood: 7.2, screen: '3.1h', focus: 6.8, energy: '3/5', pts: '+15', tasks: [{ done: true, label: 'Morning meditation' }, { done: false, label: '30-min deep work' }, { done: false, label: 'No social media before noon' }, { done: true, label: 'Evening walk' }] }
};

function openDayDetail(day) {
    var d = dayData[day];
    document.getElementById('day-modal-title').textContent = day;
    document.getElementById('day-stat-grid').innerHTML =
        '<div class="day-stat"><div class="day-stat-label">Mood</div><div class="day-stat-val">' + d.mood + '<small> / 10</small></div></div>' +
        '<div class="day-stat"><div class="day-stat-label">Screen Time</div><div class="day-stat-val">' + d.screen + '</div></div>' +
        '<div class="day-stat"><div class="day-stat-label">Focus Score</div><div class="day-stat-val">' + d.focus + '<small> / 10</small></div></div>' +
        '<div class="day-stat"><div class="day-stat-label">Energy</div><div class="day-stat-val">' + d.energy + '</div></div>';
    var tHtml = '';
    d.tasks.forEach(function (t, i) {
        tHtml += '<div class="day-task-item" style="animation-delay:' + (0.05 + i * 0.06) + 's">' +
            '<div class="day-task-dot ' + (t.done ? 'dot-done' : 'dot-skip') + '"></div>' +
            '<span style="flex:1;' + (t.done ? '' : 'color:var(--text3);text-decoration:line-through') + '">' + t.label + '</span>' +
            '<span style="font-size:11px;font-family:var(--mono);color:' + (t.done ? 'var(--green)' : 'var(--red-text)') + '">' + (t.done ? '+10' : 'skipped') + '</span></div>';
    });
    document.getElementById('day-tasks-list').innerHTML = tHtml;
    var done = d.tasks.filter(function (t) { return t.done; }).length;
    var pct = Math.round(done / d.tasks.length * 100);
    var badge = document.getElementById('day-badge');
    if (pct >= 75) { badge.className = 'day-badge badge-great'; badge.textContent = '🔥 Great day — ' + pct + '% tasks completed · ' + d.pts + ' pts earned'; }
    else if (pct >= 50) { badge.className = 'day-badge badge-ok'; badge.textContent = '👍 Decent day — ' + pct + '% tasks completed · ' + d.pts + ' pts earned'; }
    else { badge.className = 'day-badge badge-low'; badge.textContent = '😔 Tough day — ' + pct + '% tasks completed · ' + d.pts + ' pts earned'; }
    document.getElementById('day-modal-overlay').classList.add('open');
}

function closeDayDetail() {
    document.getElementById('day-modal-overlay').classList.remove('open');
}

document.getElementById('day-modal-overlay').addEventListener('click', function (e) {
    if (e.target === this) closeDayDetail();
});

// ── PROFILE ──
function editProfile() {
    var newName = prompt("Enter your new name:", appState.user);
    if (newName && newName.trim()) {
        appState.user = newName.trim();
        saveState();
        initAppFlow();
    }
}

function signOut() {
    if (confirm("Are you sure you want to sign out? This will clear your local app state.")) {
        localStorage.removeItem('habitsync_state');
        location.reload();
    }
}