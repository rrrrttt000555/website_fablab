const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3001;
const SAMBANOVA_API_KEY = process.env.SAMBANOVA_API_KEY;
const SAMBANOVA_HOST = 'api.sambanova.ai';
const SAMBANOVA_PATH = '/v1/chat/completions';
const SAMBANOVA_MODEL = 'Meta-Llama-3.3-70B-Instruct';

const publicDir = __dirname;

const sendJson = (res, statusCode, data) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
};

const callSambaNova = (message, callback) => {
    if (!SAMBANOVA_API_KEY) {
        callback(new Error('SAMBANOVA_API_KEY is not set'), null);
        return;
    }

    const payload = JSON.stringify({
        model: SAMBANOVA_MODEL,
        messages: [
            {
                role: 'system',
                content:
                    'Ты дружелюбный помощник ФабЛаб ТюмГУ. ' +
                    'Всегда отвечай на том же языке, на котором задаёт вопросы пользователь ' +
                    '(поддерживаешь русский, английский и другие распространённые языки). ' +
                    'Адрес ФабЛаб ТюмГУ: г. Тюмень, ул. Ленина 25, 5 этаж. ' +
                    'Телефон ФабЛаб ТюмГУ: +7 (3452) 57-48-42. ' +
                    'Если тебя спрашивают адрес, местоположение или как добраться до ФабЛаб ТюмГУ, ' +
                    'всегда используй именно этот адрес без изменений. ' +
                    'Если тебя спрашивают телефон или как позвонить, ' +
                    'всегда используй именно этот номер телефона без изменений.'
            },
            { role: 'user', content: message }
        ],
        stream: false
    });

    const options = {
        hostname: SAMBANOVA_HOST,
        path: SAMBANOVA_PATH,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SAMBANOVA_API_KEY}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        }
    };

    const request = https.request(options, response => {
        let data = '';

        response.on('data', chunk => {
            data += chunk;
        });

        response.on('end', () => {
            try {
                const parsed = JSON.parse(data);

                let reply;

                if (
                    parsed &&
                    parsed.choices &&
                    parsed.choices[0] &&
                    parsed.choices[0].message &&
                    parsed.choices[0].message.content
                ) {
                    reply = parsed.choices[0].message.content;
                } else if (parsed && parsed.error && parsed.error.message) {
                    console.error('SambaNova API error:', parsed.error);
                    reply = 'Сейчас я временно недоступен. Попробуйте ещё раз чуть позже.';
                } else {
                    console.error('SambaNova unexpected response:', parsed);
                    reply = 'Сейчас я временно недоступен. Попробуйте ещё раз чуть позже.';
                }

                callback(null, reply);
            } catch (e) {
                console.error('SambaNova JSON parse error:', e, data);
                callback(e, null);
            }
        });
    });

    request.on('error', err => {
        callback(err, null);
    });

    request.write(payload);
    request.end();
};

const server = http.createServer((req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.writeHead(204);
        res.end();
        return;
    }
    const parsedUrl = url.parse(req.url, true);

    if (req.method === 'POST' && parsedUrl.pathname === '/api/chat') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const parsedBody = JSON.parse(body || '{}');
                const message = (parsedBody && parsedBody.message) || '';

                if (!message) {
                    sendJson(res, 400, { reply: 'Пустое сообщение.' });
                    return;
                }

                const lower = message.toLowerCase();
                const addressReply =
                    'Адрес ФабЛаб ТюмГУ: г. Тюмень, ул. Ленина 25, 5 этаж.';
                const addressKeywords = [
                    'адрес',
                    'какой у вас адрес',
                    'ваш адрес',
                    'адрес фаблаб',
                    'адрес флаб',
                    'где вы находитесь',
                    'где находится',
                    'где вы находитесь?',
                    'где вы',
                    'где фаблаб',
                    'где находится фаблаб',
                    'где находится флаб',
                    'как добраться',
                    'как к вам добраться',
                    'как доехать',
                    'как доехать до вас',
                    'как доехать до фаблаб',
                    'как доехать до флаб',
                    'как к вам приехать',
                    'как к вам пройти',
                    'куда приходить',
                    'куда приехать',
                    'локация',
                    'местоположение',
                    'место нахождения'
                ];

                if (addressKeywords.some(phrase => lower.includes(phrase))) {
                    sendJson(res, 200, { reply: addressReply });
                    return;
                }

                const phoneReply =
                    'Телефон ФабЛаб ТюмГУ: +7 (3452) 57-48-42.';
                const phoneKeywords = [
                    'телефон',
                    'тел.',
                    'номер телефона',
                    'номер тел',
                    'какой у вас телефон',
                    'ваш телефон',
                    'телефон фаблаб',
                    'телефон флаб',
                    'телефон для связи',
                    'контактный телефон',
                    'номер для связи',
                    'как позвонить',
                    'как с вами связаться',
                    'как связаться',
                    'как записаться по телефону',
                    'по какому номеру позвонить',
                    'по какому телефону'
                ];

                if (phoneKeywords.some(phrase => lower.includes(phrase))) {
                    sendJson(res, 200, { reply: phoneReply });
                    return;
                }

                const socialAllReply =
                    'Наши социальные сети:\n' +
                    'VK: https://vk.com/futureprof.academy\n' +
                    'Telegram: https://t.me/futureprof_academy\n' +
                    'YouTube: https://www.youtube.com/channel/UCIv_kRijBFWg-gcA439c1EA';
                const socialAllKeywords = [
                    'соцсети',
                    'соц сети',
                    'социальные сети',
                    'ваши соц',
                    'ваши социальные сети',
                    'ссылки на соц',
                    'ссылки на социальные сети'
                ];

                if (socialAllKeywords.some(phrase => lower.includes(phrase))) {
                    sendJson(res, 200, { reply: socialAllReply });
                    return;
                }

                const vkReply =
                    'Наша группа ВКонтакте: https://vk.com/futureprof.academy';
                const vkKeywords = [
                    'вк',
                    'vk',
                    'вконтакт',
                    'вконтакте',
                    'ссылка на вк',
                    'группа вк',
                    'группа во вк',
                    'группа вконтакте'
                ];

                if (vkKeywords.some(phrase => lower.includes(phrase))) {
                    sendJson(res, 200, { reply: vkReply });
                    return;
                }

                const telegramReply =
                    'Наш Telegram-канал: https://t.me/futureprof_academy';
                const telegramKeywords = [
                    'телеграм',
                    'telegram',
                    'тг',
                    'ссылка на телеграм',
                    'канал в телеграм',
                    'канал в тг'
                ];

                if (telegramKeywords.some(phrase => lower.includes(phrase))) {
                    sendJson(res, 200, { reply: telegramReply });
                    return;
                }

                const youtubeReply =
                    'Наш YouTube-канал: https://www.youtube.com/channel/UCIv_kRijBFWg-gcA439c1EA';
                const youtubeKeywords = [
                    'ютуб',
                    'youtube',
                    'you tube',
                    'канал на ютубе',
                    'канал на youtube',
                    'ссылка на ютуб',
                    'ссылка на youtube'
                ];

                if (youtubeKeywords.some(phrase => lower.includes(phrase))) {
                    sendJson(res, 200, { reply: youtubeReply });
                    return;
                }

                callSambaNova(message, (err, reply) => {
                    if (err) {
                        sendJson(res, 500, {
                            reply: 'Сейчас я временно недоступен. Попробуйте ещё раз чуть позже.'
                        });
                        return;
                    }

                    sendJson(res, 200, { reply });
                });
            } catch (e) {
                sendJson(res, 400, { reply: 'Некорректный формат запроса.' });
            }
        });

        return;
    }

    const safePath = path.normalize(parsedUrl.pathname).replace(/^(\.\.[\/\\])+/, '');
    let filePath = path.join(publicDir, safePath);

    if (parsedUrl.pathname === '/' || parsedUrl.pathname === '') {
        filePath = path.join(publicDir, 'index.html');
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const map = {
            '.html': 'text/html; charset=utf-8',
            '.js': 'text/javascript; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.pdf': 'application/pdf'
        };

        const contentType = map[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
