'use strict';

/**
 * Обновляет данные профилей для статической версии (GitHub Pages).
 *
 * Запускается GitHub Action по расписанию: тянет Steam / Telegram / GitHub,
 * сохраняет аватарки в assets/ и пишет data/profiles.json.
 * Страница на Pages читает этот JSON — бэкенд не нужен.
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'data', 'profiles.json');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const LINKS = [
  { id: 'steam', label: 'Steam', url: 'https://steamcommunity.com/id/dozzics/' },
  { id: 'github', label: 'GitHub', url: 'https://github.com/dozzics' },
  { id: 'telegram', label: 'Telegram', url: 'https://t.me/DOZZIcs_offc' },
  { id: 'discord', label: 'Discord', url: null },
];

const STATIC = { discord: { nick: 'dozzicsbg', avatar: null } };

async function get(url, accept) {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: accept || '*/*', 'accept-language': 'ru,en;q=0.9' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res;
}

async function getText(url, accept) {
  return (await get(url, accept)).text();
}

function steamProfile(xml) {
  const pick = (tag) => {
    const cdata = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`));
    if (cdata) return cdata[1].trim();
    const plain = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
    return plain ? plain[1].trim() : '';
  };
  return { nick: pick('steamID'), avatar: pick('avatarFull') };
}

function telegramProfile(html) {
  const meta = (prop) => {
    const m = html.match(new RegExp(`<meta property="og:${prop}" content="([^"]*)"`));
    return m ? m[1] : '';
  };
  // og:title — отображаемое имя, нужен именно @username.
  const extra = html.match(/tgme_page_extra">\s*@?([A-Za-z0-9_]{4,})/);
  const uname = (extra && extra[1]) || (html.match(/"username":"([A-Za-z0-9_]{4,})"/) || [])[1] || '';
  const title = meta('title').replace(/\s*\([^)]*\)\s*$/, '').trim();
  return { nick: uname ? `@${uname}` : title, avatar: meta('image') };
}

function githubProfile(json) {
  return {
    nick: json.name || (json.login ? `@${json.login}` : ''),
    avatar: json.avatar_url || '',
  };
}

async function loadRemote(id) {
  if (id === 'steam') {
    return steamProfile(
      await getText('https://steamcommunity.com/id/dozzics/?xml=1', 'text/xml,application/xml'),
    );
  }
  if (id === 'telegram') {
    return telegramProfile(await getText('https://t.me/DOZZIcs_offc', 'text/html'));
  }
  if (id === 'github') {
    const text = await getText('https://api.github.com/users/dozzics', 'application/json');
    return githubProfile(JSON.parse(text));
  }
  return null;
}

async function downloadImage(url) {
  const res = await get(url, 'image/*');
  const type = (res.headers.get('content-type') || '').toLowerCase();
  const ext = type.includes('webp')
    ? 'webp'
    : type.includes('png')
      ? 'png'
      : type.includes('gif')
        ? 'gif'
        : 'jpg';
  return { bytes: Buffer.from(await res.arrayBuffer()), ext };
}

async function readPrevious() {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  const previous = await readPrevious();
  const prevLinks = new Map((previous && previous.links ? previous.links : []).map((l) => [l.id, l]));

  const links = [];
  const imageHashes = [];

  for (const link of LINKS) {
    if (link.id === 'discord') {
      links.push({ ...link, ...STATIC.discord });
      continue;
    }

    try {
      const remote = await loadRemote(link.id);
      let avatarPath = prevLinks.get(link.id)?.avatar || null;

      if (remote.avatar) {
        try {
          const image = await downloadImage(remote.avatar);
          const name = `${link.id}.${image.ext}`;
          await fs.writeFile(path.join(ROOT, 'assets', name), image.bytes);
          avatarPath = `assets/${name}`;
          imageHashes.push(crypto.createHash('sha1').update(image.bytes).digest('hex'));
          console.log(`${link.id}: аватар ${name} (${image.bytes.length} байт)`);
        } catch (error) {
          console.warn(`${link.id}: аватар не скачался — ${error.message}`);
        }
      }

      links.push({
        ...link,
        nick: remote.nick || prevLinks.get(link.id)?.nick || '',
        avatar: avatarPath,
      });
      console.log(`${link.id}: ник "${remote.nick}"`);
    } catch (error) {
      console.warn(`${link.id}: источник недоступен — ${error.message}`);
      const prev = prevLinks.get(link.id);
      links.push({ ...link, nick: prev?.nick || '', avatar: prev?.avatar || null });
    }
  }

  const signature = crypto
    .createHash('sha1')
    .update(JSON.stringify(links) + imageHashes.join(''))
    .digest('hex');
  const updatedAt = previous && previous.signature === signature
    ? previous.updatedAt
    : new Date().toISOString();

  const data = { updatedAt, signature, links };
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(`data/profiles.json обновлён (updatedAt=${updatedAt})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
