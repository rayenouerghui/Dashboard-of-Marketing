// Utility functions to parse CSV data into typed objects

export interface AttractionLead {
  expaId: string;
  submissionId: string;
  respondentId: string;
  submittedAt: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  universityName: string;
  universityLevel: string;
  fieldOfStudy: string;
  internshipType: string;
  gvEntityChoice?: string;
  gtEntityChoice?: string;
  availability?: string;
  referral: string;
  memberName?: string;
  hackathonInterest?: string;
  accountStatus: string;
}

export interface DigitalLead {
  expaId: string;
  submissionId: string;
  respondentId: string;
  submittedAt: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  referral: string;
  universityName: string;
  fieldOfStudy: string;
  yearOfStudy: string;
  internshipType: string;
  volunteeringInterest: boolean;
  professionalInterest: boolean;
  teachingInterest: boolean;
  accountStatus: string;
}

export function parseAttractionCSV(csvText: string): AttractionLead[] {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',');
  const data: AttractionLead[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    if (values.length < 10) continue;

    data.push({
      expaId: values[0] || '',
      submissionId: values[1] || '',
      respondentId: values[2] || '',
      submittedAt: values[3] || '',
      firstName: values[4] || '',
      lastName: values[5] || '',
      phoneNumber: values[6] || '',
      email: values[7] || '',
      universityName: values[8] || '',
      universityLevel: values[9] || '',
      fieldOfStudy: values[10] || '',
      internshipType: values[11] || '',
      gvEntityChoice: values[12],
      gtEntityChoice: values[13],
      availability: values[14],
      referral: values[15] || '',
      memberName: values[16],
      hackathonInterest: values[17],
      accountStatus: values[18] || '',
    });
  }

  return data;
}

export function parseDigitalCSV(csvText: string): DigitalLead[] {
  const lines = csvText.split('\n');
  const data: DigitalLead[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    if (values.length < 10) continue;

    data.push({
      expaId: values[0] || '',
      submissionId: values[1] || '',
      respondentId: values[2] || '',
      submittedAt: values[3] || '',
      firstName: values[4] || '',
      lastName: values[5] || '',
      phoneNumber: values[6] || '',
      email: values[7] || '',
      referral: values[8] || '',
      universityName: values[9] || '',
      fieldOfStudy: values[10] || '',
      yearOfStudy: values[11] || '',
      internshipType: values[12] || '',
      volunteeringInterest: values[13] === 'TRUE',
      professionalInterest: values[14] === 'TRUE',
      teachingInterest: values[15] === 'TRUE',
      accountStatus: values[16] || '',
    });
  }

  return data;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}
