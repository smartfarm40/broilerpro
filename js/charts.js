// ===== CHARTS =====
let dashChart, weightChart, mortalityChart, distChart;

function initDashboardChart() {
  const ctx = document.getElementById('dashboardChart');
  if (!ctx) return;
  if (dashChart) dashChart.destroy();
  const days = DB.dailyLogs.filter(l => l.weight).map(l => 'H' + l.day);
  const weights = DB.dailyLogs.filter(l => l.weight).map(l => l.weight);
  dashChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: days.length ? days : ['H1','H7','H14','H21','H24'],
      datasets: [{
        label: 'Berat (g)',
        data: weights.length ? weights : [45,150,320,580,980],
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59,130,246,.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#3B82F6',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'Fredoka', size: 11 } } },
        y: { grid: { color: 'rgba(0,0,0,.05)' }, ticks: { font: { family: 'Fredoka', size: 11 } } }
      }
    }
  });
}

function initGrowthCharts() {
  const isDark = document.body.dataset.theme === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.05)';
  const tickFont = { family: 'Fredoka', size: 11 };

  // Weight chart
  const wCtx = document.getElementById('weightChart');
  if (wCtx) {
    if (weightChart) weightChart.destroy();
    weightChart = new Chart(wCtx, {
      type: 'line',
      data: {
        labels: ['H1','H7','H14','H21','H24'],
        datasets: [
          {
            label: 'Aktual',
            data: [200,450,780,1100,1250],
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59,130,246,.1)',
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#3B82F6',
            pointRadius: 4
          },
          {
            label: 'Target',
            data: [180,420,750,1050,1200],
            borderColor: '#10B981',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [6,4],
            tension: 0.4,
            fill: false,
            pointRadius: 3,
            pointBackgroundColor: '#10B981'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { font: { family: 'Fredoka' }, boxWidth: 12 } } },
        scales: {
          x: { grid: { display: false }, ticks: { font: tickFont } },
          y: { grid: { color: gridColor }, ticks: { font: tickFont } }
        }
      }
    });
  }

  // Mortality chart
  const mCtx = document.getElementById('mortalityChart');
  if (mCtx) {
    if (mortalityChart) mortalityChart.destroy();
    const mData = DB.dailyLogs.map(l => l.mortality || 0);
    const mLabels = DB.dailyLogs.map(l => 'H' + l.day);
    mortalityChart = new Chart(mCtx, {
      type: 'bar',
      data: {
        labels: mLabels.length ? mLabels : ['Sen','Sel','Rab','Kam','Jum','Sab','Min'],
        datasets: [{
          label: 'Kematian',
          data: mData.length ? mData : [2,5,1,3,2,0,1],
          backgroundColor: 'rgba(239,68,68,.7)',
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: tickFont } },
          y: { grid: { color: gridColor }, ticks: { font: tickFont, stepSize: 1 } }
        }
      }
    });
  }

  // Distribution donut
  const dCtx = document.getElementById('distributionChart');
  if (dCtx) {
    if (distChart) distChart.destroy();
    distChart = new Chart(dCtx, {
      type: 'doughnut',
      data: {
        labels: ['Kurang Berat','Sesuai Target','Kelebihan Berat'],
        datasets: [{
          data: [15,65,20],
          backgroundColor: ['#FBBF24','#10B981','#3B82F6'],
          borderWidth: 2,
          borderColor: isDark ? '#374151' : '#fff'
        }]
      },
      options: {
        responsive: true,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: 'Fredoka', size: 12 }, padding: 16, boxWidth: 12 }
          }
        }
      }
    });
  }
}
