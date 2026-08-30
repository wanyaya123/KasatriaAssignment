import { CONFIG } from './config.js';

let currentUser = null;
let googleButtonRendered = false;

export function getCurrentUser() {
	return currentUser;
}

// Sets up Google Sign-In and calls onSuccess once the user is logged in
export function initGoogleAuth(onSuccess) {
	if (!CONFIG.GOOGLE_CLIENT_ID || CONFIG.GOOGLE_CLIENT_ID.startsWith('YOUR_')) {
		document.getElementById('auth-warning').hidden = false;
		return;
	}

	// Google sends back a JWT token — we decode it to get name, email, photo
	window.handleGoogleCredential = (response) => {
		try {
			clearAuthError();
			const payload = parseJwt(response.credential);
			currentUser = {
				name: payload.name,
				email: payload.email,
				picture: payload.picture,
			};
			onSuccess(currentUser);
		} catch (error) {
			showAuthError(`Sign-in callback failed: ${error.message}`);
		}
	};

	// Google library might already be loaded, or still loading — handle both cases
	if (window.google?.accounts?.id) {
		renderGoogleButton();
		return;
	}

	window.onGoogleLibraryLoad = renderGoogleButton;
}

function showAuthError(message) {
	const errorBox = document.getElementById('auth-error');
	errorBox.textContent = message;
	errorBox.hidden = false;
}

function clearAuthError() {
	const errorBox = document.getElementById('auth-error');
	errorBox.textContent = '';
	errorBox.hidden = true;
}

// Renders the official "Sign in with Google" button on the login page
function renderGoogleButton() {
	if (googleButtonRendered) return;
	googleButtonRendered = true;

	const buttonContainer = document.getElementById('google-signin-button');
	buttonContainer.innerHTML = '';

	google.accounts.id.initialize({
		client_id: CONFIG.GOOGLE_CLIENT_ID,
		callback: window.handleGoogleCredential,
		auto_select: false,
		use_fedcm_for_prompt: false,
		error_callback: (error) => {
			const message = error?.type === 'popup_failed_to_open'
				? 'Pop-up blocked. Allow pop-ups for this site and try again.'
				: `Google Sign-In error: ${error?.type || 'unknown error'}. Check your OAuth settings in Google Cloud, wait a minute, then refresh.`;

			showAuthError(message);
		},
	});

	google.accounts.id.renderButton(buttonContainer, {
		theme: 'outline',
		size: 'large',
		text: 'signin_with',
		shape: 'rectangular',
		width: 280,
	});
}

// Decodes the JWT token Google returns after sign-in
function parseJwt(token) {
	const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
	const json = decodeURIComponent(
		atob(base64)
			.split('')
			.map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
			.join('')
	);

	return JSON.parse(json);
}

// Shows the logged-in user's name, email and avatar in the top bar
export function showUserProfile(user) {
	const profile = document.getElementById('user-profile');

	if (!user) {
		profile.hidden = true;
		return;
	}

	document.getElementById('user-name').textContent = user.name;
	document.getElementById('user-email').textContent = user.email;
	document.getElementById('user-avatar').src = user.picture;
	profile.hidden = false;
}

// Signs the user out and sends them back to the login page
export function logout() {
	const email = currentUser?.email;
	currentUser = null;

	if (window.google?.accounts?.id) {
		google.accounts.id.disableAutoSelect();

		if (email) {
			google.accounts.id.revoke(email, () => {});
		}
	}

	showUserProfile(null);
	clearAuthError();
}
