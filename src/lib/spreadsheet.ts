import * as XLSX from 'xlsx';

/**
 * Reads the first sheet of an Excel or CSV file as rows.
 * CSV is read as UTF-8 text and kept as written, so accents survive and dates like
 * "03/04/2012" stay day/month/year instead of being turned into US-style date numbers.
 */
export async function readSpreadsheetRows(file: File): Promise<Record<string, unknown>[]> {
  const isCsv = /\.csv$/i.test(file.name) || file.type === 'text/csv';
  const book = isCsv
    ? XLSX.read((await file.text()).replace(/^\uFEFF/, ''), { type: 'string', raw: true })
    : XLSX.read(await file.arrayBuffer(), { type: 'array' });
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(book.Sheets[book.SheetNames[0]], { defval: '' });
}
