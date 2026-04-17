// STATE & LOCAL STORAGE
let awarenessScore = parseInt(localStorage.getItem('cybersecScore')) || 0;
let threatHistory = JSON.parse(localStorage.getItem('cybersecHistory')) || [];

// DOM ELEMENTS
const scoreDisplay = document.getElementById('score-display');
const tabs = document.querySelectorAll('.tab');
const mainViews = document.querySelectorAll('main');
const inputThreat = document.getElementById('threat-input');
const btnAnalyze = document.getElementById('btn-analyze');
const btnClear = document.getElementById('btn-clear');
const scanLoader = document.getElementById('scan-loader');
const btnText = document.querySelector('.btn-text');
const resultsPanel = document.getElementById('results-panel');
const resultsEmpty = document.getElementById('results-empty');
const resultsContent = document.getElementById('results-content');
const severityBadge = document.getElementById('severity-badge');
const explanationText = document.getElementById('explanation-text');
const recommendationsList = document.getElementById('recommendations-list');
const historyContainer = document.getElementById('history-container');
const btnExport = document.getElementById('btn-export');
const reportContainer = document.getElementById('report-action-container');

// HISTORY MODAL ELEMENTS
const historyModal = document.getElementById('history-modal');
const btnCloseHistory = document.getElementById('btn-close-history');
const histDetailBadge = document.getElementById('hist-detail-badge');
const histDetailExplanation = document.getElementById('hist-detail-explanation');

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const dropLoader = document.getElementById('drop-loader');
const dropText = document.getElementById('drop-text');
const btnShareEmail = document.getElementById('btn-share-email');
let currentLatestResult = null;

// SIMULATION ELEMENTS
const btnStartSim = document.getElementById('btn-start-sim');
const simModal = document.getElementById('sim-modal');
const btnCloseSim = document.getElementById('btn-close-sim');
const simHighlights = document.querySelectorAll('.sim-highlight');
const simFlagsCount = document.getElementById('sim-flags-count');

let chartInstance = null;
let currentChartData = { safe: 0, low: 0, med: 0, high: 0 };

// INIT
function init() {
  initBackground();
  updateScoreDisplay();
  renderHistory();
  initChart();
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

    let spacing = 40;
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

// TAB SWITCHING
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

// SCORE MANAGEMENT
function updateScore(points) {
  awarenessScore += points;
  if(awarenessScore < 0) awarenessScore = 0;
  localStorage.setItem('cybersecScore', awarenessScore);
  updateScoreDisplay();
  
  if (points > 0) {
    showToast(`+${points} Points! Good job.`, 'success');
  } else if (points < 0) {
    showToast(`${points} Points. Be careful!`, 'error');
  }
}

function updateScoreDisplay() {
  scoreDisplay.innerText = awarenessScore;
}

// STRICT AI INTEGRATION VIA FASTAPI
async function analyzeContent(text) {
   const req = await fetch('/api/analyze', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text })
   });
   if(!req.ok) {
      let errMsg = "AI API Server Error";
      try {
          const errData = await req.json();
          if (errData.detail) errMsg = errData.detail;
      } catch(e) {}
      throw new Error(errMsg);
   }
   const data = await req.json();
   return data; 
}

// ANALYZE BUTTON HANDLER
btnAnalyze.addEventListener('click', async () => {
  const text = inputThreat.value.trim();
  if (!text) {
    showToast('Please enter text to analyze', 'error');
    return;
  }

  // UI Loading State
  btnAnalyze.disabled = true;
  btnText.innerText = 'SCANNING...';
  scanLoader.classList.remove('hidden');
  resultsContent.classList.add('hidden');
  resultsEmpty.classList.remove('hidden');

  let result;
  try {
     result = await analyzeContent(text);
  } catch(error) {
     console.error(error);
     showToast(error.message, "error");
     btnAnalyze.disabled = false;
     btnText.innerText = 'SCAN CONTENT';
     scanLoader.classList.add('hidden');
     return;
  }
  
  currentLatestResult = result;

  // Parse Result to UI
  resultsEmpty.classList.add('hidden');
  resultsContent.classList.remove('hidden');
  
  result.category = result.category || 'Unknown';
  result.severity = (result.severity || 'SAFE').toUpperCase().trim();

  severityBadge.className = 'badge'; // reset
  severityBadge.innerText = result.severity;
  if(result.severity === 'HIGH') severityBadge.classList.add('sev-high');
  else if(result.severity === 'MEDIUM') severityBadge.classList.add('sev-med');
  else if(result.severity === 'LOW') severityBadge.classList.add('sev-low');
  else severityBadge.classList.add('sev-safe');

  if (result.severity === 'HIGH' || result.severity === 'MEDIUM') {
    reportContainer.style.display = 'block';
  } else {
    reportContainer.style.display = 'none';
  }

  explanationText.innerText = result.explanation;

  recommendationsList.innerHTML = '';
  result.recommendations.forEach(rec => {
    const li = document.createElement('li');
    li.innerText = rec;
    recommendationsList.appendChild(li);
  });

  // Track History
  const historyItem = {
    id: Date.now(),
    date: new Date().toLocaleString(),
    category: result.category,
    severity: result.severity,
    text: text.length > 50 ? text.substring(0, 50) + '...' : text,
    fullText: text,
    explanation: result.explanation
  };
  
  threatHistory.unshift(historyItem);
  if(threatHistory.length > 50) threatHistory.pop(); // limit
  localStorage.setItem('cybersecHistory', JSON.stringify(threatHistory));

  // Score Changes
  if(result.severity === 'SAFE' || result.severity === 'LOW') {
    updateScore(5); // Reward for scanning safe/low items
  } else {
    updateScore(10); // Reward for catching real threats
  }

  // UI Reset State
  btnAnalyze.disabled = false;
  btnText.innerText = 'SCAN CONTENT';
  scanLoader.classList.add('hidden');
  
  // Re-render chart data if needed secretly
  updateChartData();
});

btnShareEmail.addEventListener('click', () => {
   if(!currentLatestResult || !inputThreat.value) {
       showToast("Nothing to share yet!", "error");
       return;
   }
   const subject = encodeURIComponent("Security Threat Analysis Report: " + currentLatestResult.severity);
   const body = encodeURIComponent(`Hi,
I ran a threat scan and found this:

Original Content:
"${inputThreat.value.substring(0, 100)}..."

Analysis:
Severity: ${currentLatestResult.severity}
Category: ${currentLatestResult.category}

Explanation:
${currentLatestResult.explanation}

Recommendations:
${currentLatestResult.recommendations.join(", ")}
   `);
   window.open(`mailto:?subject=${subject}&body=${body}`);
});

btnClear.addEventListener('click', () => {
  inputThreat.value = '';
  resultsContent.classList.add('hidden');
  resultsEmpty.classList.remove('hidden');
});

// DASHBOARD & CHART
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
    
    div.style.cursor = 'pointer';
    div.addEventListener('click', () => {
      openHistoryModal(item);
    });

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
  historyModal.classList.add('active');
}

if (btnCloseHistory) {
  btnCloseHistory.addEventListener('click', () => {
    historyModal.classList.remove('active');
  });
}

function updateChartData() {
  currentChartData = { safe: 0, low: 0, med: 0, high: 0 };
  threatHistory.forEach(h => {
    if (h.severity === 'SAFE') currentChartData.safe++;
    else if (h.severity === 'LOW') currentChartData.low++;
    else if (h.severity === 'MEDIUM') currentChartData.med++;
    else if (h.severity === 'HIGH') currentChartData.high++;
  });
  
  if (chartInstance) {
    chartInstance.data.datasets[0].data = [
      currentChartData.high, 
      currentChartData.med, 
      currentChartData.low, 
      currentChartData.safe
    ];
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
      labels: ['High', 'Medium', 'Low', 'Safe'],
      datasets: [{
        data: [currentChartData.high, currentChartData.med, currentChartData.low, currentChartData.safe],
        backgroundColor: [
          '#ff4757', // High
          '#f5a623', // Med
          'rgba(0, 229, 192, 0.5)', // Low
          'rgba(122, 145, 168, 0.3)' // Safe
        ],
        borderColor: '#0d1424',
        borderWidth: 2,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#e2e8f0' }
        }
      },
      cutout: '70%'
    }
  });
}

// PDF EXPORT
btnExport.addEventListener('click', () => {
  if (!window.jspdf) {
    showToast('PDF Library not loaded. Check internet.', 'error');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(0, 229, 192);
  doc.text("Cybersec Awareness Report", 14, 22);
  
  doc.setFontSize(12);
  doc.setTextColor(50, 50, 50);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);
  doc.text(`Overall Awareness Score: ${awarenessScore} PTS`, 14, 40);

  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("Threat Scan History", 14, 55);

  if (threatHistory.length > 0) {
    const tableData = threatHistory.map(h => [
      h.date.split(',')[0], 
      h.severity, 
      h.category,
      h.text
    ]);

    doc.autoTable({
      startY: 60,
      head: [['Date', 'Severity', 'Category', 'Snippet']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [17, 28, 51], textColor: [0, 229, 192] },
      styles: { fontSize: 9 }
    });
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("No scan history recorded yet.", 14, 65);
  }

  doc.save("Cybersec_Report.pdf");
  showToast("Report Exported Successfully", "success");
});

// SIMULATION LOGIC
let foundFlags = 0;
let clickedFlags = new Set();

btnStartSim.addEventListener('click', () => {
  simModal.classList.add('active');
  // Reset sim
  foundFlags = 0;
  clickedFlags.clear();
  simFlagsCount.innerText = "0";
  simHighlights.forEach(el => el.classList.remove('active'));
});

btnCloseSim.addEventListener('click', () => {
  simModal.classList.remove('active');
  if(foundFlags < 3) {
    updateScore(-10); // Penalty for aborting uncompleted!
    showToast("Simulation aborted! Penalty applied.", 'error');
  }
});

simHighlights.forEach((el, index) => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    if (!clickedFlags.has(index)) {
      clickedFlags.add(index);
      el.classList.add('active');
      foundFlags++;
      simFlagsCount.innerText = foundFlags;
      updateScore(15); // +15 per flag found
      
      if(foundFlags === 3) {
         setTimeout(() => {
           showToast("PERFECT! You found all hidden threats.", 'success');
           updateScore(50); // Bonus
           simModal.classList.remove('active');
         }, 1500);
      }
    }
  });
});

// TOAST SYSTEM
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

// ================= FILE PARSING LOGIC =================
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.style.borderColor = 'var(--primary)';
});
dropZone.addEventListener('dragleave', (e) => {
  dropZone.style.borderColor = 'rgba(0,229,192,0.3)';
});
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.style.borderColor = 'rgba(0,229,192,0.3)';
  if (e.dataTransfer.files.length) {
    handleFile(e.dataTransfer.files[0]);
  }
});
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) handleFile(e.target.files[0]);
});

async function handleFile(file) {
  dropText.classList.add('hidden');
  dropLoader.classList.remove('hidden');
  
  try {
    let extractedText = "";
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (ext === 'pdf') {
      extractedText = await parsePDF(file);
    } else if (['png', 'jpg', 'jpeg'].includes(ext)) {
      extractedText = await parseImage(file);
    } else if (ext === 'eml') {
      extractedText = await parseEML(file);
    } else {
      throw new Error("Unsupported file type");
    }
    
    inputThreat.value = extractedText;
    showToast("Text extracted! You can now scan it.", "success");
  } catch (error) {
    console.error(error);
    showToast("Error parsing file.", "error");
  } finally {
    dropText.classList.remove('hidden');
    dropLoader.classList.add('hidden');
    fileInput.value = "";
  }
}

async function parseImage(file) {
  return new Promise((resolve, reject) => {
    if(!window.Tesseract) return reject("Tesseract not loaded");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = await window.Tesseract.recognize(reader.result, 'eng');
        resolve(result.data.text);
      } catch(e) { reject(e); }
    };
    reader.readAsDataURL(file);
  });
}

function parsePDF(file) {
  return new Promise((resolve, reject) => {
    if(!window.pdfjsLib) return reject("PDF.js not loaded");
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const reader = new FileReader();
    reader.onload = async function() {
      const typedarray = new Uint8Array(this.result);
      try {
        const pdf = await window.pdfjsLib.getDocument(typedarray).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(item => item.str).join(' ') + " \n";
        }
        resolve(text);
      } catch(e) { reject(e); }
    };
    reader.readAsArrayBuffer(file);
  });
}

function parseEML(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = reader.result;
      const stripped = raw.replace(/<[^>]*>?/gm, ''); 
      resolve(stripped.substring(0, 5000)); 
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// Start
init();
