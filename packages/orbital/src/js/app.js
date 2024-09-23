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
 1/19/24 R. Eastman            v0.1 beta
 1/21/24 R. Eastman            v0.1.1 beta, cosmetic changes
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
let clock = null;
let data = null;
let omt = null;// the "orbital mechanics thing" object handles the rendering of 
// the vectors, their labels, the planets, and the orbit curves
let orbitControls = null;// in this context, "orbit" refers to the camera.
// OrbitControls is a THREE.js class that has nothing to do with orbital mechanics
let playing = false;
let cbRadius = 1;
const muCanonical = 1;// mu is 1 for canonical units of distance (DU)
// and time (TU). This constant is included in the code rather than 
// the number 1 for maintainance and clarity
const sqrtMuCanonical = Math.sqrt(muCanonical);//obviously, this should also be 1
let periapseTooSmall = false;

const defaultCentralBody = 'Earth';
const defaultConicSection = 'ellipse';
// below are roughly the values for a Hohmann transfer orbit
// to a geosynchronous orbit from 160 km above Cape Canaveral
const defaultA = 20;// index of aArray corresponding to a = 3.822
const defaultE = 100;// index of eArray corresponding to e = 0.7318
const defaultLan = 0;// degrees
const defaultInclination = -28;// degrees
const defaultAop = -81;// degrees

const defaultDelta = Math.PI/2;// 90 degrees for a unit hyperbola

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

const defaultTimeScale = 900;//number of seconds in 15 minutes
const defaultTimeScaleMenuChoice = 'sec-equals-15minutes';

const defaultCentralBodyTransparency = 0;// 0=completely opaque, 100=completely transparent
const defaultShowOutOfPlaneVectors = false;
const defaultTrueAnomaly360 = false;

// aerovisualizerData can be modified and saved to local storage when 
// values and preferences are changed and is retrieved from local 
// storage at startup
let aerovisualizerData = [
  {name:'central-body', value:defaultCentralBody},
  {name:'conic-section', value:defaultConicSection},
  {name:'semimajor-axis', value:defaultA},
  {name:'eccentricity', value:defaultE},
  {name:'longitude-of-ascending-node', value:defaultLan},
  {name:'inclination', value:defaultInclination},
  {name:'argument-of-periapsis', value:defaultAop},
  {name:'true-anomaly', value:0},//true-anomaly is deprecated but keep it here
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
  {name:'timeScaleMenuChoice', value:defaultTimeScaleMenuChoice},
  {name:'centralBodyTransparency', value:defaultCentralBodyTransparency},
  {name:'showOutOfPlaneVectors', value:defaultShowOutOfPlaneVectors},
  {name:'trueAnomaly360', value:defaultTrueAnomaly360},
  {name:'param1', value:0},
  {name:'param2', value:0},
  {name:'param3', value:0},
  {name:'param4', value:0},
  {name:'param5', value:0},
  {name:'param6', value:0},
  {name:'param7', value:0},
  {name:'param8', value:0},
  {name:'param9', value:0},
  {name:'param10', value:0},
  {name:'param11', value:0},
  {name:'param12', value:0},
  {name:'param13', value:0},
  {name:'param14', value:0},
  {name:'param15', value:0}
];

let centralBody = defaultCentralBody;
let theCB = null;
let ctu = 0;// canonical time unit
let cdu = 0;// canonical distance unit
let planetRotationPeriodInSeconds = 0;
let conicSection = defaultConicSection;
let conicSectionIsEllipse = defaultConicSection === 'ellipse';
let a = Number(defaultA);
// aArray, eArrayEllipse, and eArrayHyperbola contain the values
// for each of 150 slider positions for the 'a' slider and 'e' slider.
// The values were obtained from an Excel spreadsheet containing
// Bezier curves that allow for gradual changes at the extreme
// ends.  The semi-major axis (a) goes from 1 to 60.  For the
// heliocentric option with CDU = AU, this does not allow for
// 'a' to be smaller than Earth's 'a' (1 AU).  The eccentricity
// (e) goes from 0 to 0.98 for ellipses and 1.02 to 5 for hyberbolas.
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

const eArrayEllipse = [
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
const eArrayHyperbola = [
  1.02,1.021,1.022,1.025,1.028,1.033,1.039,1.046,1.05,1.06,
  1.07,1.08,1.09,1.11,1.12,1.13,1.15,1.16,1.18,1.20,
  1.22,1.23,1.25,1.28,1.30,1.32,1.34,1.36,1.39,1.41,
  1.44,1.47,1.49,1.52,1.55,1.58,1.60,1.63,1.66,1.70,
  1.73,1.76,1.79,1.82,1.86,1.89,1.92,1.96,1.99,2.03,
  2.06,2.10,2.14,2.17,2.21,2.25,2.28,2.32,2.36,2.40,
  2.44,2.48,2.51,2.55,2.59,2.63,2.67,2.71,2.75,2.79,
  2.83,2.87,2.91,2.95,2.99,3.03,3.07,3.11,3.15,3.19,
  3.23,3.27,3.31,3.35,3.39,3.43,3.47,3.51,3.54,3.58,
  3.62,3.66,3.70,3.74,3.77,3.81,3.85,3.88,3.92,3.96,
  3.99,4.03,4.06,4.10,4.13,4.16,4.20,4.23,4.26,4.29,
  4.32,4.36,4.39,4.42,4.44,4.47,4.50,4.53,4.55,4.58,
  4.61,4.63,4.66,4.68,4.70,4.72,4.74,4.77,4.79,4.80,
  4.82,4.84,4.86,4.87,4.89,4.90,4.91,4.93,4.94,4.95,
  4.96,4.97,4.974,4.981,4.987,4.992,4.995,4.998,4.999,5];
let tp = twoPi*Math.pow(a,1.5)/muCanonical;//orbital period
let e = Number(defaultE);
let lanDegrees = defaultLan;
let lan = lanDegrees*piOver180; // longitude of the ascending node
let incDegrees = defaultInclination;
let inc = incDegrees*piOver180;// inclination
let aopDegrees = defaultAop;
let aop = aopDegrees*piOver180;// argument of periapsis
let dcmPQW2IJK = new THREE.Matrix3();// direction cosine matrices
let dcmPQW2UVW = new THREE.Matrix3();
let nuDegrees = 0;
let nu = nuDegrees*piOver180;// true anomaly
let eccentricAnomaly;
let hyperbolicAnomaly;
let meanAnomaly;
let meanMotion;
let timeAfterPeriapse;// in canonical time units (CTU)
let timeAfterPeriapseInSeconds;

let trajArray = [];// array of objects containing the position,
// velocity, time, and nu of an orbiting body on 
// either an elliptical or a hyperbolic trajectory.  This array
// contains 'trajArraySize' number of object elements.  The array
// is traversed during animation and the state vector of the 
// orbiting body is computed by interpolating between adjacent 
// elements
const trajArraySize = 181;
  // trajArraySize is the size of trajArray. 181 seems to be a good
  // enough size.  Try to use the smallest number that you can 
  // get away with due to computer memory issues. The ellipses and 
  // hyperbolas are approximated as polyhedrons with the number of 
  // sides equal to trajArraySize MINUS 1.  Lower numbers cause the 
  // animation to appear segmented and the numbers to be less accurate
let iTraj0;// this is the index of trajArray that corresponds to 
// before timeAfterPeriapseInSeconds during animation
let iTraj1 = iTraj0;// this is the index of trajArray that corresponds to 
// after timeAfterPeriapseInSeconds during animation
let timeAfterPeriapseInSeconds0;// time corresponding to trajArray[iTraj0]
let timeAfterPeriapseInSeconds1;// time corresponding to trajArray[iTraj1]

// position and velocity lower interpolation values for animation
let x0;
let y0;
let vx0;
let vy0;
// position and velocity for animation
let px;
let py;
let vx;
let vy;
// slopes of interpolation for animation between points
let dpxdt;
let dpydt;
let dvxdt;
let dvydt;
let dnudt;
// true anomaly lower and upper values for interpolation for animation
let nu0;
let nu1;
let needToComputeTrajArray = false;

let period = tp;// period is the orbital period for elliptical orbits
// in canonical units.  For hyperbolic trajectories, it is the time we
// establish to go from one extreme to the other, also in canonical units
let periodInSeconds = period*ctu;// this is 0 here because ctu is currently 0

let inertialVectorsChoice = defaultInertialVectorsChoice;
let orbitFixedVectorsChoice = defaultOrbitFixedVectorsChoice;
let orbitingBodyVectorsChoice = defaultOrbitingBodyVectorsChoice;

let inertialVectorColor = defaultInertialVectorColor;
let orbitFixedVectorColor = defaultOrbitFixedVectorColor;
let uvwVectorColor = defaultUVWVectorColor;
let rVectorColor = defaultRVectorColor;
let vVectorColor = defaultVVectorColor;

let inertialVectorScale = defaultInertialVectorScale;
let orbitFixedVectorScale = defaultOrbitFixedVectorScale;
let orbitingBodyVectorScale = defaultOrbitingBodyVectorScale;

let timeScale = defaultTimeScale;
let deltaT = timeScale*0.01666;
// 0.01666 is what clock.getDelta() would return for 60 frames/sec 

let displayTimeScale = defaultTimeScale;
let timeScaleMenuChoice = defaultTimeScaleMenuChoice;

let centralBodyTransparency = defaultCentralBodyTransparency;
let showOutOfPlaneVectors = defaultShowOutOfPlaneVectors;
let trueAnomaly360 = defaultTrueAnomaly360;// true=0 to 360, false=-180 to 180

let rPQW = new THREE.Vector3(1, 1, 1);
let rIJK = new THREE.Vector3(1, 1, 1);
let rUVW = new THREE.Vector3(1, 1, 1);
let vPQW = new THREE.Vector3(1, 1, 1);
let vIJK = new THREE.Vector3(1, 1, 1);
let vUVW = new THREE.Vector3(1, 1, 1);

let p = a*(1 - e*e);// parameter (semi-latus rectum)
let sqrtMuOverP = Math.sqrt(muCanonical/p);//needed for computing velocity
let delta = defaultDelta;// turning angle for hyperbolic orbits
let rp = Number(a*(1-e));// r vector magnitude at periapse
let ra = Number(a*(1+e));// r vector magnitude at apoapse
let specificEnergy = -muCanonical/(2*a);
let vp = Math.sqrt((muCanonical/a)*((1+e)/(1-e)));//v vector magnitude at periapse
let h = rp*vp;
periapseTooSmall = rp < cbRadius ? true : false;

const threeDWorld = document.getElementById('threeD-world');

const muButton = document.getElementById('mu-btn');
const aeButton = document.getElementById('a-e-btn');
const orientationButton = document.getElementById('orientation-btn');
const nuButton = document.getElementById('nu-btn');
const numericalButton = document.getElementById('numerical-btn');
const mainReturnButton = document.getElementById('main-return-btn');

const toggleConicSectionButton = document.getElementById('toggle-conic-btn');
const prefsButton = document.getElementById('preferences-btn');
const infoButton = document.getElementById('info-btn');

const muMenu = document.getElementById('central-body-menu');

const aDisplay = document.getElementById('a-display');    
const eDisplay = document.getElementById('e-display');    
const aSlider = document.getElementById('a-slider');
const eSlider = document.getElementById('e-slider');
const periapseWarning = document.getElementById('periapse-warning');
const lanDisplay = document.getElementById('lan-display');    
const incDisplay = document.getElementById('inc-display');    
const aopDisplay = document.getElementById('aop-display');    
const lanSlider = document.getElementById('lan-slider');
const incSlider = document.getElementById('inc-slider');
const aopSlider = document.getElementById('aop-slider');
const zeroLanButton = document.getElementById('zero-lan-btn');
const zeroIncButton = document.getElementById('zero-inc-btn');
const zeroAopButton = document.getElementById('zero-aop-btn');

const nuSlider = document.getElementById('nu-slider');
const nuDisplay = document.getElementById('nu-display');
const zeroNuButton = document.getElementById('zero-nu-btn');
const timeAfterPeriapseDisplay1 = document.getElementById('tap-display1');
const timeAfterPeriapseDisplay2 = document.getElementById('tap-display2');
const timeScaleMenu = document.getElementById('time-scale-menu');
const playPauseButton = document.getElementById('play-pause-btn');
const resetButton = document.getElementById('reset-btn');

const muElements = document.getElementById('central-body-elements');
const aeElements = document.getElementById('a-e-elements');
const orientationElements = document.getElementById('orientation-elements');
const nuElements = document.getElementById('nu-elements');
const numericalElements1 = document.getElementById('numerical-elements1');
const numericalElements2 = document.getElementById('numerical-elements2');
const numericalElements3 = document.getElementById('numerical-elements3');
const prefsElements = document.getElementById('prefs-elements');
const playResetButtonsElements = document.getElementById('play-reset-buttons-elements');

const muDisplay = document.getElementById('mu');
const aCBDisplay = document.getElementById('a');
const eCBDisplay = document.getElementById('e');
const iDisplay = document.getElementById('i');
const OmegaDisplay = document.getElementById('Omega');
const omegaDisplay = document.getElementById('omega');
const radiusDisplay = document.getElementById('radius');
const vescDisplay = document.getElementById('vesc');

let numericalDisplayIsOccurring = false;
let numericalDisplayOption = 1;
let displayUnits = 1;
const cycleNumericalDisplayButton1 = document.getElementById('cycle-numerical-btn1');
const cycleNumericalDisplayButton2 = document.getElementById('cycle-numerical-btn2');
const cycleNumericalDisplayButton3 = document.getElementById('cycle-numerical-btn3');
const toggleNumericalDisplayUnitsButton1 = document.getElementById('toggle-units-btn1');
const toggleNumericalDisplayUnitsButton2 = document.getElementById('toggle-units-btn2');
const unitsDisplay1 = document.getElementById('units-display1');
const unitsDisplay2 = document.getElementById('units-display2');

const numRI = document.getElementById('num-ri');
const numRJ = document.getElementById('num-rj');
const numRK = document.getElementById('num-rk');
const numVI = document.getElementById('num-vi');
const numVJ = document.getElementById('num-vj');
const numVK = document.getElementById('num-vk');
const numRP = document.getElementById('num-rp');
const numRQ = document.getElementById('num-rq');
const numVP = document.getElementById('num-vp');
const numVQ = document.getElementById('num-vq');
const numRU = document.getElementById('num-ru');
const numRV = document.getElementById('num-rv');
const numVU = document.getElementById('num-vu');
const numVV = document.getElementById('num-vv');
const numNu = document.getElementById('num-nu');
const numT = document.getElementById('num-t');
const numH = document.getElementById('num-h');
const numEnergy = document.getElementById('num-sp-energy');
const numV = document.getElementById('num-v');
const numVcs = document.getElementById('num-vcs');
const numVesc = document.getElementById('num-vesc');
const numQ = document.getElementById('num-Q');
const numC3 = document.getElementById('num-c3');
const numA = document.getElementById('num-a');
const numE = document.getElementById('num-e');
const numOm = document.getElementById('num-Om');
const numI = document.getElementById('num-i');
const numom = document.getElementById('num-om');
const numP = document.getElementById('num-p');
const numTotalPeriod = document.getElementById('num-period');
const numEccenAnom = document.getElementById('num-E');
const numHyperAnom = document.getElementById('num-F');
const numMeanAnom = document.getElementById('num-M');
const numMeanMotion = document.getElementById('num-n');

const dcm11pqw2ijk = document.getElementById('dcm11-pqw-to-ijk');
const dcm12pqw2ijk = document.getElementById('dcm12-pqw-to-ijk');
const dcm13pqw2ijk = document.getElementById('dcm13-pqw-to-ijk');
const dcm21pqw2ijk = document.getElementById('dcm21-pqw-to-ijk');
const dcm22pqw2ijk = document.getElementById('dcm22-pqw-to-ijk');
const dcm23pqw2ijk = document.getElementById('dcm23-pqw-to-ijk');
const dcm31pqw2ijk = document.getElementById('dcm31-pqw-to-ijk');
const dcm32pqw2ijk = document.getElementById('dcm32-pqw-to-ijk');
const dcm33pqw2ijk = document.getElementById('dcm33-pqw-to-ijk');
const dcm11pqw2uvw = document.getElementById('dcm11-pqw-to-uvw');
const dcm12pqw2uvw = document.getElementById('dcm12-pqw-to-uvw');
const dcm13pqw2uvw = document.getElementById('dcm13-pqw-to-uvw');
const dcm21pqw2uvw = document.getElementById('dcm21-pqw-to-uvw');
const dcm22pqw2uvw = document.getElementById('dcm22-pqw-to-uvw');
const dcm23pqw2uvw = document.getElementById('dcm23-pqw-to-uvw');
const dcm31pqw2uvw = document.getElementById('dcm31-pqw-to-uvw');
const dcm32pqw2uvw = document.getElementById('dcm32-pqw-to-uvw');
const dcm33pqw2uvw = document.getElementById('dcm33-pqw-to-uvw');

const mainPrefsMenu = document.getElementById('main-prefs-menu');
mainPrefsMenu.value = 'general-preferences';

const centralBodyTransparencySlider = document.getElementById('central-body-transparency-slider');
const defaultResetButton = document.getElementById('default-reset-btn');
const showOutOfPlaneVectorsCheckbox = document.getElementById('show-out-of-plane');
const trueAnomalyOptionCheckbox = document.getElementById('true-anomaly-option');

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
const inertialVectorsElements = document.getElementById('inertial-vectors-elements');
const orbitFixedVectorsElements = document.getElementById('orbit-fixed-vectors-elements');
const orbitingBodyVectorsElements = document.getElementById('orbiting-body-vectors-elements');
const infoElements = document.getElementById('info-elements');
const infoMenu = document.getElementById('info-menu');
const infoText = document.getElementById('info-text');

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
om       = Longitude of perihelion (deg) J2000
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

cycleNumericalDisplayButton1.addEventListener('click', () => {
  numericalDisplayOption = 2;
  handleMainButtons('numerical');
});

cycleNumericalDisplayButton2.addEventListener('click', () => {
  numericalDisplayOption = 3;
  handleMainButtons('numerical');
});

cycleNumericalDisplayButton3.addEventListener('click', () => {
  numericalDisplayOption = 1;
  handleMainButtons('numerical');
});

const displayNumerical1 = function(){
  computeKepler();

  if (meanAnomaly === null){
    numT.innerHTML = 'INF';
    return;
  }
  
  rPQW.set(px, py, 0);
  vPQW.set(vx, vy, 0);

  let tap = displayUnits === 1 ? timeAfterPeriapse : timeAfterPeriapseInSeconds/displayTimeScale;
  let per = displayUnits === 1 ? period : periodInSeconds/displayTimeScale;
  per = tap >=0 ? 0 : per;
  let threeSixty = trueAnomaly360 && (nuDegrees < 0) ? 360 : 0;

  let spAngMom = h;
  let spEnergy = specificEnergy;
  let aDisp = a;
  let pDisp = p;
  let tpDisp = tp;
  let r = rPQW.length();
  let v = vPQW.length();
  let vcs = Math.sqrt(muCanonical/r);
  let vesc = Math.SQRT2*vcs;
  let Q = vPQW.lengthSq()/vcs/vcs;// also Q = 2 - r/a
  let c3 = v*v - vesc*vesc;// also c3 = v*v - 2*muCanonical/r
  let mm = meanMotion/piOver180;// degrees per CTU

  if (displayUnits === 2){
    spAngMom *= cdu*cdu/ctu;
    spEnergy *= cdu*cdu/ctu/ctu;
    aDisp *= cdu;
    pDisp *= cdu;
    tpDisp *= ctu/displayTimeScale;
    mm /= ctu/displayTimeScale;// degrees per second, minute, ...
  }

  numNu.innerHTML = `${Number(nuDegrees+threeSixty).toFixed(2).toString()}`;
  numMeanAnom.innerHTML = `${Number(meanAnomaly/piOver180+threeSixty).toFixed(2).toString()}`;
  numEccenAnom.innerHTML = `${Number(eccentricAnomaly/piOver180+threeSixty).toFixed(2).toString()}`;
  numHyperAnom.innerHTML = `${Number(hyperbolicAnomaly/piOver180+threeSixty).toFixed(2).toString()}`;

  switch (timeScaleMenuChoice){
    case 'sec-equals-1sec':
      numT.innerHTML = `${Number(tap+per).toFixed(0).toString()}`;
      break;
    case 'sec-equals-1minute':
    case 'sec-equals-5minutes':
    case 'sec-equals-15minutes':
      numT.innerHTML = `${Number(tap+per).toFixed(1).toString()}`;
      break;
    case 'sec-equals-1hour':
      numT.innerHTML = `${Number(tap+per).toFixed(1).toString()}`;
      break;
    case 'sec-equals-1day':
      numT.innerHTML = `${Number(tap+per).toFixed(1).toString()}`;
      break;
  }

  numEnergy.innerHTML = `${Number(spEnergy).toFixed(4).toString()}`;
  numE.innerHTML = `${Number(e).toFixed(3).toString()}`;
  numOm.innerHTML = lanDegrees;
  numI.innerHTML = incDegrees;
  numom.innerHTML = aopDegrees;

  if (e < 1){
    numTotalPeriod.innerHTML = `${Number(tpDisp).toFixed(4).toString()}`;
    numHyperAnom.innerHTML = 'x';
  }else{
    numTotalPeriod.innerHTML = 'x';
    numEccenAnom.innerHTML = 'x';
  }

  if (displayUnits === 2){
    numH.innerHTML = `${Number(spAngMom).toExponential(3).toString()}`;
    numA.innerHTML = `${Number(aDisp).toExponential(3).toString()}`;
    numP.innerHTML = `${Number(pDisp).toExponential(3).toString()}`;
    v *= cdu/ctu;
    vcs *= cdu/ctu;
    vesc *= cdu/ctu;
    c3 *= (cdu*cdu)/(ctu*ctu);
  }else{
    numH.innerHTML = `${Number(spAngMom).toFixed(1).toString()}`;
    numA.innerHTML = `${Number(aDisp).toFixed(2).toString()}`;
    numP.innerHTML = `${Number(pDisp).toFixed(2).toString()}`;
  }

  numV.innerHTML = `${Number(v).toFixed(4).toString()}`;
  numVcs.innerHTML = `${Number(vcs).toFixed(4).toString()}`;
  numVesc.innerHTML = `${Number(vesc).toFixed(4).toString()}`;
  numQ.innerHTML = `${Number(Q).toFixed(4).toString()}`;
  numC3.innerHTML = `${Number(c3).toFixed(4).toString()}`;
  numMeanMotion.innerHTML = `${Number(mm).toFixed(4).toString()}`;
}

// position and velocity vectors display
const displayNumerical2 = function(){
  computePQW2UVWRotation();

  rPQW.set(px, py, 0);
  rIJK.copy(rPQW);
  rUVW.copy(rPQW);
  rIJK.applyMatrix3(dcmPQW2IJK);
  rUVW.applyMatrix3(dcmPQW2UVW);
  vPQW.set(vx, vy, 0);
  vIJK.copy(vPQW);
  vUVW.copy(vPQW);
  vIJK.applyMatrix3(dcmPQW2IJK);
  vUVW.applyMatrix3(dcmPQW2UVW);

  let du = cdu;
  let duTu = cdu/ctu;
  let nPos = 0;
  let nVel = 2;

  if (displayUnits === 1){
    // canonical units
    du = 1;
    duTu = 1;
    nPos = 2;
    nVel = 4;
  }

  numRP.innerHTML = `${Number(du*px).toFixed(nPos).toString()}`;
  numRQ.innerHTML = `${Number(du*py).toFixed(nPos).toString()}`;
  numVP.innerHTML = `${Number(duTu*vx).toFixed(nVel).toString()}`;
  numVQ.innerHTML = `${Number(duTu*vy).toFixed(nVel).toString()}`;
  numRI.innerHTML = `${Number(du*rIJK.x).toFixed(nPos).toString()}`;
  numRJ.innerHTML = `${Number(du*rIJK.y).toFixed(nPos).toString()}`;
  numRK.innerHTML = `${Number(du*rIJK.z).toFixed(nPos).toString()}`;
  numVI.innerHTML = `${Number(duTu*vIJK.x).toFixed(nVel).toString()}`;
  numVJ.innerHTML = `${Number(duTu*vIJK.y).toFixed(nVel).toString()}`;
  numVK.innerHTML = `${Number(duTu*vIJK.z).toFixed(nVel).toString()}`;
  numRU.innerHTML = `${Number(du*rUVW.x).toFixed(nPos).toString()}`;
  numRV.innerHTML = '0';
  numVU.innerHTML = `${Number(duTu*vUVW.x).toFixed(nVel).toString()}`;
  numVV.innerHTML = `${Number(duTu*vUVW.y).toFixed(nVel).toString()}`;
}

// direction cosine matrices display
// displays two matrices: PQW --> IJK and UVW --> PQW
// UVW --> PQW is the inverse of dcmPQW2UVW
const displayNumerical3 = function(){
  computePQW2UVWRotation();

  dcm11pqw2ijk.innerHTML = `${Number(dcmPQW2IJK.elements[0]).toFixed(4).toString()}`;
  dcm12pqw2ijk.innerHTML = `${Number(dcmPQW2IJK.elements[3]).toFixed(4).toString()}`;
  dcm13pqw2ijk.innerHTML = `${Number(dcmPQW2IJK.elements[6]).toFixed(4).toString()}`;
  dcm21pqw2ijk.innerHTML = `${Number(dcmPQW2IJK.elements[1]).toFixed(4).toString()}`;
  dcm22pqw2ijk.innerHTML = `${Number(dcmPQW2IJK.elements[4]).toFixed(4).toString()}`;
  dcm23pqw2ijk.innerHTML = `${Number(dcmPQW2IJK.elements[7]).toFixed(4).toString()}`;
  dcm31pqw2ijk.innerHTML = `${Number(dcmPQW2IJK.elements[2]).toFixed(4).toString()}`;
  dcm32pqw2ijk.innerHTML = `${Number(dcmPQW2IJK.elements[5]).toFixed(4).toString()}`;
  dcm33pqw2ijk.innerHTML = `${Number(dcmPQW2IJK.elements[8]).toFixed(4).toString()}`;
  dcm11pqw2uvw.innerHTML = `${Number(dcmPQW2UVW.elements[0]).toFixed(4).toString()}`;
  dcm21pqw2uvw.innerHTML = `${Number(dcmPQW2UVW.elements[1]).toFixed(4).toString()}`;
  dcm31pqw2uvw.innerHTML = `${Number(dcmPQW2UVW.elements[2]).toFixed(4).toString()}`;
  dcm12pqw2uvw.innerHTML = `${Number(dcmPQW2UVW.elements[3]).toFixed(4).toString()}`;
  dcm22pqw2uvw.innerHTML = `${Number(dcmPQW2UVW.elements[4]).toFixed(4).toString()}`;
  dcm32pqw2uvw.innerHTML = `${Number(dcmPQW2UVW.elements[5]).toFixed(4).toString()}`;
  dcm13pqw2uvw.innerHTML = `${Number(dcmPQW2UVW.elements[6]).toFixed(4).toString()}`;
  dcm23pqw2uvw.innerHTML = `${Number(dcmPQW2UVW.elements[7]).toFixed(4).toString()}`;
  dcm33pqw2uvw.innerHTML = `${Number(dcmPQW2UVW.elements[8]).toFixed(4).toString()}`;
}

const displayNumerical = function(){
  if (!numericalDisplayIsOccurring){
    return;
  }

  switch (numericalDisplayOption){
    case 1:
      numericalElements1.style.display = 'grid';
      displayNumerical1();
      break;
    case 2:
      numericalElements2.style.display = 'grid';
      displayNumerical2();
      break;
    case 3:
      numericalElements3.style.display = 'grid';
      displayNumerical3();
      break;
  }
}

const displayUnitsText = function(){
  let posAndVelText = 'pos: CDU, vel: CDU/CTU, time: ';
  let timeText = 'CTU';

  if (displayUnits === 2){
    posAndVelText = 'pos: km, vel: km/s, time: ';

    switch (displayTimeScale){
      case 1:
        timeText = 'seconds';
        break;
      case 60:
        timeText = 'minutes';
        break;
      case 3600:
        timeText = 'hours';
        break;
      case 3600*24:
        timeText = 'days';
        break;
    }
  }

  unitsDisplay1.innerHTML = posAndVelText+timeText;
  unitsDisplay2.innerHTML = posAndVelText+timeText;
}

toggleNumericalDisplayUnitsButton1.addEventListener('click', () => {
  displayUnits = displayUnits === 1 ? 2 : 1;
  displayUnitsText();
  displayNumerical();
});

toggleNumericalDisplayUnitsButton2.addEventListener('click', () => {
  displayUnits = displayUnits === 1 ? 2 : 1;
  displayUnitsText();
  displayNumerical();
});

const handleMainButtons = function(button){
  muButton.disabled = false;
  aeButton.disabled = false;
  orientationButton.disabled = false;
  nuButton.disabled = false;
  numericalButton.disabled = false;
  prefsButton.disabled = false;
  infoButton.disabled = false;
  muElements.style.display = 'none';
  aeElements.style.display = 'none';
  orientationElements.style.display = 'none';
  nuElements.style.display = 'none';
  numericalElements1.style.display = 'none';
  numericalElements2.style.display = 'none';
  numericalElements3.style.display = 'none';
  prefsElements.style.display = 'none';
  playResetButtonsElements.style.display = 'flex';
  generalPrefsElements.style.display = 'none';
  inertialVectorsElements.style.display = 'none';
  orbitFixedVectorsElements.style.display = 'none';
  orbitingBodyVectorsElements.style.display = 'none';
  infoElements.style.display = 'none';
  numericalDisplayIsOccurring = false;

  switch (button){
    case 'mu':
      haltPlay();
      muElements.style.display = 'grid';
      muButton.disabled = true;
      break;
    case 'aeP':
      haltPlay();
      aeElements.style.display = 'grid';
      aeButton.disabled = true;
      break;
    case 'orientation':
      haltPlay();
      orientationElements.style.display = 'grid';
      orientationButton.disabled = true;
      break;
    case 'nu':
      haltPlay();
      nuElements.style.display = 'grid';
      nuButton.disabled = true;
      break;
    case 'numerical':
      numericalButton.disabled = true;
      numericalDisplayIsOccurring = true;
      computePQW2IJKRotation();
      displayUnitsText();

      switch (numericalDisplayOption){
        case 1:
          numericalElements1.style.display = 'grid';
          displayNumerical1();
          break;
        case 2:
          numericalElements2.style.display = 'grid';
          displayNumerical2();
          break;
        case 3:
          numericalElements3.style.display = 'grid';
          displayNumerical3();
          break;
      }
      break;
    case 'prefs':
      haltPlay();
      prefsElements.style.display = 'grid';
      prefsButton.disabled = true;
      handleMainPrefs(mainPrefsMenu.value);
      break;
    case 'info':
      haltPlay();
      infoElements.style.display = 'grid';
      infoButton.disabled = true;
      playResetButtonsElements.style.display = 'none';
      break;
    case 'none':
      break;
  }
}

muButton.addEventListener('click', () => {
  handleMainButtons('mu');
});

aeButton.addEventListener('click', () => {
  handleMainButtons('aeP');
});

orientationButton.addEventListener('click', () => {
  handleMainButtons('orientation');
});

nuButton.addEventListener('click', () => {
  handleMainButtons('nu');
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

const computeP = function(){
  p = a*(1 - e*e);
  sqrtMuOverP = Math.sqrt(muCanonical/p);// needed for computing velocity
}

const computeDelta = function(){
  // delta is the turning angle (i.e. the angle through
  // which the path of a space probe is turned by its
  // encounter with a planet during a hyperbolic flyby
  // from and to infinite distances)
  if (e < 1){
    return;
  }

  delta = 2*Math.asin(1/e);// delta is in radians
}

const doTwoSunOptionChoice = function(){
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
  haltPlay();
  a = aArray[i];

  // a > 0 for ellipses, a < 0 for hyperbolas
  if (conicSectionIsEllipse){
    tp = twoPi*Math.pow(a,1.5)/muCanonical;// orbital period
    period = tp;
    periodInSeconds = period*ctu;
  }else{
    a = -a;
    tp = null;// orbital period (tp) is not defined for hyperbolic orbits

    // set period equal to the time period of the flyby.  
    // Since the time is infinite to reach the delta angle, we reduce 
    // this angle by a small amount ("th") to make the animation time
    // reasonable.  nu1 and nu2 are the true anomalies at the extremes of
    // the flyby.  One possible program enhancement might be to let the
    // user determine the value of "th"

    const th = Math.PI/10;
    const trueAnomaly1 = -(Math.PI + delta)/2 + th;
    const trueAnomaly2 = (Math.PI + delta)/2 - th;
    const cosnu1 = Math.cos(trueAnomaly1);
    const cosnu2 = Math.cos(trueAnomaly2);
    // make sure to compute e (>1) before this function, otherwise
    // coshF1 and coshF2 can be such that we compute a square
    // root of a negative number below
    const coshF1 = (e + cosnu1)/(1 + e*cosnu1);
    const coshF2 = (e + cosnu2)/(1 + e*cosnu2);
    const F1 = -Math.log(coshF1 + Math.sqrt(coshF1*coshF1 - 1));
    const F2 = Math.log(coshF2 + Math.sqrt(coshF2*coshF2 - 1));
    const M1 = e*Math.sinh(F1) - F1;
    const M2 = e*Math.sinh(F2) - F2;
    const n = Math.sqrt(muCanonical/(-a*a*a));
    period = (M2 - M1)/n;
    periodInSeconds = period*ctu;
  }

  needToComputeTrajArray = true;

  if (a > 0){
    meanMotion = Math.sqrt(muCanonical/(a*a*a));
  }else{
    meanMotion = Math.sqrt(muCanonical/(-a*a*a));
  }

  specificEnergy = -muCanonical/(2*a);
  aDisplay.innerHTML = `a: ${Number(a).toFixed(3).toString()}`;
  computeP();
  doTwoSunOptionChoice();
}

const doESliderOnInput = function(i){
  haltPlay();

  if (conicSectionIsEllipse){
    e = eArrayEllipse[i];
    eDisplay.innerHTML = `e: ${Number(e).toFixed(3).toString()}`;
  }else{
    e = eArrayHyperbola[i];
    computeDelta();// hypberbolic turning angle
  }
  
  eDisplay.innerHTML = `e: ${Number(e).toFixed(3).toString()}`;
  needToComputeTrajArray = true;
  computeP();
  doTwoSunOptionChoice();
}

aSlider.oninput = function(){
  doASliderOnInput(+this.value);
}

eSlider.oninput = function(){
  doESliderOnInput(+this.value);
}

const enableDisableTimeScaleOptions = function(){
  // don't allow timeScale to be more than a specified
  // fraction of the orbital period
  
  const tsArray = [1, 60, 300, 900, 3600, 3600*24];
  const fraction = 0.1;
  const timeFraction = fraction*periodInSeconds;

  for (let i=tsArray.length-1; i>0; i--){
    timeScaleMenu.options[i].disabled = false;

    if (tsArray[i] > timeFraction){
      timeScaleMenu.options[i].disabled = true;

      if (timeScaleMenu.selectedIndex >= i){
        timeScaleMenu.selectedIndex = i - 1;
      }
    }
  }
}

aSlider.onpointerup = function(){
  rp = a*(1-e);
  ra = a*(1+e);
  vp = Math.sqrt((muCanonical/a)*((1+e)/(1-e)));
  h = rp*vp;
  computeTrajArray();
  handlePeriapseCheck();
  doNu(nuDegrees);
  enableDisableTimeScaleOptions();
  replaceAerovisualizerData('semimajor-axis',+this.value);
  saveToLocalStorage();
}

eSlider.onpointerup = function(){
  rp = a*(1-e);
  ra = a*(1+e);
  vp = Math.sqrt((muCanonical/a)*((1+e)/(1-e)));
  h = rp*vp;
  computeTrajArray();
  handlePeriapseCheck();
  doNu(nuDegrees);
  replaceAerovisualizerData('eccentricity',+this.value);
  saveToLocalStorage();
}

const computePQW2IJKRotation = function(){
  // compute the direction cosine matrix from the perifocal frame
  // to the geocentric equatorial frame (or other inertial frames)
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
  dcmPQW2IJK.set(r11, r12, r13, r21, r22, r23, r31, r32, r33);
  omt.setQuatFromDCMElements(r11, r12, r13, r21, r22, r23, r31, r32, r33);
}

const computePQW2UVWRotation = function(){
  // compute the direction cosine matrix from the perifocal frame
  // to the UVW frame
  const cnu = Math.cos(nu);
  const snu = Math.sin(nu);
  dcmPQW2UVW.set(cnu, snu, 0, -snu, cnu, 0, 0, 0, 1);
}

const handleOrientationOnInput = function(opt, setValuesOnly = false){
  switch (opt){
    case 'lan':
      lanDegrees = lanSlider.value;
      lanDisplay.innerHTML = lanDegrees;
      lan = lanDegrees*piOver180;
      break;

    case 'inc':
      incDegrees = incSlider.value;
      incDisplay.innerHTML = incDegrees;
      inc = incDegrees*piOver180;
      break;

    case 'aop':
      aopDegrees = aopSlider.value;
      aopDisplay.innerHTML = aopDegrees;
      aop = aopDegrees*piOver180;
      break;
  }

  if (!setValuesOnly){
    haltPlay();
    computePQW2IJKRotation();
    doTwoSunOptionChoice();
  }
}

lanSlider.oninput = function(){
  handleOrientationOnInput('lan');
}

incSlider.oninput = function(){
  handleOrientationOnInput('inc');
}

aopSlider.oninput = function(){
  handleOrientationOnInput('aop');
}

lanSlider.onpointerup = function(){
  replaceAerovisualizerData('longitude-of-ascending-node',this.value);
  saveToLocalStorage();
}

incSlider.onpointerup = function(){
  replaceAerovisualizerData('inclination',this.value);
  saveToLocalStorage();
}

aopSlider.onpointerup = function(){
  replaceAerovisualizerData('argument-of-periapsis',this.value);
  saveToLocalStorage();
}

zeroLanButton.addEventListener('click', () => {
  lanSlider.value = 0;
  handleOrientationOnInput('lan');
  replaceAerovisualizerData('longitude-of-ascending-node',0);
  saveToLocalStorage();
});

zeroIncButton.addEventListener('click', () => {
  incSlider.value = 0;
  handleOrientationOnInput('inc');
  replaceAerovisualizerData('inclination',0);
  saveToLocalStorage();
});

zeroAopButton.addEventListener('click', () => {
  aopSlider.value = 0;
  handleOrientationOnInput('aop');
  replaceAerovisualizerData('argument-of-periapsis',0);
  saveToLocalStorage();
});

const renderRandV = function(){
  let a1 = a;

  if (conicSection === 'hyperbola'){
    if (nu > (Math.PI + delta)/2 || nu < -(Math.PI + delta)/2){
      omt.setRVisible(false);
      omt.setVVisible(false);
      return;
    }

    a1 = -a;
  }

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
  // Bate pp. 182-188
  const cosnu = Math.cos(nu);

  if (e<1){
    // ellipse
    let E = Math.acos((e + cosnu)/(1 + e*cosnu));// acos is 0 to pi
    eccentricAnomaly = nu < 0 ? -E : E;
    meanAnomaly = eccentricAnomaly - e*Math.sin(E);
  }else{
    // hyperbola
    if (!(nu > (Math.PI + delta)/2 || nu < -(Math.PI + delta)/2)){
      const coshF = (e + cosnu)/(1 + e*cosnu);
      let F = Math.log(coshF + Math.sqrt(coshF*coshF - 1));
      hyperbolicAnomaly = nu < 0 ? -F : F;
      meanAnomaly = e*Math.sinh(hyperbolicAnomaly) - hyperbolicAnomaly;
    }else{
      hyperbolicAnomaly = null;
      meanAnomaly = null;
      return;
    }
  }
}

const doNuAndTimeDisplay = function(){
  let ps = 0;

  if (meanAnomaly !== null){
    if (trueAnomaly360 && nuDegrees < 0){
      ps = periodInSeconds;
      nuDisplay.innerHTML = `&nu;: ${Number(nuDegrees+360).toFixed(2).toString()}`;
      timeAfterPeriapseDisplay1.innerHTML = `t: ${Number(timeAfterPeriapse+period).toFixed(4).toString()} CTU`;
    }else{
      nuDisplay.innerHTML = `&nu;: ${Number(nuDegrees).toFixed(2).toString()}`;
      timeAfterPeriapseDisplay1.innerHTML = `t: ${Number(timeAfterPeriapse).toFixed(4).toString()} CTU`;
    }

    switch (timeScaleMenuChoice){
      case 'sec-equals-1sec':
        timeAfterPeriapseDisplay2.innerHTML = `${Number((timeAfterPeriapseInSeconds+ps)/displayTimeScale).toFixed(0).toString()} seconds`;
        break;
      case 'sec-equals-1minute':
      case 'sec-equals-5minutes':
      case 'sec-equals-15minutes':
        timeAfterPeriapseDisplay2.innerHTML = `${Number((timeAfterPeriapseInSeconds+ps)/displayTimeScale).toFixed(1).toString()} minutes`;
        break;
      case 'sec-equals-1hour':
        timeAfterPeriapseDisplay2.innerHTML = `${Number((timeAfterPeriapseInSeconds+ps)/displayTimeScale).toFixed(2).toString()} hours`;
        break;
      case 'sec-equals-1day':
        timeAfterPeriapseDisplay2.innerHTML = `${Number((timeAfterPeriapseInSeconds+ps)/displayTimeScale).toFixed(3).toString()} days`;
        break;
    }
  }else{
    nuDisplay.innerHTML = 'INFINITY';
    timeAfterPeriapseDisplay1.innerHTML = 'INFINITY';
    timeAfterPeriapseDisplay2.innerHTML = 'INFINITY';
  }
}

const doNu = function(value, precise = false){
  haltPlay();

  if (!trajArray){
    return;
  }

  if (trueAnomaly360){
    if (value > 0){
      nuDegrees = value - 180;
    }else{
      nuDegrees = value + 180;
    }
  }else{
    nuDegrees = value;
  }

  nu = nuDegrees*piOver180;
  computeKepler();
  timeAfterPeriapse = meanAnomaly/meanMotion;

  if (!precise){
    iTraj0 = trajArray.findIndex((e) => e.t >= timeAfterPeriapse);
  }else{
    iTraj0 = trajArray.findIndex((e) => e.t > timeAfterPeriapse - 0.0001 && e.t < timeAfterPeriapse + 0.0001);
  }

  if (iTraj0 < 0){
    iTraj0 = Number(0);
  }

  syncTrajState();

  if (trueAnomaly360){
    if (value > 0){
      omt.rotatePlanet1(timeAfterPeriapseInSeconds+periodInSeconds, planetRotationPeriodInSeconds);
    }else{
      omt.rotatePlanet1(timeAfterPeriapseInSeconds, planetRotationPeriodInSeconds);
    }
  }else{
    omt.rotatePlanet1(timeAfterPeriapseInSeconds, planetRotationPeriodInSeconds);
  }

  doNuAndTimeDisplay();
  renderRandV();
  omt.refresh();
}

nuSlider.oninput = function(){
  doNu(Number(this.value));
}

zeroNuButton.addEventListener('click', () => {
  nuDegrees = 0;
  nu = nuDegrees*piOver180;

  if (trueAnomaly360){
    nuSlider.value = -180;
  }else{
    nuSlider.value = 0;
  }

  timeAfterPeriapse = 0;
  computeKepler();
  doNu(nuDegrees, true);
  omt.needsRefresh = true;
});

const computeTrajArray = function(){
  let tn;
  let dtdx;
  let xFirstGuess;
  let x;
  let z;
  let c;
  let s;
  let r;
  let f;
  let g;
  let i;
  let rx;
  let ry;

  if (!needToComputeTrajArray){
    return;
  }

  needToComputeTrajArray = false;
  // set needToComputeTrajArray to true whenever a or e changes
  // but don't call this function until pointerup.  Also, call this
  // immediately when switching between conic section types or when 
  // changing the central body

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

  const sqrtA = Math.sqrt(Math.abs(a));

  // clear the trajArray of any entries that exist
  while (trajArray.length){
    trajArray.pop();
  }

  // trajPoint stores an object to be pushed on to trajArray
  let trajPoint;

  // t is the time in canonical time units.  For elliptical orbits, an 
  // orbital period (tp) equals twoPi canonical time units (TU or CTU)
  // which equals 'period'.  For a hyperbolic flyby, 'period'
  // equals the time span computed in doASliderOnInput()
  let t;

  let E;
  let E1;
  let F;
  let coshF;
  let nu;
  let cosnu;
  let M;
  const th = Math.PI/10;

  for (let nuDeg=-180; nuDeg<trajArraySize; nuDeg+=2){
    // Bate pp. 182-188
    nu = nuDeg*piOver180;
    cosnu = Math.cos(nu);
  
    if (e<1){
      // ellipse
      E = Math.acos((e + cosnu)/(1 + e*cosnu));// acos is 0 to pi
      E1 = nu < 0 ? -E : E;
      M = E1 - e*Math.sin(E);
      t = M/meanMotion;// meanMotion is computed in doASliderOnInput 
    }else{
      // hyperbola
      if (!(nu > (Math.PI + delta)/2 - th || nu < -(Math.PI + delta)/2) + th){
        coshF = (e + cosnu)/(1 + e*cosnu);
        F = Math.log(coshF + Math.sqrt(coshF*coshF - 1));
        F = nu < 0 ? -F : F;
        M = e*Math.sinh(F) - F;
        t = M/meanMotion;
      }else{
        M = undefined;
        t = undefined;
      }
    }

    // Bate p. 206 for first guess of x
    if (e < 1){
      // ellipse
      xFirstGuess = Math.sqrt(muCanonical)*(t - t0)/a;
    }else{
      // hyperbola
      if (t !== t0){
        xFirstGuess = Math.sign(t - t0)*sqrtA*Math.log(-2*muCanonical*(t - t0)
        / (a*(r0DotV0 + Math.sign(t - t0)*sqrtMuCanonical*sqrtA*
        (1 - r0/a))));
      }else{
        xFirstGuess = 0;
      }
    }

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
      if (z > 0){
        let sqrtZ;

        sqrtZ = Math.sqrt(z);
        c = (1 - Math.cos(sqrtZ))/z;
        s = (sqrtZ - Math.sin(sqrtZ))/(sqrtZ*sqrtZ*sqrtZ);
      }else if (z < 0){
        let sqrtMinusZ;

        sqrtMinusZ = Math.sqrt(-z);
        c = (1 - Math.cosh(sqrtMinusZ))/z;
        s = (Math.sinh(sqrtMinusZ) - sqrtMinusZ)/(sqrtMinusZ*sqrtMinusZ*sqrtMinusZ);
      }

      // Bate pp. 197-8, use equations 4.4-14 and 4.4-17
      tn = (r0DotV0*x*x*c/sqrtMuCanonical +
       (1 - r0/a)*x*x*x*s + r0*x)/sqrtMuCanonical;
      dtdx = (x*x*c + r0DotV0*x*(1 - z*s)/sqrtMuCanonical +
       r0*(1 - z*c))/sqrtMuCanonical;      
      x = x + (t - tn)/dtdx;

      // break out of the loop if "close enough", i is usually 
      // way below its max, especially for eccentricities far from 1
      if (Math.abs(t - tn) < 0.001){
        break;
      }
    }
    
    if (i >= 50){
      periapseWarning.innerHTML = 'problem generating trajectory';
    }

    // Bate pp. 201-2
    trajPoint = new Object();
    trajPoint.t = t;
    f = 1 - x*x*c/r0;
    g = t - x*x*x*s/sqrtMuCanonical;
    trajPoint.f = f;
    trajPoint.g = g;
    // below, r is computed under the assumption that r0 and v0 are
    // at the periapse, which is mentioned earlier
    rx = f*rp;
    ry = g*sqrtMuOverP*(e + 1);
    r = Math.sqrt(rx*rx + ry*ry);
    trajPoint.nu = Math.atan2(ry, rx)/piOver180;
    trajPoint.fdot = sqrtMuCanonical*x*(z*s - 1)/(r0*r);
    trajPoint.gdot = 1 - x*x*c/r;
    
    trajArray.push(trajPoint);
    // console.log(f*trajPoint.gdot - g*trajPoint.fdot); // this should be near 1
  }
  
  if (trajArray[0].nu > 179.999999){
    // set the first nu to -180 for elliptical orbits.  atan2 sets it to +180
    trajArray[0].nu = -180;
  }
}

const syncTrajState = function(){
  // sync everything to correspond to the trajectory state stored
  // in trajArray[] at the index iTraj0
  timeAfterPeriapse = trajArray[iTraj0%trajArraySize].t
  timeAfterPeriapseInSeconds = timeAfterPeriapse*ctu;
  timeAfterPeriapseInSeconds0 = timeAfterPeriapseInSeconds;
  iTraj1 = (iTraj0 + 1)%trajArraySize;
  timeAfterPeriapseInSeconds1 = trajArray[iTraj1%trajArraySize].t*ctu;
  x0 = trajArray[iTraj0%trajArraySize].f*rp;
  y0 = trajArray[iTraj0%trajArraySize].g*sqrtMuOverP*(e + 1);
  vx0 = trajArray[iTraj0%trajArraySize].fdot*rp;
  vy0 = trajArray[iTraj0%trajArraySize].gdot*sqrtMuOverP*(e + 1);
  px = x0;
  py = y0;
  vx = vx0;
  vy = vy0;

  let x1 = trajArray[iTraj1%trajArraySize].f*rp;
  let y1 = trajArray[iTraj1%trajArraySize].g*sqrtMuOverP*(e + 1);
  let vx1 = trajArray[iTraj1%trajArraySize].fdot*rp;
  let vy1 = trajArray[iTraj1%trajArraySize].gdot*sqrtMuOverP*(e + 1);
  let deltaTime = timeAfterPeriapseInSeconds1 - timeAfterPeriapseInSeconds0;

  nu0 = trajArray[iTraj0%trajArraySize].nu;
  nu1 = trajArray[iTraj1%trajArraySize].nu;
  nuDegrees = nu0;
  nu = nuDegrees*piOver180;
  dpxdt = (x1 - x0)/deltaTime;
  dpydt = (y1 - y0)/deltaTime;
  dvxdt = (vx1 - vx0)/deltaTime;
  dvydt = (vy1 - vy0)/deltaTime;
  dnudt = (nu1 - nu0)/deltaTime;

  computeKepler();
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

const handlePlanetChange = function(){
  haltPlay();
  theCB = centralBodyData.find(x => x.name === centralBody);
  ctu = theCB.CTU;
  cdu = theCB.CDU;
  periodInSeconds = period*ctu;
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
  ra = Number(a*(1+e));
  vp = Math.sqrt((muCanonical/a)*((1+e)/(1-e)));
  h = rp*vp;
  computeTrajArray();

  doNu(nuDegrees);
  handlePeriapseCheck();
  doTwoSunOptionChoice();
  displayNumerical();
}

muMenu.addEventListener('change', () => {
  centralBody = muMenu.value;
  needToComputeTrajArray = true;
  handlePlanetChange();
  replaceAerovisualizerData('central-body',centralBody);
  saveToLocalStorage();
});

const doTimeScaleMenu = function(){
  haltPlay();
  timeScaleMenuChoice = timeScaleMenu.value;

  switch (timeScaleMenuChoice){
    case 'sec-equals-1sec':
      timeScale = 1;
      displayTimeScale = 1;
      break;
    case 'sec-equals-1minute':
      timeScale = 60;
      displayTimeScale = 60;
      break;
    case 'sec-equals-5minutes':
      timeScale = 300;
      displayTimeScale = 60;
      break;
    case 'sec-equals-15minutes':
      timeScale = 900;
      displayTimeScale = 60;
      break;
    case 'sec-equals-1hour':
      timeScale = 3600;
      displayTimeScale = 3600;
      break;
    case 'sec-equals-1day':
      timeScale = 3600*24;
      displayTimeScale = 3600*24;
      break;
  }

  displayUnitsText();
  displayNumerical();
}

timeScaleMenu.addEventListener('change', () => {
  doTimeScaleMenu();
  doNuAndTimeDisplay();
  replaceAerovisualizerData('timeScaleMenuChoice',timeScaleMenuChoice);
  saveToLocalStorage();
});

const handleMainPrefs = function(opt){
  generalPrefsElements.style.display = 'none';
  inertialVectorsElements.style.display = 'none';
  orbitFixedVectorsElements.style.display = 'none';
  orbitingBodyVectorsElements.style.display = 'none';

  switch (opt){
    case 'general-preferences':
      generalPrefsElements.style.display = 'grid';
      break;

    case 'inertial-vectors':
      inertialVectorsElements.style.display = 'grid';
      inertialVectorsMenu.value = inertialVectorsChoice;
      doInertialVectorsChoice();
      break;

    case 'orbit-fixed-vectors':
      orbitFixedVectorsElements.style.display = 'grid';
      orbitFixedVectorsMenu.value = orbitFixedVectorsChoice;
      doOrbitFixedVectorsChoice();
      break;

    case 'orbiting-body-vectors':
      orbitingBodyVectorsElements.style.display = 'grid';
      orbitingBodyVectorsMenu.value = orbitingBodyVectorsChoice
      doOrbitingBodyVectorsChoice();
      break;
  }
}

mainPrefsMenu.addEventListener('change', () => {
  handleMainPrefs(mainPrefsMenu.value);
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

trueAnomalyOptionCheckbox.addEventListener('change', () => {
  trueAnomaly360 = trueAnomalyOptionCheckbox.checked;
  replaceAerovisualizerData('trueAnomaly360',trueAnomaly360);
  saveToLocalStorage();
});

toggleConicSectionButton.addEventListener('click', () => {
  conicSection = conicSection === 'ellipse' ? 'hyperbola' : 'ellipse';
  conicSectionIsEllipse = conicSection === 'ellipse';

  if (conicSectionIsEllipse){
    toggleConicSectionButton.innerHTML = 'ELLIPSE&nbsp;/&nbsp;hyperbola';
  }else{
    toggleConicSectionButton.innerHTML = 'ellipse&nbsp;/&nbsp;HYPERBOLA';
  }

  needToComputeTrajArray = true;
  doESliderOnInput(+eSlider.value);
  doASliderOnInput(+aSlider.value);
  rp = Number(a*(1-e));
  ra = Number(a*(1+e));
  vp = Math.sqrt((muCanonical/a)*((1+e)/(1-e)));
  h = rp*vp;
  computeTrajArray();

  nuDegrees = 0;
  nu = nuDegrees*piOver180;

  if (trueAnomaly360){
    nuSlider.value = -180;
  }else{
    nuSlider.value = 0;
  }

  timeAfterPeriapse = 0;
  doNu(nuDegrees, true);
  handlePeriapseCheck();
  displayNumerical();

  replaceAerovisualizerData('conic-section',conicSection);
  saveToLocalStorage();
});

const handlePeriapseCheck = function(){
  periapseTooSmall = rp < cbRadius ? true : false;

  if (!periapseTooSmall || (theCB.id === 1)){
    periapseWarning.innerHTML = '&nbsp';
    muButton.style.backgroundColor = '#5555ff';// blue
    aeButton.style.backgroundColor = '#5555ff';
    orientationButton.style.backgroundColor = '#5555ff';
    nuButton.style.backgroundColor = '#5555ff';
    numericalButton.style.backgroundColor = '#5555ff';
    mainReturnButton.style.backgroundColor = '#5555ff';
    toggleConicSectionButton.style.backgroundColor = '#5555ff';
    prefsButton.style.backgroundColor = '#5555ff';
    infoButton.style.backgroundColor = '#5555ff';
    timeScaleMenu.style.backgroundColor = '#5555ff';
    muMenu.style.backgroundColor = '#5555ff';
    infoMenu.style.backgroundColor = '#5555ff';
    mainPrefsMenu.style.backgroundColor = '#5555ff';
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
    playPauseButton.style.backgroundColor = '#5555ff';
    resetButton.style.backgroundColor = '#5555ff';
    cycleNumericalDisplayButton1.style.backgroundColor = '#5555ff';
    cycleNumericalDisplayButton2.style.backgroundColor = '#5555ff';
    cycleNumericalDisplayButton3.style.backgroundColor = '#5555ff';
    toggleNumericalDisplayUnitsButton1.style.backgroundColor = '#5555ff';
    toggleNumericalDisplayUnitsButton2.style.backgroundColor = '#5555ff';
  }else{
    periapseWarning.innerHTML = 'PERIAPSE TOO SMALL';
    muButton.style.backgroundColor = 'red';
    aeButton.style.backgroundColor = 'red';
    orientationButton.style.backgroundColor = 'red';
    nuButton.style.backgroundColor = 'red';
    numericalButton.style.backgroundColor = 'red';
    mainReturnButton.style.backgroundColor = 'red';
    toggleConicSectionButton.style.backgroundColor = 'red';
    prefsButton.style.backgroundColor = 'red';
    infoButton.style.backgroundColor = 'red';
    timeScaleMenu.style.backgroundColor = 'red';
    muMenu.style.backgroundColor = 'red';
    infoMenu.style.backgroundColor = 'red';
    mainPrefsMenu.style.backgroundColor = 'red';
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
    playPauseButton.style.backgroundColor = 'red';
    resetButton.style.backgroundColor = 'red';
    cycleNumericalDisplayButton1.style.backgroundColor = 'red';
    cycleNumericalDisplayButton2.style.backgroundColor = 'red';
    cycleNumericalDisplayButton3.style.backgroundColor = 'red';
    toggleNumericalDisplayUnitsButton1.style.backgroundColor = 'red';
    toggleNumericalDisplayUnitsButton2.style.backgroundColor = 'red';
  }
}

const handleInfoMenuChoice = function(choice){
  switch (choice){
    case 'info-intro': // Introduction
      infoText.innerHTML = `<p class="p-normal">The purpose of Aerovisualizer is to 
      assist in teaching or reinforcing concepts in aerospace engineering by presenting 
      them in interesting and engaging ways.  Subjects are displayed as 2D and 3D 
      animations to complement the dry equations found in textbooks and online.  Controls
      are also provided to manipulate the displays.</p>
      
      <p class="p-normal"><em>Aerovisualizer - Orbital Mechanics</em> focuses on, well, orbital 
      mechanics.  Set the values of the orbital elements and click the play button to start 
      the animation.  It is assumed that you have taken or are currently taking a course on this 
      topic.</p>`;
      break;

    case 'info-how-to-use': // how to use aerovisualizer
      infoText.innerHTML = `
      <p class="p-normal">1) Click <em>&mu;</em> to set the central body and its gravitational 
      parameter (&mu;).</p>
      <p class="p-normal">2) Click <em>a&nbsp;e</em> to set the semi-major axis (a) and the eccentricity 
      (e).</p>
      <p class="p-normal">3) Click <em>&Omega;&nbsp;i&nbsp;&omega;</em> to set the longitude of the 
      ascending node (&Omega;), the orbital inclination (i), and the argument of periapsis (&omega;).</p>
      <p class="p-normal">4) Click <em>&nu;</em> to set the true anomaly (&nu;) and the time after 
      periapse.  (&nu; is the greek letter pronounced "nu")</p>
      <p class="p-normal">5) Click the <em>play</em> button to start things moving.  Click the 
      <em>reset</em> button to return to the initial state.</p>`;
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

    case 'info-a-and-e':
      infoText.innerHTML = `
      <p class="p-normal">Click <em>a&nbsp;e</em>.  Use the sliders to set the 
      <em>semi-major axis (a)</em> and the <em>orbital eccentricity (e)</em>.  The 
      displayed orbit changes in accordance with the sliders.  If the orbit intersects  
      the central body, the buttons change to red.  Adjust a and e to prevent this.</p>
      <p class="p-normal">The value of 'a' is displayed in canonical 
      distance units (CDU).  Its range is 1 to 60 for elliptical orbits and -1 to -60 
      for hyperbolic orbits.</p>
      <p class="p-normal">The value of 'e' ranges from 0 to 0.98 for elliptical orbits 
      and 1.02 to 5 for hyperbolic orbits.  Nearly parabolic orbits (e~=1) are avoided.</p>
      `;
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
      <p class="p-normal">Click <em>&nu;</em>.  Use the slider 
      to set the <em>true anomaly (&nu;)</em> .  The true anomaly is displayed in 
      degrees.  The time since periapse passage is also displayed.  The vectors attached 
      to the orbiting body move in accordance with the slider.  Use the button to set 
      &nu; to zero.</p>
      `;
      break;

    case 'info-numerical-1':
      infoText.innerHTML = `<p class="p-normal">Click <em>1 2 3</em> and choose display 
      option <em>1</em> to show the following information:</p>
      
      <p class="p-normal">time after periapse (t), orbital period (TP), true anomaly (&nu;), 
      eccentric anomaly (E), hyperbolic anomaly (F), mean anomaly (M), mean motion (n), 
      semi-major axis (a), orbital eccentricity (e), longitude of the ascending node 
      (&Omega;), inclination (i), argument of periapsis (&omega;), semi-latus rectum (P), 
      specific angular momentum (h), specific energy (spfc en), orbital velocity (vel), 
      velocity of circular satellite (vcs), escape velocity (vesc), the Q parameter (Q), 
      and characteristic energy (C3).
      </p>
      <p class="p-normal">Click <em>units</em> to switch between canonical and metric 
      units.  The time after periapse and orbital period are in the units of the chosen 
      time scale.  Other time-related values contain units of seconds.  Angles are in 
      degrees.</p>`;
      break;

    case 'info-numerical-2-3':
      infoText.innerHTML = `<p class="p-normal">Click <em>1 2 3</em> and choose display 
      option <em>2</em> to display the <em>r</em> and <em>v</em> vectors in the 
      IJK, PQW, and UVW coordinate frames.  The IJK frame is an inertial frame such as 
      the geocentric-equatorial frame or the heliocentric-ecliptic frame.  The 
      PQW frame is the perifocal frame.  The UVW frame is described in most sources.</p>
      <p class="p-normal">Click <em>units</em> to switch between canonical and metric 
      units.  Choose display option <em>3</em> to display the direction 
      cosine matrices from the PQW frame to the IJK frame and from the UVW frame to 
      the PQW frame.</p>`;
      break;

    case 'info-ellipse-hyperbola':
      infoText.innerHTML = `<p class="p-normal">Click <em>ellipse / hyperbola</em> to toggle between the 
      two types of orbits.  If the buttons suddenly appear red, click the 'a e' button and 
      adjust the semi-major axis and/or the orbital eccentricity to increase the 
      periapse such that the orbit does not intersect the sun/moon/planet.</p>`;
      break;

    case 'info-time-scale':
      infoText.innerHTML = `<p class="p-normal">Choose the time scale from the <em>time scale menu</em>.   
      Click the play button.  The animation rate matches your choice.  For example, if you 
      chose "1 second = 1 hour", one second of real time is equal to an hour of orbital motion.  
      The numerical display shows the time after periapse and orbital period in the units 
      of the time scale.</p>`;
      break;
      
    case 'info-prefs-main':
      infoText.innerHTML = `<p class="p-normal">Click <em>preferences</em>.  Another menu 
      appears letting you choose from several preferences categories.</p>`;
      break;

    case 'info-prefs-general':
      infoText.innerHTML = `<p class="p-normal">Under <em>general preferences</em>, use the slider to set the 
      transparency of the sun/moon/planet.  Use the first checkbox to specify whether or not to show 
      the out of plane vectors (W) of the PQW and UVW frames.  Use the second checkbox to specify that 
      the true/eccentric/hyperbolic/mean anomalies range from 0 to 360&deg; rather than -180&deg; 
      to 180&deg;.</p>`;
      break;

    case 'info-prefs-inertial-vectors':
      infoText.innerHTML = `<p class="p-normal">Under <em>inertial vectors</em>, use the first menu to choose 
      whether or not to display the ijk vector frame.</p>
      <p class="p-normal">Use the second menu to choose the color of the ijk vectors.</p>
      <p class="p-normal">Use the slider to set the scale of the ijk vectors.</p>
      <p class="p-normal">Note: many sources use the letters x, y, and z to represent this frame.</p>
      `;
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
  clock = new THREE.Clock();
  clock.getElapsedTime();
  
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
    handleMainButtons('none');
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

  if (data){
    aerovisualizerData = JSON.parse(JSON.stringify(data));

    for (let o of data) {
      switch (o.name){
          case 'central-body':
            centralBody  = o.value;
            break;
          case 'conic-section':
            conicSection  = o.value;
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
          case 'timeScaleMenuChoice':
            timeScaleMenuChoice  = o.value;
            break;
          case 'centralBodyTransparency':
            centralBodyTransparency  = o.value;
            break;
          case 'showOutOfPlaneVectors':
            showOutOfPlaneVectors  = o.value;
            break;
          case 'trueAnomaly360':
            trueAnomaly360  = o.value;
            break;
      }
    }
  }

  if (omt === null){
    omt = new OrbitalMechThings(scene, camera);
  }

  conicSectionIsEllipse = conicSection === 'ellipse';

  if (conicSectionIsEllipse){
    toggleConicSectionButton.innerHTML = 'ELLIPSE&nbsp;/&nbsp;hyperbola';
  }else{
    toggleConicSectionButton.innerHTML = 'ellipse&nbsp;/&nbsp;HYPERBOLA';
  }

  muMenu.value = centralBody;
  timeScaleMenu.value = timeScaleMenuChoice;
  needToComputeTrajArray = true;
  haltPlay();
  theCB = centralBodyData.find(x => x.name === centralBody);
  ctu = theCB.CTU;
  cdu = theCB.CDU;
  periodInSeconds = period*ctu;
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

  eSlider.value = +eSl;
  aSlider.value = +aSl;
  doESliderOnInput(+eSl);
  doASliderOnInput(+aSl);
  rp = Number(a*(1-e));
  ra = Number(a*(1+e));
  vp = Math.sqrt((muCanonical/a)*((1+e)/(1-e)));
  h = rp*vp;
  computeTrajArray();
  nuDegrees = 0;
  doNu(nuDegrees, true);
  handlePeriapseCheck();
  doTwoSunOptionChoice();
  displayNumerical();
  handlePeriapseCheck();
  lanSlider.value = lanDegrees;
  incSlider.value = incDegrees;
  aopSlider.value = aopDegrees;
  handleOrientationOnInput('lan',true);
  handleOrientationOnInput('inc',true);
  handleOrientationOnInput('aop');
  enableDisableTimeScaleOptions();
  doTimeScaleMenu();
  centralBodyTransparencySlider.value = centralBodyTransparency;
  setCentralBodyTransparency(centralBodyTransparency);
  handleMainPrefs(mainPrefsMenu.value);
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
    handleMainButtons('mu');
    
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

    px = x0 + dpxdt*(timeAfterPeriapseInSeconds - timeAfterPeriapseInSeconds0);
    py = y0 + dpydt*(timeAfterPeriapseInSeconds - timeAfterPeriapseInSeconds0);
    vx = vx0 + dvxdt*(timeAfterPeriapseInSeconds - timeAfterPeriapseInSeconds0);
    vy = vy0 + dvydt*(timeAfterPeriapseInSeconds - timeAfterPeriapseInSeconds0);
    displayNumerical();

    showOutOfPlaneVectorsCheckbox.checked = showOutOfPlaneVectors;
    doWVectors();
    trueAnomalyOptionCheckbox.checked = trueAnomaly360;

    omt.needsRefresh = true;
  }
};

const doPlayPause = function(){
  // icons came from tabler-icons.io
  playing = playing ? false : true;

  if (playing && needToComputeTrajArray){
    computeTrajArray();
    doNu(nuDegrees);
    playing = true;
  }

  if (playing && conicSection === 'hyperbola' && (nu > (Math.PI + delta)/2 || nu < -(Math.PI + delta)/2)){
    doNu(0, true);
    playing = true;
  }

  playPauseButton.innerHTML = playing ? `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-pause-filled" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
  <path d="M9 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" stroke-width="0" fill="currentColor"></path>
  <path d="M17 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" stroke-width="0" fill="currentColor"></path>
</svg>` : `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-play-filled" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
  <path d="M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z" stroke-width="0" fill="currentColor"></path>
</svg>`;
  clock.getDelta();
}

playPauseButton.addEventListener('click', () => {
  doPlayPause();
});

const haltPlay = function(){
  if (playing){
    playing = false;
    playPauseButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-play-filled" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
    <path d="M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z" stroke-width="0" fill="currentColor"></path>
 </svg>`;
    clock.getDelta();
  }
}

resetButton.addEventListener('click', () => {
  nuDegrees = nuSlider.value;
  doNu(nuDegrees);
  displayNumerical();
  omt.resetPlanetRotationParameters();
});

const tick = function(){
  deltaT = timeScale*clock.getDelta();
  timeAfterPeriapseInSeconds += deltaT;// deltaT for 60 fps is 0.01666
  timeAfterPeriapse = timeAfterPeriapseInSeconds/ctu;

  if (timeAfterPeriapseInSeconds >= timeAfterPeriapseInSeconds1){
    while (timeAfterPeriapseInSeconds >= timeAfterPeriapseInSeconds1){
      iTraj0 = iTraj1;
      iTraj1 = iTraj0 + 1;

      // wrap around at apoapse for elliptical orbits
      if (iTraj1 >= Number(trajArraySize)){
        iTraj0 = 0;
        iTraj1 = 1;
      }

      timeAfterPeriapseInSeconds0 = trajArray[iTraj0%trajArraySize].t*ctu;
      timeAfterPeriapseInSeconds1 = trajArray[iTraj1%trajArraySize].t*ctu;
      timeAfterPeriapseInSeconds = timeAfterPeriapseInSeconds0;
    }

    syncTrajState();
    deltaT = timeScale*clock.getDelta();
    timeAfterPeriapseInSeconds += deltaT;// deltaT for 60 fps is 0.01666
    timeAfterPeriapse = timeAfterPeriapseInSeconds/ctu;
  }

  // do the linear interpolation between computed points on the ellipse or
  // hyperbola.  The conic sections are approximated as multi-sided
  // polygons.  To reduce the error, increase the trajArraySize variable but
  // at the expense of more computer memory required for the array
  px = x0 + dpxdt*(timeAfterPeriapseInSeconds - timeAfterPeriapseInSeconds0);
  py = y0 + dpydt*(timeAfterPeriapseInSeconds - timeAfterPeriapseInSeconds0);
  vx = vx0 + dvxdt*(timeAfterPeriapseInSeconds - timeAfterPeriapseInSeconds0);
  vy = vy0 + dvydt*(timeAfterPeriapseInSeconds - timeAfterPeriapseInSeconds0);
  nuDegrees = nu0 + dnudt*(timeAfterPeriapseInSeconds - timeAfterPeriapseInSeconds0);
  nu = nuDegrees*piOver180;
  omt.setR(px, py, 0, a);
  omt.setV(vx, vy, 0);
  omt.rotatePlanet2(timeAfterPeriapseInSeconds, planetRotationPeriodInSeconds, period*ctu);
  displayNumerical();
  omt.needsRefresh = true;
}

const animate = function(continueAnimation = true) {
  if (continueAnimation) {
    requestAnimationFrame(animate);
  }
  
  orbitControls.update();// orbitControls have nothing to do with orbital mechanics

  if (cpx !== camera.position.x && cpy !== camera.position.y && cpz !== camera.position.z){
    cpx = camera.position.x;
    cpy = camera.position.y;
    cpz = camera.position.z;
    omt.needsRefresh = true;
  } 

  renderer.clear();
  renderer.render(scene, camera);

  if (playing){
    tick();
  }

  omt.refresh();// refresh only happens if needsRefresh === true
};

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
