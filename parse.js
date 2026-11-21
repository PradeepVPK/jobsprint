// Turn whatever a job app shares (title/text/url) into {title, company, url, source}.
// Share text formats vary by app and version, so this is best-effort; the form
// lets you correct it and the sheet script fills blanks from the page itself.
(function (root) {
  const SOURCES = [
    [/linkedin/, 'LinkedIn'], [/naukri/, 'Naukri'], [/indeed/, 'Indeed'], [/instahyre/, 'Instahyre'],
    [/wellfound|angel\.co/, 'Wellfound'], [/foundit|monster/, 'Foundit'], [/iimjobs/, 'iimjobs'],
    [/hirist/, 'Hirist'], [/cutshort/, 'Cutshort'], [/glassdoor/, 'Glassdoor'],
  ];

  function sourceOf(url) {
    let host = '';
    try { host = new URL(url).hostname; } catch (e) { return ''; }
    for (const [re, name] of SOURCES) if (re.test(host)) return name;
    return host.replace(/^www\./, '');
  }

  const tidy = (s) => String(s || '').replace(/\s+/g, ' ').replace(/^[\s:,.\-–|]+|[\s:,.\-–|!]+$/g, '').trim();

  // Filler phrases apps put around the job details.
  const FILLER = [
    /^(hey|hi|hello)[,!]?\s*/i,
    /^(check out|look at|have a look at|take a look at|see|found|i found|i came across|sharing|interesting)\s+(this|a|the)?\s*(job|role|opening|position|opportunity)?\s*(opening|posting|listing)?\s*(on|at|from|via)?\s*(linkedin|naukri(\.com)?|indeed)?\s*[:\-–]?\s*/i,
    /\s*(on|via|from)\s+(linkedin|naukri(\.com)?|indeed)\s*$/i,
    /\s*[|\-–]\s*(linkedin|naukri(\.com)?|indeed)\s*$/i,
    /\s*(apply (now|here|on).*|click (here|the link).*)$/i,
  ];

  function stripFiller(s) {
    let prev;
    do { prev = s; for (const re of FILLER) s = s.replace(re, ''); } while (s !== prev);
    return tidy(s);
  }

  // Naukri slugs: /job-listings-java-developer-acme-tech-bengaluru-3-to-6-years-211124012345
  function fromNaukriSlug(url) {
    const m = url.match(/job-listings-(.+?)-(\d+)-to-(\d+)-years?-\d+/i) || url.match(/job-listings-(.+?)-\d{6,}/i);
    if (!m) return '';
    return m[1].split('-').map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
  }

  function parseShare({ title = '', text = '', url = '' } = {}) {
    const all = [title, text, url].join(' ');
    const urlMatch = (url && /^https?:\/\//.test(url) ? url : '') || (all.match(/https?:\/\/[^\s"'<>]+/) || [])[0] || '';
    const cleanUrl = urlMatch.replace(/[).,!?]+$/, '');
    let body = [text, title].filter(Boolean).join('\n')
      .replace(/[(\[]?\s*https?:\/\/[^\s"'<>]+/g, ' ') // the link, plus a bracket opened just before it
      .replace(/[(\[]\s*[)\]]/g, ' ');
    // Use the first meaningful line.
    const lines = body.split(/\n+/).map(stripFiller).filter((l) => l.length > 2);
    let line = lines[0] || '';

    let jobTitle = '', company = '';
    let m;
    // "Check out this job at Zeta: Software Engineer II" — company before the colon.
    const raw = (body.split(/\n+/).find((l) => l.trim().length > 2) || '').trim();
    if ((m = raw.match(/\bjob\s+(?:at|with)\s+([^:]{2,60}):\s*(.+)$/i))) {
      company = m[1]; jobTitle = m[2];
    } else if ((m = line.match(/^(.+?)\s+(?:is\s+)?hiring(?:\s+(?:for|an?))?\s*[:\-–]?\s+(.+?)(?:\s+in\s+[^,]+(?:,.*)?)?$/i))) {
      company = m[1]; jobTitle = m[2];                       // "Acme is hiring a Senior Engineer in Pune"
    } else if ((m = line.match(/^(.+?)\s+(?:at|@)\s+(.+?)(?:\s+in\s+[^,]+(?:,.*)?)?$/i))) {
      jobTitle = m[1]; company = m[2];                       // "Senior Engineer at Acme"
    } else if ((m = line.match(/^(.+?)\s+[|\-–]\s+(.+?)(?:\s+[|\-–]\s+.*)?$/))) {
      jobTitle = m[1]; company = m[2];                       // "Senior Engineer - Acme - Pune"
    } else {
      jobTitle = line;
    }
    if (!jobTitle && /naukri/i.test(cleanUrl)) jobTitle = fromNaukriSlug(cleanUrl);
    return {
      title: tidy(jobTitle).slice(0, 200),
      company: tidy(company).replace(/\s+(?:in|for)$/i, '').slice(0, 120),
      url: cleanUrl,
      source: sourceOf(cleanUrl),
    };
  }

  root.parseShare = parseShare;
  if (typeof module !== 'undefined') module.exports = { parseShare };
})(typeof window !== 'undefined' ? window : globalThis);
