import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; }
    else if (c === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += c; }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(filePath) {
  const text = readFileSync(filePath, 'latin1');
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  });
}

// Physical Attraction
const physRows = parseCSV(join(root, '[SignOff] Bardo Physical attraction LC26.27 S1 - Responses.csv'));
const physData = physRows.map(r => ({
  expaId: r['EXPA ID'],
  submissionId: r['Submission ID'],
  submittedAt: r['Submitted at'],
  firstName: r['[FN] First Name'],
  lastName: r['[LN] Last Name'],
  phone: r['[PN] Phone Number'],
  email: r['[E] Email'],
  university: r['[UN] University Name'],
  universityLevel: r['🎓 University Level'],
  fieldOfStudy: r['📚 Field of study '],
  internshipType: r['🌍 Type Of Abroad Internship'],
  referral: r['📢Referral'],
  memberName: r['🙋Member Name'],
  hackathonInterest: r['💻Are you interested to attend a hackathon ?'],
  accountStatus: r['Account Satus'],
}));

// OGX / Digital
const ogxRows = parseCSV(join(root, '[SignOff] Bardo National OGX Responses MC25.26 S2 - Responses.csv'));
const ogxData = ogxRows.map(r => ({
  expaId: r['EXPA ID'],
  submissionId: r['Submission ID'],
  submittedAt: r['Submitted at'],
  firstName: r['[FN] First Name'],
  lastName: r['[LN] Last Name'],
  phone: r['[PN] Phone Number'],
  email: r['[E] Email'],
  university: r['[UN] University Name'],
  fieldOfStudy: r['📚 Field of study '],
  yearOfStudy: r['🗓️ Year of study '],
  internshipType: r['🌍 Type Of Abroad Internship'],
  referral: r['📢Referral'],
  volunteering: r['🌍 Type Of Abroad Internship (Volunteering Internship)'] === 'TRUE',
  professional: r['🌍 Type Of Abroad Internship (Professional Internship)'] === 'TRUE',
  teaching: r['🌍 Type Of Abroad Internship (Teaching Internship)'] === 'TRUE',
  accountStatus: r['Account Satus'],
}));

const outDir = join(__dirname, '..', 'src', 'data');
writeFileSync(join(outDir, 'physicalAttraction.json'), JSON.stringify(physData, null, 2));
writeFileSync(join(outDir, 'ogxLeads.json'), JSON.stringify(ogxData, null, 2));

console.log(`Physical: ${physData.length} rows`);
console.log(`OGX: ${ogxData.length} rows`);
