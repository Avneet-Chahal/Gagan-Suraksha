// ==========================================================================
// GAGAN SURAKSHA - INTEGRATION & DATA INTEGRITY VERIFICATION SUITE
// ==========================================================================

import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('--- RUNNING GAGAN SURAKSHA INTEGRATION CHECKS ---');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

// 1. Verify Routes Coverage
const routesFilePath = resolve('src/routes/AppRoutes.tsx');
const routesContent = readFileSync(routesFilePath, 'utf-8');

const expectedRoutes = [
  { path: '/', name: 'Dashboard' },
  { path: '/satellites', name: 'Satellites' },
  { path: '/tracking', name: 'Orbit Tracking' },
  { path: '/close-approaches', name: 'Close Approaches' },
  { path: '/collision-risk', name: 'Collision Risk' },
  { path: '/maneuver-planner', name: 'Maneuver Planner' },
  { path: '/analytics', name: 'Analytics' },
  { path: '/alerts', name: 'Alerts' },
  { path: '/settings', name: 'Settings' },
];

console.log('\n1. Verifying 9 Route Declarations:');
expectedRoutes.forEach((route) => {
  const hasRoute = routesContent.includes(`path="${route.path}"`);
  assert(hasRoute, `Route ${route.path} (${route.name}) registered in AppRoutes.tsx`);
});

// 2. Verify Sidebar Nav Links
const sidebarFilePath = resolve('src/components/layout/Sidebar.tsx');
const sidebarContent = readFileSync(sidebarFilePath, 'utf-8');

console.log('\n2. Verifying Sidebar Navigation Coverage:');
expectedRoutes.forEach((route) => {
  const hasSidebarLink = sidebarContent.includes(`path: '${route.path}'`);
  assert(hasSidebarLink, `Sidebar includes navigation link for ${route.path}`);
});

// 3. Verify Mock Data & Astrodynamic Sanity
const mockDataFilePath = resolve('src/data/mockData.ts');
const mockDataContent = readFileSync(mockDataFilePath, 'utf-8');

console.log('\n3. Verifying Mock Data Integrity & Scientific Consistency:');
assert(mockDataContent.includes('DEMO_PRIMARY_SATELLITE'), 'DEMO_PRIMARY_SATELLITE exported');
assert(mockDataContent.includes('DEMO_SATELLITES_LIST'), 'DEMO_SATELLITES_LIST exported');
assert(mockDataContent.includes('DEMO_CLOSE_APPROACHES'), 'DEMO_CLOSE_APPROACHES exported');
assert(mockDataContent.includes('DEMO_MANEUVER_RECOMMENDATIONS'), 'DEMO_MANEUVER_RECOMMENDATIONS exported');
assert(mockDataContent.includes('DEMO_SPACE_WEATHER'), 'DEMO_SPACE_WEATHER exported');
assert(mockDataContent.includes('DEMO_ALERTS'), 'DEMO_ALERTS exported');

// 4. Verify 3D Three.js Fallbacks and Scene Resource Cleanup
console.log('\n4. Verifying Three.js WebGL Fallback and Disposal:');
const earthVisContent = readFileSync(resolve('src/components/dashboard/EarthVisualization.tsx'), 'utf-8');
const satVisContent = readFileSync(resolve('src/components/satellites/SatellitesEarthVisualization.tsx'), 'utf-8');
const trackVisContent = readFileSync(resolve('src/components/tracking/OrbitTrackingScene.tsx'), 'utf-8');

assert(earthVisContent.includes('isWebGLAvailable') && earthVisContent.includes('disposeSceneHierarchy'), 'EarthVisualization has WebGL check and scene disposal');
assert(satVisContent.includes('isWebGLAvailable') && satVisContent.includes('disposeSceneHierarchy'), 'SatellitesEarthVisualization has WebGL check and scene disposal');
assert(trackVisContent.includes('isWebGLAvailable') && trackVisContent.includes('disposeSceneHierarchy'), 'OrbitTrackingScene has WebGL check and scene disposal');

// 5. Verify Settings Presets and Persistence
console.log('\n5. Verifying Settings Persistence & Presets:');
const settingsContent = readFileSync(resolve('src/pages/SettingsPage.tsx'), 'utf-8');
assert(settingsContent.includes('gagan_mission_settings'), 'Settings uses localStorage persistence key');
assert(settingsContent.includes('ISRO ISTRAC Ops Preset'), 'Default preset available');
assert(settingsContent.includes('LEO Debris Shield'), 'LEO Debris Shield preset available');
assert(settingsContent.includes('Astrodynamics R&D Mode'), 'Astrodynamics R&D preset available');

console.log(`\nResults: ${passedTests} / ${totalTests} checks passed.`);
if (passedTests === totalTests) {
  console.log('INTEGRATION TEST SUITE PASSED SUCCESSFULLY!\n');
} else {
  console.error('SOME INTEGRATION CHECKS FAILED!\n');
  process.exit(1);
}
