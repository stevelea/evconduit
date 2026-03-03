// Lark Base field IDs mapped from the API response
export const FIELD_IDS = {
  ID: 'fldbYEgQKG',
  TYPE: 'fldoguuUe3',
  STATUS: 'fld46iqHB3',
  FUNCTION: 'fldLkY3ANn',
  TITLE: 'fldwVZ0DLW',
  DESCRIPTION: 'fldCiEwdOG',
  STATUS_COMMENTS: 'fldUL2Lpl5',
  CAR_MODELS: 'fld34ebZmj',
  ATTACHMENTS: 'fldE2naCWw',
  FIXED_IN_XOS: 'fldiq7uYhR',
} as const;

// Option ID -> display name mappings
export const TYPE_OPTIONS: Record<string, string> = {
  opt2ndlcEr: 'Suggestion',
  optjs5d3rd: 'Issue',
};

export const STATUS_OPTIONS: Record<string, string> = {
  optjozmSkd: 'New',
  optu08V7dV: 'Review @ XPENG',
  opte5D7JJ7: 'Confirmed @ XPENG',
  opt4lSDVWh: 'Roadmap @ XPENG',
  optvhJLyuJ: 'Work in progress @ XPENG',
  opt8wjlwhk: 'Beta Testing',
  optSNFJFiP: 'Beta Test Success',
  optDipFEk8: 'Beta Test Feedback',
  optIWy4bRV: 'Done / Released',
  optG20mEAN: 'Blocked',
  optlvQRZqI: 'Ended / Declined',
};

export const FUNCTION_OPTIONS: Record<string, string> = {
  optrxFNAHo: 'XCOMBO',
  optldiiv7A: 'AVAS',
  opt995f3Rb: 'Media mirror',
  optoQhXtlE: '360 Camera',
  optqUJFS71: 'AA / CP',
  optZboSiJL: 'ACC',
  opt3eUCxRT: 'ALC',
  optS5wgS3t: 'APA',
  opty3Akmrq: 'App Store',
  optuybyqNw: 'Bluetooth',
  optmH0vB9J: 'Charging',
  optC7fNCp2: 'Dynaudio',
  optQx7TsMh: 'General',
  optmZaySoM: 'Infotainment',
  optTLFXV5Z: 'LCC',
  optDYKsnAX: 'Lights',
  optIXjQ3FJ: 'Mobile App',
  optufBSSl5: 'Navigation',
  optVsySXJe: 'Parking',
  optWaUGFrQ: 'Phone',
  optjaN0NTh: 'Upgrade',
  optXJMLTlW: 'XPILOT',
  optyjtLhw1: 'XGUARD / Dashcam',
};

export const CAR_MODEL_OPTIONS: Record<string, string> = {
  optfY5XJjz: 'G6 2025',
  optQf90nRu: 'G9 2025',
  optDolKmio: 'G6',
  opth445Fp3: 'G9 2023',
  optudQSYfk: 'G9 2024',
  optGIlDoAF: 'P7',
  optLZS3poR: 'N/A',
  optwM1b8MN: 'All models',
};

export const XOS_VERSION_OPTIONS: Record<string, string> = {
  optjQdtCoc: '5.10.0',
  optxHjQCJe: '5.8.0',
  opthxpBHN5: '5.6.0',
  optx0iGpwu: '5.4.6',
  opt4xXQjul: '5.4.5',
  opttczIJmx: '5.2.7',
  opt2rmEgYI: '5.2.6',
  optDQrzKPM: '5.2.5',
};

export const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-100 text-blue-800',
  'Review @ XPENG': 'bg-yellow-100 text-yellow-800',
  'Confirmed @ XPENG': 'bg-orange-100 text-orange-800',
  'Roadmap @ XPENG': 'bg-purple-100 text-purple-800',
  'Work in progress @ XPENG': 'bg-indigo-100 text-indigo-800',
  'Beta Testing': 'bg-cyan-100 text-cyan-800',
  'Beta Test Success': 'bg-teal-100 text-teal-800',
  'Beta Test Feedback': 'bg-lime-100 text-lime-800',
  'Done / Released': 'bg-green-100 text-green-800',
  Blocked: 'bg-red-100 text-red-800',
  'Ended / Declined': 'bg-gray-100 text-gray-600',
};

export const TYPE_COLORS: Record<string, string> = {
  Suggestion: 'bg-blue-100 text-blue-700',
  Issue: 'bg-red-100 text-red-700',
};

export interface TrackerRecord {
  id: string;
  recordId: string;
  type: string;
  status: string;
  functions: string[];
  title: string;
  description: string;
  statusComments: string;
  carModels: string[];
  fixedInXOS: string;
}

// Extract text from Lark rich-text field value
function extractText(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map((seg: { text?: string }) => seg.text || '')
      .join('')
      .trim();
  }
  return '';
}

// Parse a single record from Lark API format to our type
export function parseRecord(recordId: string, fields: Record<string, { value: unknown }>): TrackerRecord {
  const get = (fieldId: string) => fields[fieldId]?.value;

  // ID field is an array with {number, sequence}
  const idValue = get(FIELD_IDS.ID);
  let id = '';
  if (Array.isArray(idValue) && idValue.length > 0) {
    id = idValue[0].number || `ID-${idValue[0].sequence}`;
  }

  // SingleSelect fields return option IDs
  const typeOptId = get(FIELD_IDS.TYPE) as string;
  const statusOptId = get(FIELD_IDS.STATUS) as string;
  const xosOptId = get(FIELD_IDS.FIXED_IN_XOS) as string;

  // MultiSelect fields return arrays of option IDs
  const functionOptIds = (get(FIELD_IDS.FUNCTION) as string[]) || [];
  const carModelOptIds = (get(FIELD_IDS.CAR_MODELS) as string[]) || [];

  return {
    id,
    recordId,
    type: TYPE_OPTIONS[typeOptId] || '',
    status: STATUS_OPTIONS[statusOptId] || '',
    functions: functionOptIds.map((id) => FUNCTION_OPTIONS[id] || id),
    title: extractText(get(FIELD_IDS.TITLE)),
    description: extractText(get(FIELD_IDS.DESCRIPTION)),
    statusComments: extractText(get(FIELD_IDS.STATUS_COMMENTS)),
    carModels: carModelOptIds.map((id) => CAR_MODEL_OPTIONS[id] || id),
    fixedInXOS: XOS_VERSION_OPTIONS[xosOptId] || '',
  };
}

const LARK_BASE_URL = 'https://vjp4csliuiap.jp.larksuite.com';
const LARK_API_PATH = '/space/api/bitable/form/external/list_records';
const SHARE_TOKEN = 'shrjpKCy2qRt6NpBhujyGNcU2ph';
const QUERY_PAGE_URL = `${LARK_BASE_URL}/share/base/query/${SHARE_TOKEN}`;
const REFERER = QUERY_PAGE_URL;

// Session cookies cached in memory (refreshed when expired/invalid)
let sessionCookies: string | null = null;
let sessionTime = 0;
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

// Follow redirects manually to collect cookies from all hops (Lark guest auth flow)
async function getSessionCookies(): Promise<string> {
  const now = Date.now();
  if (sessionCookies && now - sessionTime < SESSION_TTL) {
    return sessionCookies;
  }

  const cookies: Record<string, string> = {};
  let currentUrl: string = QUERY_PAGE_URL;

  for (let step = 0; step < 10; step++) {
    const cookieStr = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');

    const res = await fetch(currentUrl, {
      redirect: 'manual',
      headers: cookieStr ? { Cookie: cookieStr } : {},
    });

    // Collect Set-Cookie headers from this hop
    for (const c of res.headers.getSetCookie?.() || []) {
      const [pair] = c.split(';');
      const eqIdx = pair.indexOf('=');
      if (eqIdx > 0) {
        cookies[pair.substring(0, eqIdx).trim()] = pair.substring(eqIdx + 1).trim();
      }
    }

    if (res.status >= 300 && res.status < 400) {
      let location = res.headers.get('location') || '';
      if (location.startsWith('/')) {
        const u = new URL(currentUrl);
        location = u.origin + location;
      }
      currentUrl = location;
      await res.text();
    } else {
      await res.text();
      break;
    }
  }

  sessionCookies = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
  sessionTime = now;
  return sessionCookies;
}

export async function fetchAllRecords(): Promise<TrackerRecord[]> {
  const cookies = await getSessionCookies();
  const records: TrackerRecord[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const body: Record<string, unknown> = {
      filter: '{"conditions":[],"conjunction":"and"}',
      shareToken: SHARE_TOKEN,
    };
    if (offset > 0) {
      body.offset = offset;
    }

    const res = await fetch(`${LARK_BASE_URL}${LARK_API_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Referer: REFERER,
        Cookie: cookies,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      // If 403, try refreshing session
      if (res.status === 403 && sessionCookies) {
        sessionCookies = null;
        const newCookies = await getSessionCookies();
        const retryRes = await fetch(`${LARK_BASE_URL}${LARK_API_PATH}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Referer: REFERER,
            Cookie: newCookies,
          },
          body: JSON.stringify(body),
        });
        if (!retryRes.ok) {
          throw new Error(`Lark API error: ${retryRes.status}`);
        }
        const retryData = await retryRes.json();
        const retryResult = retryData.data;
        if (retryResult?.recordMap) {
          for (const [recId, fields] of Object.entries(retryResult.recordMap)) {
            records.push(parseRecord(recId, fields as Record<string, { value: unknown }>));
          }
        }
        hasMore = retryResult?.hasMore === true;
        if (hasMore && retryResult?.nextOffset != null) {
          offset = retryResult.nextOffset;
        } else {
          hasMore = false;
        }
        continue;
      }
      throw new Error(`Lark API error: ${res.status}`);
    }

    const data = await res.json();

    // Check for login required error
    if (data.code === 5) {
      sessionCookies = null;
      throw new Error('Lark session expired, will retry on next request');
    }

    const result = data.data;

    if (result?.recordMap) {
      for (const [recId, fields] of Object.entries(result.recordMap)) {
        records.push(parseRecord(recId, fields as Record<string, { value: unknown }>));
      }
    }

    hasMore = result?.hasMore === true;
    if (hasMore && result?.nextOffset != null) {
      offset = result.nextOffset;
    } else {
      hasMore = false;
    }
  }

  // Sort by ID number descending (newest first)
  records.sort((a, b) => {
    const numA = parseInt(a.id.replace('ID-', '')) || 0;
    const numB = parseInt(b.id.replace('ID-', '')) || 0;
    return numB - numA;
  });

  return records;
}

export const LARK_FORM_URL = 'https://vjp4csliuiap.jp.larksuite.com/share/base/form/shrjp6aV8JIVUFKohtexjzlcnth';

// Software version options available on the Lark submission form
export const FORM_XOS_VERSIONS = [
  'XOS 5.8.7',
  'XOS 5.8.5',
  'XOS 5.8.0',
  'XOS 5.6.0',
  'XOS 5.4.6',
  'XOS 5.4.5',
  'XOS 5.2.7',
  'XOS 5.2.6',
  'XOS 5.2.5',
  'XOS 4.X',
  "Other/I don't know ",
];
