(function() {
  const TIMEZONES = {
    'Asia/Makassar': { label: 'WITA', offset: 8 },
    'Asia/Jakarta': { label: 'WIB', offset: 7 },
    'Asia/Jayapura': { label: 'WIT', offset: 9 },
    'Asia/Singapore': { label: 'SGT', offset: 8 },
    'Asia/Tokyo': { label: 'JST', offset: 9 },
    'auto': { label: 'Auto', offset: null }
  };

  let currentTimezone = 'Asia/Makassar';
  let clockInterval = null;

  function getTimeInTimezone(tz) {
    if (tz === 'auto') {
      const now = new Date();
      return {
        hours: now.getHours(), minutes: now.getMinutes(), seconds: now.getSeconds(),
        day: now.getDay(), date: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear()
      };
    }
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('id-ID', {
        timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit',
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour12: false
      });
      const parts = formatter.formatToParts(now);
      const result = { hours: 0, minutes: 0, seconds: 0, day: 0, date: 0, month: 0, year: 0 };
      parts.forEach(p => {
        if (p.type === 'hour') result.hours = parseInt(p.value);
        if (p.type === 'minute') result.minutes = parseInt(p.value);
        if (p.type === 'second') result.seconds = parseInt(p.value);
        if (p.type === 'day') result.date = parseInt(p.value);
        if (p.type === 'month') result.month = parseInt(p.value);
        if (p.type === 'year') result.year = parseInt(p.value);
      });
      const testDate = new Date(result.year, result.month - 1, result.date);
      result.day = testDate.getDay();
      return result;
    } catch(e) {
      const now = new Date();
      return {
        hours: now.getHours(), minutes: now.getMinutes(), seconds: now.getSeconds(),
        day: now.getDay(), date: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear()
      };
    }
  }

  function formatTime(h, m, s) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function getDayName(dayIndex) {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[dayIndex] || '';
  }

  function getMonthName(monthNum) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return months[monthNum - 1] || '';
  }

  function createTimeDisplay() {
    const existing = document.getElementById('solo-time-display');
    if (existing) existing.remove();

    const subtitle = document.querySelector('.subtitle');
    const timeDisplay = document.createElement('div');
    timeDisplay.id = 'solo-time-display';
    timeDisplay.style.cssText = `
      background: linear-gradient(135deg, #0e0e20, #161635);
      border: 2px solid #4a4a8a;
      border-radius: 14px;
      padding: 14px 20px;
      margin-bottom: 20px;
      box-shadow: 0 0 15px #3a3aff22, inset 0 0 15px #00000044;
      font-family: 'Courier New', monospace;
      color: #c0c0e0;
      cursor: pointer;
      transition: all 0.3s;
      user-select: none;
    `;
    timeDisplay.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <span style="font-size:0.7rem;color:#666;letter-spacing:3px;text-transform:uppercase;">⏰ Waktu Quest</span>
        <span class="timezone-badge" style="background:#3a2a1a;padding:3px 14px;border-radius:14px;font-size:0.8rem;color:#ffaa00;font-weight:bold;box-shadow:0 0 8px #ffaa0033;">WITA UTC+8</span>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:20px;flex-wrap:wrap;">
        <div style="text-align:center;">
          <div class="time-main" style="font-size:2.5rem;font-weight:bold;color:#c0a0ff;text-shadow:0 0 15px #6a4aff,0 0 30px #6a4aff55;letter-spacing:3px;line-height:1;">00:00:00</div>
        </div>
        <div style="width:1px;height:45px;background:linear-gradient(transparent,#4a4a8a,transparent);"></div>
        <div style="text-align:left;">
          <div class="day-name" style="font-size:1.1rem;font-weight:bold;color:#ffcc88;margin-bottom:2px;">Selasa</div>
          <div class="full-date" style="font-size:0.9rem;color:#aaa;">26 Mei 2026</div>
        </div>
      </div>
      <div style="margin-top:12px;text-align:center;">
        <span class="time-greeting" style="font-size:0.8rem;color:#aaccff;background:#1a1a30;padding:4px 16px;border-radius:10px;">🌅 Selamat Pagi, Player!</span>
      </div>
      <div style="font-size:0.6rem;color:#444;text-align:center;margin-top:6px;">🖱️ Klik untuk ganti zona waktu • WIB • WITA • WIT</div>
    `;

    timeDisplay.onmouseenter = () => {
      timeDisplay.style.borderColor = '#8a8aff';
      timeDisplay.style.boxShadow = '0 0 25px #6a6aff44, inset 0 0 20px #00000066';
    };
    timeDisplay.onmouseleave = () => {
      timeDisplay.style.borderColor = '#4a4a8a';
      timeDisplay.style.boxShadow = '0 0 15px #3a3aff22, inset 0 0 15px #00000044';
    };
    timeDisplay.onclick = () => cycleTimezone();

    if (subtitle) {
      subtitle.after(timeDisplay);
    } else {
      const app = document.querySelector('.app');
      if (app) app.prepend(timeDisplay);
    }
  }

  function cycleTimezone() {
    const tzKeys = Object.keys(TIMEZONES);
    const currentIndex = tzKeys.indexOf(currentTimezone);
    const nextIndex = (currentIndex + 1) % tzKeys.length;
    currentTimezone = tzKeys[nextIndex];
    localStorage.setItem('solo_timezone', currentTimezone);
    updateTimeDisplay();

    // Minta izin notifikasi saat klik jam (jika belum)
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(perm => {
        window.dispatchEvent(new CustomEvent('timezoneChanged', {
          detail: { timezone: currentTimezone, label: TIMEZONES[currentTimezone].label }
        }));
      });
    } else {
      window.dispatchEvent(new CustomEvent('timezoneChanged', {
        detail: { timezone: currentTimezone, label: TIMEZONES[currentTimezone].label }
      }));
    }
  }

  function getGreeting(hours) {
    if (hours < 4) return '🌙 Selamat Malam, Player!';
    if (hours < 11) return '🌅 Selamat Pagi, Player!';
    if (hours < 15) return '☀️ Selamat Siang, Player!';
    if (hours < 18) return '🌤️ Selamat Sore, Player!';
    return '🌙 Selamat Malam, Player!';
  }

  function updateTimeDisplay() {
    const timeData = getTimeInTimezone(currentTimezone);
    const tzLabel = TIMEZONES[currentTimezone]?.label || 'WITA';
    const tzOffset = TIMEZONES[currentTimezone]?.offset;
    const greeting = getGreeting(timeData.hours);
    const dayName = getDayName(timeData.day);
    const monthName = getMonthName(timeData.month);
    const fullDate = `${timeData.date} ${monthName} ${timeData.year}`;
    const timeStr = formatTime(timeData.hours, timeData.minutes, timeData.seconds);

    const timeMain = document.querySelector('.time-main');
    const dayNameEl = document.querySelector('.day-name');
    const fullDateEl = document.querySelector('.full-date');
    const timeGreeting = document.querySelector('.time-greeting');
    const timezoneBadge = document.querySelector('.timezone-badge');

    if (timeMain) timeMain.textContent = timeStr;
    if (dayNameEl) dayNameEl.textContent = dayName;
    if (fullDateEl) fullDateEl.textContent = fullDate;
    if (timeGreeting) timeGreeting.textContent = greeting;

    if (timezoneBadge) {
      const utcSign = tzOffset >= 0 ? '+' : '';
      timezoneBadge.textContent = `${tzLabel} UTC${utcSign}${tzOffset}`;
      if (tzLabel === 'WITA') {
        timezoneBadge.style.background = '#3a2a1a';
        timezoneBadge.style.color = '#ffaa00';
        timezoneBadge.style.boxShadow = '0 0 8px #ffaa0044';
      } else if (tzLabel === 'WIB') {
        timezoneBadge.style.background = '#2a2a3a';
        timezoneBadge.style.color = '#aaccff';
        timezoneBadge.style.boxShadow = 'none';
      } else if (tzLabel === 'WIT') {
        timezoneBadge.style.background = '#2a3a2a';
        timezoneBadge.style.color = '#88ff88';
        timezoneBadge.style.boxShadow = 'none';
      } else {
        timezoneBadge.style.background = '#2a2a50';
        timezoneBadge.style.color = '#ffd966';
        timezoneBadge.style.boxShadow = 'none';
      }
    }

    if (timeData.seconds === 0 && timeMain) {
      timeMain.style.transform = 'scale(1.08)';
      timeMain.style.transition = 'transform 0.15s';
      setTimeout(() => { if (timeMain) timeMain.style.transform = 'scale(1)'; }, 150);
    }

    if (dayNameEl) {
      dayNameEl.style.color = '#ffcc88';
      dayNameEl.style.textShadow = '0 0 8px #ffaa0044';
    }
  }

  function initTimeDisplay() {
    const saved = localStorage.getItem('solo_timezone');
    if (!saved || !TIMEZONES[saved]) {
      currentTimezone = 'Asia/Makassar';
      localStorage.setItem('solo_timezone', currentTimezone);
    } else {
      currentTimezone = saved;
    }

    createTimeDisplay();
    updateTimeDisplay();

    if (clockInterval) clearInterval(clockInterval);
    clockInterval = setInterval(updateTimeDisplay, 1000);
  }

  window.SoloTime = {
    getCurrentTimezone: () => currentTimezone,
    getTimeData: () => getTimeInTimezone(currentTimezone),
    getTodayDate: () => {
      const td = getTimeInTimezone(currentTimezone);
      return `${td.year}-${String(td.month).padStart(2,'0')}-${String(td.date).padStart(2,'0')}`;
    },
    setTimezone: (tz) => {
      if (TIMEZONES[tz]) {
        currentTimezone = tz;
        localStorage.setItem('solo_timezone', tz);
        updateTimeDisplay();
        window.dispatchEvent(new CustomEvent('timezoneChanged', {
          detail: { timezone: tz, label: TIMEZONES[tz].label }
        }));
      }
    },
    refresh: updateTimeDisplay
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTimeDisplay);
  } else {
    initTimeDisplay();
  }

  console.log('🕐 Solo Time Display Ready - WITA Default');
})();