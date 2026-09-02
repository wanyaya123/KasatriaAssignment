/**
 * App settings — Google Sign-In and Google Sheet data source.
 *
 * 1. Import the CSV into Google Sheets and share with lisa@kasatria.com
 * 2. Set sharing to "Anyone with the link" → Viewer
 * 3. Create an OAuth Client ID (Web application) in Google Cloud
 * 4. Paste your Client ID and Sheet ID below
 */

// Main config — swap in your own values here
export const CONFIG = {
	GOOGLE_CLIENT_ID: '321823148934-qujpmmfp0t4pbe0n96tckn05udggm6es.apps.googleusercontent.com',
	SHEET_ID: '19MmXbOnN433PKLItoPsdh3b311Qh81YXCdTLN644D3w',
	SHEET_NAME: 'Sheet1',
};

// If someone pastes the full Google Sheets URL, pull out just the ID part
function extractSheetId(value) {
	const match = String(value).match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
	return match ? match[1] : String(value).trim();
}

// Builds the URL we use to fetch sheet data as CSV
export function getSheetCsvUrl() {
	const sheetId = extractSheetId(CONFIG.SHEET_ID);
	const { SHEET_NAME } = CONFIG;

	return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;
}
