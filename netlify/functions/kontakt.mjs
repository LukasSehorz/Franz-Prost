/* =====================================================================
   KONTAKTFORMULAR → RESEND (seit 17.11.2026)
   Nimmt das Kontaktformular von /kontakt/ entgegen und schickt es über
   Resend an info@akademie-besseres-leben.eu. „Antworten“ geht direkt an
   die absendende Person. Bei Netlify wird nichts gespeichert.

   DER SCHLÜSSEL STEHT NICHT IN DIESER DATEI. Er kommt aus der
   Netlify-Umgebungsvariable RESEND_API_KEY (nur Senderecht).
   Absender-Domain muss in Resend bestätigt sein (DNS bei KAS).

   Vorlage: Lack & Karosserie Benda / Estera, gleicher Spamschutz:
   Feldfalle, unterschriebener Prüfwert, Zeitfalle 4 s, Inhaltsfilter.
   ===================================================================== */
import crypto from 'node:crypto';

export const config = { path: '/api/kontakt' };

const EMPFAENGER = process.env.EMPFAENGER || 'info@akademie-besseres-leben.eu';
const ABSENDER = process.env.ABSENDER || 'Webseite Akademie <formular@akademie-besseres-leben.eu>';
const MINDESTALTER_MS = 4000;
const HOECHSTALTER_MS = 24 * 60 * 60 * 1000;

const FELDER = [
  ['vorname', 'Vorname'], ['name', 'Name'], ['email', 'E-Mail'], ['telefon', 'Telefon'],
  ['betreff', 'Betreff'], ['nachricht', 'Nachricht'],
];

function schluessel() {
  const quelle = process.env.FORMULAR_GEHEIMNIS || process.env.RESEND_API_KEY || '';
  return crypto.createHash('sha256').update('akademie-kontakt:' + quelle).digest();
}
function unterschrift(zeit) {
  return crypto.createHmac('sha256', schluessel()).update(zeit).digest('base64url').slice(0, 22);
}
function pruefwertAlter(wert) {
  const m = /^([0-9a-z]{6,12})\.([A-Za-z0-9_-]{22})$/.exec(String(wert || '').trim());
  if (!m) return null;
  const soll = Buffer.from(unterschrift(m[1])), ist = Buffer.from(m[2]);
  if (soll.length !== ist.length || !crypto.timingSafeEqual(soll, ist)) return null;
  return Date.now() - parseInt(m[1], 36);
}
const SPAM = [/freeb2bdata|b2b ?data/i, /wanted to know your price/i,
  /\b(seo|backlinks?|casino|crypto|bitcoin|viagra|forex)\b/i, /[Ѐ-ӿ一-鿿]/];

const json = (status, d) => new Response(JSON.stringify(d), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const verwerfen = (grund) => { console.log('Kontakt verworfen:', grund); return json(200, { ok: true }); };
const h = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const istEmail = (s) => /^[^\s@<>,;]+@[^\s@<>,;]+\.[a-z]{2,}$/i.test(String(s || '').trim());

function mailHtml(w) {
  const zeilen = FELDER.filter(([k]) => w[k]).map(([k, t]) => `<tr>
    <td style="padding:10px 16px;border-bottom:1px solid #e8eaec;font:400 13px/1.5 Arial,sans-serif;color:#5b6157;white-space:nowrap;vertical-align:top;">${h(t)}</td>
    <td style="padding:10px 16px;border-bottom:1px solid #e8eaec;font:400 15px/1.5 Arial,sans-serif;color:#1d2419;white-space:pre-wrap;">${h(w[k])}</td></tr>`).join('');
  return `<!doctype html><html lang="de"><body style="margin:0;padding:24px;background:#f4f5f2;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e8eaec;border-radius:6px;">
  <tr><td style="padding:22px 16px;background:#2f4a2c;border-radius:6px 6px 0 0;">
    <div style="font:700 17px/1.3 Arial,sans-serif;color:#fff;">Akademie für ein besseres Leben</div>
    <div style="font:400 13px/1.5 Arial,sans-serif;color:#d9e6c8;margin-top:6px;">Neue Nachricht über das Kontaktformular</div></td></tr>
  <tr><td style="padding:8px 0;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%">${zeilen}</table></td></tr>
  <tr><td style="padding:16px;font:400 12px/1.6 Arial,sans-serif;color:#8a8f86;border-top:1px solid #e8eaec;">
    Gesendet über akademie-besseres-leben.eu/kontakt. Datenschutz-Zustimmung wurde erteilt. Ein Klick auf „Antworten“ geht direkt an die absendende Person.</td></tr>
  </table></body></html>`;
}

export default async (req) => {
  if (req.method === 'GET') {
    const z = Date.now().toString(36);
    return json(200, { t: z + '.' + unterschrift(z) });
  }
  if (req.method !== 'POST') return json(405, { fehler: 'Nur GET und POST.' });
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.error('RESEND_API_KEY fehlt.'); return json(503, { fehler: 'Versand nicht eingerichtet.' }); }

  let d;
  try { d = await req.json(); } catch { return json(400, { fehler: 'Ungültige Daten.' }); }
  const w = {};
  for (const [k] of FELDER) w[k] = String(d[k] || '').trim().slice(0, k === 'nachricht' ? 8000 : 300);

  if (String(d['bot-field'] || '').trim()) return verwerfen('feldfalle');
  const alter = pruefwertAlter(d.pruefwert);
  if (alter == null) return verwerfen('pruefwert');
  if (alter < MINDESTALTER_MS || alter > HOECHSTALTER_MS) return verwerfen('zeit ' + alter);
  if (!d.datenschutz) return json(400, { fehler: 'Bitte stimmen Sie der Datenschutzerklärung zu.' });
  if (!w.vorname || !w.name || !w.betreff || !w.nachricht || !istEmail(w.email))
    return json(400, { fehler: 'Bitte füllen Sie alle Pflichtfelder aus.' });
  const alles = Object.values(w).join(' ');
  if (SPAM.some((r) => r.test(alles))) return verwerfen('inhalt');

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: ABSENDER, to: [EMPFAENGER], reply_to: w.email,
      subject: 'Kontaktformular: ' + w.betreff + ' – ' + w.vorname + ' ' + w.name,
      html: mailHtml(w),
      text: FELDER.filter(([k]) => w[k]).map(([k, t]) => t + ': ' + w[k]).join('\n'),
    }),
  });
  if (!r.ok) { console.error('Resend-Fehler', r.status, (await r.text()).slice(0, 300)); return json(502, { fehler: 'Versand fehlgeschlagen.' }); }
  return json(200, { ok: true });
};
