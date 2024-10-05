import * as THREE from '../../../../node_modules/three/build/three.module.js';
import OrbitalMechThings from './OrbitalMechThings.js';
import {OrbitControls} from './OrbitControls.js';

/**
The purpose of Aerovisualizer is to assist in the teaching and 
reinforcement of concepts in aerospace engineering by presenting 
them in interesting and engaging ways.  3D animations are displayed 
to complement the dry equations found in textbooks and online, and 
controls are also provided to manipulate the displays.

One of the concepts is orbital mechanics, and this file contains the 
main code for it.

 References

 "Fundamentals of Astrodynamics" by Bate, Mueller, and White, 
 Dover Publications (Bate)

 Revision History
 Date    Name                  Description
 9/2/24 R. Eastman             v2.0 beta
*/

const piOver180 = Math.PI/180;
const twoPi = 2*Math.PI;

let scene, camera, renderer;
let background = null;
const cameraRadius = 4;
let nominalCameraPos = new THREE.Vector3(cameraRadius/4, -cameraRadius, cameraRadius/2);
nominalCameraPos.normalize();
nominalCameraPos.multiplyScalar(cameraRadius);
let cpx, cpy, cpz;// camera position
const centerOfRotation = [0, 0, 0];
let data = null;
let omt = null;// the "orbital mechanics thing" object handles the rendering of 
// the vectors, their labels, the planets, and the orbit curves
let orbitControls = null;// in this context, "orbit" refers to the camera.
// OrbitControls is a THREE.js class that has nothing to do with orbital mechanics
let centralBodyRadius = 1;// compare the periapse in CDU to this
const muCanonical = 1;// mu is 1 for canonical units of distance (DU)
// and time (TU). This constant is included in the code rather than 
// the number 1 for maintainance and clarity
const sqrtMuCanonical = Math.sqrt(muCanonical);//obviously, this is 1 also
let periapseTooSmall = false;

const defaultCentralBody = 'Earth';
// below are ROUGHLY the values for a Hohmann transfer orbit
// to a highly inclined geosynchronous orbit from 160 km above 
// and to the east of Cape Canaveral
const defaultA = 20;// index of aArray corresponding to a = 3.822
const defaultE = 100;// index of eArray corresponding to e = 0.7318
const defaultLan = 180;// degrees
const defaultInc = 28;// degrees
const defaultAop = 103;// degrees
const defaultNuDegrees = 0;// degrees

const defaultDeltaVPrefChoice = 'pqw';
const defaultDeltaRPrefChoice = 'pqw';

const defaultInertialVectorsChoice = 'no-inertial-vectors';
const defaultOrbitFixedVectorsChoice = 'h-and-e';
const defaultOrbitingBodyVectorsChoice = 'r-v-and-uvw';

const defaultInertialVectorColor = 'orange';
const defaultOrbitFixedVectorColor = 'blue';
const defaultUVWVectorColor = 'blue';
const defaultRVectorColor = 'orange';
const defaultVVectorColor = 'orange';

const defaultInertialVectorScale = 50;
const defaultOrbitFixedVectorScale = 50;
const defaultOrbitingBodyVectorScale = 25;

const defaultCentralBodyTransparency = 0;// 0=completely opaque, 100=completely transparent
const defaultShowOutOfPlaneVectors = false;

// aerovisualizerData can be modified and saved to local storage when 
// values and preferences are changed.  It is retrieved from local 
// storage at startup
let aerovisualizerData = [
  {name:'central-body', value:defaultCentralBody},
  {name:'semimajor-axis', value:defaultA},
  {name:'eccentricity', value:defaultE},
  {name:'longitude-of-ascending-node', value:defaultLan},
  {name:'inclination', value:defaultInc},
  {name:'argument-of-periapsis', value:defaultAop},
  {name:'true-anomaly', value:defaultNuDegrees},
  {name:'inertialVectorsChoice', value:defaultInertialVectorsChoice},
  {name:'orbitFixedVectorsChoice', value:defaultOrbitFixedVectorsChoice},
  {name:'orbitingBodyVectorsChoice', value:defaultOrbitingBodyVectorsChoice},
  {name:'inertialVectorColor', value:defaultInertialVectorColor},
  {name:'orbitFixedVectorColor', value:defaultOrbitFixedVectorColor},
  {name:'uvwVectorColor', value:defaultUVWVectorColor},
  {name:'rVectorColor', value:defaultRVectorColor},
  {name:'vVectorColor', value:defaultVVectorColor},
  {name:'inertialVectorScale', value:defaultInertialVectorScale},
  {name:'orbitFixedVectorScale', value:defaultOrbitFixedVectorScale},
  {name:'orbitingBodyVectorScale', value:defaultOrbitingBodyVectorScale},
  {name:'centralBodyTransparency', value:defaultCentralBodyTransparency},
  {name:'showOutOfPlaneVectors', value:defaultShowOutOfPlaneVectors},
  {name:'trueAnomaly360', value:0},//not used
  {name:'deltaVPrefChoice', value:defaultDeltaVPrefChoice},
  {name:'deltaRPrefChoice', value:defaultDeltaRPrefChoice},
  {name:'deltaVXSliderValue', value:16},
  {name:'deltaVYSliderValue', value:16},
  {name:'deltaVZSliderValue', value:16},
  {name:'deltaRXSliderValue', value:20},
  {name:'deltaRYSliderValue', value:20},
  {name:'deltaRZSliderValue', value:20},
  {name:'param1', value:0},
  {name:'param2', value:0},
  {name:'param3', value:0},
  {name:'param4', value:0},
  {name:'param5', value:0},
  {name:'param6', value:0},
  {name:'param7', value:0},
  {name:'param8', value:0},
  {name:'param9', value:0},
  {name:'param10', value:0}
];

let centralBody = defaultCentralBody;
let theCB = null;
let ctu = 0;// canonical time unit
let cdu = 0;// canonical distance unit
let cduPerCtu = 0;
let planetRotationPeriodInSeconds = 0;
// aArray and eArray contain the values
// for each of 150 slider positions for the 'a' slider and 'e' slider.
// The values were obtained from an Excel spreadsheet containing
// Bezier curves that allow for gradual changes at the extreme
// ends.  The semi-major axis (a) goes from 1 to 60.  For the
// heliocentric option with CDU = AU, this does not allow for
// 'a' to be smaller than Earth's 'a' (1 AU).  The eccentricity
// (e) goes from 0 to 0.98 for ellipses.
// Assuming Earth's radius ~= 6371 km = 1 CDU (a=1) for Earth, and 
// 'a' is computed for heights of 160, 410, 450, 540, 1000, 2000,
// and 42164 km (geosynchronous, a=6.618), and also a = 3.822 for a 
// Hohmann transfer from 160 km to it (e=0.7318 for Hohmann transfer 
// orbit).
const aArray = [
1,1.025,1.064,1.071,1.085,1.157,1.25,1.314,1.45,1.6,
1.8, 1.9, 2.1, 2.3, 2.5, 2.7, 2.9, 3.1, 3.4, 3.6,
3.822, 4.2, 4.5, 4.8, 5.1, 5.4, 5.8, 6.1, 6.618, 6.8,
7.2, 7.6, 8.0, 8.4, 8.8, 9.2, 9.7,10.1,10.6,11.0,
11.5,11.9,12.4,12.9,13.4,13.9,14.4,14.9,15.4,15.9,
16.5,17.0,17.5,18.1,18.6,19.2,19.7,20.3,20.9,21.4,
22.0,22.6,23.1,23.7,24.3,24.9,25.5,26.1,26.6,27.2,
27.8,28.4,29.0,29.6,30.2,30.8,31.4,32.0,32.6,33.2,
33.8,34.4,34.9,35.5,36.1,36.7,37.3,37.9,38.4,39.0,
39.6,40.1,40.7,41.3,41.8,42.4,42.9,43.5,44.0,44.5,
45.1,45.6,46.1,46.6,47.1,47.6,48.1,48.6,49.1,49.5,
50.0,50.4,50.9,51.3,51.8,52.2,52.6,53.0,53.4,53.8,
54.2,54.5,54.9,55.2,55.6,55.9,56.2,56.5,56.8,57.1,
57.4,57.6,57.9,58.1,58.3,58.5,58.7,58.9,59.1,59.2,
59.4,59.5,59.6,59.7,59.8,59.9,59.93,59.97,59.99,60];

const eArray = [
0,0.0001,0.0005,0.0012,0.002,0.003,0.005,0.006,0.008,0.01,
0.013,0.015,0.018,0.021,0.024,0.028,0.031,0.035,0.039,0.044,
0.048,0.053,0.058,0.063,0.068,0.074,0.079,0.085,0.091,0.097,
0.103,0.110,0.116,0.123,0.130,0.137,0.144,0.151,0.159,0.166,
0.174,0.182,0.190,0.198,0.206,0.214,0.223,0.231,0.240,0.248,
0.257,0.266,0.275,0.284,0.293,0.302,0.311,0.321,0.330,0.339,
0.349,0.358,0.368,0.377,0.387,0.397,0.407,0.416,0.426,0.436,
0.446,0.455,0.465,0.475,0.485,0.495,0.505,0.515,0.525,0.534,
0.544,0.554,0.564,0.573,0.583,0.593,0.603,0.612,0.622,0.631,
0.641,0.650,0.659,0.669,0.678,0.687,0.696,0.705,0.714,0.723,
0.7318,0.740,0.749,0.757,0.766,0.774,0.782,0.790,0.798,0.806,
0.814,0.821,0.829,0.836,0.843,0.850,0.857,0.864,0.870,0.877,
0.883,0.889,0.895,0.901,0.906,0.912,0.917,0.922,0.927,0.932,
0.936,0.941,0.945,0.949,0.952,0.956,0.959,0.962,0.965,0.9673,
0.9697,0.9718,0.9737,0.9754,0.9768,0.9779,0.9788,0.9795,0.9799,0.98];

const deltaVArray = [
  -1,-0.8,-0.6,-0.4,-0.2,-0.1,-0.08,-0.06,-0.04,-0.02,-0.01,-0.008,-0.006,-0.004,-0.002,-0.001,
  0,0.001,0.002,0.004,0.006,0.008,0.01,0.02,0.04,0.06,0.08,0.1,0.2,0.4,0.6,0.8,1];//33

const deltaRArray = [
  -500,-400,-300,-200,-100,-80,-60,-40,-20,-10,-8,-6,-4,-2,-1,-0.8,-0.6,-0.4,-0.2,-0.1,
  0,0.1,0.2,0.4,0.6,0.8,1,2,4,6,8,10,20,40,60,80,100,200,300,400,500];//41

let a = aArray[Number(defaultA)];
let periodNom = twoPi*Math.pow(a,1.5)/muCanonical;//orbital period in canonical units
let e = eArray[Number(defaultE)];
let eNomIsZero = (e === 0);
let ePertIsZero = false;
let lanDegrees = defaultLan;
let lan = lanDegrees*piOver180; // longitude of the ascending node
let incDegrees = defaultInc;
let inc = incDegrees*piOver180;// inclination
let aopDegrees = defaultAop;
let aop = aopDegrees*piOver180;// argument of periapsis
let dcmIJK2PQW = new THREE.Matrix3();// direction cosine 
let dcmPQW2IJK = new THREE.Matrix3();// matrices for 
let dcmPQW2UVW = new THREE.Matrix3();// the nominal 
let dcmUVW2PQW = new THREE.Matrix3();// orbit
let nuDegrees = defaultNuDegrees;
let nu = nuDegrees*piOver180;// true anomaly
let eccentricAnomaly;
let meanAnomaly;
let meanMotion;
let timeAfterPeriapse;// in canonical time units (CTU)
let timeAfterPeriapseInSeconds;
let dvx;
let dvy;
let dvz;
let drx;
let dry;
let drz;
let displayOrbitsAsDifference = false;// make this a preference eventually

let orbitNom = [];// array of objects containing states (position,
// velocity, time, and nu) of the nominal orbiting body.  This array
// contains 'orbitSize' number of object elements
const orbitSize = 181;
  // orbitSize is the size of the orbitNom and orbitPert arrays. 181 
  // seems to be a good enough size.  Try to use the smallest number that  
  // you can get away with due to computer memory issues. The ellipses 
  // are approximated as polyhedrons with the number of 
  // sides equal to orbitSize MINUS 1.  Lower numbers cause the 
  // curves to appear segmented and the numbers to be less accurate.
  // 181 allows for 2-degree increments in true anomaly about an ellipse 
  // with the endpoints repeated
let iOrb;// this is the index of orbitNom that corresponds to 
// timeAfterPeriapseInSeconds

let orbitPert = [];// array of objects containing states (position,
// velocity, time, and nu) of the perturbed orbiting body.  This array
// contains 'orbitSize' number of object elements

let orbitDelta = [];// array of objects containing states (position,
// velocity, time, and nu) of the perturbed orbiting body minus the 
// nominal orbiting body.  This array contains 'orbitSize' number of object elements

let needToComputeNominalOrbit = false;

let inertialVectorsChoice = defaultInertialVectorsChoice;
let orbitFixedVectorsChoice = defaultOrbitFixedVectorsChoice;
let orbitingBodyVectorsChoice = defaultOrbitingBodyVectorsChoice;

let deltaVPrefChoice = defaultDeltaVPrefChoice;
let deltaRPrefChoice = defaultDeltaRPrefChoice;

let inertialVectorColor = defaultInertialVectorColor;
let orbitFixedVectorColor = defaultOrbitFixedVectorColor;
let uvwVectorColor = defaultUVWVectorColor;
let rVectorColor = defaultRVectorColor;
let vVectorColor = defaultVVectorColor;

let inertialVectorScale = defaultInertialVectorScale;
let orbitFixedVectorScale = defaultOrbitFixedVectorScale;
let orbitingBodyVectorScale = defaultOrbitingBodyVectorScale;

let centralBodyTransparency = defaultCentralBodyTransparency;
let showOutOfPlaneVectors = defaultShowOutOfPlaneVectors;

let rPQW = new THREE.Vector3(1, 1, 1);
let vPQW = new THREE.Vector3(1, 1, 1);

// r and v vectors at an arbitrary point along the perturbed orbit
let r0PertPQW = new THREE.Vector3(1, 1, 1);
let v0PertPQW = new THREE.Vector3(1, 1, 1);
// period of the perturbed orbit in canonical time units
let periodPert = 0;
// semi-major axis of the perturbed orbit
let aPert;
// eccentricity of the perturbed orbit
let ePert;
// PQW unit vectors for the perturbed orbit
let pPert = new THREE.Vector3(1, 1, 1);
let qPert = new THREE.Vector3(1, 1, 1);
let wPert = new THREE.Vector3(1, 1, 1);
// longitude of the ascending node, inclination, and argument 
// of periapse of the perturbed orbit
let lanPert;
let incPert;
let aopPert;

let rPertPeriapse;// periapse distance of the perturbed orbit
let kPertPeriapse;// the index to the orbitPert array for the r that is closest to periapse

let p = a*(1 - e*e);// parameter (semi-latus rectum)
let sqrtMuOverP = Math.sqrt(muCanonical/p);//needed for computing velocity
let rp = Number(a*(1-e));// r vector magnitude at periapse
// let vp = Math.sqrt((muCanonical/a)*((1+e)/(1-e)));//v vector magnitude at periapse
periapseTooSmall = rp < centralBodyRadius ? true : false;

const threeDWorld = document.getElementById('threeD-world');

const aenuButton = document.getElementById('a-e-nu-btn');
const orientationButton = document.getElementById('orientation-btn');
const deltaVButton = document.getElementById('delta-v-btn');
const deltaRButton = document.getElementById('delta-r-btn');
const numericalButton = document.getElementById('numerical-btn');
const prefsButton = document.getElementById('preferences-btn');
const infoButton = document.getElementById('info-btn');
const mainReturnButton = document.getElementById('main-return-btn');

let mostPreviousMainButton = 'aenu';

const aDisplay = document.getElementById('a-display');    
const eDisplay = document.getElementById('e-display');    
const aSlider = document.getElementById('a-slider');
const eSlider = document.getElementById('e-slider');
const warning1 = document.getElementById('warning-1');

const lanDisplay = document.getElementById('lan-display');
const incDisplay = document.getElementById('inc-display');
const aopDisplay = document.getElementById('aop-display');
const lanSlider = document.getElementById('lan-slider');
const incSlider = document.getElementById('inc-slider');
const aopSlider = document.getElementById('aop-slider');
const zeroLanButton = document.getElementById('zero-lan-btn');
const zeroIncButton = document.getElementById('zero-inc-btn');
const zeroAopButton = document.getElementById('zero-aop-btn');

const deltaVPrefMenu = document.getElementById('delta-v-pref-menu');
const toggleOrbitDiffDisplayButton = document.getElementById('toggle-orbit-diff-display-btn');
const deltaVXDisplay = document.getElementById('delta-v-x-display');
const deltaVYDisplay = document.getElementById('delta-v-y-display');
const deltaVZDisplay = document.getElementById('delta-v-z-display');
const deltaVXSlider = document.getElementById('delta-v-x-slider');
const deltaVYSlider = document.getElementById('delta-v-y-slider');
const deltaVZSlider = document.getElementById('delta-v-z-slider');
const zeroDeltaVXButton = document.getElementById('zero-delta-v-x-btn');
const zeroDeltaVYButton = document.getElementById('zero-delta-v-y-btn');
const zeroDeltaVZButton = document.getElementById('zero-delta-v-z-btn');

const deltaRPrefMenu = document.getElementById('delta-r-pref-menu');
const deltaRXDisplay = document.getElementById('delta-r-x-display');
const deltaRYDisplay = document.getElementById('delta-r-y-display');
const deltaRZDisplay = document.getElementById('delta-r-z-display');
const deltaRXSlider = document.getElementById('delta-r-x-slider');
const deltaRYSlider = document.getElementById('delta-r-y-slider');
const deltaRZSlider = document.getElementById('delta-r-z-slider');
const zeroDeltaRXButton = document.getElementById('zero-delta-r-x-btn');
const zeroDeltaRYButton = document.getElementById('zero-delta-r-y-btn');
const zeroDeltaRZButton = document.getElementById('zero-delta-r-z-btn');

const nuSlider = document.getElementById('nu-slider');
const nuDisplay = document.getElementById('nu-display');
const zeroNuButton = document.getElementById('zero-nu-btn');
const timeAfterPeriapseDisplay = document.getElementById('tap-display');
const cduDisplay = document.getElementById('cdu-display');

const zoomSlider = document.getElementById('zoom-slider');
const zoomDisplay = document.getElementById('zoom-display');
const warning2 = document.getElementById('warning-2');

const aenuElements = document.getElementById('a-e-nu-elements');
const orientationElements = document.getElementById('orientation-elements');
const deltaVElements = document.getElementById('delta-v-elements');
const deltaRElements = document.getElementById('delta-r-elements');
const numericalElements = document.getElementById('numerical-elements');
const zoomElements = document.getElementById('zoom-elements');
const prefsElements = document.getElementById('prefs-elements');

const muDisplay = document.getElementById('mu');
const aCBDisplay = document.getElementById('a');
const eCBDisplay = document.getElementById('e');
const iDisplay = document.getElementById('i');
const OmegaDisplay = document.getElementById('Omega');
const omegaDisplay = document.getElementById('omega');
const radiusDisplay = document.getElementById('radius');
const vescDisplay = document.getElementById('vesc');

const nomPeriod = document.getElementById('nom-period');
const nomA = document.getElementById('nom-a');
const nomE = document.getElementById('nom-e');
const nomLAN = document.getElementById('nom-lan');
const nomINC = document.getElementById('nom-inc');
const nomAOP = document.getElementById('nom-aop');

const pertPeriod = document.getElementById('pert-period');
const pertA = document.getElementById('pert-a');
const pertE = document.getElementById('pert-e');
const pertLAN = document.getElementById('pert-lan');
const pertINC = document.getElementById('pert-inc');
const pertAOP = document.getElementById('pert-aop');

const deltaRXNumerical = document.getElementById('delta-rx');
const deltaRYNumerical = document.getElementById('delta-ry');
const deltaRZNumerical = document.getElementById('delta-rz');
const deltaVXNumerical = document.getElementById('delta-vx');
const deltaVYNumerical = document.getElementById('delta-vy');
const deltaVZNumerical = document.getElementById('delta-vz');

const mainButtonsElements = document.getElementById('main-buttons-elements');
const subMainButtonsElements = document.getElementById('sub-main-buttons-elements');
const prefsMenu = document.getElementById('prefs-menu');
const prefReturnButton = document.getElementById('pref-return-btn');

const centralBodyTransparencySlider = document.getElementById('central-body-transparency-slider');
const defaultResetButton = document.getElementById('default-reset-btn');
const showOutOfPlaneVectorsCheckbox = document.getElementById('show-out-of-plane');

const muMenu = document.getElementById('central-body-menu');

const inertialVectorsMenu = document.getElementById('inertial-vectors-menu');
inertialVectorsMenu.value = inertialVectorsChoice;
const orbitFixedVectorsMenu = document.getElementById('orbit-fixed-vectors-menu');
orbitFixedVectorsMenu.value = orbitFixedVectorsChoice;
const orbitingBodyVectorsMenu = document.getElementById('orbiting-body-vectors-menu');
orbitingBodyVectorsMenu.value = orbitingBodyVectorsChoice;

const inertialVectorColorMenu = document.getElementById('inertial-vector-color-menu');
inertialVectorColorMenu.value = inertialVectorColor;
const orbitFixedVectorColorMenu = document.getElementById('orbit-fixed-vector-color-menu');
orbitFixedVectorColorMenu.value = orbitFixedVectorColor;
const uvwVectorColorMenu = document.getElementById('uvw-vector-color-menu');
uvwVectorColorMenu.value = uvwVectorColor;
const rVectorColorMenu = document.getElementById('r-vector-color-menu');
rVectorColorMenu.value = rVectorColor;
const vVectorColorMenu = document.getElementById('v-vector-color-menu');
vVectorColorMenu.value = vVectorColor;

const inertialVectorScaleSlider = document.getElementById('inertial-vector-scale-slider');
inertialVectorScaleSlider.value = inertialVectorScale;
const orbitFixedVectorScaleSlider = document.getElementById('orbit-fixed-vector-scale-slider');
orbitFixedVectorScaleSlider.value = orbitFixedVectorScale;
const orbitingBodyVectorScaleSlider = document.getElementById('orbiting-body-vector-scale-slider');
orbitingBodyVectorScaleSlider.value = orbitingBodyVectorScale;

const generalPrefsElements = document.getElementById('general-prefs-elements');
const muPrefsElements = document.getElementById('central-body-prefs-elements');
const inertialVectorsElements = document.getElementById('inertial-vectors-elements');
const orbitFixedVectorsElements = document.getElementById('orbit-fixed-vectors-elements');
const orbitingBodyVectorsElements = document.getElementById('orbiting-body-vectors-elements');
const infoElements = document.getElementById('info-elements');
const infoMenu = document.getElementById('info-menu');
const infoText = document.getElementById('info-text');
const infoReturnButton = document.getElementById('info-return-btn');

/*
name     = name
m        = mass (x1e24 kg)
CDU      = canonical distance unit (CDU), radius or 1 AU (km)
CTU      = canonical time unit (s)
gravSurf = Surface gravity (mean) (m/s^2)
vesc     = Escape velocity (km/s)
mu       = GM (km^3/s^2)
Tsid     = Sidereal orbit period (days)
perihel  = perihelion (x1e6 km) 
aphel    = aphelion (x1e6 km)
Tsyn     = Synodic period (days)
vmean    = Mean orbital velocity (km/s) 
vmax     = Maximum orbital velocity (km/s)
vmin     = Minimum orbital velocity (km/s) 
srp      = Sidereal rotation period (hrs)
daylen   = Length of day (hrs)
obliqu   = Obliquity to orbit (deg) 
incEqu   = Inclination of equator (deg)
a        = Semimajor axis (AU) J2000
e        = Orbital eccentricity J2000
i        = Orbital inclination (deg) J2000
Om       = Longitude of ascending node (deg) J2000
om       = Argument of periapsis (Longitude of perihelion) (deg) J2000
ml       = Mean Longitude (deg) J2000

G = 6.67430E-11 m^3/kg/s^2
G = 6.67430E-20 km^3/kg/s^2
G = 39.478 AU^3/M(sun)/yr^2
1 AU = 149597870.70 km exactly

moon
Trev = Revolution period (days) 27.3217
incEcl = Inclination to ecliptic (deg) 5.145

according to https://archive.aoe.vt.edu/lutze/AOE2104/consts.pdf
for Earth orbit:
JGM-2
CTU=13.44684985511 min
CDU/CTU = 7.905366149846 km/s
and heliocentric
TU=58.132821 days
avg dist=149599650
AU/TU=29.784852 km/s
*/

let centralBodyData = [
  {name:'sun1', id:0, m:1988470, CDU:696000, CTU:1593.888886079390, gravSurf:'NA', 
  vesc:617.5, mu:132712440018, Tsid:'NA', perihel:'NA', radius:696000, 
  aphel:'NA', Tsyn:'NA', vmean:'NA', vmax:'NA', vmin:'NA', 
  srp:1000000, daylen:'NA', obliqu:'NA', incEqu:'NA', 
  a:'NA', e:'NA', i:'NA', Om:'NA', 
  om:'NA', ml:'NA'},
  {name:'sun2', id:1, m:1988470, CDU:149597870.70, CTU:5022675.7344, gravSurf:'NA', 
  vesc:617.5, mu:132712440018, Tsid:'NA', perihel:'NA', radius:696000, 
  aphel:'NA', Tsyn:'NA', vmean:'NA', vmax:'NA', vmin:'NA', 
  srp:1000000, daylen:'NA', obliqu:'NA', incEqu:'NA', 
  a:'NA', e:'NA', i:'NA', Om:'NA', 
  om:'NA', ml:'NA'},
  {name:'Mercury', id:2, m:0.3301, CDU:2439.7, CTU: 811.853519657804, gravSurf:3.7, 
  vesc:4.3, mu:22032., Tsid:87.969, perihel:46., radius:2439.7, 
  aphel:69.818, Tsyn:115.88, vmean:47.36, vmax:58.97, vmin:38.86, 
  srp:1407.6, daylen:4222.6, obliqu:0.034, incEqu:0.034, 
  a:0.38709893, e:0.20563069, i:7.00487, Om:48.33167, 
  om:77.45645, ml:252.25084},
  {name:'Venus', id:3, m:4.8673, CDU:6051.8, CTU: 825.998766884161, gravSurf:8.87, 
  vesc:10.36, mu:324859, Tsid:224.701, perihel:107.48, radius:6051.8, 
  aphel:108.941, Tsyn:583.92, vmean:35.02, vmax:35.26, vmin:34.78, 
  srp:-5832.6, daylen:2802., obliqu:177.36, incEqu:2.64, 
  a:0.72333199, e:0.00677323, i:3.39471, Om:76.68069, 
  om:131.53298, ml:181.97973},
  {name:'Earth', id:4, m:5.9722, CDU:6378.1, CTU: 806.804103286409, gravSurf:9.82, 
  vesc:11.186, mu:398600.4418, Tsid:365.256, perihel:147.095, radius:6378.1, 
  aphel:152.1, Tsyn:0, vmean:29.78, vmax:30.29, vmin:29.29, 
  srp:23.9345, daylen:24., obliqu:23.44, incEqu:23.44, 
  a:1.00000011, e:0.01671022, i:0.00005, Om:-11.26064, 
  om:102.94719, ml:100.46435},
  {name:'moon', id:5, m:0.0734767309, CDU:1079.6, CTU:506.501324477232, gravSurf:'?', 
  vesc:2.38, mu:4904.8695, Tsid:'?', perihel:'NA', radius:1079.6, 
  aphel:'NA', Tsyn:'?', vmean:'NA', vmax:'NA', vmin:'NA', 
  srp:655.728, daylen:'?', obliqu:'NA', incEqu:'NA', 
  a:0.002570, e:0.0549, i:'NA', Om:'NA', 
  om:'NA', ml:'?'},
  {name:'Mars', id:6, m:0.64169, CDU:3389.5, CTU: 953.541414862714, gravSurf:3.73, 
  vesc:5.03, mu:42828, Tsid:686.98, perihel:206.65, radius:3389.5, 
  aphel:249.261, Tsyn:779.94, vmean:24.08, vmax:26.5, vmin:21.97, 
  srp:24.6229, daylen:24.6597, obliqu:25.19, incEqu:25.19, 
  a:1.52366231, e:0.09341233, i:1.85061, Om:49.57854, 
  om:336.04084, ml:355.45332},
  {name:'Jupiter', id:7, m:1898.13, CDU:69911, CTU: 1642.299064209990, gravSurf:25.92, 
  vesc:59.5, mu:126687000, Tsid:4332.59, perihel:740.595, radius:69911, 
  aphel:816.363, Tsyn:398.88, vmean:13.06, vmax:13.72, vmin:12.44, 
  srp:9.925, daylen:9.9259, obliqu:3.13, incEqu:3.13, 
  a:5.20336301, e:0.04839266, i:1.3053, Om:100.55615, 
  om:14.75385, ml:34.40438},
  {name:'Saturn', id:8, m:568.32, CDU:58232, CTU: 2281.631023447120, gravSurf:11.19, 
  vesc:35.5, mu:37931000, Tsid:10759.22, perihel:1357.55, radius:58232, 
  aphel:1506.53, Tsyn:378.09, vmean:9.67, vmax:10.14, vmin:9.14, 
  srp:10.656, daylen:10.656, obliqu:26.73, incEqu:undefined, 
  a:9.53707032, e:0.0541506, i:2.48446, Om:113.71504, 
  om:92.43194, ml:49.94432},
  {name:'Uranus', id:9, m:86.811, CDU:25362, CTU: 1677.976993115500, gravSurf:9.01, 
  vesc:21.3, mu:5794000, Tsid:30685.40, perihel:2732.70, radius:25362, 
  aphel:3001.39, Tsyn:369.66, vmean:6.79, vmax:7.13, vmin:6.49, 
  srp:-17.24, daylen:17.24, obliqu:97.77, incEqu:82.23, 
  a:19.19126393, e:0.04716771, i:0.76986, Om:74.22988, 
  om:170.96424, ml:313.23218},
  {name:'Neptune', id:10, m:102.409, CDU:24622, CTU: 1477.789423646780, gravSurf:11.27, 
  vesc:23.5, mu:6835100, Tsid:60189.00, perihel:4471.05, radius:24622, 
  aphel:4558.86, Tsyn:367.49, vmean:5.45, vmax:5.47, vmin:5.37, 
  srp:16.11, daylen:16.11, obliqu:28.32, incEqu:28.32, 
  a:30.06896348, e:0.00858587, i:1.76917, Om:131.72169, 
  om:44.97135, ml:304.88003}
];

const replaceAerovisualizerData = function(name, value){
  if (aerovisualizerData){
    aerovisualizerData.forEach(o => {
      if (o.name === name){
        o.value = value;
      }});
  }
}

const saveToLocalStorage = function(){
  localStorage.setItem('aerovisualizerData', JSON.stringify(aerovisualizerData));
}

const getFromLocalStorage = function(){
  const data = JSON.parse(localStorage.getItem('aerovisualizerData'));
  return data;
}

const dhms =function(sec){
  let daysHoursMinutesSeconds;
  const sPerH = 60*60;
  const sPerD = sPerH*24;
  let s = sec;
  const d = Math.trunc(s/sPerD);
  const h = Math.trunc((s - d*sPerD)/sPerH);
  const m = Math.trunc((s - d*sPerD - h*sPerH)/60);
  s = Math.trunc(s - d*sPerD - h*sPerH - m*60);
  const dS = d < 10 ? String(d).padStart(2,'0') : String(d);
  const hS = h < 10 ? String(h).padStart(2,'0') : String(h);
  const mS = m < 10 ? String(h).padStart(2,'0') : String(m);
  const sS = s < 10 ? String(s).padStart(2,'0') : String(s);
  daysHoursMinutesSeconds = `${dS}:${hS}:${mS}:${sS}`;

  return daysHoursMinutesSeconds;
}

const displayNumerical = function(){
  // inputs: cdu, ctu, cduPerCtu, a, aPert, periodNom, periodPert,
  //         e, eNomIsZero, lanDegrees, incDegrees, aopDegrees,
  //         ePert, ePertIsZero, lanPert, incPert, aopPert,
  //         drx, dry, drz, dvx, dvy, dvz
  // outputs: numerical display and nothing else
  const aDisp = a*cdu;
  const aPertDisp = aPert*cdu;
  const nomS = periodNom*ctu;
  const pertS = periodPert*ctu;
  
  nomPeriod.innerHTML = dhms(nomS);
  nomA.innerHTML = `${Number(aDisp).toExponential(3).toString()}`;
  nomE.innerHTML = `${Number(e).toFixed(3).toString()}`;
  nomLAN.innerHTML = eNomIsZero ? 'UNDEF' : lanDegrees;
  nomINC.innerHTML = incDegrees;
  nomAOP.innerHTML = eNomIsZero ? 'UNDEF' : aopDegrees;
  
  pertPeriod.innerHTML = dhms(pertS);
  pertA.innerHTML = `${Number(aPertDisp).toExponential(3).toString()}`;
  pertE.innerHTML = `${Number(ePert).toFixed(3).toString()}`;
  pertLAN.innerHTML = ePertIsZero ? 'UNDEF' : lanPert;
  pertINC.innerHTML = incPert;
  pertAOP.innerHTML = ePertIsZero ? 'UNDEF' : aopPert;

  deltaRXNumerical.innerHTML = `${Number(drx*cdu).toFixed(1).toString()}`;
  deltaRYNumerical.innerHTML = `${Number(dry*cdu).toFixed(1).toString()}`;
  deltaRZNumerical.innerHTML = `${Number(drz*cdu).toFixed(1).toString()}`;
  deltaVXNumerical.innerHTML = `${Number(dvx*cduPerCtu).toFixed(2).toString()}`;
  deltaVYNumerical.innerHTML = `${Number(dvy*cduPerCtu).toFixed(2).toString()}`;
  deltaVZNumerical.innerHTML = `${Number(dvz*cduPerCtu).toFixed(2).toString()}`;
}

const handleMainButtons = function(button){
  aenuButton.disabled = false;
  orientationButton.disabled = false;
  deltaVButton.disabled = false;
  deltaRButton.disabled = false;
  numericalButton.disabled = false;
  prefsButton.disabled = false;
  infoButton.disabled = false;
  aenuElements.style.display = 'none';
  orientationElements.style.display = 'none';
  deltaVElements.style.display = 'none';
  deltaRElements.style.display = 'none';
  numericalElements.style.display = 'none';
  prefsElements.style.display = 'none';
  generalPrefsElements.style.display = 'none';
  muPrefsElements.style.display = 'none';
  inertialVectorsElements.style.display = 'none';
  orbitFixedVectorsElements.style.display = 'none';
  orbitingBodyVectorsElements.style.display = 'none';
  infoElements.style.display = 'none';

  if (button !== 'prefs' && button !== 'info' & button !== 'no-info'){
    mostPreviousMainButton = button;
  }

  switch (button){
    case 'aenu':
      aenuElements.style.display = 'grid';
      aenuButton.disabled = true;
      break;
    case 'orientation':
      orientationElements.style.display = 'grid';
      orientationButton.disabled = true;
      break;
    case 'delta-v':
      deltaVElements.style.display = 'grid';
      deltaVButton.disabled = true;
      break;
    case 'delta-r':
      deltaRElements.style.display = 'grid';
      deltaRButton.disabled = true;
      break;
    case 'numerical':
      numericalElements.style.display = 'grid';
      numericalButton.disabled = true;
      computePQW2IJKRotation();
      displayNumerical();
      break;
    case 'prefs':
      prefsElements.style.display = 'grid';
      prefsButton.disabled = true;
      zoomElements.style.display = 'none';
      aenuButton.disabled = true;
      orientationButton.disabled = true;
      deltaVButton.disabled = true;
      deltaRButton.disabled = true;
      numericalButton.disabled = true;
      mainReturnButton.disabled = true;
      prefsButton.disabled = true;
      infoButton.disabled = true;
      toggleOrbitDiffDisplayButton.disabled = true;
      handlePrefsChoice('general-prefs');
      break;
    case 'info':
      threeDWorld.style.display = 'none';
      mainButtonsElements.style.display = 'none';
      subMainButtonsElements.style.display = 'none';
      zoomElements.style.display = 'none';
      infoElements.style.display = 'grid';
      infoButton.disabled = true;
      break;
    case 'no-info':
      threeDWorld.style.display = 'block';
      mainButtonsElements.style.display = 'flex';
      subMainButtonsElements.style.display = 'flex';

      if (displayOrbitsAsDifference === true){
        zoomElements.style.display = 'grid';
      }
      break;
    case 'none':
      break;
  }
}

aenuButton.addEventListener('click', () => {
  handleMainButtons('aenu');
});

orientationButton.addEventListener('click', () => {
  handleMainButtons('orientation');
});

deltaVButton.addEventListener('click', () => {
  handleMainButtons('delta-v');
});

deltaRButton.addEventListener('click', () => {
  handleMainButtons('delta-r');
});

numericalButton.addEventListener('click', () => {
  handleMainButtons('numerical');
});

prefsButton.addEventListener('click', () => {
  handleMainButtons('prefs');
});

infoButton.addEventListener('click', () => {
  handleMainButtons('info');
});

infoReturnButton.addEventListener('click', () => {
  handleMainButtons('no-info');
  handleMainButtons(mostPreviousMainButton);
});

const computeP = function(){
  p = a*(1 - e*e);
  sqrtMuOverP = Math.sqrt(muCanonical/p);// needed for computing velocity
}

const shapeOrbitCurve = function(){
  // inputs: theCB, omt with quaternion set, a, e
  // outputs: nominal orbit and planet size and rotation appear correct 
  //          after the next refresh
  //
  // 'sun1' uses the sun's radius as the canonical distance unit (CDU).
  // 'sun2' uses 1 AU as the CDU, and we need to scale the size of the  
  // sun additionally by a factor of the ratio of 1 AU to the radius of  
  // the sun (ratio=214.9...).  sun2 is needed to allow the 'a' slider 
  // to reach larger scales of distance.  Make sure that the 
  // centralBodyData id for 'sun2' is 1.  NOTE: the sun is not visible 
  // to scale even at the smallest value of 'a' (1 AU).

  if (theCB.id !== 1){
    omt.shapeOrbitCurve(a, e);
  }else{
    omt.shapeOrbitCurve(214.939469396551724*a, e);
  }
}

const doASliderOnInput = function(i){
  a = aArray[i];
  computeP();
  periodNom = twoPi*Math.pow(a,1.5)/muCanonical;// orbital period
  meanMotion = Math.sqrt(muCanonical/(a*a*a));
  aDisplay.innerHTML = `a: ${Number(a).toFixed(3).toString()} CDU`;
  shapeOrbitCurve();
  displayNumerical();
}

const doESliderOnInput = function(i){
  // inputs: eSlider index
  // outputs: e, p, sqrtMuOverP, eNomIsZero, correctly displayed e,
  //          correctly shaped orbit, planet size and rotation,
  //          correct numerical display
  e = eArray[i];
  computeP();
  eNomIsZero = (e === 0);
  eDisplay.innerHTML = `e: ${Number(e).toFixed(3).toString()}`;
  shapeOrbitCurve();
  displayNumerical();
}

aSlider.oninput = function(){
  doASliderOnInput(+this.value);
  omt.needsRefresh = false;
}

eSlider.oninput = function(){
  doESliderOnInput(+this.value);
}

aSlider.onpointerup = function(){
  rp = a*(1-e);
  handlePeriapseCheck();
  needToComputeNominalOrbit = true;
  computeNominalOrbit();
  computePerturbedOrbit();
  doNu(nuDegrees);
  omt.needsRefresh = true;
  replaceAerovisualizerData('semimajor-axis',+this.value);
  saveToLocalStorage();
}

eSlider.onpointerup = function(){
  rp = a*(1-e);
  handlePeriapseCheck();
  needToComputeNominalOrbit = true;
  computeNominalOrbit();
  computePerturbedOrbit();
  doNu(nuDegrees);
  omt.needsRefresh = true;
  
  // these are undefined for zero eccentricity, so
  // need to set the display correctly
  handleLanIncAopOnInput('lan');
  handleLanIncAopOnInput('aop');

  replaceAerovisualizerData('eccentricity',+this.value);
  saveToLocalStorage();
}

const computePQW2IJKRotation = function(){
  // inputs: lan, inc, aop
  // outputs: dcmIJK2PQW, dcmPQW2IJK, omt quaternion
  //
  // compute the direction cosine matrices between the perifocal frame
  // and the geocentric equatorial frame (or other inertial frames)
  // (Bate p. 82).  This is a 313 Euler rotation sequence
  const clan = Math.cos(lan);// longitude of the ascending node
  const slan = Math.sin(lan);
  const cinc = Math.cos(inc);// orbital inclination
  const sinc = Math.sin(inc);
  const caop = Math.cos(aop);// argument of periapse
  const saop = Math.sin(aop);
  const r11 =  clan*caop - slan*saop*cinc;
  const r12 = -clan*saop - slan*caop*cinc;
  const r13 =  slan*sinc;
  const r21 =  slan*caop + clan*saop*cinc;
  const r22 = -slan*saop + clan*caop*cinc;
  const r23 = -clan*sinc;
  const r31 =  saop*sinc;
  const r32 =  caop*sinc;
  const r33 =  cinc;
  dcmIJK2PQW.set(r11, r21, r31, r12, r22, r32, r13, r23, r33);
  dcmPQW2IJK.set(r11, r12, r13, r21, r22, r23, r31, r32, r33);
  omt.setQuatFromDCMElements(r11, r12, r13, r21, r22, r23, r31, r32, r33);
}

const computePQW2UVWRotation = function(){
  // inputs: nu
  // outputs: dcmPQW2UVW, dcmUVW2PQW
  //
  // compute the direction cosine matrix from the perifocal frame
  // to the UVW frame and vice versa

  const cnu = Math.cos(nu);
  const snu = Math.sin(nu);
  dcmPQW2UVW.set(cnu,  snu,  0, -snu, cnu, 0, 0, 0, 1);
  dcmUVW2PQW.set(cnu, -snu,  0,  snu, cnu, 0, 0, 0, 1);
}

const handleLanIncAopOnInput = function(opt){
  // inputs: opt, lanSlider.value, incSlider.value, aopSlider.value
  // outputs: lan, inc, aop, correct respective displays,
  //          correct numerical display, correctly shaped orbit curve
  //          and planet size and rotation, correct dcmIJK2PQW and 
  //          dcmPQW2IJK matrices

  switch (opt){
    case 'lan':
      lanDegrees = lanSlider.value;
      lanDisplay.innerHTML = eNomIsZero ? 'UNDEF' : `${lanDegrees}&deg;`;
      lan = lanDegrees*piOver180;
      break;

    case 'inc':
      incDegrees = incSlider.value;
      incDisplay.innerHTML = `${incDegrees}&deg;`;
      inc = incDegrees*piOver180;
      break;

    case 'aop':
      aopDegrees = aopSlider.value;
      aopDisplay.innerHTML = eNomIsZero ? 'UNDEF' : `${aopDegrees}&deg;`;
      aop = aopDegrees*piOver180;
      break;

    case 'all':
      lanDegrees = lanSlider.value;
      incDegrees = incSlider.value;
      aopDegrees = aopSlider.value;
      lanDisplay.innerHTML = eNomIsZero ? 'UNDEF' : `${lanDegrees}&deg;`;
      incDisplay.innerHTML = `${incDegrees}&deg;`;
      aopDisplay.innerHTML = eNomIsZero ? 'UNDEF' : `${aopDegrees}&deg;`;
      lan = lanDegrees*piOver180;
      inc = incDegrees*piOver180;
      aop = aopDegrees*piOver180;
  }

  displayNumerical();
  shapeOrbitCurve();
  computePQW2IJKRotation();
}

lanSlider.oninput = function(){
  handleLanIncAopOnInput('lan');
}

incSlider.oninput = function(){
  handleLanIncAopOnInput('inc');
}

aopSlider.oninput = function(){
  handleLanIncAopOnInput('aop');
}

const handleLanIncAopOnPointerUp = function(){
  if (deltaVPrefChoice === 'ijk' || deltaRPrefChoice === 'ijk'){
    if (deltaVPrefChoice === 'ijk'){
      handleDeltaVOnPointerUp();
    }

    if (deltaRPrefChoice === 'ijk'){
      handleDeltaROnPointerUp();
    }

    omt.needsRefresh = true;
    computePerturbedOrbit();
  }
}

lanSlider.onpointerup = function(){
  handleLanIncAopOnPointerUp();
  computeOrbitPertParams();//temporary need to do this for numerical menu
  displayNumerical();//temporary
  replaceAerovisualizerData('longitude-of-ascending-node',this.value);
  saveToLocalStorage();
}

incSlider.onpointerup = function(){
  handleLanIncAopOnPointerUp();
  computeOrbitPertParams();//temporary need to do this for numerical menu
  displayNumerical();//temporary
  replaceAerovisualizerData('inclination',this.value);
  saveToLocalStorage();
}

aopSlider.onpointerup = function(){
  handleLanIncAopOnPointerUp();
  computeOrbitPertParams();//temporary need to do this for numerical menu
  displayNumerical();//temporary
  replaceAerovisualizerData('argument-of-periapsis',this.value);
  saveToLocalStorage();
}

zeroLanButton.addEventListener('click', () => {
  lanSlider.value = 0;
  handleLanIncAopOnInput('lan');
  handleLanIncAopOnPointerUp();
  replaceAerovisualizerData('longitude-of-ascending-node',0);
  saveToLocalStorage();
});

zeroIncButton.addEventListener('click', () => {
  incSlider.value = 0;
  handleLanIncAopOnInput('inc');
  handleLanIncAopOnPointerUp();
  replaceAerovisualizerData('inclination',0);
  saveToLocalStorage();
});

zeroAopButton.addEventListener('click', () => {
  aopSlider.value = 0;
  handleLanIncAopOnInput('aop');
  handleLanIncAopOnPointerUp();
  replaceAerovisualizerData('argument-of-periapsis',0);
  saveToLocalStorage();
});

const handleDeltaVDisplay = function(xyz){
  // dvxKmPerSec, dvyKmPerSec, and dvzKmPerSec are the rates from deltaVArray 
  // converted from km/s into CDU/CTU
  const dvxKmPerSec = deltaVArray[+deltaVXSlider.value];
  const dvyKmPerSec = deltaVArray[+deltaVYSlider.value];
  const dvzKmPerSec = deltaVArray[+deltaVZSlider.value];

  switch (xyz){
    case 'x':
      switch (deltaVPrefChoice){
        case 'pqw':
          deltaVXDisplay.innerHTML = `&Delta;Vp: ${Number(dvxKmPerSec).toFixed(4).toString()}`;
          break;
    
        case 'uvw':
          deltaVXDisplay.innerHTML = `&Delta;Vu: ${Number(dvxKmPerSec).toFixed(4).toString()}`;
          break;
    
        case 'ijk':
          deltaVXDisplay.innerHTML = `&Delta;Vi: ${Number(dvxKmPerSec).toFixed(4).toString()}`;
          break;
    
        case 'vel':
          deltaVXDisplay.innerHTML = `&Delta;V: ${Number(dvxKmPerSec).toFixed(4).toString()}`;
          break;
      }
      break;

    case 'y':
      switch (deltaVPrefChoice){
        case 'pqw':
          deltaVYDisplay.innerHTML = `&Delta;Vq: ${Number(dvyKmPerSec).toFixed(4).toString()}`;
          break;
    
        case 'uvw':
          deltaVYDisplay.innerHTML = `&Delta;Vv: ${Number(dvyKmPerSec).toFixed(4).toString()}`;
          break;
    
        case 'ijk':
          deltaVYDisplay.innerHTML = `&Delta;Vj: ${Number(dvyKmPerSec).toFixed(4).toString()}`;
          break;
    
        case 'vel':
          deltaVYDisplay.innerHTML = '&nbsp;';
          break;
      }
      break;
    
    case 'z':
      switch (deltaVPrefChoice){
        case 'pqw':
          deltaVZDisplay.innerHTML = `&Delta;Vw: ${Number(dvzKmPerSec).toFixed(4).toString()}`;
          break;
    
        case 'uvw':
          deltaVZDisplay.innerHTML = `&Delta;Vw: ${Number(dvzKmPerSec).toFixed(4).toString()}`;
          break;
    
        case 'ijk':
          deltaVZDisplay.innerHTML = `&Delta;Vk: ${Number(dvzKmPerSec).toFixed(4).toString()}`;
          break;
    
        case 'vel':
          deltaVZDisplay.innerHTML = '&nbsp;';
          break;
      }
      break;
  }
}

const handleDeltaRDisplay = function(xyz){
  const drxKm = deltaRArray[+deltaRXSlider.value];
  const dryKm = deltaRArray[+deltaRYSlider.value];
  const drzKm = deltaRArray[+deltaRZSlider.value];

  switch (xyz){
    case 'x':
      switch (deltaRPrefChoice){
        case 'pqw':
          deltaRXDisplay.innerHTML = `&Delta;Rp: ${Number(drxKm).toFixed(1).toString()}`;
          break;
    
        case 'uvw':
          deltaRXDisplay.innerHTML = `&Delta;Ru: ${Number(drxKm).toFixed(1).toString()}`;
          break;
    
        case 'ijk':
          deltaRXDisplay.innerHTML = `&Delta;Ri: ${Number(drxKm).toFixed(1).toString()}`;
          break;
    
        case 'vel':
          deltaRXDisplay.innerHTML = `&Delta;R: ${Number(drxKm).toFixed(1).toString()}`;
          break;
      }
      break;

    case 'y':
      switch (deltaRPrefChoice){
        case 'pqw':
          deltaRYDisplay.innerHTML = `&Delta;Rq: ${Number(dryKm).toFixed(1).toString()}`;
          break;
    
        case 'uvw':
          deltaRYDisplay.innerHTML = `&Delta;Rv: ${Number(dryKm).toFixed(1).toString()}`;
          break;
    
        case 'ijk':
          deltaRYDisplay.innerHTML = `&Delta;Rj: ${Number(dryKm).toFixed(1).toString()}`;
          break;
    
        case 'vel':
          deltaRYDisplay.innerHTML = '&nbsp;';
          break;
      }
      break;
    
    case 'z':
      switch (deltaRPrefChoice){
        case 'pqw':
          deltaRZDisplay.innerHTML = `&Delta;Rw: ${Number(drzKm).toFixed(1).toString()}`;
          break;
    
        case 'uvw':
          deltaRZDisplay.innerHTML = `&Delta;Rw: ${Number(drzKm).toFixed(1).toString()}`;
          break;
    
        case 'ijk':
          deltaRZDisplay.innerHTML = `&Delta;Rk: ${Number(drzKm).toFixed(1).toString()}`;
          break;
    
        case 'vel':
          deltaRZDisplay.innerHTML = '&nbsp;';
          break;
      }
      break;
  }
}

deltaVPrefMenu.addEventListener('change', () => {
  deltaVPrefChoice = deltaVPrefMenu.value;
  deltaVXSlider.value = 16;// 0 is at index 16 of deltaVArray
  deltaVYSlider.value = 16;
  deltaVZSlider.value = 16;
  dvx = deltaVArray[+deltaVXSlider.value]/cduPerCtu;
  dvy = deltaVArray[+deltaVYSlider.value]/cduPerCtu;
  dvz = deltaVArray[+deltaVZSlider.value]/cduPerCtu;
  handleDeltaVDisplay('x');
  handleDeltaVDisplay('y');
  handleDeltaVDisplay('z');
  computePerturbedOrbit();
  omt.needsRefresh = true;
  replaceAerovisualizerData('deltaVPrefChoice',deltaVPrefChoice);
  saveToLocalStorage();
});

deltaRPrefMenu.addEventListener('change', () => {
  deltaRPrefChoice = deltaRPrefMenu.value;
  deltaRXSlider.value = 20;// 0 is at index 20 of deltaRArray
  deltaRYSlider.value = 20;
  deltaRZSlider.value = 20;
  drx = deltaRArray[+deltaRXSlider.value]/cdu;
  dry = deltaRArray[+deltaRYSlider.value]/cdu;
  drz = deltaRArray[+deltaRZSlider.value]/cdu;
  handleDeltaRDisplay('x');
  handleDeltaRDisplay('y');
  handleDeltaRDisplay('z');
  computePerturbedOrbit();
  omt.needsRefresh = true;
  replaceAerovisualizerData('deltaRPrefChoice',deltaRPrefChoice);
  saveToLocalStorage();
});

const handleDeltaOrbitsButton = function(){
  omt.setDisplayOrbitsAsDifference(displayOrbitsAsDifference);

  if (displayOrbitsAsDifference){
    setCentralBodyTransparency(100);
    omt.setOrbitCurveOpacity(0);
    toggleOrbitDiffDisplayButton.innerHTML = '2&nbsp;orbits&nbsp;/&nbsp;&Delta;&nbsp;ORBITS';
    zoomElements.style.display = 'grid';
  }else{
    setCentralBodyTransparency(centralBodyTransparency);
    omt.setOrbitCurveOpacity(1);
    toggleOrbitDiffDisplayButton.innerHTML = '2&nbsp;ORBITS&nbsp;/&nbsp;&Delta;&nbsp;orbits';
    zoomElements.style.display = 'none';
  }

  passOrbitPertOrDeltaToOMT();
}

toggleOrbitDiffDisplayButton.addEventListener('click', () => {
  displayOrbitsAsDifference = displayOrbitsAsDifference === true ? false : true;
  handleDeltaOrbitsButton();
});

deltaVXSlider.oninput = function(){
  handleDeltaVDisplay('x');
}

deltaVYSlider.oninput = function(){
  handleDeltaVDisplay('y');
}

deltaVZSlider.oninput = function(){
  handleDeltaVDisplay('z');
}

deltaRXSlider.oninput = function(){
  handleDeltaRDisplay('x');
}

deltaRYSlider.oninput = function(){
  handleDeltaRDisplay('y');
}

deltaRZSlider.oninput = function(){
  handleDeltaRDisplay('z');
}

const handleDeltaVOnPointerUp = function(){
  dvx = deltaVArray[+deltaVXSlider.value]/cduPerCtu;
  dvy = deltaVArray[+deltaVYSlider.value]/cduPerCtu;
  dvz = deltaVArray[+deltaVZSlider.value]/cduPerCtu;

  switch (deltaVPrefChoice){
    case 'pqw':
      break;

    case 'uvw':
      vPQW.set(dvx, dvy, dvz);
      vPQW.applyMatrix3(dcmUVW2PQW);
      dvx = vPQW.x;
      dvy = vPQW.y;
      dvz = vPQW.z;
      break;
    
    case 'ijk':
      vPQW.set(dvx, dvy, dvz);
      vPQW.applyMatrix3(dcmIJK2PQW);
      dvx = vPQW.x;
      dvy = vPQW.y;
      dvz = vPQW.z;
      break;

    case 'vel':
      // set the delta v to be along the nominal orbit velocity
      // direction using the deltaVXSlider control
      let nomVx = orbitNom[(iOrb+0)%orbitSize].vx;
      let nomVy = orbitNom[(iOrb+0)%orbitSize].vy;
      let nomVz = orbitNom[(iOrb+0)%orbitSize].vz;
      const nomVMag = Math.sqrt(nomVx*nomVx + nomVy*nomVy + nomVz*nomVz);
      const dvMag = deltaVArray[+deltaVXSlider.value]/cduPerCtu;

      dvx = nomVx/nomVMag*dvMag;
      dvy = nomVy/nomVMag*dvMag;
      dvz = nomVz/nomVMag*dvMag;
      break;
  }

  computePerturbedOrbit();
  omt.needsRefresh = true;
}

const handleDeltaROnPointerUp = function(){
  drx = deltaRArray[+deltaRXSlider.value]/cdu;
  dry = deltaRArray[+deltaRYSlider.value]/cdu;
  drz = deltaRArray[+deltaRZSlider.value]/cdu;

  switch (deltaRPrefChoice){
    case 'pqw':
      break;

    case 'uvw':
      rPQW.set(drx, dry, drz);
      rPQW.applyMatrix3(dcmUVW2PQW);
      drx = rPQW.x;
      dry = rPQW.y;
      drz = rPQW.z;
      break;
    
    case 'ijk':
      rPQW.set(drx, dry, drz);
      rPQW.applyMatrix3(dcmIJK2PQW);
      drx = rPQW.x;
      dry = rPQW.y;
      drz = rPQW.z;
      break;

    case 'vel':
      // set the delta r to be along the nominal orbit velocity
      // direction using the deltaRXSlider control
      let nomVx = orbitNom[(iOrb+0)%orbitSize].vx;
      let nomVy = orbitNom[(iOrb+0)%orbitSize].vy;
      let nomVz = orbitNom[(iOrb+0)%orbitSize].vz;
      const nomVMag = Math.sqrt(nomVx*nomVx + nomVy*nomVy + nomVz*nomVz);
      const drMag = deltaRArray[+deltaRXSlider.value]/cdu;

      drx = nomVx/nomVMag*drMag;
      dry = nomVy/nomVMag*drMag;
      drz = nomVz/nomVMag*drMag;
      break;
  }

  computePerturbedOrbit();
  omt.needsRefresh = true;
}

deltaVXSlider.onpointerup = function(){
  handleDeltaVOnPointerUp();
  replaceAerovisualizerData('deltaVXSliderValue',this.value);
  saveToLocalStorage();
}

deltaVYSlider.onpointerup = function(){
  handleDeltaVOnPointerUp();
  replaceAerovisualizerData('deltaVYSliderValue',this.value);
  saveToLocalStorage();
}

deltaVZSlider.onpointerup = function(){
  handleDeltaVOnPointerUp();
  replaceAerovisualizerData('deltaVZSliderValue',this.value);
  saveToLocalStorage();
}

deltaRXSlider.onpointerup = function(){
  handleDeltaROnPointerUp();
  replaceAerovisualizerData('deltaRXSliderValue',this.value);
  saveToLocalStorage();
}

deltaRYSlider.onpointerup = function(){
  handleDeltaROnPointerUp();
  replaceAerovisualizerData('deltaRYSliderValue',this.value);
  saveToLocalStorage();
}

deltaRZSlider.onpointerup = function(){
  handleDeltaROnPointerUp();
  replaceAerovisualizerData('deltaRZSliderValue',this.value);
  saveToLocalStorage();
}

zeroDeltaVXButton.addEventListener('click', () => {
  deltaVXSlider.value = 16;//16 is index to deltaVArray value 0
  handleDeltaVDisplay('x');
  handleDeltaVOnPointerUp();
  replaceAerovisualizerData('deltaVXSliderValue',deltaVXSlider.value);
  saveToLocalStorage();
});

zeroDeltaVYButton.addEventListener('click', () => {
  deltaVYSlider.value = 16;
  handleDeltaVDisplay('y');
  handleDeltaVOnPointerUp();
  replaceAerovisualizerData('deltaVYSliderValue',deltaVYSlider.value);
  saveToLocalStorage();
});

zeroDeltaVZButton.addEventListener('click', () => {
  deltaVZSlider.value = 16;
  handleDeltaVDisplay('z');
  handleDeltaVOnPointerUp();
  replaceAerovisualizerData('deltaVZSliderValue',deltaVZSlider.value);
  saveToLocalStorage();
});

zeroDeltaRXButton.addEventListener('click', () => {
  deltaRXSlider.value = 20;//20 is index to deltaRArray value 0
  handleDeltaRDisplay('x');
  handleDeltaROnPointerUp();
  replaceAerovisualizerData('deltaRXSliderValue',deltaRXSlider.value);
  saveToLocalStorage();
});

zeroDeltaRYButton.addEventListener('click', () => {
  deltaRYSlider.value = 20;
  handleDeltaRDisplay('y');
  handleDeltaROnPointerUp();
  replaceAerovisualizerData('deltaRYSliderValue',deltaRYSlider.value);
  saveToLocalStorage();
});

zeroDeltaRZButton.addEventListener('click', () => {
  deltaRZSlider.value = 20;
  handleDeltaRDisplay('z');
  handleDeltaROnPointerUp();
  replaceAerovisualizerData('deltaRZSliderValue',deltaRZSlider.value);
  saveToLocalStorage();
});

zoomSlider.oninput = function(){
  zoomDisplay.innerHTML = `zoom: x${1 + Number(this.value)}`;
}

zoomSlider.onpointerup = function(){
  omt.setZoom(1 + Number(this.value));//slider range should start at 0
  omt.needsRefresh = true;
}

const renderRandV = function(){
  // inputs: a, p, sqrtMuOverP, e, nu
  // outputs: correctly rendered r and v vectors on the next refresh
  let a1 = a;
  const r = p/(1 + e*Math.cos(nu));
  let x = r*Math.cos(nu);
  let y = r*Math.sin(nu);   
  omt.setRVisible(true);
  omt.setVVisible(true);
  omt.setR(x, y, 0, a1);
  x = -sqrtMuOverP*Math.sin(nu);
  y = sqrtMuOverP*(e + Math.cos(nu));
  omt.setV(x, y, 0, a1);
}

const computeKepler = function(){
  // inputs: nu
  // outputs: eccentricAnomaly, meanAnomaly

  // Bate pp. 182-188
  const cosnu = Math.cos(nu);
  let E = Math.acos((e + cosnu)/(1 + e*cosnu));// acos is 0 to pi
  E = nu < 0 ? -E : E;
  eccentricAnomaly = E;
  meanAnomaly = eccentricAnomaly - e*Math.sin(E);
}

const doNu = function(value, precise = false){
  // inputs: value to set nuDegrees to
  // outputs: nuDegrees, nu, eccentricAnomaly, meanAnomaly,
  //          dcmUVW2PQW, dcmPQW2UVW, timeAfterPeriapse,
  //          timeAfterPeriapseInSeconds, iOrb, correctly
  //          rotated planet, correct time after periapse display,
  //          correctly rendered r and v vectors

  if (!orbitNom){
    return;
  }

  nuDegrees = value;
  nu = nuDegrees*piOver180;
  computeKepler();
  computePQW2UVWRotation();
  timeAfterPeriapse = meanAnomaly/meanMotion;
  timeAfterPeriapseInSeconds = timeAfterPeriapse*ctu;

  if (!precise){
    iOrb = orbitNom.findIndex((e) => e.t >= timeAfterPeriapse);
  }else{
    iOrb = orbitNom.findIndex((e) => e.t > timeAfterPeriapse - 0.0001 && e.t < timeAfterPeriapse + 0.0001);
  }

  if (iOrb < 0){
    iOrb = Number(0);
  }

  omt.rotatePlanet1(timeAfterPeriapseInSeconds, planetRotationPeriodInSeconds);

  if (meanAnomaly !== null){
    nuDisplay.innerHTML = `&nu;: ${Number(nuDegrees).toFixed(2).toString()}`;
    
    if (nuDegrees >= 0){
      timeAfterPeriapseDisplay.innerHTML = `time after periapse = ${dhms(timeAfterPeriapse*ctu)}`;
    }else{
      timeAfterPeriapseDisplay.innerHTML = `time after periapse = -${dhms(Math.abs(timeAfterPeriapse*ctu))}`;
    }
  }else{
    nuDisplay.innerHTML = 'INF';
    timeAfterPeriapseDisplay.innerHTML = 'time after periapse = INFINITY';
  }

  renderRandV();
  omt.refresh();
}

nuSlider.oninput = function(){
  doNu(Number(this.value));
}

nuSlider.onpointerup = function(){
  computePerturbedOrbit();
  omt.needsRefresh = true;
  replaceAerovisualizerData('true-anomaly',nuDegrees);
  saveToLocalStorage();
}

zeroNuButton.addEventListener('click', () => {
  nuSlider.value = 0;
  doNu(Number(nuSlider.value));
  computePerturbedOrbit();
  omt.needsRefresh = true;
  replaceAerovisualizerData('true-anomaly',nuDegrees);
  saveToLocalStorage();
});

const computeNominalOrbit = function(){
  let tn;
  let dtdx;
  let xFirstGuess;
  let x;
  let z;
  let c;
  let s;
  let r;
  let i;
  let f;
  let g;
  let fdot;
  let gdot;

  if (!needToComputeNominalOrbit){
    return;
  }

  needToComputeNominalOrbit = false;
  // set needToComputeNominalOrbit to true whenever a or e changes
  // but don't call this function until pointerup.  Also, call this
  // immediately when changing the central body

  const t0 = 0;
  // we set r0 to be at periapse, so t0 = timeAfterPeriapse = 0.
  // Otherwise, we would set t0 equal to timeAfterPeriapse

  const r0 = rp;
  // we set r0 to be at periapse, so we set it to rp, which
  // was set equal to a*(1-e) in either aSlider.onpointerup
  // or eSlider.onpointerup.  Otherwise, we would set r0 to 
  // rVector.length(), where rVector is some THREE.Vector3 object

  const r0DotV0 = 0;
  // we set r0 and v0 to be at periapse, so their dot product
  // is 0.  Otherwise, we would set r0DotV0 equal to 
  // rVector.dot(vVector), where rVector and vVector are some 
  // THREE.Vector3 objects, and where rVector would be set from 
  // r = p/(1 + e*cos(nu)), and so rVector.x would equal r*cos(nu),
  // rVector.y would equal r*sin(nu), vVector.x would equal 
  // -sqrtMuOverP*sin(nu), and vVector.y would equal 
  // sqrtMuOverP*(e + cos(nu)) from Bate pp. 72, 73

  // t is the time in canonical time units.  For elliptical orbits, an 
  // orbital period (periodNom) equals twoPi canonical time units (TU or CTU)
  let t;
  let E;
  let nu;
  let cosnu;
  let M;
  let k = 0;

  for (let nuDeg=-180; nuDeg<=180; nuDeg+=2){
    // nuDeg limits are tied to orbitSize, so better to not to use 180 here
    // Bate pp. 182-188
    nu = nuDeg*piOver180;
    cosnu = Math.cos(nu);
  
    E = Math.acos((e + cosnu)/(1 + e*cosnu));// acos is 0 to pi
    M = E - e*Math.sin(E);
    t = M/meanMotion;// meanMotion is computed in doASliderOnInput
    t = nu < 0 ? -t : t;
    E = nu < 0 ? -E : E;

    if (t - t0 === 0){
      t = t0 + 0.00000001;// small arbitrary number to avoid division by zero
    }

    r = a*(1 - e*Math.cos(E));

    // Bate p. 206 for first guess of x
    xFirstGuess = Math.sqrt(muCanonical)*(t - t0)/a;
    x = xFirstGuess;

    // iterate to find x at time t.  The loop count limit is arbitrary
    // but is designed to handle extreme cases.  It should usually
    // break out of the loop way before i reaches its maximum.  Tests of
    // this have shown that i can get up to around 30 for eccentricities
    // near 1 (parabolic orbit).  Eccentricities from 0.98 to 1.02 
    // are not allowed to prevent i from being too large and affecting 
    // computer performance
    for (i=0; i<50; i++){
      // Bate p. 195
      z = x*x/a;
      
      // Bate p. 208
      let sqrtZ = Math.sqrt(z);
      c = (1 - Math.cos(sqrtZ))/z;
      s = (sqrtZ - Math.sin(sqrtZ))/(sqrtZ*sqrtZ*sqrtZ);

      // Bate pp. 197-8, use equations 4.4-14 and 4.4-17
      tn = (r0DotV0*x*x*c/sqrtMuCanonical +
       (1 - r0/a)*x*x*x*s + r0*x)/sqrtMuCanonical;
      dtdx = (x*x*c + r0DotV0*x*(1 - z*s)/sqrtMuCanonical +
       r0*(1 - z*c))/sqrtMuCanonical;      
      x = x + (t - tn)/dtdx;

      // break out of the loop if "close enough", i is usually 
      // way below its max, especially for eccentricities far from 1
      if (Math.abs(t - tn) < 0.00000001){
        break;
      }
    }

    if (i < 50){
      warning2.innerHTML = '&nbsp;';
    }else{
      warning2.innerHTML = 'problem generating nominal orbit';
    }

    // Bate pp. 201-2
    // below, the r and v vectors are computed assuming that r0 and v0 are
    // at periapse.  The r0 vector is just rp, directed along the P direction in PQW.  
    // The v0 vector is sqrtMuOverP*(e + 1) (see Bate p. 73, nu=0), directed along the 
    // Q direction in PQW

    orbitNom[k].nu = nuDeg;
    orbitNom[k].t = t;

    f = 1 - x*x*c/r0;
    g = t - x*x*x*s/sqrtMuCanonical;
    orbitNom[k].rx = f*rp;
    orbitNom[k].ry = g*sqrtMuOverP*(e + 1);
    orbitNom[k].rz = 0;
    
    fdot = sqrtMuCanonical*x*(z*s - 1)/(r0*r);
    gdot = 1 - x*x*c/r;
    orbitNom[k].vx = fdot*rp;
    orbitNom[k].vy = gdot*sqrtMuOverP*(e + 1);
    orbitNom[k].vz = 0;

    k++;
  }
  
  if (orbitNom[0].nu > 179.999999){
    // set the first nu to -180 because atan2 sets it to +180
    orbitNom[0].nu = -180;
  }
}

const computePerturbedOrbit = function(){
  let tn;
  let dtdx;
  let xFirstGuess;
  let x;
  let z;
  let c;
  let s;
  let r;
  let i;
  let f;
  let g;
  let fdot;
  let gdot;
  const t0 = 0;// time in CTU

  r0PertPQW.x = orbitNom[(iOrb+0)%orbitSize].rx;
  r0PertPQW.y = orbitNom[(iOrb+0)%orbitSize].ry;
  r0PertPQW.z = orbitNom[(iOrb+0)%orbitSize].rz;
  v0PertPQW.x = orbitNom[(iOrb+0)%orbitSize].vx;
  v0PertPQW.y = orbitNom[(iOrb+0)%orbitSize].vy;
  v0PertPQW.z = orbitNom[(iOrb+0)%orbitSize].vz;

  r0PertPQW.x += drx;
  r0PertPQW.y += dry;
  r0PertPQW.z += drz;
  v0PertPQW.x += dvx;
  v0PertPQW.y += dvy;
  v0PertPQW.z += dvz;

  let r0 = r0PertPQW.length();// magnitude of the vector to the 
  // nominal trajectory
  rPertPeriapse = r0;// first guess of periapse distance
  kPertPeriapse = 0;// first guess of the index to the 
  // orbitPert array for the r that is closest to periapse
  let r0DotV0 = r0PertPQW.dot(v0PertPQW);// dot product of the 
  // nominal position and velocity vectors at time t0

  let t;// time since when r0PertPQW and v0PertPQW occurred in canonical time units
  const v0 = v0PertPQW.length();
  const vSqu = v0*v0;
  r = r0;
  const specEnergy = vSqu/2 - muCanonical/r;//Bate p. 27, specific energy
  aPert = -muCanonical/(2*specEnergy);//Bate p. 28, semi-major axis
  periodPert = twoPi*Math.pow(aPert,1.5)/muCanonical;

  for (let k=0; k<orbitSize; k++){
    t = orbitNom[(iOrb+k)%orbitSize].t - orbitNom[(iOrb+0)%orbitSize].t;
    
    if (t - t0 === 0){
      t = t0 + 0.00000001;// small arbitrary number to avoid division by zero
    }

    t = t < 0 ? t + periodNom : t;// add 1 orbital time period if t < 0 (i.e., time before nominal orbit periapse)

    // Bate p. 206 for first guess of x
    xFirstGuess = Math.sqrt(muCanonical)*(t - t0)/aPert;
    x = xFirstGuess;

    // iterate to find x at time t.  The loop count limit is arbitrary
    // but is designed to handle extreme cases.  It should usually
    // break out of the loop way before i reaches its maximum.  Tests of
    // this have shown that i can get up to around 30 for eccentricities
    // near 1 (parabolic orbit).  Eccentricities from 0.98 to 1.02 
    // are not allowed to prevent i from being too large and affecting 
    // computer performance
    for (i=0; i<50; i++){
      // Bate p. 195
      z = x*x/aPert;
      
      // Bate p. 208
      let sqrtZ = Math.sqrt(z);
      c = (1 - Math.cos(sqrtZ))/z;
      s = (sqrtZ - Math.sin(sqrtZ))/(sqrtZ*sqrtZ*sqrtZ);

      // Bate pp. 197-8, use equations 4.4-14 and 4.4-17
      tn = (r0DotV0*x*x*c/sqrtMuCanonical +
       (1 - r0/aPert)*x*x*x*s + r0*x)/sqrtMuCanonical;
      dtdx = (x*x*c + r0DotV0*x*(1 - z*s)/sqrtMuCanonical +
       r0*(1 - z*c))/sqrtMuCanonical;      
      x = x + (t - tn)/dtdx;

      // break out of the loop if "close enough", i is usually 
      // way below its max, especially for eccentricities far from 1
      if (Math.abs(t - tn) < 0.00000001){
        break;
      }
    }

    if (i < 50){
      warning2.innerHTML = '&nbsp;';
    }else{
      warning2.innerHTML = 'problem generating pertubed orbit';
    }

    // Bate pp. 201-2

    orbitPert[k].nu = 0;
    orbitPert[k].t = t + orbitNom[(iOrb+0)%orbitSize].t;

    f = 1 - x*x*c/r0;
    g = t - x*x*x*s/sqrtMuCanonical;
    orbitPert[k].rx = f*r0PertPQW.x + g*v0PertPQW.x;
    orbitPert[k].ry = f*r0PertPQW.y + g*v0PertPQW.y;
    orbitPert[k].rz = f*r0PertPQW.z + g*v0PertPQW.z;

    r = Math.sqrt(orbitPert[k].rx*orbitPert[k].rx + orbitPert[k].ry*orbitPert[k].ry + orbitPert[k].rz*orbitPert[k].rz);

    if (r <= rPertPeriapse){
      rPertPeriapse = r;
      kPertPeriapse = k;
    }

    fdot = sqrtMuCanonical*x*(z*s - 1)/(r0*r);
    gdot = 1 - x*x*c/r;
    orbitPert[k].vx = fdot*r0PertPQW.x + gdot*v0PertPQW.x;
    orbitPert[k].vy = fdot*r0PertPQW.y + gdot*v0PertPQW.y;
    orbitPert[k].vz = fdot*r0PertPQW.z + gdot*v0PertPQW.z;
  }

  computeOrbitPertParams();
  passOrbitPertOrDeltaToOMT();
}

const passOrbitPertOrDeltaToOMT = function(){
  if (displayOrbitsAsDifference){
    for (let k=0; k<orbitSize; k++){
      orbitDelta[k].t  = orbitPert[k].t  - orbitNom[(iOrb+k)%orbitSize].t;
      orbitDelta[k].nu = orbitPert[k].nu - orbitNom[(iOrb+k)%orbitSize].nu;
      orbitDelta[k].rx = orbitPert[k].rx - orbitNom[(iOrb+k)%orbitSize].rx;
      orbitDelta[k].ry = orbitPert[k].ry - orbitNom[(iOrb+k)%orbitSize].ry;
      orbitDelta[k].rz = orbitPert[k].rz - orbitNom[(iOrb+k)%orbitSize].rz;
      orbitDelta[k].vx = orbitPert[k].vx - orbitNom[(iOrb+k)%orbitSize].vx;
      orbitDelta[k].vy = orbitPert[k].vy - orbitNom[(iOrb+k)%orbitSize].vy;
      orbitDelta[k].vz = orbitPert[k].vz - orbitNom[(iOrb+k)%orbitSize].vz;
    }

    omt.setOrbitPertOrDelta(orbitDelta, true);
  }else{
    omt.setOrbitPertOrDelta(orbitPert, false);
  }

  omt.needsRefresh = true;
}

const computeOrbitPertParams = function(){
  // do this function at the end of computePertubedOrbit which 
  // sets r0PertPQW and v0PertPQW, and computes rPertPeriapse,  
  // kPertPeriapse, and aPert

  // compute the PQW unit vectors.  These are expressed in the PQW
  // frame of the NOMINAL orbit
  wPert.crossVectors(r0PertPQW,v0PertPQW);
  wPert.normalize();
  pPert.set(orbitPert[kPertPeriapse].rx, orbitPert[kPertPeriapse].ry, orbitPert[kPertPeriapse].rz);
  pPert.normalize();
  qPert.crossVectors(wPert,pPert);

  // rotate the PQW vectors of the perturbed orbit to the inertial frame
  pPert.applyMatrix3(dcmPQW2IJK);
  qPert.applyMatrix3(dcmPQW2IJK);
  wPert.applyMatrix3(dcmPQW2IJK);

  // eccentricity of the perturbed orbit
  ePert = 1 - rPertPeriapse/aPert;
  ePertIsZero = (ePert < 1e-10);

  // extract the 313 Euler angles from what would be a 
  // direction cosine matrix made using pPert, qPert, and wPert
  incPert = Math.acos(wPert.z);
  const sinInc = Math.sin(incPert);
  incPert = incPert < 0 ? incPert + Math.PI : incPert;
  incPert /= piOver180;
  incPert = Math.round(incPert);

  if (sinInc !== 0){
    lanPert = Math.round(Math.atan2(wPert.x/sinInc,-wPert.y/sinInc)/piOver180);
    aopPert = Math.round(Math.atan2(pPert.z/sinInc,qPert.z/sinInc)/piOver180);
  }else{
    lanPert = undefined;
    aopPert = undefined;
  }

  // console.log('lanPert = ',lanPert/piOver180,'incPert = ',incPert/piOver180,'aopPert = ',aopPert/piOver180);
}

const setInertialVectorColor = function(color, save=false){
  omt.setColor('inertialVectors', color);

  if (save){
    replaceAerovisualizerData('inertialVectorColor',color);
  }
}

const setOrbitFixedVectorColor = function(color, save=false){
  omt.setColor('orbitFixedVectors', color);

  if (save){
    replaceAerovisualizerData('orbitFixedVectorColor',color);
  }
}

const setUVWVectorColor = function(color, save=false){
  omt.setColor('uvwVectors', color);

  if (save){
    replaceAerovisualizerData('uvwVectorColor',color);
  }
}

const setRVectorColor = function(color, save=false){
  omt.setColor('rVector', color);

  if (save){
    replaceAerovisualizerData('rVectorColor',color);
  }
}

const setVVectorColor = function(color, save=false){
  omt.setColor('vVector', color);

  if (save){
    replaceAerovisualizerData('vVectorColor',color);
  }
}

inertialVectorColorMenu.addEventListener('change', () => {
  inertialVectorColor = inertialVectorColorMenu.value;
  setInertialVectorColor(inertialVectorColor, true);
  saveToLocalStorage();
});

orbitFixedVectorColorMenu.addEventListener('change', () => {
  orbitFixedVectorColor = orbitFixedVectorColorMenu.value;
  setOrbitFixedVectorColor(orbitFixedVectorColor, true);
  saveToLocalStorage();
});

uvwVectorColorMenu.addEventListener('change', () => {
  uvwVectorColor = uvwVectorColorMenu.value;
  setUVWVectorColor(uvwVectorColor, true);
  saveToLocalStorage();
});

rVectorColorMenu.addEventListener('change', () => {
  rVectorColor = rVectorColorMenu.value;
  setRVectorColor(rVectorColor, true);
  saveToLocalStorage();
});

vVectorColorMenu.addEventListener('change', () => {
  vVectorColor = vVectorColorMenu.value;
  setVVectorColor(vVectorColor, true);
  saveToLocalStorage();
});

const handlePrefsChoice = function(opt){
  generalPrefsElements.style.display = 'none';
  muPrefsElements.style.display = 'none';
  inertialVectorsElements.style.display = 'none';
  orbitFixedVectorsElements.style.display = 'none';
  orbitingBodyVectorsElements.style.display = 'none';

  switch (opt){
    case 'general-prefs':
      generalPrefsElements.style.display = 'grid';
      break;

    case 'mu-prefs':
      muPrefsElements.style.display = 'grid';
      break;

    case 'inertial-vectors-prefs':
      inertialVectorsElements.style.display = 'grid';
      inertialVectorsMenu.value = inertialVectorsChoice;
      doInertialVectorsChoice();
      break;

    case 'orbit-fixed-vectors-prefs':
      orbitFixedVectorsElements.style.display = 'grid';
      orbitFixedVectorsMenu.value = orbitFixedVectorsChoice;
      doOrbitFixedVectorsChoice();
      break;

    case 'orbiting-body-vectors-prefs':
      orbitingBodyVectorsElements.style.display = 'grid';
      orbitingBodyVectorsMenu.value = orbitingBodyVectorsChoice
      doOrbitingBodyVectorsChoice();
      break;

    case 'no-prefs':
      handleMainButtons(mostPreviousMainButton);
      aenuButton.disabled = false;
      orientationButton.disabled = false;
      deltaVButton.disabled = false;
      deltaRButton.disabled = false;
      numericalButton.disabled = false;
      mainReturnButton.disabled = false;
      prefsButton.disabled = false;
      infoButton.disabled = false;
      
      if (displayOrbitsAsDifference === true){
        zoomElements.style.display = 'grid';
      }

      toggleOrbitDiffDisplayButton.disabled = false;
      mainButtonsElements.style.display = 'flex';
      subMainButtonsElements.style.display = 'flex';
      break;
  }
}

// handlePrefsChoice('general-prefs');
// handlePrefsChoice('mu-prefs');
// handlePrefsChoice('inertial-vectors-prefs');
// handlePrefsChoice('orbit-fixed-vectors-prefs');
// handlePrefsChoice('orbiting-body-vectors-prefs');
  
prefsMenu.addEventListener('change', () => {
  const choice = prefsMenu.value;
  handlePrefsChoice(choice);
});

prefReturnButton.addEventListener('click', () => {
  handlePrefsChoice('no-prefs');
});

const handlePlanetChange = function(){
  theCB = centralBodyData.find(x => x.name === centralBody);
  ctu = theCB.CTU;
  cdu = theCB.CDU;
  cduDisplay.innerHTML = `1 canonical distance unit = ${cdu} km`;
  planetRotationPeriodInSeconds = 3600*theCB.srp;
  muDisplay.innerHTML = `${Number(+theCB.mu*1e6).toExponential(6).toString()} km&sup3;/s&sup2;`;// GM
  radiusDisplay.innerHTML = `${theCB.radius} km`;// radius
  vescDisplay.innerHTML = `${theCB.vesc} km/s`;// escape velocity from surface
  aCBDisplay.innerHTML = `${theCB.a} AU`;// semimajor axis
  eCBDisplay.innerHTML = `${theCB.e}`;// orbital eccentricity
  iDisplay.innerHTML = `${theCB.i}&deg;`;// orbital inclination
  OmegaDisplay.innerHTML = `${theCB.Om}&deg;`;// longitude of ascending node
  omegaDisplay.innerHTML = `${theCB.om}&deg;`;// longitude of perihelion
  omt.setPlanet(theCB.id);

  doESliderOnInput(+eSlider.value);
  doASliderOnInput(+aSlider.value);
  rp = Number(a*(1-e));
  computeNominalOrbit();
  doNu(nuDegrees);
  handlePeriapseCheck();
  shapeOrbitCurve();
  displayNumerical();
}

muMenu.addEventListener('change', () => {
  centralBody = muMenu.value;
  needToComputeNominalOrbit = true;
  handlePlanetChange();
  replaceAerovisualizerData('central-body',centralBody);
  saveToLocalStorage();
});

const doInertialVectorsChoice = function(){
  switch (inertialVectorsChoice){
    case 'X-Y-Z':
      omt.showIJKFrame(true);
      break;

    case 'x-y-z':
      omt.showIJKFrame(true);
      break;

    case 'I-J-K':
      omt.showIJKFrame(true);
      break;
    
    case 'i-j-k':
      omt.showIJKFrame(true);
      break;

    case 'no-inertial-vectors':
      omt.showIJKFrame(false);
      break;
  }
}

const doOrbitFixedVectorsChoice = function(){
  switch (orbitFixedVectorsChoice){
    case 'h-and-e':
      omt.showPQWFrame(false);
      omt.showH(true);
      omt.showE(true);
      break;
    
    case 'h-only':
      omt.showPQWFrame(false);
      omt.showH(true);
      omt.showE(false);
      break;

    case 'e-only':
      omt.showPQWFrame(false);
      omt.showH(false);
      omt.showE(true);
      break;

    case 'p-q-w':
      omt.showPQWFrame(true);
      omt.showE(false);
      omt.showH(false);
      break;

    case 'no-orbit-fixed-vectors':
      omt.showPQWFrame(false);
      omt.showE(false);
      omt.showH(false);
      break;
  }
}

const doOrbitingBodyVectorsChoice = function(){
  switch (orbitingBodyVectorsChoice){
    case 'no-orbiting-body-vectors':
      omt.showR(false);
      omt.showV(false);
      omt.showUVWFrame(false);
      break;

    case 'r-only':
      omt.showR(true);
      omt.showV(false);
      omt.showUVWFrame(false);
      break;

    case 'v-only':
      omt.showR(false);
      omt.showV(true);
      omt.showUVWFrame(false);
      break;

    case 'uvw-only':
      omt.showR(false);
      omt.showV(false);
      omt.showUVWFrame(true);
      break;

    case 'r-and-v':
      omt.showR(true);
      omt.showV(true);
      omt.showUVWFrame(false);
      break;
    
    case 'r-and-uvw':
      omt.showR(true);
      omt.showV(false);
      omt.showUVWFrame(true);
      break;

    case 'v-and-uvw':
      omt.showR(false);
      omt.showV(true);
      omt.showUVWFrame(true);
      break;

    case 'r-v-and-uvw':
      omt.showR(true);
      omt.showV(true);
      omt.showUVWFrame(true);
      break;
  }
}

inertialVectorsMenu.addEventListener('change', () => {
  inertialVectorsChoice = inertialVectorsMenu.value;
  doInertialVectorsChoice();
  replaceAerovisualizerData('inertialVectorsChoice',inertialVectorsChoice);
  saveToLocalStorage();
});

orbitFixedVectorsMenu.addEventListener('change', () => {
  orbitFixedVectorsChoice = orbitFixedVectorsMenu.value;
  doOrbitFixedVectorsChoice();
  replaceAerovisualizerData('orbitFixedVectorsChoice',orbitFixedVectorsChoice);
  saveToLocalStorage();
});

orbitingBodyVectorsMenu.addEventListener('change', () => {
  orbitingBodyVectorsChoice = orbitingBodyVectorsMenu.value;
  doOrbitingBodyVectorsChoice();
  replaceAerovisualizerData('orbitingBodyVectorsChoice',orbitingBodyVectorsChoice);
  saveToLocalStorage();
});

const doVectorScaleSliderOnInput = function(opt, value){
  switch (opt){
    case 'inertial':
      inertialVectorScale = value;
      break;

    case 'orbit-fixed':
      orbitFixedVectorScale = value;
      break;

    case 'orbitingBody':
      orbitingBodyVectorScale = value;
      break;
  }
}

inertialVectorScaleSlider.oninput = function(){
  doVectorScaleSliderOnInput('inertial', +this.value);
}

orbitFixedVectorScaleSlider.oninput = function(){
  doVectorScaleSliderOnInput('orbit-fixed', +this.value);
}

orbitingBodyVectorScaleSlider.oninput = function(){
  doVectorScaleSliderOnInput('orbitingBody', +this.value);
}

inertialVectorScaleSlider.onpointerup = function(){
  omt.setInertialVectorScale(inertialVectorScale);
  replaceAerovisualizerData('inertialVectorScale',inertialVectorScale);
  saveToLocalStorage();
  omt.needsRefresh = true;
}

orbitFixedVectorScaleSlider.onpointerup = function(){
  omt.setOrbitFixedVectorScale(orbitFixedVectorScale);
  replaceAerovisualizerData('orbitFixedVectorScale',orbitFixedVectorScale);
  saveToLocalStorage();
  omt.needsRefresh = true;
}

orbitingBodyVectorScaleSlider.onpointerup = function(){
  omt.setOrbitingBodyVectorScale(orbitingBodyVectorScale);
  replaceAerovisualizerData('orbitingBodyVectorScale',orbitingBodyVectorScale);
  saveToLocalStorage();
  omt.needsRefresh = true;
}

const setCentralBodyTransparency = function(transparency){
  const opacity = (100 - transparency)/100;
  omt.setPlanetOpacity(opacity);
}

centralBodyTransparencySlider.onpointerup = function(){
  setCentralBodyTransparency(this.value);// don't call this in oninput
  // because it is computationally intensive
  replaceAerovisualizerData('centralBodyTransparency',this.value);
  saveToLocalStorage();
}

defaultResetButton.addEventListener('click', () => {
  localStorage.clear();
  location.reload();
  data = getFromLocalStorage();

  if (data){
    saveToLocalStorage();
  }
});

const doWVectors = function(){
  showOutOfPlaneVectors = showOutOfPlaneVectorsCheckbox.checked;
  omt.showWVectors(showOutOfPlaneVectors);
  renderer.clear();
  renderer.render(scene, camera);
}

showOutOfPlaneVectorsCheckbox.addEventListener('change', () => {
  doWVectors();
  replaceAerovisualizerData('showOutOfPlaneVectors',showOutOfPlaneVectors);
  saveToLocalStorage();
});

const handlePeriapseCheck = function(){
  periapseTooSmall = rp < centralBodyRadius ? true : false;

  if (!periapseTooSmall || (theCB.id === 1)){
    warning1.innerHTML = '&nbsp';
    aenuButton.style.backgroundColor = '#5555ff';
    orientationButton.style.backgroundColor = '#5555ff';
    deltaVButton.style.backgroundColor = '#5555ff';
    deltaRButton.style.backgroundColor = '#5555ff';
    numericalButton.style.backgroundColor = '#5555ff';
    mainReturnButton.style.backgroundColor = '#5555ff';
    prefsButton.style.backgroundColor = '#5555ff';
    infoButton.style.backgroundColor = '#5555ff';
    toggleOrbitDiffDisplayButton.style.backgroundColor = '#5555ff';
    infoMenu.style.backgroundColor = '#5555ff';
    muMenu.style.backgroundColor = '#5555ff';
    prefReturnButton.style.backgroundColor = '#5555ff';
    inertialVectorsMenu.style.backgroundColor = '#5555ff';
    orbitFixedVectorsMenu.style.backgroundColor = '#5555ff';
    orbitingBodyVectorsMenu.style.backgroundColor = '#5555ff';
    inertialVectorColorMenu.style.backgroundColor = '#5555ff';
    orbitFixedVectorColorMenu.style.backgroundColor = '#5555ff';
    uvwVectorColorMenu.style.backgroundColor = '#5555ff';
    rVectorColorMenu.style.backgroundColor = '#5555ff';
    vVectorColorMenu.style.backgroundColor = '#5555ff';
    zeroLanButton.style.backgroundColor = '#5555ff';
    zeroIncButton.style.backgroundColor = '#5555ff';
    zeroAopButton.style.backgroundColor = '#5555ff';
    zeroNuButton.style.backgroundColor = '#5555ff';
  }else{
    warning1.innerHTML = 'PERIAPSE TOO SMALL (adjust &apos;a&apos; and/or &apos;e&apos;)';
    aenuButton.style.backgroundColor = 'red';
    orientationButton.style.backgroundColor = 'red';
    deltaVButton.style.backgroundColor = 'red';
    deltaRButton.style.backgroundColor = 'red';
    numericalButton.style.backgroundColor = 'red';
    mainReturnButton.style.backgroundColor = 'red';
    prefsButton.style.backgroundColor = 'red';
    infoButton.style.backgroundColor = 'red';
    toggleOrbitDiffDisplayButton.style.backgroundColor = 'red';
    infoMenu.style.backgroundColor = 'red';
    muMenu.style.backgroundColor = 'red';
    prefReturnButton.style.backgroundColor = 'red';
    inertialVectorsMenu.style.backgroundColor = 'red';
    orbitFixedVectorsMenu.style.backgroundColor = 'red';
    orbitingBodyVectorsMenu.style.backgroundColor = 'red';
    inertialVectorColorMenu.style.backgroundColor = 'red';
    orbitFixedVectorColorMenu.style.backgroundColor = 'red';
    uvwVectorColorMenu.style.backgroundColor = 'red';
    rVectorColorMenu.style.backgroundColor = 'red';
    vVectorColorMenu.style.backgroundColor = 'red';
    zeroLanButton.style.backgroundColor = 'red';
    zeroIncButton.style.backgroundColor = 'red';
    zeroAopButton.style.backgroundColor = 'red';
    zeroNuButton.style.backgroundColor = 'red';
  }
}

const handleInfoMenuChoice = function(choice){
  switch (choice){
    case 'info-intro': // Introduction
      infoText.innerHTML = `<p class="p-normal">The purpose of Aerovisualizer is to 
      assist in teaching or reinforcing concepts in aerospace engineering by presenting 
      them in interesting and engaging ways.  Subjects are displayed as 3D 
      animations to complement the dry equations found in textbooks and online.  Controls
      are also provided to manipulate the displays.</p>
      
      <p class="p-normal"><em>Aerovisualizer - &Delta; Orbit</em> focuses on the difference 
      between two elliptical orbits caused by a &Delta;V or &Delta;R.  Set the values of the 
      orbital elements of the nominal orbit and then set the &Delta;s.  It is assumed that you 
      have taken or are currently taking a course on this topic.</p>`;
      break;

    case 'info-how-to-use': // how to use aerovisualizer
      infoText.innerHTML = `
      <p class="p-normal">1) Click <em>a&nbsp;e&nbsp;&nu;</em> to set the semi-major axis (a) and the 
      eccentricity (e) of the nominal orbit.  Also set the true anomaly (&nu;) about that orbit.  &nu; 
      is the greek letter pronounced "nu".  The time after periapse is also displayed.</p>
      <p class="p-normal">2) Click <em>&Omega;&nbsp;i&nbsp;&omega;</em> to set the longitude of the 
      ascending node (&Omega;), the orbital inclination (i), and the argument of periapsis (&omega;) 
      of the nominal orbit.</p>
      <p class="p-normal">4) Click <em>&Delta;V</em> to set the delta velocity imparted to 
      a second spacecraft.</p>
      <p class="p-normal">4) Click <em>&Delta;R</em> to set the difference in position of  
      a second spacecraft relative to the main one.</p>
      <p class="p-normal">A perturbed orbit is generated for the second spacecraft.  Click 
      <em>2 orbits / &Delta; orbits</em> to view the difference between the orbits at equal 
      times.</p>`;
      break;

    case 'info-a-e-nu':
      infoText.innerHTML = `
      <p class="p-normal">Click <em>a&nbsp;e&nbsp;&nu;</em>.  Use the sliders to set the 
      <em>semi-major axis (a)</em> and the <em>orbital eccentricity (e)</em> of the nominal orbit, 
      and the <em>true anomaly (&nu;)</em> of the main spacecraft.  The displayed orbit changes in 
      accordance with the sliders.  If the orbit intersects the central body, the buttons change to 
      red.  Adjust a and e to prevent this.</p>
      <p class="p-normal">The value of 'a' is displayed in canonical 
      distance units (CDU).  Its range is 1 to 60.  Canonical distance units are equal to 
      the radius of the central body (sun, moon, planet).</p>
      <p class="p-normal">The value of 'e' ranges from 0 to 0.98.</p>
      <p class="p-normal">The true anomaly is displayed in degrees.  The time since periapse 
      passage is also displayed.  Use the button to set &nu; to zero.`;
      break;

    case 'info-Omega-i-omega':
      infoText.innerHTML = `
      <p class="p-normal">Click <em>&Omega;&nbsp;i&nbsp;&omega;</em>.  Use the sliders 
      to set the orbital elements of the <em>longitude of the ascending node (&Omega;)</em>, the 
      <em>orbital inclination (i)</em>, and the <em>argument of periapsis (&omega;)</em>.  Their values are displayed in degrees next to their respective 
      sliders.  The displayed orbit changes in accordance with the sliders.  Use the 
      buttons to set the values to zero.</p>
      `;
      break;

    case 'info-nu':
      infoText.innerHTML = `
      <p class="p-normal">The true anomaly is displayed in 
      degrees.  The time since periapse passage is also displayed.  The vectors attached 
      to the orbiting body move in accordance with the slider.  Use the button to set 
      &nu; to zero.</p>
      `;
      break;

    case 'info-numerical':
      infoText.innerHTML = `<p class="p-normal">Click <em>1 2 3</em> to show the following information for  
      both the nominal trajectory and the perturbed one:</p>
      <p class="p-normal">orbital period, semi-major axis (a), orbital eccentricity (e), longitude of the 
      ascending node (&Omega;), inclination (i), and the argument of periapsis (&omega;).  Also displayed 
      are the &Delta;V imparted to the second spacecraft and relative position of the second spacecraft to 
      the main one at the time since periapse passage of the main spacecraft.
      </p>`;
      break;
      
    case 'info-prefs-main':
      infoText.innerHTML = `<p class="p-normal">Click <em>preferences</em>.  Another menu 
      appears letting you choose from several preferences categories.</p>`;
      break;

    case 'info-prefs-general':
      infoText.innerHTML = `<p class="p-normal">Under <em>general preferences</em>, use the slider to set the 
      transparency of the sun/moon/planet.  Use the checkbox to specify whether or not to show 
      the out of plane vectors (W) of the PQW and UVW frames.</p>`;
      break;

    case 'info-mu':
      infoText.innerHTML = `
      <p class="p-normal">Click <em>&mu;</em>. A menu appears allowing you to choose the central body 
      and its <em>gravitational parameter &mu;</em> (&mu; = Gm).</p>
      <p class="p-normal">Choose a central body.  The sun/moon/planet changes to reflect your choice. 
      Data for the sun/moon/planet appear.  Besides &mu;, the radius and escape velocity from the 
      surface appear.  The remaining data are the J2000 orbital parameters.</p>
      <p class="p-normal">The sun has two menu choices.  One sets the canonical distance unit 
      (CDU) equal to the sun's radius.  The other sets it equal to 1 astronomical unit (AU) to 
      allow for greater distances from the sun.</p>
      `;
      break;

    case 'info-prefs-inertial-vectors':
      infoText.innerHTML = `<p class="p-normal">Under <em>inertial vectors</em>, use the first menu to choose 
      whether or not to display the ijk vector frame.</p>
      <p class="p-normal">Use the second menu to choose the color of the ijk vectors.</p>
      <p class="p-normal">Use the slider to set the scale of the ijk vectors.</p>
      <p class="p-normal">Note: many sources use the letters x, y, and z to represent this frame.</p>`;
      break;

    case 'info-prefs-orbit-fixed-vectors':
      infoText.innerHTML = `<p class="p-normal">Under <em>orbit-fixed vectors</em>, use the first menu to choose 
      from the following options: 1) both h and e, 2) h only, 3) e only, 4) perifocal (PQW) frame, or 5) no 
      vectors.</p>
      <p class="p-normal">Use the second menu to choose the color of the vectors.</p>
      <p class="p-normal">Use the slider to set the scale of the vectors.`;
      break;

    case 'info-prefs-orbiting-body-vectors':
      infoText.innerHTML = `<p class="p-normal">Under <em>orbiting body vectors</em>, use the first menu to choose 
      from the following options: 1) r only, 2) v only, 3) UVW frame only, 4) r and v, 5) r and UVW frame, 6) v 
      and UVW frame, 7) r, v, and UVW frame, and 8) no vectors.</p>
      <p class="p-normal">Use the rest of the menus to choose the various vector colors.</p>
      <p class="p-normal">Use the slider to set the scale of the vectors.`;
      break;

    case 'info-contact-disclaimer':
      infoText.innerHTML = `<p class="p-normal">Aerovisualizer is an open source 
      project.  To report bugs or suggestions or to contribute to its development, 
      please contact us by going to github.com/eastmanrj/aerovisualizer and creating 
      an "issue".  Alternatively, you can email us at eastmanrj@users.noreply.github.com.  
      Please include the word "Aerovisualizer" in the subject.</p>

      <p class="p-normal">We do not take responsibility for missed problems on 
      quizes, tests, projects, or homework due to software bugs or the 
      misinterpretation of displays in Aerovisualizer.  Do not use Aerovisualizer 
      for hardware or software qualification in aerospace or other industries nor 
      in any other applications.</p>`;
      break;
  }
}

infoMenu.addEventListener('change', () => {
  const choice = infoMenu.value;
  handleInfoMenuChoice(choice);
});

const doWindowResizeOrOrientationChange = function(){
  camera.aspect = 1;
  camera.updateProjectionMatrix();
  renderer.setSize(threeDWorld.clientWidth, threeDWorld.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.clear();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  doWindowResizeOrOrientationChange();
});

window.addEventListener('orientationchange', () => {
  doWindowResizeOrOrientationChange();
});

const loadBackground = function(){
    if (background != null){
      background = null;
    }

    let stars = new URL('../../static/img/stars.jpg', import.meta.url);
    // background = new THREE.CubeTextureLoader().load(['./img/stars.jpg','./img/stars.jpg','./img/stars.jpg','./img/stars.jpg','./img/stars.jpg','./img/stars.jpg']);
    background = new THREE.CubeTextureLoader().load([stars.pathname,stars.pathname,stars.pathname,stars.pathname,stars.pathname,stars.pathname]);
    scene.background = background;
}

const initTHREE = function() {
  scene = new THREE.Scene();
  
  const ambientLight = new THREE.AmbientLight(0xffffff);
  scene.add(ambientLight);

  // window.addEventListener('error', function (e) {
  //   e.preventDefault();
  //   e.stopPropagation();

  //   if (window.stop){
  //     window.stop();
  //   }
  // }, false);

  renderer = new THREE.WebGLRenderer({
    devicePixelRatio: window.devicePixelRatio,
    alpha: true,
  });

  if (!renderer.isWebGLRenderer){
    periapseTooSmall = true;

    handlePeriapseCheck();
    handleMainButtons('aenu');
    return;
  }

  renderer.setClearColor(0x000000);
  renderer.setSize(threeDWorld.clientWidth, threeDWorld.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.autoClear = false;
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
  camera.aspect = 1;
  camera.position.set(nominalCameraPos.x, nominalCameraPos.y, nominalCameraPos.z);
  camera.lookAt(centerOfRotation);
  camera.up.set(0,0,1);
  renderer.shadowMap.enabled = false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  threeDWorld.appendChild(renderer.domElement);
  orbitControls = new OrbitControls(camera, renderer.domElement);
  // orbitControls.enableDamping;

  orbitControls.enableZoom = false;
  orbitControls.enablePan = false;
};

const initialize = function(data, camera){
  let aSl;
  let eSl;
  let deltaVXSliderValue;
  let deltaVYSliderValue;
  let deltaVZSliderValue;
  let deltaRXSliderValue;
  let deltaRYSliderValue;
  let deltaRZSliderValue;

  if (data){
    aerovisualizerData = JSON.parse(JSON.stringify(data));

    for (let o of data) {
      switch (o.name){
          case 'central-body':
            centralBody  = o.value;
            break;
          case 'semimajor-axis':
            aSl  = Number(o.value);
            break;
          case 'eccentricity':
            eSl  = Number(o.value);
            break;
          case 'longitude-of-ascending-node':
            lanDegrees  = Number(o.value);
            break;
          case 'inclination':
            incDegrees  = Number(o.value);
            break;
          case 'argument-of-periapsis':
            aopDegrees  = Number(o.value);
            break;
          case 'true-anomaly':
            nuDegrees  = Number(o.value);
            break;
          case 'inertialVectorsChoice':
            inertialVectorsChoice  = o.value;
            break;
          case 'orbitFixedVectorsChoice':
            orbitFixedVectorsChoice  = o.value;
            break;
          case 'orbitingBodyVectorsChoice':
            orbitingBodyVectorsChoice  = o.value;
            break;
          case 'inertialVectorColor':
            inertialVectorColor  = o.value;
            break;
          case 'orbitFixedVectorColor':
            orbitFixedVectorColor  = o.value;
            break;
          case 'uvwVectorColor':
            uvwVectorColor  = o.value;
            break;
          case 'rVectorColor':
            rVectorColor  = o.value;
            break;
          case 'vVectorColor':
            vVectorColor  = o.value;
            break;
          case 'inertialVectorScale':
            inertialVectorScale  = o.value;
            break;
          case 'orbitFixedVectorScale':
            orbitFixedVectorScale  = o.value;
            break;
          case 'orbitingBodyVectorScale':
            orbitingBodyVectorScale  = o.value;
            break;
          case 'centralBodyTransparency':
            centralBodyTransparency  = o.value;
            break;
          case 'showOutOfPlaneVectors':
            showOutOfPlaneVectors  = o.value;
            break;
          case 'trueAnomaly360':
            // not used
            break;
          case 'deltaVXSliderValue':
            deltaVXSliderValue = o.value;
            break;
          case 'deltaVYSliderValue':
            deltaVYSliderValue = o.value;
            break;
          case 'deltaVZSliderValue':
            deltaVZSliderValue = o.value;
            break;
          case 'deltaRXSliderValue':
            deltaRXSliderValue = o.value;
            break;
          case 'deltaRYSliderValue':
            deltaRYSliderValue = o.value;
            break;
          case 'deltaRZSliderValue':
            deltaRZSliderValue = o.value;
            break;
          case 'deltaVPrefChoice':
            deltaVPrefChoice = o.value;
            break;
          case 'deltaRPrefChoice':
            deltaRPrefChoice = o.value;
            break;
      }
    }
  }

  if (omt === null){
    omt = new OrbitalMechThings(scene, camera);
  }

  muMenu.value = centralBody;
  theCB = centralBodyData.find(x => x.name === centralBody);
  ctu = theCB.CTU;
  cdu = theCB.CDU;
  cduPerCtu = cdu/ctu;
  cduDisplay.innerHTML = `1 canonical distance unit = ${cdu} km`;
  planetRotationPeriodInSeconds = 3600*theCB.srp;
  muDisplay.innerHTML = `${Number(+theCB.mu*1e6).toExponential(6).toString()} km&sup3;/s&sup2;`;// GM
  radiusDisplay.innerHTML = `${theCB.radius} km`;// radius
  vescDisplay.innerHTML = `${theCB.vesc} km/s`;// escape velocity from surface
  aCBDisplay.innerHTML = `${theCB.a} AU`;// semimajor axis
  eCBDisplay.innerHTML = `${theCB.e}`;// orbital eccentricity
  iDisplay.innerHTML = `${theCB.i}&deg;`;// orbital inclination
  OmegaDisplay.innerHTML = `${theCB.Om}&deg;`;// longitude of ascending node
  omegaDisplay.innerHTML = `${theCB.om}&deg;`;// argument of periapsis
  omt.setPlanet(theCB.id);
  needToComputeNominalOrbit = true;
  zoomElements.style.display = 'none';
  zoomDisplay.innerHTML = 'zoom: x1';

  // orbitState objects are pushed to the orbitNom, orbitPert, 
  // and orbitDelta arrays.  positions and velocities
  // are in the PQW frame
  const OrbitState = {nu:0, t:0,
    rx:0, ry:0, rz:0, vx:0, vy:0, vz:0
  };

  let orbitState;

  // create array of empty objects to later store the orbit in.
  // todo: change -180 and step size to something related to orbitSize
  for (let nuDeg=-180; nuDeg<orbitSize; nuDeg+=2){    
    orbitState = Object.create(OrbitState);
    orbitNom.push(orbitState);
    orbitState = Object.create(OrbitState);
    orbitPert.push(orbitState);
    orbitState = Object.create(OrbitState);
    orbitDelta.push(orbitState);
  }

  deltaVPrefMenu.value = deltaVPrefChoice;
  deltaRPrefMenu.value = deltaRPrefChoice;
  deltaVXSlider.value = deltaVXSliderValue;
  deltaVYSlider.value = deltaVYSliderValue;
  deltaVZSlider.value = deltaVZSliderValue;
  deltaRXSlider.value = deltaRXSliderValue;
  deltaRYSlider.value = deltaRYSliderValue;
  deltaRZSlider.value = deltaRZSliderValue;

  handleDeltaVDisplay('x');
  handleDeltaVDisplay('y');
  handleDeltaVDisplay('z');
  handleDeltaRDisplay('x');
  handleDeltaRDisplay('y');
  handleDeltaRDisplay('z');

  dvx = deltaVArray[+deltaVXSlider.value]/cduPerCtu;
  dvy = deltaVArray[+deltaVYSlider.value]/cduPerCtu;
  dvz = deltaVArray[+deltaVZSlider.value]/cduPerCtu;
  drx = deltaRArray[+deltaRXSlider.value]/cdu;
  dry = deltaRArray[+deltaRYSlider.value]/cdu;
  drz = deltaRArray[+deltaRZSlider.value]/cdu;
  lanSlider.value = lanDegrees;
  incSlider.value = incDegrees;
  aopSlider.value = aopDegrees;
  handleLanIncAopOnInput('all');//sets lan, inc, and aop, and dcms
  eSlider.value = +eSl;
  aSlider.value = +aSl;
  nuSlider.value = nuDegrees;
  doESliderOnInput(+eSl);//sets e but requires 'a' which has not been set
  doASliderOnInput(+aSl);//sets 'a', requires e that was just set above
  rp = Number(a*(1-e));
  handlePeriapseCheck();
  shapeOrbitCurve();
  displayNumerical();
  centralBodyTransparencySlider.value = centralBodyTransparency;
  setCentralBodyTransparency(centralBodyTransparency);
  handlePrefsChoice('general-prefs');
}

const completeInitialization = function(continueAnimation = true) {
  // the reason for this function is that the OrbitalMechThings.js file 
  // contains the function _constructLabels() which contains a FontLoader 
  // object called loader that creates code that runs asynchronously.
  // Once omt.constructionComplete is true, we can complete
  // our initialization

  if (continueAnimation && !(omt.constructionComplete)) {
    requestAnimationFrame(completeInitialization);
  }
  
  if (omt.constructionComplete){
    handleMainButtons('aenu');
    
    camera.aspect = 1;
    camera.updateProjectionMatrix();
    cpx = camera.position.x;
    cpy = camera.position.y;
    cpz = camera.position.z;

    renderer.setSize(threeDWorld.clientWidth, threeDWorld.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    handleInfoMenuChoice('info-intro');
    loadBackground();

    doInertialVectorsChoice();
    doOrbitFixedVectorsChoice();
    doOrbitingBodyVectorsChoice();

    setInertialVectorColor(inertialVectorColor);
    setOrbitFixedVectorColor(orbitFixedVectorColor);
    setUVWVectorColor(uvwVectorColor);
    setRVectorColor(rVectorColor);   
    setVVectorColor(vVectorColor);   
    
    doVectorScaleSliderOnInput('inertial',inertialVectorScale);
    doVectorScaleSliderOnInput('orbit-fixed',orbitFixedVectorScale);
    doVectorScaleSliderOnInput('orbitingBody',orbitingBodyVectorScale);

    inertialVectorScaleSlider.value = inertialVectorScale;
    orbitFixedVectorScaleSlider.value = orbitFixedVectorScale;
    orbitingBodyVectorScaleSlider.value = orbitingBodyVectorScale;

    omt.setInertialVectorScale(inertialVectorScale);
    omt.setOrbitFixedVectorScale(orbitFixedVectorScale);
    omt.setOrbitingBodyVectorScale(orbitingBodyVectorScale);

    showOutOfPlaneVectorsCheckbox.checked = showOutOfPlaneVectors;
    doWVectors();

    e = eArray[eSlider.value];
    a = aArray[aSlider.value];
    computeP();
    doNu(nuDegrees);
    eNomIsZero = (e === 0);
    eDisplay.innerHTML = `e: ${Number(e).toFixed(3).toString()}`;
    periodNom = twoPi*Math.pow(a,1.5)/muCanonical;// orbital period
    meanMotion = Math.sqrt(muCanonical/(a*a*a));
    aDisplay.innerHTML = `a: ${Number(a).toFixed(3).toString()} CDU`;
    shapeOrbitCurve();
    rp = a*(1-e);
    handlePeriapseCheck();
    needToComputeNominalOrbit = true;
    computeNominalOrbit();
    iOrb = orbitNom.findIndex((e) => e.t >= timeAfterPeriapse);
    computePerturbedOrbit();
    displayNumerical();
    omt.needsRefresh = true;
  }
};

const animate = function(continueAnimation = true) {
  if (continueAnimation) {
    requestAnimationFrame(animate);
  }
  
  orbitControls.update();// orbitControls have nothing to do with orbital mechanics
  const n = 10000000000000;

  if (cpx !== Math.trunc(n*camera.position.x)/n && cpy !== Math.trunc(n*camera.position.y)/n && cpz !== Math.trunc(n*camera.position.z)/n){
    cpx = Math.trunc(n*camera.position.x)/n;
    cpy = Math.trunc(n*camera.position.y)/n;
    cpz = Math.trunc(n*camera.position.z)/n;
    omt.needsRefresh = true;
  } 

  renderer.clear();
  renderer.render(scene, camera);
  omt.refresh();// refresh only happens if needsRefresh === true
};

// localStorage.clear();
// saveToLocalStorage();
data = getFromLocalStorage();

if (!data){
  localStorage.clear();
  saveToLocalStorage();
  location.reload();
  data = getFromLocalStorage();
}

if (data){
  initTHREE();

  if (renderer.isWebGLRenderer){
    initialize(data, camera);
    completeInitialization();
    animate();
  }
}
