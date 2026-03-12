import * as XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ws = XLSX.utils.aoa_to_sheet([
  ['Employee Name', 'SSN Last 4', 'Facility', 'Policy Number'],
  ['Alice Johnson', '9999', 'Gamma Inc', 'WC-003'],
  ['Bob Wilson', '1111', 'Delta Co', 'WC-004'],
]);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
XLSX.writeFile(wb, path.join(__dirname, 'sample.xlsx'));
console.log('Created sample.xlsx');
