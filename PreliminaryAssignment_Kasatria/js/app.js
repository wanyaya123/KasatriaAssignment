/**
 * Main app — handles the 3D visualization after login.
 * Based on the Three.js CSS3D periodic table demo, adapted for Kasatria assignment data.
 */

import * as THREE from 'three';
import TWEEN from 'three/addons/libs/tween.module.js';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

import { initGoogleAuth, showUserProfile, logout } from './auth.js';
import { fetchSheetData, getInitials, getNetWorthStyle } from './data.js';

// Layout sizes required by the assignment brief
const TABLE_COLS = 20;
const TABLE_ROWS = 10;
const GRID_COLS = 5;
const GRID_ROWS = 4;
const GRID_LAYERS = 10;

// Three.js scene bits — kept in module scope so we can clean up on logout
let camera;
let scene;
let renderer;
let controls;
let animationId = null;
const objects = [];
const targets = { table: [], sphere: [], helix: [], grid: [] };

// Kick things off — wait for Google login, then load the visualization
initGoogleAuth(async (user) => {
	showLoginScreen(false);
	showUserProfile(user);

	try {
		await startVisualization();
	} catch (error) {
		console.error(error);
		setStatus(error.message || 'Failed to start visualization.', true);
	}
});

// Log out button — clears everything and returns to login
document.getElementById('logout-btn').addEventListener('click', handleLogout);

// Layout switcher buttons at the bottom (Table, Sphere, Helix, Grid)
document.getElementById('menu').addEventListener('click', (event) => {
	if (!objects.length) return;

	switch (event.target.id) {
		case 'table':
			transform(targets.table, 2000);
			break;
		case 'sphere':
			transform(targets.sphere, 2000);
			break;
		case 'helix':
			transform(targets.helix, 2000);
			break;
		case 'grid':
			transform(targets.grid, 2000);
			break;
		default:
			break;
	}
});

// Toggle between login page and main app
function showLoginScreen(show) {
	document.getElementById('login-screen').hidden = !show;
	document.getElementById('app-screen').hidden = show;
}

// Updates the status text under the title (e.g. "Loaded 200 records")
function setStatus(message, isError = false) {
	const status = document.getElementById('status-message');
	status.textContent = message;
	status.classList.toggle('error', isError);
}

// Fetches sheet data and builds the 3D scene
async function startVisualization() {
	setStatus('Loading data from Google Sheet...');

	try {
		const records = await fetchSheetData();
		setStatus(`Loaded ${records.length} records`);
		buildScene(records);
	} catch (error) {
		setStatus(error.message, true);
	}
}

// Wipes the scene and sends user back to login
function handleLogout() {
	logout();
	destroyVisualization();
	showLoginScreen(true);
	setStatus('Preparing visualization...');
}

// Tears down the Three.js scene so we can log in fresh next time
function destroyVisualization() {
	TWEEN.removeAll();

	if (animationId) {
		cancelAnimationFrame(animationId);
		animationId = null;
	}

	if (controls) {
		controls.dispose();
		controls = null;
	}

	if (renderer) {
		renderer.domElement.remove();
		renderer = null;
	}

	scene = null;
	camera = null;
	objects.length = 0;
	targets.table.length = 0;
	targets.sphere.length = 0;
	targets.helix.length = 0;
	targets.grid.length = 0;

	document.getElementById('container').innerHTML = '';
	window.removeEventListener('resize', onWindowResize);
}

// Creates the 3D world and populates it with one tile per person
function buildScene(records) {
	camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
	camera.position.z = 3200;

	scene = new THREE.Scene();

	// Create a CSS3D card for each person — start them scattered randomly
	for (let i = 0; i < records.length; i++) {
		const person = records[i];
		const element = createTileElement(person);
		const objectCSS = new CSS3DObject(element);

		objectCSS.position.x = Math.random() * 4000 - 2000;
		objectCSS.position.y = Math.random() * 4000 - 2000;
		objectCSS.position.z = Math.random() * 4000 - 2000;

		scene.add(objectCSS);
		objects.push(objectCSS);
	}

	// Pre-calculate where each tile should go for every layout option
	buildTableTargets();
	buildSphereTargets();
	buildDoubleHelixTargets();
	buildGridTargets();

	renderer = new CSS3DRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.getElementById('container').appendChild(renderer.domElement);

	// Lets the user drag to rotate and scroll to zoom
	controls = new TrackballControls(camera, renderer.domElement);
	controls.minDistance = 500;
	controls.maxDistance = 6000;
	controls.addEventListener('change', render);

	// Start in table view, then kick off the animation loop
	transform(targets.table, 2000);
	animate();
	window.addEventListener('resize', onWindowResize);
}

// Builds one person card — photo, name, age, country, interest, net worth
function createTileElement(person) {
	const element = document.createElement('div');
	const colors = getNetWorthStyle(person.netWorth);
	element.className = 'element';
	element.style.backgroundColor = colors.background;
	element.style.borderColor = colors.border;
	element.style.boxShadow = `0 0 8px ${colors.glow}`;

	const rank = document.createElement('div');
	rank.className = 'rank';
	rank.textContent = person.rank;
	element.appendChild(rank);

	const photo = document.createElement('img');
	photo.className = 'photo';
	photo.src = person.photo;
	photo.alt = person.name;
	photo.decoding = 'async';
	photo.draggable = false;
	element.appendChild(photo);

	const initials = document.createElement('div');
	initials.className = 'initials';
	initials.textContent = getInitials(person.name);
	element.appendChild(initials);

	const name = document.createElement('div');
	name.className = 'name';
	name.textContent = person.name;
	element.appendChild(name);

	const meta = document.createElement('div');
	meta.className = 'meta';
	meta.innerHTML = `${person.age} · ${person.country}<br>${person.interest}`;
	element.appendChild(meta);

	const netWorth = document.createElement('div');
	netWorth.className = 'net-worth';
	netWorth.textContent = person.netWorthRaw;
	element.appendChild(netWorth);

	return element;
}

// Table layout — 20 columns × 10 rows (200 tiles total)
function buildTableTargets() {
	for (let i = 0; i < objects.length; i++) {
		const col = i % TABLE_COLS;
		const row = Math.floor(i / TABLE_COLS);
		const object = new THREE.Object3D();

		object.position.x = col * 140 - ((TABLE_COLS - 1) * 140) / 2;
		object.position.y = -(row * 180) + ((TABLE_ROWS - 1) * 180) / 2;

		targets.table.push(object);
	}
}

// Sphere layout — tiles arranged evenly on a sphere surface
function buildSphereTargets() {
	const vector = new THREE.Vector3();

	for (let i = 0, l = objects.length; i < l; i++) {
		const phi = Math.acos(-1 + (2 * i) / l);
		const theta = Math.sqrt(l * Math.PI) * phi;
		const object = new THREE.Object3D();

		object.position.setFromSphericalCoords(900, phi, theta);
		vector.copy(object.position).multiplyScalar(2);
		object.lookAt(vector);

		targets.sphere.push(object);
	}
}

// Double helix — inner + outer strand, close together but still two clear paths
function buildDoubleHelixTargets() {
	const vector = new THREE.Vector3();
	const innerRadius = 640;
	const outerRadius = 800;
	const verticalStep = 12;
	const angleStep = 0.2;
	const itemsPerStrand = Math.ceil(objects.length / 2);

	for (let i = 0, l = objects.length; i < l; i++) {
		const strand = i % 2;
		const indexOnStrand = Math.floor(i / 2);
		const radius = strand === 0 ? innerRadius : outerRadius;
		const theta = indexOnStrand * angleStep + strand * Math.PI;
		const y = -(indexOnStrand * verticalStep) + (itemsPerStrand * verticalStep) / 2;
		const object = new THREE.Object3D();

		object.position.setFromCylindricalCoords(radius, theta, y);

		vector.x = object.position.x * 2;
		vector.y = object.position.y;
		vector.z = object.position.z * 2;
		object.lookAt(vector);

		targets.helix.push(object);
	}
}

// Grid layout — 5 wide × 4 deep × 10 layers (200 tiles total)
function buildGridTargets() {
	for (let i = 0; i < objects.length; i++) {
		const object = new THREE.Object3D();

		object.position.x = (i % GRID_COLS) * 400 - ((GRID_COLS - 1) * 400) / 2;
		object.position.y = -(Math.floor(i / GRID_COLS) % GRID_ROWS) * 400 + ((GRID_ROWS - 1) * 400) / 2;
		object.position.z = Math.floor(i / (GRID_COLS * GRID_ROWS)) * 1000 - ((GRID_LAYERS - 1) * 1000) / 2;

		targets.grid.push(object);
	}
}

// Smoothly animates all tiles from their current position to a new layout
function transform(targetList, duration) {
	TWEEN.removeAll();

	for (let i = 0; i < objects.length; i++) {
		const object = objects[i];
		const target = targetList[i];

		new TWEEN.Tween(object.position)
			.to({ x: target.position.x, y: target.position.y, z: target.position.z }, Math.random() * duration + duration)
			.easing(TWEEN.Easing.Exponential.InOut)
			.start();

		new TWEEN.Tween(object.rotation)
			.to({ x: target.rotation.x, y: target.rotation.y, z: target.rotation.z }, Math.random() * duration + duration)
			.easing(TWEEN.Easing.Exponential.InOut)
			.start();
	}

	new TWEEN.Tween({})
		.to({}, duration * 2)
		.onUpdate(render)
		.start();
}

function onWindowResize() {
	if (!camera || !renderer) return;

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
	render();
}

// Main render loop — runs every frame
function animate() {
	animationId = requestAnimationFrame(animate);
	TWEEN.update();

	if (controls) {
		controls.update();
	}
}

function render() {
	if (!renderer || !scene || !camera) return;

	renderer.render(scene, camera);
}
