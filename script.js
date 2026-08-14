/* Live Stat Counter Animation */
function animateCounters() {
  const counters = document.querySelectorAll('.stat-val');
  counters.forEach(counter => {
    const target = +counter.getAttribute('data-target');
    let count = 0;
    const speed = target / 60;
    const update = () => {
      count += speed;
      if (count < target) {
        counter.innerText = Math.ceil(count).toLocaleString();
        setTimeout(update, 20);
      } else {
        counter.innerText = target.toLocaleString();
      }
    };
    update();
  });
}
document.addEventListener("DOMContentLoaded", animateCounters);

/* Hacker Terminal Log Simulation on Scan */
function appendTerminalLog(msg, isSuccess = false) {
  const consoleEl = document.getElementById('hackerConsole');
  if (!consoleEl) return;
  const time = new Date().toLocaleTimeString().split(' ')[0];
  const log = document.createElement('div');
  log.className = 'hacker-log';
  log.innerHTML = `<span class="time">[${time}]</span> <span class="${isSuccess ? 'success' : ''}">${msg}</span>`;
  consoleEl.appendChild(log);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

/* Modifikasi Handler tombol Extract untuk menampilkan Log Futuristik */
const origExtract = document.getElementById('extractBtn');
if (origExtract) {
  origExtract.addEventListener('click', () => {
    const consoleEl = document.getElementById('hackerConsole');
    if (consoleEl) consoleEl.innerHTML = '';
    
    appendTerminalLog("Connecting to target server...");
    setTimeout(() => appendTerminalLog("Bypassing CORS filters & grabbing headers..."), 400);
    setTimeout(() => appendTerminalLog("Extracting HTML, Inline CSS & Bundled JS..."), 800);
    setTimeout(() => appendTerminalLog("Analyzing tech stack & SEO tags..."), 1200);
    setTimeout(() => appendTerminalLog("SUCCESS: Deep extraction completed!", true), 1600);
  });
}
