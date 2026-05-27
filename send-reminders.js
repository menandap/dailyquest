const emailjs = require('@emailjs/nodejs');
const fetch = require('node-fetch');

const {
  GITHUB_TOKEN,
  GIST_ID,
  EMAILJS_PUBLIC_KEY,
  EMAILJS_PRIVATE_KEY,
  EMAILJS_SERVICE_ID,
  EMAILJS_REMINDER_TEMPLATE_ID,
  EMAILJS_DAILY_TEMPLATE_ID,
  TIMEZONE
} = process.env;

emailjs.init({
  publicKey: EMAILJS_PUBLIC_KEY,
  privateKey: EMAILJS_PRIVATE_KEY
});

// ========== TIMEZONE ==========
function getNowInTimezone(tz) {
  if (!tz || tz === 'auto') return new Date();
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(now);
    const dateParts = {};
    parts.forEach(p => {
      if (p.type !== 'literal') dateParts[p.type] = parseInt(p.value);
    });
    return new Date(dateParts.year, dateParts.month - 1, dateParts.day, dateParts.hour, dateParts.minute, dateParts.second);
  } catch(e) {
    return new Date();
  }
}

function getTodayStr(tz) {
  const now = getNowInTimezone(tz);
  return now.getFullYear() + '-' + 
         String(now.getMonth() + 1).padStart(2, '0') + '-' + 
         String(now.getDate()).padStart(2, '0');
}

function getMonthName(month) {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][month];
}

// ========== GIST API ==========
async function getGistData() {
  const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}` }
  });
  if (!res.ok) throw new Error(`Gagal fetch Gist: ${res.status}`);
  const data = await res.json();
  const file = data.files['solo-data.json'];
  return file ? JSON.parse(file.content) : null;
}

async function updateGist(state) {
  await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: 'PATCH',
    headers: { Authorization: `token ${GITHUB_TOKEN}` },
    body: JSON.stringify({
      files: { 'solo-data.json': { content: JSON.stringify(state) } }
    })
  });
}

function getLevel(exp) { return Math.floor(exp / 100) + 1; }

function getActiveQuestsForToday(state, dayIndex) {
  let activeQuests = state.quests.filter(q => q.days && q.days.includes(dayIndex));
  const scheduled = state.scheduledQuests?.[dayIndex.toString()] || [];
  scheduled.forEach(sq => {
    activeQuests.push({
      id: 'sched_' + dayIndex + '_' + sq.text.replace(/\s/g, '_'),
      text: sq.text,
      stat: sq.stat,
      isScheduled: true
    });
  });
  return activeQuests;
}

// ========== DAILY QUEST REPORT (Jam 6 Pagi) ==========
async function sendDailyQuestReport(state, now) {
  const todayIndex = now.getDay();
  const todayStr = getTodayStr(TIMEZONE);
  
  if (state.lastDailySent === todayStr) {
    console.log('📅 Daily quest sudah dikirim hari ini, skip');
    return false;
  }
  
  const activeQuests = getActiveQuestsForToday(state, todayIndex);
  const completedQuests = state.completedQuests || [];
  
  let questList = '';
  activeQuests.forEach((q, idx) => {
    const completed = (completedQuests[idx] === true) ? '✅' : '⬜';
    questList += `${completed} ${q.text} (+${q.stat})\n`;
  });
  
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const formattedDate = `${days[todayIndex]}, ${now.getDate()} ${getMonthName(now.getMonth())} ${now.getFullYear()}`;
  
  const level = getLevel(state.totalExp || 0);
  const streak = state.streak || 0;
  
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_DAILY_TEMPLATE_ID, {
      player_name: state.playerName || 'Player',
      daily_date: formattedDate,
      quest_list: questList,
      current_level: level,
      current_streak: streak
    });
    console.log(`✅ Daily quest report terkirim untuk ${formattedDate}`);
    return true;
  } catch(err) {
    console.log(`❌ Gagal kirim daily quest: ${err.message || 'unknown'}`);
    return false;
  }
}

// ========== REMINDER BIASA ==========
async function sendReminder(reminder, state, todayStr) {
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_REMINDER_TEMPLATE_ID, {
      player_name: state.playerName || 'Player',
      reminder_message: reminder.message,
      time: reminder.time
    });
    console.log(`✅ Reminder ${reminder.time} terkirim via email`);
    return true;
  } catch(err) {
    console.log(`❌ Gagal kirim reminder ${reminder.time}: ${err.message || 'unknown'}`);
    return false;
  }
}

// ========== MAIN ==========
(async () => {
  try {
    console.log('🔄 Memeriksa reminder...');
    const state = await getGistData();
    
    if (!state) {
      console.log('⚠️ Tidak ada data.');
      return;
    }

    const now = getNowInTimezone(TIMEZONE || 'Asia/Makassar');
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const todayStr = getTodayStr(TIMEZONE || 'Asia/Makassar');
    let modified = false;

    console.log(`🕐 Waktu: ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')} WITA`);
    console.log(`📅 Hari: ${['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][now.getDay()]}, ${todayStr}`);

    // ========== DAILY QUEST (Jam 6:00 - 6:04) ==========
    if (currentMinutes >= 360 && currentMinutes < 365) {
      console.log('📧 Waktu daily quest report (jam 6 pagi)...');
      const sent = await sendDailyQuestReport(state, now);
      if (sent) {
        state.lastDailySent = todayStr;
        modified = true;
      }
    }

    // ========== REMINDER BIASA ==========
    if (state.reminders && state.reminders.length > 0) {
      for (const reminder of state.reminders) {
        if (!reminder.enabled) continue;
        if (!reminder.days?.includes(now.getDay())) continue;

        const [h, m] = reminder.time.split(':').map(Number);
        const reminderMinutes = h * 60 + m;

        if (reminderMinutes <= currentMinutes && reminderMinutes > currentMinutes - 5) {
          if (reminder.lastSent !== todayStr) {
            reminder.lastSent = todayStr;
            modified = true;
            await sendReminder(reminder, state, todayStr);
          }
        }
      }
    }

    if (modified) {
      await updateGist(state);
      console.log('💾 Status diperbarui di Gist.');
    } else {
      console.log('✅ Tidak ada yang perlu dikirim.');
    }

  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
})();