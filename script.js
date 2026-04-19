// ================= STATE & CONSTANTS =================
let awarenessScore = parseInt(localStorage.getItem('cybersecScore')) || 0;
let threatHistory = JSON.parse(localStorage.getItem('cybersecHistory')) || [];

const SCENARIOS = {
  BEGINNER: {
    senders: ["official-reward@yahoooo.com", "security@verify-apple.net", "it-support@globalcorp-service.com"],
    subjects: ["YOU WON A $1,000 GIFT CARD!", "Urgent: Unusual sign-in", "Mailbox Storage Full"],
    bodies: [
      "Congratulations! Your email has been selected as the winner of our weekly prize pool. Click below to claim your link before it expires tonight!",
      "A new login was detected on your account from a device in Beijing, China. If this wasn't you, please secure your account immediately.",
      "Your company email storage is 99% full. To avoid losing incoming emails, please click below to increase your storage space."
    ]
  },
  INTERMEDIATE: {
    senders: ["hr-benefits@company-internal.net", "payroll-notifications@payroll-portal.uk", "security-admin@slack-alerts.com"],
    subjects: ["Urgent: Health Benefits Deadline", "Discrepancy in June Payroll", "New Privacy Policy - Signature Required"],
    bodies: [
      "Today is the final deadline for benefits enrollment. If you don't submit the form in the next 2 hours, you will lose coverage.",
      "We noticed an error in your direct deposit for the current period. Please verify your banking details at the secure HR portal here.",
      "Due to updated regulations, all employees must sign the new Remote Work Agreement by EOD. Use the link below to access the portal."
    ]
  },
  ADVANCED: {
    senders: ["no-reply@linkdin.com", "accounts@g00gle.com", "compliance@micros0ft.com"],
    subjects: ["Someone viewed your profile", "Critical Alert: Security breach in your area", "Mandatory Security Update"],
    bodies: [
      "A recruiter from a top firm just viewed your profile. Login to see who it was and unlock your personalized career insights.",
      "Our monitoring systems detected a massive breach affecting accounts in your region. Verify your credentials now to ensure your data is safe.",
      "A critical security patch must be applied to your Office 365 account to prevent unauthorized access. Click below to start the update."
    ]
  }
};

// ================= DOM ELEMENTS =================
const scoreDisplay = document.getElementById('score-display');
const rankDisplay = document.getElementById('user-rank');
const tabs = document.querySelectorAll('.tab');
const mainViews = document.querySelectorAll('main');
const inputThreat = document.getElementById('threat-input');
const btnAnalyze = document.getElementById('btn-analyze');
const btnClear = document.getElementById('btn-clear');
const scanLoader = document.getElementById('scan-loader');
const btnText = document.querySelector('.btn-text');
const resultsContent = document.getElementById('results-content');
const resultsEmpty = document.getElementById('results-empty');
const severityBadge = document.getElementById('severity-badge');
const explanationText = document.getElementById('explanation-text');
const recommendationsList = document.getElementById('recommendations-list');
const historyContainer = document.getElementById('history-container');
const btnExport = document.getElementById('btn-export');
const reportContainer = document.getElementById('report-action-container');
const historyModal = document.getElementById('history-modal');
const btnCloseHistory = document.getElementById('btn-close-history');
const histDetailBadge = document.getElementById('hist-detail-badge');
const histDetailExplanation = document.getElementById('hist-detail-explanation');
const histDetailSignals = document.getElementById('hist-detail-signals');
const btnShareEmail = document.getElementById('btn-share-email');
const btnStartSim = document.getElementById('btn-start-sim');
const simModal = document.getElementById('sim-modal');
const btnCloseSim = document.getElementById('btn-close-sim');
const btnHint = document.getElementById('btn-hint');
const simFlagsCount = document.getElementById('sim-flags-count');
const simFlagsTotal = document.getElementById('sim-flags-total');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const dropLoader = document.getElementById('drop-loader');
const dropText = document.getElementById('drop-text');

let chartInstance = null;
let currentChartData = { safe: 0, low: 0, med: 0, high: 0 };
let currentSimLevel = "BEGINNER";
let foundFlags = 0;
let clickedFlags = new Set();
let currentLatestResult = null;

// ================= INITIALIZATION =================
function init() {
  initBackground();
  updateScoreDisplay();
  updateRank();
  renderHistory();
  initChart();
  
  // Custom Cursor Safety Timeout
  setTimeout(initMagneticCursor, 200);
}

function initBackground() {
  const canvas = document.getElementById('dotted-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;
  let time = 0;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  function draw() {
    ctx.clearRect(0, 0, width, height);
    time += 0.02;
    ctx.fillStyle = 'rgba(0, 229, 192, 0.4)'; 
    const spacing = 40;
    for (let x = 0; x < width + spacing; x += spacing) {
      for (let y = 0; y < height + spacing; y += spacing) {
         let nx = x / 200;
         let ny = y / 200;
         let val = Math.sin(nx + time) * Math.cos(ny + time);
         let size = (val + 1) * 1.5;
         ctx.beginPath();
         ctx.arc(x, y + Math.sin(x/100 + time)*30, size, 0, Math.PI * 2);
         ctx.fill();
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

// ================= CORE UI LOGIC =================
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    mainViews.forEach(view => view.classList.add('hidden'));
    const target = document.getElementById(tab.getAttribute('data-target'));
    if (target) {
      target.classList.remove('hidden');
      if (tab.getAttribute('data-target') === 'dashboard-view') {
        renderHistory();
        updateChartData();
      }
    }
  });
});

function updateScore(points) {
  awarenessScore += points;
  if(awarenessScore < 0) awarenessScore = 0;
  localStorage.setItem('cybersecScore', awarenessScore);
  updateScoreDisplay();
  updateRank();
  if (points > 0) showToast(`+${points} Points!`, 'success');
  else if (points < 0) showToast(`${points} Points.`, 'error');
}

function updateScoreDisplay() {
  scoreDisplay.innerText = awarenessScore;
}

function updateRank() {
  if(!rankDisplay) return;
  const dashRank = document.getElementById('dash-rank-name');
  const dashNext = document.getElementById('dash-next-rank');
  const dashBar = document.getElementById('rank-progress-bar');
  const dashStatus = document.getElementById('rank-status-text');

  let rank = "INTERN";
  let nextRank = "PROTECTOR";
  let color = "var(--text-muted)";
  let min = 0, max = 100;

  if (awarenessScore >= 1500) { 
    rank = "SENTINEL"; nextRank = "MAX RANK"; color = "var(--primary)"; 
    min = 1500; max = 3000; 
  }
  else if (awarenessScore >= 500) { 
    rank = "GUARDIAN"; nextRank = "SENTINEL"; color = "var(--secondary)"; 
    min = 500; max = 1500; 
  }
  else if (awarenessScore >= 100) { 
    rank = "PROTECTOR"; nextRank = "GUARDIAN"; color = "var(--accent-amber)"; 
    min = 100; max = 500; 
  }

  rankDisplay.innerText = rank;
  rankDisplay.style.color = color;
  rankDisplay.style.borderColor = color;

  if (dashRank) {
    dashRank.innerText = rank;
    dashRank.style.color = color;
    dashNext.innerText = `Next: ${nextRank}`;
    let progress = ((awarenessScore - min) / (max - min)) * 100;
    if (progress > 100) progress = 100;
    dashBar.style.width = `${progress}%`;
    dashBar.style.backgroundColor = color;
    if (rank === "SENTINEL") {
      dashStatus.innerHTML = `You are a <strong>${rank}</strong>. Keep hunting!`;
    } else {
      dashStatus.innerHTML = `You need <strong>${max - awarenessScore} XP</strong> for the next rank.`;
    }
  }
}

// ================= THREAT ANALYSIS =================
btnAnalyze.addEventListener('click', async () => {
  const text = inputThreat.value.trim();
  if (!text) {
    showToast('Please enter text to analyze', 'error');
    return;
  }

  btnAnalyze.disabled = true;
  btnText.innerText = 'SCANNING...';
  scanLoader.classList.remove('hidden');
  resultsContent.classList.add('hidden');
  resultsEmpty.classList.remove('hidden');

  try {
    const req = await fetch('/api/analyze', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text })
    });
    if(!req.ok) throw new Error("AI Server Connection Failed");
    const result = await req.json();
    currentLatestResult = result;

    resultsEmpty.classList.add('hidden');
    resultsContent.classList.remove('hidden');
    
    result.category = result.category || 'Unknown';
    result.severity = (result.severity || 'SAFE').toUpperCase().trim();
    result.signals = result.signals || [];

    severityBadge.className = 'badge';
    severityBadge.innerText = result.severity;
    if(result.severity === 'HIGH') severityBadge.classList.add('sev-high');
    else if(result.severity === 'MEDIUM') severityBadge.classList.add('sev-med');
    else if(result.severity === 'LOW') severityBadge.classList.add('sev-low');
    else severityBadge.classList.add('sev-safe');

    reportContainer.style.display = (result.severity === 'HIGH' || result.severity === 'MEDIUM') ? 'block' : 'none';
    explanationText.innerText = result.explanation;

    recommendationsList.innerHTML = '';
    result.recommendations.forEach(rec => {
      const li = document.createElement('li');
      li.innerText = rec;
      recommendationsList.appendChild(li);
    });

    const historyItem = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      category: result.category,
      severity: result.severity,
      text: text.length > 50 ? text.substring(0, 50) + '...' : text,
      fullText: text,
      explanation: result.explanation,
      signals: result.signals
    };
    threatHistory.unshift(historyItem);
    if(threatHistory.length > 50) threatHistory.pop(); 
    localStorage.setItem('cybersecHistory', JSON.stringify(threatHistory));

    const scoreGain = (result.severity === 'HIGH' || result.severity === 'MEDIUM') ? 50 : 10;
    updateScore(scoreGain);
    updateChartData();
  } catch(error) {
    showToast(error.message, "error");
  } finally {
    btnAnalyze.disabled = false;
    btnText.innerText = 'SCAN CONTENT';
    scanLoader.classList.add('hidden');
  }
});

btnClear.addEventListener('click', () => {
  inputThreat.value = '';
  resultsContent.classList.add('hidden');
  resultsEmpty.classList.remove('hidden');
});

// ================= DASHBOARD & HISTORY =================
function renderHistory() {
  historyContainer.innerHTML = '';
  if (threatHistory.length === 0) {
    historyContainer.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">No scans yet.</p>';
    return;
  }
  threatHistory.forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';
    let color = 'var(--primary)';
    if(item.severity === 'HIGH') color = 'var(--accent-red)';
    if(item.severity === 'MEDIUM') color = 'var(--accent-amber)';
    div.innerHTML = `
      <div class="history-meta">
        <span class="type" style="color: ${color}">${item.category} (${item.severity})</span>
        <span class="date">${item.date}</span>
        <span style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">"${item.text}"</span>
      </div>
    `;
    div.addEventListener('click', () => openHistoryModal(item));
    historyContainer.appendChild(div);
  });
}

function openHistoryModal(item) {
  histDetailBadge.innerText = item.severity;
  histDetailBadge.className = 'badge';
  if(item.severity === 'HIGH') histDetailBadge.classList.add('sev-high');
  else if(item.severity === 'MEDIUM') histDetailBadge.classList.add('sev-med');
  else if(item.severity === 'LOW') histDetailBadge.classList.add('sev-low');
  else histDetailBadge.classList.add('sev-safe');

  histDetailExplanation.innerText = item.explanation || "No explanation recorded.";
  histDetailSignals.innerHTML = '';
  if(item.signals && item.signals.length > 0) {
    item.signals.forEach(sig => {
      const span = document.createElement('span');
      span.className = 'signal-pill';
      span.innerText = sig;
      histDetailSignals.appendChild(span);
    });
  } else {
    histDetailSignals.innerHTML = '<span style="color:var(--text-dim); font-size:0.8rem;">No signals detected.</span>';
  }
  historyModal.classList.add('active');
}

btnCloseHistory.addEventListener('click', () => historyModal.classList.remove('active'));

function updateChartData() {
  currentChartData = { safe: 0, low: 0, med: 0, high: 0 };
  threatHistory.forEach(h => {
    if (h.severity === 'SAFE') currentChartData.safe++;
    else if (h.severity === 'LOW') currentChartData.low++;
    else if (h.severity === 'MEDIUM') currentChartData.med++;
    else if (h.severity === 'HIGH') currentChartData.high++;
  });
  if (chartInstance) {
    chartInstance.data.datasets[0].data = [currentChartData.high, currentChartData.med, currentChartData.low, currentChartData.safe];
    chartInstance.update();
  }
}

function initChart() {
  const ctx = document.getElementById('threatChart').getContext('2d');
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.font.family = "'Share Tech Mono', monospace";
  updateChartData();
  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['High', 'Med', 'Low', 'Safe'],
      datasets: [{
        data: [currentChartData.high, currentChartData.med, currentChartData.low, currentChartData.safe],
        backgroundColor: ['#ff4757', '#f5a623', 'rgba(0, 229, 192, 0.5)', 'rgba(122, 145, 168, 0.3)'],
        borderColor: '#0d1424', borderWidth: 2
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right' } } }
  });
}

// ================= PHISHING SIMULATION =================
btnStartSim.addEventListener('click', () => {
  simModal.classList.add('active');
  generateRandomScenario();
});

btnCloseSim.addEventListener('click', () => {
  simModal.classList.remove('active');
  if(foundFlags === 0) {
    updateScore(-10);
    showToast("Simulation aborted with no detection.", "error");
  }
});

document.querySelectorAll('.sim-level-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sim-level-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSimLevel = btn.getAttribute('data-level');
    generateRandomScenario();
  });
});

function generateRandomScenario() {
  const data = SCENARIOS[currentSimLevel];
  const sender = data.senders[Math.floor(Math.random() * data.senders.length)];
  const subject = data.subjects[Math.floor(Math.random() * data.subjects.length)];
  const body = data.bodies[Math.floor(Math.random() * data.bodies.length)];
  
  let tFlags = (currentSimLevel === "ADVANCED") ? 3 : (currentSimLevel === "INTERMEDIATE" ? 2 : 1);
  if (simFlagsTotal) simFlagsTotal.innerText = tFlags;

  const simMock = document.querySelector('.sim-mock-email');
  simMock.innerHTML = `
    <div class="sim-header">
      <span class="sim-sender"><strong>From:</strong> ${sender}</span>
      <span><strong>To:</strong> you@company.corp</span>
      <span><strong>Subject:</strong> ${subject}</span>
    </div>
    <div class="sim-body">
      <p>${body}</p><br>
      <div id="flag-container" style="display:flex; flex-direction:column; gap:10px;"></div>
      <br><p>Regards,<br>IT Security Team</p>
    </div>
  `;
  
  const flagContainer = document.getElementById('flag-container');
  const possibleFlags = [
    { text: "Secure Your Account Now", info: "Deceptive Link detected." },
    { text: "Verify Identity Instantly", info: "Urgency Pressure detected." },
    { text: "Download Security Patch", info: "Potential Malicious Attachment." }
  ];

  for(let i=0; i<tFlags; i++) {
    const f = possibleFlags[i];
    const a = document.createElement('a');
    a.href = "#";
    a.className = "sim-highlight sim-link";
    a.dataset.info = f.info;
    a.innerText = f.text;
    flagContainer.appendChild(a);
  }
  
  foundFlags = 0;
  clickedFlags.clear();
  simFlagsCount.innerText = "0";

  simMock.querySelectorAll('.sim-highlight').forEach((el, index) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (!clickedFlags.has(index)) {
        clickedFlags.add(index);
        el.classList.add('active');
        foundFlags++;
        simFlagsCount.innerText = foundFlags;
        let mult = (currentSimLevel === "ADVANCED") ? 4 : (currentSimLevel === "INTERMEDIATE" ? 2 : 1);
        updateScore(25 * mult);
        if (foundFlags >= tFlags) {
          setTimeout(() => { showToast("Level Complete! Found all flags.", "success"); simModal.classList.remove('active'); }, 1500);
        } else {
          showToast(`Found ${foundFlags}/${tFlags} flags...`, "info");
        }
      }
    });
  });
}

btnHint.addEventListener('click', () => {
  if (awarenessScore < 50) { showToast("Min. 50 XP required.", "error"); return; }
  const flags = document.querySelectorAll('.sim-highlight:not(.active)');
  const tFlags = parseInt(simFlagsTotal.innerText);
  if (flags.length > 0) {
    updateScore(-50);
    const flag = flags[0];
    flag.classList.add('active');
    flag.style.outline = "2px solid var(--accent-amber)";
    showToast("Hint used! Red flag revealed.", "info");
    foundFlags++;
    simFlagsCount.innerText = foundFlags;
    if (foundFlags >= tFlags) {
      setTimeout(() => simModal.classList.remove('active'), 1500);
    }
  }
});

// ================= UTILITIES & PARSING =================
function showToast(message, type='info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  if(type === 'success') toast.style.borderLeftColor = 'var(--primary)';
  else if (type === 'error') toast.style.borderLeftColor = 'var(--accent-red)';
  toast.innerHTML = `<span style="font-size:0.9rem;">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3000);
}

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--primary)'; });
dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.style.borderColor = 'rgba(0,229,192,0.3)'; });
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.style.borderColor = 'rgba(0,229,192,0.3)';
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => { if (e.target.files.length) handleFile(e.target.files[0]); });

async function handleFile(file) {
  dropText.classList.add('hidden');
  dropLoader.classList.remove('hidden');
  try {
    const ext = file.name.split('.').pop().toLowerCase();
    let text = "";
    if (ext === 'pdf') {
       const typedarray = new Uint8Array(await file.arrayBuffer());
       const pdf = await window.pdfjsLib.getDocument(typedarray).promise;
       for (let i = 1; i <= pdf.numPages; i++) {
         const page = await pdf.getPage(i);
         const content = await page.getTextContent();
         text += content.items.map(it => it.str).join(' ') + " \n";
       }
    } else if (['png', 'jpg', 'jpeg'].includes(ext)) {
       const res = await window.Tesseract.recognize(file, 'eng');
       text = res.data.text;
    }
    inputThreat.value = text;
    showToast("Text Extracted!", "success");
  } catch (e) { showToast("File Error", "error"); }
  finally { dropText.classList.remove('hidden'); dropLoader.classList.add('hidden'); fileInput.value = ""; }
}

// ================= MAGNETIC CURSOR =================
function initMagneticCursor() {
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring || !window.gsap) return;

  document.body.classList.add('custom-cursor-active');
  const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const dotPos = { x: mouse.x, y: mouse.y };
  const ringPos = { x: mouse.x, y: mouse.y };
  const dSetX = gsap.quickSetter(dot, "x", "px"), dSetY = gsap.quickSetter(dot, "y", "px");
  const rSetX = gsap.quickSetter(ring, "x", "px"), rSetY = gsap.quickSetter(ring, "y", "px");

  window.addEventListener("mousemove", e => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    if (dot.style.opacity === "0" || dot.style.opacity === "") gsap.to([dot, ring], { opacity: 1, duration: 0.3 });
  });

  gsap.ticker.add(() => {
    const dt = 1.0 - Math.pow(1.0 - 0.2, gsap.ticker.deltaRatio());
    dotPos.x += (mouse.x - dotPos.x) * dt; dotPos.y += (mouse.y - dotPos.y) * dt;
    dSetX(dotPos.x); dSetY(dotPos.y);
    const rt = 1.0 - Math.pow(1.0 - 0.1, gsap.ticker.deltaRatio());
    ringPos.x += (mouse.x - ringPos.x) * rt; ringPos.y += (mouse.y - ringPos.y) * rt;
    rSetX(ringPos.x); rSetY(ringPos.y);
  });

  document.querySelectorAll('[data-magnetic]').forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2, centerY = rect.top + rect.height / 2;
      mouse.x = centerX + (e.clientX - centerX) * 0.3;
      mouse.y = centerY + (e.clientY - centerY) * 0.3;
      gsap.to(el, { duration: 0.4, x: (e.clientX - centerX) * 0.2, y: (e.clientY - centerY) * 0.2, scale: 1.02 });
      document.body.classList.add('cursor-hover');
    });
    el.addEventListener('mouseleave', () => {
      gsap.to(el, { duration: 0.6, x: 0, y: 0, scale: 1, ease: "elastic.out(1, 0.4)" });
      document.body.classList.remove('cursor-hover');
    });
  });

  window.addEventListener('mousedown', () => gsap.to(ring, { scale: 0.7, opacity: 0.5 }));
  window.addEventListener('mouseup', () => gsap.to(ring, { scale: 1, opacity: 1 }));
}

// ================= RUN =================
init();
