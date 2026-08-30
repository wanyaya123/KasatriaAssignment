/**
 * App settings — update these before submitting the assignment.
 *
 * Quick setup:
 * 1. Import Data Template.csv into Google Sheets and share with lisa@kasatria.com
 * 2. Set sheet sharing to "Anyone with the link" → Viewer
 * 3. Create a Google Cloud OAuth Client ID (Web application)
 * 4. Paste your Client ID and Sheet ID below
 */

// If someone pastes the full Google Sheets URL, pull out just the ID part
function extractSheetId(value) {
	if (!value || value === 'YOUR_GOOGLE_SHEET_ID') return value;
	const match = value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
	return match ? match[1] : value.trim();
}

// Main config — swap in your own values here
export const CONFIG = {
	GOOGLE_CLIENT_ID: '321823148934-qujpmmfp0t4pbe0n96tckn05udggm6es.apps.googleusercontent.com',
	SHEET_ID: '19MmXbOnN433PKLItoPsdh3b311Qh81YXCdTLN644D3w',
	SHEET_NAME: 'Sheet1',
	// Used as a backup if no Sheet ID is set yet
	LOCAL_CSV_URL: './data/Data Template.csv',
};

// Builds the URL we use to fetch sheet data as CSV (no API key needed if sheet is public)
export function getSheetCsvUrl() {
	const sheetId = extractSheetId(CONFIG.SHEET_ID);
	const { SHEET_NAME } = CONFIG;

	if (!sheetId || sheetId === 'YOUR_GOOGLE_SHEET_ID') {
		return CONFIG.LOCAL_CSV_URL;
	}

	return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;
}
