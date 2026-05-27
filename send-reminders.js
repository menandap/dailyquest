const emailjs = require('@emailjs/nodejs');
const fetch = require('node-fetch');

const {
  GITHUB_TOKEN,
  GIST_ID,
  EMAILJS_PUBLIC_KEY,
  EMAILJS_PRIVATE_KEY,
  EMAILJS_SERVICE_ID,
  EMAILJS_REMINDER_TEMPLATE_ID,
  TIMEZONE
} = process.env;

// ========== DEBUG: Cek semua secrets ==========
console.log('🔐 ===== CEK SECRETS =====');
console.log('GIST_ID:', GIST_ID ? GIST_ID.substring(0, 10) + '...' : '❌ KOSONG');
console.log('GITHUB_TOKEN:', GITHUB_TOKEN ? '✅ Ada (length: ' + GITHUB_TOKEN.length + ')' : '❌ KOSONG');
console.log('EMAILJS_PUBLIC_KEY:', EMAILJS_PUBLIC_KEY ? '✅ Ada' : '❌ KOSONG');
console.log('EMAILJS_PRIVATE_KEY:', EMAILJS_PRIVATE_KEY ? '✅ Ada (length: ' + EMAILJS_PRIVATE_KEY.length + ')' : '❌ KOSONG');
console.log('EMAILJS_SERVICE_ID:', EMAILJS_SERVICE_ID ? '✅ Ada' : '❌ KOSONG');
console.log('EMAILJS_REMINDER_TEMPLATE_ID:', EMAILJS_REMINDER_TEMPLATE_ID ? '✅ Ada' : '❌ KOSONG');
console.log('TIMEZONE:', TIMEZONE || 'Asia/Makassar');
console.log('========================\n');

// Inisialisasi dengan Public Key DAN Private Key
emailjs.init({
  publicKey: EMAILJS_PUBLIC_KEY,
  privateKey: EMAILJS_PRIVATE_KEY
});

// ========== TIMEZONE UTILITIES ==========
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

// ========== MAIN ==========
(async () => {
  try {
    console.log('🔄 Memeriksa reminder...');
    const state = await getGistData();
    
    if (!state || !state.reminders || state.reminders.length === 0) {
      console.log('⚠️ Tidak ada data reminder.');
      return;
    }

    const now = getNowInTimezone(TIMEZONE || 'Asia/Makassar');
    const today = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const todayStr = getTodayStr(TIMEZONE || 'Asia/Makassar');
    let modified = false;

    console.log(`🕐 Waktu sekarang: ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} WITA`);
    console.log(`📅 Hari ini: ${['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][today]}, ${todayStr}`);
    console.log(`📋 Total reminder: ${state.reminders.length}`);

    for (const reminder of state.reminders) {
      if (!reminder.enabled) continue;
      if (!reminder.days || !reminder.days.includes(today)) continue;

      const [h, m] = reminder.time.split(':').map(Number);
      const reminderMinutes = h * 60 + m;

      // Cek dalam rentang 5 menit terakhir
      if (reminderMinutes <= currentMinutes && reminderMinutes > currentMinutes - 5) {
        if (reminder.lastSent !== todayStr) {
          reminder.lastSent = todayStr;
          modified = true;

          try {
            const templateParams = {
              player_name: state.playerName || 'Player',
              reminder_message: reminder.message,
              time: reminder.time
            };
            
            console.log(`📧 Mengirim email ke ${EMAILJS_REMINDER_TEMPLATE_ID}...`);
            
            const result = await emailjs.send(
              EMAILJS_SERVICE_ID, 
              EMAILJS_REMINDER_TEMPLATE_ID, 
              templateParams
            );
            console.log(`✅ Reminder ${reminder.time} terkirim via email (status: ${result.status})`);
          } catch(err) {
            console.log(`❌ Gagal kirim reminder ${reminder.time}:`);
            console.log(`   Message: ${err.message || 'tidak ada'}`);
            console.log(`   Status: ${err.status || 'tidak ada'}`);
            if (err.text) console.log(`   Text: ${err.text}`);
          }
        } else {
          console.log(`⏭ Reminder ${reminder.time} sudah dikirim hari ini, skip`);
        }
      }
    }

    if (modified) {
      await updateGist(state);
      console.log('💾 Status pengiriman diperbarui di Gist.');
    } else {
      console.log('✅ Tidak ada reminder yang perlu dikirim.');
    }

  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
})();