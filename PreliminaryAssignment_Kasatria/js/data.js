import { getSheetCsvUrl } from './config.js';

// Turn "$251,260.80" into a plain number we can compare
export function parseNetWorth(value) {
	if (value == null || value === '') return 0;
	return parseFloat(String(value).replace(/[$,\s]/g, '')) || 0;
}

// Assignment colour rules based on net worth
export function getNetWorthColor(netWorth) {
	if (netWorth < 100000) return 'rgba(220, 53, 69, 0.88)'; // red — under $100K
	if (netWorth <= 200000) return 'rgba(255, 152, 0, 0.88)'; // orange — $100K to $200K
	return 'rgba(40, 167, 69, 0.88)'; // green — above $200K
}

// Grab first letters of the name for the tile (e.g. "Lee Siew Suan" → "LS")
export function getInitials(name) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() || '')
		.join('');
}

// Reads one CSV row properly, even when values contain commas inside quotes
function parseCsvLine(line) {
	const values = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];

		if (char === '"') {
			inQuotes = !inQuotes;
			continue;
		}

		if (char === ',' && !inQuotes) {
			values.push(current.trim());
			current = '';
			continue;
		}

		current += char;
	}

	values.push(current.trim());
	return values;
}

// Converts raw CSV text into a clean list of person objects
export function parseCsv(text) {
	const lines = text.trim().split(/\r?\n/);
	if (lines.length < 2) return [];

	const headers = parseCsvLine(lines[0]).map((header) => header.trim());
	const records = [];

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		const values = parseCsvLine(line);
		const record = {};

		headers.forEach((header, index) => {
			record[header.trim()] = values[index]?.trim() ?? '';
		});

		if (record.Name) {
			records.push({
				rank: records.length + 1,
				name: record.Name,
				photo: record.Photo,
				age: record.Age,
				country: record.Country,
				interest: record.Interest,
				netWorthRaw: record['Net Worth'] || '',
				netWorth: parseNetWorth(record['Net Worth']),
			});
		}
	}

	return records;
}

// Fetches data from Google Sheets (or local CSV as fallback) and parses it
export async function fetchSheetData() {
	const response = await fetch(getSheetCsvUrl());

	if (!response.ok) {
		throw new Error(`Failed to load data (${response.status}). Check your Google Sheet sharing settings.`);
	}

	const csvText = await response.text();
	const records = parseCsv(csvText);

	if (records.length === 0) {
		throw new Error('No records found in the data source.');
	}

	return records;
}
