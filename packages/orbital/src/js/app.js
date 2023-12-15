import * as THREE from '../../../../node_modules/three/build/three.module.js';
import OrbitalMechThings from './OrbitalMechThings.js';
import {OrbitControls} from './OrbitControls.js';

const piOver180 = Math.PI / 180;
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
let omt = null;//"vectors object" (handles all of the vectors)
let orbitControls = null;//in this context, "orbit" refers to the camera
// OrbitControls is a THREE.js class that has nothing to do with orbital mechanics
let playing = false;
let cbRadius = 1;
const muCanonical = 1;//mu is 1 for canonical units of distance (DU)
//and time (TU). This is included in the code rather than 1 to
//maintain clarity
const sqrtMuCanonical = Math.sqrt(muCanonical);//this also should be 1
let periapseTooSmall = false;

const defaultCentralBody = 'Earth';
const defaultConicSection = 'ellipse';
const defaultA = 1;//positive for ellipses
const defaultE = 0;//use 0 for ellipse or Math.SQRT2 for hyperbola
const defaultLan = 0;//degrees
const defaultInclination = 0;//degrees
const defaultAop = 0;//degrees
const defaultNu = 0;//degrees

const defaultDelta = Math.PI/2;// 90 degrees for "square" hyperbola
// const defaultVectorSize = 6;

const defaultInertialVectorsChoice = 'X-Y-Z';
const defaultOrbitFixedVectorsChoice = 'h-and-e';
const defaultOrbitingBodyVectorsChoice = 'r-and-v';

const defaultInertialVectorColor = 'orange';
const defaultOrbitFixedVectorColor = 'blue';
const defaultUVWVectorColor = 'yellow';
const defaultRVectorColor = 'yellow';
const defaultVVectorColor = 'green';

const defaultInertialVectorScale = 50;
const defaultOrbitFixedVectorScale = 50;
const defaultOrbitingBodyVectorScale = 50;

const defaultTimeScale = 1;
const defaultTimeScaleMenuChoice = 'sec-equals-1sec';

const defaultCentralBodyTransparency = 0;//0=completely opaque, 100=completely transparent
const defaultShowOutOfPlaneVectors = true;

//aerovisualizerData is modified and saved to local storage when 
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
  {name:'true-anomaly', value:defaultNu},
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
  {name:'showOutOfPlaneVectors', value:defaultShowOutOfPlaneVectors}
];

let centralBody = defaultCentralBody;
let theCB = null;
let ctu = 0;//canonical time unit
let cdu = 0;//canonical distance unit
let planetRotationPeriodSeconds = 0;
let conicSection = defaultConicSection;
let a = Number(defaultA);
let tp = twoPi*Math.pow(a,1.5)/muCanonical;//orbital period
let e = Number(defaultE);
let lanDegrees = defaultLan;
let lan = lanDegrees*piOver180; // longitude of the ascending node
let incDegrees = defaultInclination;
let inc = incDegrees*piOver180;// inclination
let aopDegrees = defaultAop;
let aop = aopDegrees*piOver180;// argument of periapsis
let dcmPQW2IJK = new THREE.Matrix3();
let dcmPQW2UVW = new THREE.Matrix3();
let nuDegrees = defaultNu;
let nu = nuDegrees*piOver180;// true anomaly
let eccentricAnomaly;
let hyperbolicAnomaly;
let meanAnomaly;
let meanMotion;
let timeAfterPeriapse;// in canonical time units (CTU)
let timeAfterPeriapseInSeconds;

let universalArray = [];
const universalArraySize = 361;
let universalArrayIndex0;// this is
// the index of universalArray that corresponds to just before
// where the time is during animation
let universalArrayIndex1 = universalArrayIndex0; // this is
// the index of universalArray that corresponds to just after
// where the time is during animation
let timeAfterPeriapseInSeconds0;// time corresponding
// to universalArray[universalArrayIndex0]
let timeAfterPeriapseInSeconds1;// time corresponding
// to universalArray[universalArrayIndex1]

// initial position and velocity of interpolation for animation
let x0;
let y0;
let vx0;
let vy0;
// position and velocity for animation
let px;
let py;
let vx;
let vy;
// slopes of interpolation for animation
let dpxdt;
let dpydt;
let dvxdt;
let dvydt;
let dnudt;
// true anomaly of interpolation for animation
let nu0;
let nu1;

let needToComputeUniversal = true;
let animationPeriod = tp;

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
let displayTimeScale = defaultTimeScale;
let timeScaleMenuChoice = defaultTimeScaleMenuChoice;

let centralBodyTransparency = defaultCentralBodyTransparency;
let showOutOfPlaneVectors = defaultShowOutOfPlaneVectors;

let rVector = new THREE.Vector3(1, 1, 1);
let rPQW = new THREE.Vector3(1, 1, 1);
let rIJK = new THREE.Vector3(1, 1, 1);
let rUVW = new THREE.Vector3(1, 1, 1);
let vVector = new THREE.Vector3(1, 1, 1);
let vPQW = new THREE.Vector3(1, 1, 1);
let vIJK = new THREE.Vector3(1, 1, 1);
let vUVW = new THREE.Vector3(1, 1, 1);

let p = a*(1 - e*e);//parameter (semi-latus rectum)
let sqrtMuOverP = Math.sqrt(muCanonical/p);//needed for computing velocity
let delta = defaultDelta;//turning angle for hyperbolic orbits
let rp = Number(a*(1-e));//r vector magnitude at periapse
let ra = Number(a*(1+e));//r vector magnitude at apoapse
let specificEnergy = -muCanonical/(2*a);
let vp = Math.sqrt((muCanonical/a)*((1+e)/(1-e)));//v vector magnitude at periapse
let h = rp*vp;
periapseTooSmall = rp < cbRadius ? true : false;

let periapseLocked = false;
let apoapseLocked = false;
let sliderAcanChange = false;//required for locking the periapse/apoapse
let sliderEcanChange = false;//required for locking the periapse/apoapse

const aMin = 1;
const aMax = 60;
const aRange = aMax - aMin;
const eMinEllipse = 0;
const eMaxEllipse = 0.98;
const eEllipseRange = eMaxEllipse - eMinEllipse;
const eMinHyperbola = 1.02;
const eMaxHyperbola = 5;
const eHyperbolaRange = eMaxHyperbola - eMinHyperbola;
const aSliderRange = 150;
const eSliderRange = 150;

// let vectorSize = defaultVectorSize;

const threeDWorld = document.getElementById('threeD-world');

const muButton = document.getElementById('mu-btn');
const aeButton = document.getElementById('a-e-btn');
const orientationButton = document.getElementById('orientation-btn');
const rvButton = document.getElementById('r-v-btn');
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
const lockPeriapseButton = document.getElementById('lock-periapse-btn');
const lockApoapseButton = document.getElementById('lock-apoapse-btn');
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
const timeAfterPeriapseDisplay = document.getElementById('tap-display');
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
const numVcs = document.getElementById('num-vcs');
const numVesc = document.getElementById('num-vesc');
const numQ = document.getElementById('num-Q');
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
const showOutOfPlaneVectorsCheckbox = document.getElementById('show-out-of-plane');

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

const numXXX = document.getElementById('num-xxx');

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

G, 6.67430E-11, m3/kg/s2
G, 39.478, AU3/M(sun)/yr2
G, 6.67430E-20, km3/kg/s2

1.495979E+11, m/AU
1.495979E+08, km/AU

moon
Trev = Revolution period (days) 27.3217
incEcl = Inclination to ecliptic (deg) 5.145
{name:'moon', m:0.07346, CDU:1737.4, gravSurf:1.62, vesc:2.38,
 mu:0.0049, akm:0.3844, Tsid:x, perihel:0.3633, aphel:0.4055, Tsyn:29.53,
  vmean:1.022, vmax:1.082, vmin:0.97, inc:18.28, -28.58, srp:0.0549, 
  daylen:655.72, obliqu:x, incEqu:6.68, a:x,  e:0.002569555, i:0.0554, 
  Om:5.16, om:125.08, ml:318.15, 135.27, 
*/

/*
G km^3/kg/s^2 = 6.6743E-20
1 AU = 149597870.70 km exactly

according to source, for earth
from https://archive.aoe.vt.edu/lutze/AOE2104/consts.pdf
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
  a:'NA', e:'NA', i:'NA', Om:'NA', 
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
// localStorage.clear();//temp
// saveToLocalStorage();//temp blah
// location.reload();//temp

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


const displayNumerical = function(){
  let tap = displayUnits === 1 ? timeAfterPeriapse : timeAfterPeriapseInSeconds/displayTimeScale;

  if (meanAnomaly !== null){
    computePQW2IJKRotation();
    computePQW2UVWRotation();
    numNu.innerHTML = `${Number(nuDegrees).toFixed(2).toString()}`;

    switch (timeScaleMenuChoice){
      case 'sec-equals-1sec':
        numT.innerHTML = `${Number(tap).toFixed(0).toString()}`;
        break;
      case 'sec-equals-1minute':
        numT.innerHTML = `${Number(tap).toFixed(1).toString()}`;
        break;
      case 'sec-equals-5minutes':
        numT.innerHTML = `${Number(tap).toFixed(1).toString()}`;
        break;
      case 'sec-equals-15minutes':
        numT.innerHTML = `${Number(tap).toFixed(1).toString()}`;
        break;
      case 'sec-equals-1hour':
        numT.innerHTML = `${Number(tap).toFixed(2).toString()}`;
        break;
      case 'sec-equals-1day':
        numT.innerHTML = `${Number(tap).toFixed(3).toString()}`;
        break;
    }
  }else{
    numT.innerHTML = 'INF';
  }

  let spAngMom = h;
  let spEnergy = specificEnergy;
  let aDisp = a;
  let pDisp = p;
  let tpDisp = tp;
  let mm = meanMotion;

  if (displayUnits === 2){
    tap = timeAfterPeriapseInSeconds/displayTimeScale;
    spAngMom *= cdu*cdu/ctu;
    spEnergy *= cdu*cdu/ctu/ctu;
    aDisp *= cdu;
    pDisp *= cdu;
    tpDisp *= ctu/displayTimeScale;
    mm /= ctu;
  }

  numXXX.innerHTML = 'xxx';

  numEnergy.innerHTML = `${Number(spEnergy).toFixed(4).toString()}`;
  numE.innerHTML = `${Number(e).toFixed(3).toString()}`;
  numOm.innerHTML = lanDegrees;
  numI.innerHTML = incDegrees;
  numom.innerHTML = aopDegrees;

  if (e < 1){
    numTotalPeriod.innerHTML = `${Number(tpDisp).toFixed(4).toString()}`;
  }else{
    numTotalPeriod.innerHTML = 'x';
  }

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
  dcm12pqw2uvw.innerHTML = `${Number(dcmPQW2UVW.elements[3]).toFixed(4).toString()}`;
  dcm13pqw2uvw.innerHTML = `${Number(dcmPQW2UVW.elements[6]).toFixed(4).toString()}`;
  dcm21pqw2uvw.innerHTML = `${Number(dcmPQW2UVW.elements[1]).toFixed(4).toString()}`;
  dcm22pqw2uvw.innerHTML = `${Number(dcmPQW2UVW.elements[4]).toFixed(4).toString()}`;
  dcm23pqw2uvw.innerHTML = `${Number(dcmPQW2UVW.elements[7]).toFixed(4).toString()}`;
  dcm31pqw2uvw.innerHTML = `${Number(dcmPQW2UVW.elements[2]).toFixed(4).toString()}`;
  dcm32pqw2uvw.innerHTML = `${Number(dcmPQW2UVW.elements[5]).toFixed(4).toString()}`;
  dcm33pqw2uvw.innerHTML = `${Number(dcmPQW2UVW.elements[8]).toFixed(4).toString()}`;

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

  let rcs = rPQW.length();
  let vcs = Math.sqrt(muCanonical/rcs);
  let vesc = Math.SQRT2*vcs;
  let Q = vPQW.lengthSq()/vcs/vcs;

  if (displayUnits === 2){
    numH.innerHTML = `${Number(spAngMom).toExponential(3).toString()}`;
    numA.innerHTML = `${Number(aDisp).toExponential(3).toString()}`;
    numP.innerHTML = `${Number(pDisp).toExponential(3).toString()}`;
    vcs *= cdu/ctu;
    vesc *= cdu/ctu;
    numRP.innerHTML = `${Number(cdu*px).toFixed(0).toString()}`;
    numRQ.innerHTML = `${Number(cdu*py).toFixed(0).toString()}`;
    numVP.innerHTML = `${Number(cdu/ctu*vx).toFixed(3).toString()}`;
    numVQ.innerHTML = `${Number(cdu/ctu*vy).toFixed(3).toString()}`;
    numRI.innerHTML = `${Number(cdu*rIJK.x).toFixed(0).toString()}`;
    numRJ.innerHTML = `${Number(cdu*rIJK.y).toFixed(0).toString()}`;
    numRK.innerHTML = `${Number(cdu*rIJK.z).toFixed(0).toString()}`;
    numVI.innerHTML = `${Number(cdu/ctu*vIJK.x).toFixed(3).toString()}`;
    numVJ.innerHTML = `${Number(cdu/ctu*vIJK.y).toFixed(3).toString()}`;
    numVK.innerHTML = `${Number(cdu/ctu*vIJK.z).toFixed(3).toString()}`;
    numRU.innerHTML = `${Number(cdu*rUVW.x).toFixed(0).toString()}`;
    numRV.innerHTML = '0.000';
    numVU.innerHTML = `${Number(cdu/ctu*vUVW.x).toFixed(3).toString()}`;
    numVV.innerHTML = `${Number(cdu/ctu*vUVW.y).toFixed(3).toString()}`;
    unitsDisplay1.innerHTML = 'metric units (km, km/s)'
    unitsDisplay2.innerHTML = 'metric units (km, km/s)'
  }else{
    numH.innerHTML = `${Number(spAngMom).toFixed(1).toString()}`;
    numA.innerHTML = `${Number(aDisp).toFixed(2).toString()}`;
    numP.innerHTML = `${Number(pDisp).toFixed(2).toString()}`;
    numRP.innerHTML = `${Number(px).toFixed(3).toString()}`;
    numRQ.innerHTML = `${Number(py).toFixed(3).toString()}`;
    numVP.innerHTML = `${Number(vx).toFixed(3).toString()}`;
    numVQ.innerHTML = `${Number(vy).toFixed(3).toString()}`;
    numRI.innerHTML = `${Number(rIJK.x).toFixed(3).toString()}`;
    numRJ.innerHTML = `${Number(rIJK.y).toFixed(3).toString()}`;
    numRK.innerHTML = `${Number(rIJK.z).toFixed(3).toString()}`;
    numVI.innerHTML = `${Number(vIJK.x).toFixed(3).toString()}`;
    numVJ.innerHTML = `${Number(vIJK.y).toFixed(3).toString()}`;
    numVK.innerHTML = `${Number(vIJK.z).toFixed(3).toString()}`;
    numRU.innerHTML = `${Number(rUVW.x).toFixed(3).toString()}`;
    numRV.innerHTML = '0.000';
    numVU.innerHTML = `${Number(vUVW.x).toFixed(3).toString()}`;
    numVV.innerHTML = `${Number(vUVW.y).toFixed(3).toString()}`;
    unitsDisplay1.innerHTML = 'canonical units'
    unitsDisplay2.innerHTML = 'canonical units'
  }

  numVcs.innerHTML = `${Number(vcs).toFixed(4).toString()}`;
  numVesc.innerHTML = `${Number(vesc).toFixed(4).toString()}`;
  numQ.innerHTML = `${Number(Q).toFixed(4).toString()}`;

  computeKeplerStuff();

  if (e < 1){
    numEccenAnom.innerHTML = `${Number(eccentricAnomaly/piOver180).toFixed(2).toString()}`;
    numHyperAnom.innerHTML = 'x';
  }else{
    numEccenAnom.innerHTML = 'x';
    numHyperAnom.innerHTML = `${Number(hyperbolicAnomaly/piOver180).toFixed(2).toString()}`;
  }
  
  numMeanAnom.innerHTML = `${Number(meanAnomaly/piOver180).toFixed(2).toString()}`;
  numMeanMotion.innerHTML = `${Number(mm).toFixed(4).toString()}`;
}

toggleNumericalDisplayUnitsButton1.addEventListener('click', () => {
  displayUnits = (displayUnits === 1) ? 2 : 1;
  displayNumerical();
});

toggleNumericalDisplayUnitsButton2.addEventListener('click', () => {
  displayUnits = (displayUnits === 1) ? 2 : 1;
  displayNumerical();
});

const handleMainButtons = function(button){
  muButton.disabled = false;
  aeButton.disabled = false;
  orientationButton.disabled = false;
  rvButton.disabled = false;
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
    case 'rv':
      haltPlay();
      nuElements.style.display = 'grid';
      rvButton.disabled = true;
      break;
    case 'numerical':
      switch (numericalDisplayOption){
        case 1:
          numericalElements1.style.display = 'grid';
          break;
        case 2:
          numericalElements2.style.display = 'grid';
          break;
        case 3:
          numericalElements3.style.display = 'grid';
          break;
      }

      numericalButton.disabled = true;
      numericalDisplayIsOccurring = true;
      displayNumerical();
      break;
    case 'prefs':
      haltPlay();
      prefsElements.style.display = 'grid';
      prefsButton.disabled = true;
      playResetButtonsElements.style.display = 'none';
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

rvButton.addEventListener('click', () => {
  handleMainButtons('rv');
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
  sqrtMuOverP = Math.sqrt(muCanonical/p);//needed for computing velocity
}

const computeDelta = function(){
  // delta is the turning angle (i.e. the angle through
  // which the path of a space probe is turned by its
  // encounter with a planet during a hyperbolic flyby)
  if (e < 1){
    return;
  }

  delta = 2*Math.asin(1/e);// delta is an angle in radians
}

const doTwoSunOptionChoice = function(){
  // 'sun1' is the sun with its radius as the canonical distance unit.
  // 'sun2' uses 1 AU as the CDU, and we need to scale the size of the  
  // sun additionally by a factor of the ratio of 1 AU to the radius of  
  // the sun (ratio=214.9...).  sun2 is needed to allow the 'a' slider 
  // to reach larger scales of distance.  Make sure that the 
  // centralBodyData id for 'sun2' is 1

  if (theCB.id !== 1){
    omt.shapeOrbitCurve(a, e);
  }else{
    omt.shapeOrbitCurve(214.939469396551724*a, e);
  }
}

const doASliderOnInput = function(value){
  haltPlay();
  let c = aRange/(Math.log(aSliderRange+1));
  let d = aMax;
  value = aSliderRange - value;
  a = d - c*Math.log(value+1);

  // a > 0 for ellipses, a < 0 for hyperbolas
  if (conicSection === 'ellipse'){
    tp = twoPi*Math.pow(a,1.5)/muCanonical;//orbital period
    animationPeriod = tp;
  }else{
    a = -a;
    tp = null;//orbital period is not defined for hyperbolic orbits

    // set animationPeriod equal to the time period of the flyby.  
    // Since the time is infinite to reach the delta angle, we reduce 
    // this angle by a small amount ("th") to make the animation time
    // reasonable.  nu1 and nu2 are true anomalies at the extremes of
    // the flyby.  One possible program enhancement might be to let the
    // user determine the value of "th"

    const th = Math.PI/10;
    const trueAnomaly1 = -(Math.PI + delta)/2 + th;
    const trueAnomaly2 = (Math.PI + delta)/2 - th;
    const cosnu1 = Math.cos(trueAnomaly1);
    const cosnu2 = Math.cos(trueAnomaly2);
    //make sure to compute e before this function, otherwise
    //coshF1 and coshF2 can be such that we compute a square
    //root of a negative number below
    const coshF1 = (e + cosnu1)/(1 + e*cosnu1);
    const coshF2 = (e + cosnu2)/(1 + e*cosnu2);
    const F1 = -Math.log(coshF1 + Math.sqrt(coshF1*coshF1 - 1));
    const F2 = Math.log(coshF2 + Math.sqrt(coshF2*coshF2 - 1));
    const M1 = e*Math.sinh(F1) - F1;
    const M2 = e*Math.sinh(F2) - F2;
    const n = Math.sqrt(muCanonical/(-a*a*a));
    animationPeriod = (M2 - M1)/n;
  }

  needToComputeUniversal = true;
  meanMotion = Math.sqrt(1/(a*a*a));
  // a = value/aSliderRange*aRange + aMin;
  specificEnergy = -muCanonical/(2*a);
  aDisplay.innerHTML = `a: ${Number(a).toFixed(2).toString()}`;
  computeP();
  doTwoSunOptionChoice();
}

const doESliderOnInput = function(value){
  haltPlay();
  let c;
  let d;
  value = eSliderRange - value;

  switch (conicSection){
    case 'ellipse':
      c = eEllipseRange/(Math.log(eSliderRange+1));
      d = eMaxEllipse;
      e = d - c*Math.log(value+1);
      eDisplay.innerHTML = `e: ${Number(e).toFixed(3).toString()}`;
      break;

    case 'hyperbola':
      c = eHyperbolaRange/(Math.log(eSliderRange+1));
      d = eMaxHyperbola;
      e = d - c*Math.log(value+1);

      computeDelta();//hypberbolic turning angle
      eDisplay.innerHTML = `e: ${Number(e).toFixed(3).toString()}`;
      break;
  }

  needToComputeUniversal = true;
  computeP();
  doTwoSunOptionChoice();
}

aSlider.oninput = function(){
  doASliderOnInput(+this.value);
  sliderEcanChange = true;//needed for locking the periapse/apoapse
}

eSlider.oninput = function(){
  doESliderOnInput(+this.value);
  sliderAcanChange = true;//needed for locking the periapse/apoapse
}

aSlider.onpointerup = function(){
  if ((periapseLocked || apoapseLocked) && sliderEcanChange){
    const apses = [periapseLocked, apoapseLocked];

    for (apseLocked in apses){
      if (apseLocked){
        let ce;
        let de;

        if (conicSection === 'ellipse'){
          ce = eEllipseRange/(Math.log(eSliderRange+1));
          de = eMaxEllipse;
        }else{
          ce = eHyperbolaRange/(Math.log(eSliderRange+1));
          de = eMaxHyperbola;
        }

        let etemp;

        // assuming that only periapseLocked
        // or apoapseLocked but not both
        if (periapseLocked){
          etemp = 1 - rp/a;
        }else{
          etemp = 1 + ra/a;
        }

        let eS = eSliderRange - (Math.exp((de-etemp)/ce) - 1);

        if (0 < eS && eS < eSliderRange){
          eSlider.value = +eS;
          doESliderOnInput(+eS);// sets the value of 'e'
        }
      }
    }
  }

  rp = a*(1-e);
  ra = a*(1+e);
  vp = Math.sqrt((muCanonical/a)*((1+e)/(1-e)));
  h = rp*vp;

  handlePeriapseCheck();
  sliderEcanChange = false;
  doNuSliderOnInput(nuDegrees);
  replaceAerovisualizerData('semimajor-axis',+this.value);
  saveToLocalStorage();
}

eSlider.onpointerup = function(){
  if ((periapseLocked || apoapseLocked) && sliderAcanChange){
    const apses = [periapseLocked, apoapseLocked];

    for (apseLocked in apses){
      if (apseLocked){
        let atemp;

        // assuming that only periapseLocked
        // or apoapseLocked but not both
        if (periapseLocked){
          atemp = rp/(1-e);
        }else{
          atemp = ra/(1+e);
        }

        if (conicSection === 'hyperbola'){
          // a > 0 for ellipses, a < 0 for hyperbolas
          atemp = -atemp;
        }

        let ca = aRange/(Math.log(aSliderRange+1));
        let da = aMax;
        let aS = aSliderRange - (Math.exp((da-atemp)/ca) - 1);

        if (0 < aS && aS < aSliderRange){
          aSlider.value = +aS;
          doASliderOnInput(+aS);// sets the value of 'a'
        }
      }
    }
  }

  rp = a*(1-e);
  ra = a*(1+e);
  vp = Math.sqrt((muCanonical/a)*((1+e)/(1-e)));
  h = rp*vp;
  handlePeriapseCheck();
  sliderAcanChange = false;
  doNuSliderOnInput(nuDegrees);
  replaceAerovisualizerData('eccentricity',+this.value);
  saveToLocalStorage();
}

lockPeriapseButton.addEventListener('click', () => {
  handlePeriapseCheck();

  if (periapseLocked){
    periapseLocked = false;
    lockPeriapseButton.innerHTML = 'lock periapse';

    if (!periapseTooSmall){
      lockPeriapseButton.style.backgroundColor = "#5555ff";
    }
  }else{
    periapseLocked = true;
    lockPeriapseButton.innerHTML = 'PERIAPSE LOCKED';
    lockPeriapseButton.style.backgroundColor = 'red';

    apoapseLocked = false;
    lockApoapseButton.innerHTML = 'lock apoapse';
    
    if (!periapseTooSmall){
      lockApoapseButton.style.backgroundColor = "#5555ff";
    }
  }
});

lockApoapseButton.addEventListener('click', () => {
  handlePeriapseCheck();

  if (apoapseLocked){
    apoapseLocked = false;
    lockApoapseButton.innerHTML = 'lock apoapse';

    if (!periapseTooSmall){
      lockApoapseButton.style.backgroundColor = "#5555ff";
    }
  }else{
    apoapseLocked = true;
    lockApoapseButton.innerHTML = 'APOAPSE LOCKED';
    lockApoapseButton.style.backgroundColor = 'red';

    periapseLocked = false;
    lockPeriapseButton.innerHTML = 'lock periapse';

    if (!periapseTooSmall){
      lockPeriapseButton.style.backgroundColor = "#5555ff";
    }
  }
});

const computePQW2IJKRotation = function(){
  // compute the direction cosine matrix from the perifocal frame
  // to the geocentric equatorial frame (or other inertial frames)
  // from Fundamentals of Astrodynamics (Bate, Mueller, White), 
  // p. 82, Dover Publications
  // this is a 313 Euler rotation sequence
  const clan = Math.cos(lan);//longitude of the ascending node
  const slan = Math.sin(lan);
  const cinc = Math.cos(inc);//orbital inclination
  const sinc = Math.sin(inc);
  const caop = Math.cos(aop);//argument of periapse
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
  // compute the direction cosine matrix from the UVW frame
  // to the perifocal frame
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

const computeREllipse = function(){
  const r = p/(1 + e*Math.cos(nu));
  const x = r*Math.cos(nu);
  const y = r*Math.sin(nu);
  rVector.set(x, y, 0);
  omt.setR(x, y, 0, a);
}

const computeRHyperbola = function(){
  // don't render the r vector when the true anomaly
  // is in a range such that r would point to the
  // wrong branch of the hyperbola.
  // Also, if going from 0 to 360, replace the code below with this -->
  // if (nu > (Math.PI + delta)/2 && nu < 1.5*Math.PI - delta/2){

  if (nu > (Math.PI + delta)/2 || nu < -(Math.PI + delta)/2){
    omt.setRVisible(false);
    return;
  }

  omt.setRVisible(true);
  const r = p/(1 + e*Math.cos(nu));
  const x = r*Math.cos(nu);
  const y = r*Math.sin(nu);
  rVector.set(x, y, 0);
  omt.setR(x, y, 0, -a);
}

const computeVEllipse = function(){
  const x = -sqrtMuOverP*Math.sin(nu);
  const y = sqrtMuOverP*(e + Math.cos(nu));
  vVector.set(x, y, 0);
  omt.setV(x, y, 0, a);
}

const computeVHyperbola = function(){
  // see the comment for computeRHyperbola

  if (nu > (Math.PI + delta)/2 || nu < -(Math.PI + delta)/2){
    omt.setVVisible(false);
    return;
  }

  omt.setVVisible(true);
  const x = -sqrtMuOverP*Math.sin(nu);
  const y = sqrtMuOverP*(e + Math.cos(nu));
  vVector.set(x, y, 0);
  omt.setV(x, y, 0, -a);
}

const computeKeplerStuff = function(){
  // see Bate Mueller White pp. 182-188
  const cosnu = Math.cos(nu);

  if (e<1){
    let E = Math.acos((e + cosnu)/(1 + e*cosnu));//acos is 0 to pi
    eccentricAnomaly = nu < 0 ? -E : E;
    meanAnomaly = eccentricAnomaly - e*Math.sin(eccentricAnomaly);
  }else{
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

  const aCubed = a < 0 ? -a*a*a : a*a*a;
  meanMotion = Math.sqrt(muCanonical/aCubed);
  timeAfterPeriapse = meanAnomaly/meanMotion;
  timeAfterPeriapseInSeconds = timeAfterPeriapse*ctu;
}

const computeKeplerAndTimeAfterPeriapse = function(){
  computeKeplerStuff();
  universalArrayIndex0 = universalArray.findIndex((e) => e.t >= timeAfterPeriapse);
  universalArrayIndex1 = (universalArrayIndex0 + 1)%universalArraySize;
  timeAfterPeriapseInSeconds0 = universalArray[universalArrayIndex0].t*ctu;
  timeAfterPeriapseInSeconds1 = universalArray[universalArrayIndex1].t*ctu;
}

const doNuAndTimeDisplay = function(){
  if (meanAnomaly !== null){
    nuDisplay.innerHTML = `&nu;: ${Number(nuDegrees).toFixed(2).toString()}`;
    computePQW2UVWRotation();

    switch (timeScaleMenuChoice){
      case 'sec-equals-1sec':
        timeAfterPeriapseDisplay.innerHTML = `t: ${Number(timeAfterPeriapseInSeconds/displayTimeScale).toFixed(0).toString()} seconds`;
        break;
      case 'sec-equals-1minute':
        timeAfterPeriapseDisplay.innerHTML = `t: ${Number(timeAfterPeriapseInSeconds/displayTimeScale).toFixed(1).toString()} minutes`;
        break;
      case 'sec-equals-5minutes':
        timeAfterPeriapseDisplay.innerHTML = `t: ${Number(timeAfterPeriapseInSeconds/displayTimeScale).toFixed(1).toString()} minutes`;
        break;
      case 'sec-equals-15minutes':
        timeAfterPeriapseDisplay.innerHTML = `t: ${Number(timeAfterPeriapseInSeconds/displayTimeScale).toFixed(1).toString()} minutes`;
        break;
      case 'sec-equals-1hour':
        timeAfterPeriapseDisplay.innerHTML = `t: ${Number(timeAfterPeriapseInSeconds/displayTimeScale).toFixed(2).toString()} hours`;
        break;
      case 'sec-equals-1day':
        timeAfterPeriapseDisplay.innerHTML = `t: ${Number(timeAfterPeriapseInSeconds/displayTimeScale).toFixed(3).toString()} days`;
        break;
    }
  }else{
    timeAfterPeriapseDisplay.innerHTML = 't: INFINITY';
  }
}

const doNuSliderOnInput = function(value){
  haltPlay();
  nuDegrees = value;
  nu = nuDegrees*piOver180;
  computeKeplerAndTimeAfterPeriapse();
  doNuAndTimeDisplay();
  omt.rotatePlanet(timeAfterPeriapseInSeconds, planetRotationPeriodSeconds);

  switch (conicSection){
    case 'ellipse':
      computeREllipse();
      computeVEllipse();
      break;
      
    case 'hyperbola':
      computeRHyperbola();
      computeVHyperbola();
      break;
  }

  omt.refresh();
}

nuSlider.oninput = function(){
  doNuSliderOnInput(+this.value);
}

nuSlider.onpointerup = function(){
  doUniversalPointCalculations(1);
  replaceAerovisualizerData('true-anomaly',nuDegrees);
  saveToLocalStorage();
}

zeroNuButton.addEventListener('click', () => {
  nu = 0;
  nuDegrees = 0;
  nuSlider.value = nuDegrees;  
  doUniversalPointCalculations(1);
  replaceAerovisualizerData('true-anomaly',nuDegrees);
  saveToLocalStorage();
});

const computeUniversal = function(){
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

  needToComputeUniversal = false;
  // set needToComputeUniversal to true whenever a or e changes
  // but don't call this function until the user hits the play button

  const t0 = 0;
    // we use the periapse for r0, so t0 = timeAfterPeriapse = 0.
    // Generally, set t0 equal to timeAfterPeriapse

  const r0 = rp;
  // we use the periapse for r0, so we set it to rp, which
  // was set equal to a*(1-e) in either aSlider.onpointerup
  // or eSlider.onpointerup.  Generally, set r0 to rVector.length()

  const r0DotV0 = 0;
  // we use the periapse for r0 and v0, so their dot product
  // is 0.  Generally, set r0DotV0 equal to rVector.dot(vVector),
  // where rVector is set from r = p/(1 + e*cos(nu)), and
  // rVector.x equals r*cos(nu), rVector.y equals r*sin(nu),
  // vVector.x equals -sqrtMuOverP*sin(nu), and
  // vVector.y equals sqrtMuOverP*(e + cos(nu)) from Bate p. 72
  // VELOCITY COMMENT MIGHT BE FOR PERIAPSE, NOT GENERAL

  const sqrtA = Math.sqrt(Math.abs(a));

  // clear the universalArray of any entries that exist
  while (universalArray.length){
    universalArray.pop();
  }

  let univPoint;  
  // make sure that universalArraySize is an even fraction or
  // multiple of 360 PLUS 1 such as 61, 91, 121, 181, 361, or 721.
  // 361 seems to be good enough. lower numbers cause the animation
  // to look segmented around periapse and the numbers to be
  // too inaccurate.  The last point is the same as the first
  for (let t=-animationPeriod/2; t<animationPeriod/2; t+=animationPeriod/(universalArraySize-1)){
    // t is the time in canonical time units.  For elliptical orbits, an 
    // orbital period (tp) equals twoPi canonical time units (TU or CTU)
    // which equals animationPeriod.  For a hyperbolic flyby, animationPeriod
    // equals the time span computed in doASliderOnInput(). t is incremented
    // evenly.  Another way might be to have more data points where nu changes
    // the fastest around periapse

    // see Bate p. 206 for first guess of x
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
    // near 1 (parabolic).  The variable eMinHyperbola is the
    // extreme lower limit for hyperbolic orbits and its value for the
    // tests was set to 1.02.  If you reduce eMinHyperbola, you will 
    // certainly need to increase the maximum iterations for i but
    // at the expense of computer performance
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

      // break out of the loop if "close enough", i is usually way below its max
      if (Math.abs(t - tn) < 0.001){
        break;
      }

      // if (i>7){
      //   console.log('i: ',i,'x: ',x, 'z: ',z, 'c: ',c, 's: ',s, 'tn: ',tn, 'dtdx: ',dtdx);
      // }
    }
    
    // Bate pp. 201-2
    univPoint = new Object();
    univPoint.t = t;
    f = 1 - x*x*c/r0;
    g = t - x*x*x*s/sqrtMuCanonical;
    univPoint.f = f;
    univPoint.g = g;
    // below, r is computed under the assumption that r0 and v0 are
    // at the periapse, which is mentioned earlier
    rx = f*rp;
    ry = g*sqrtMuOverP*(e + 1);
    r = Math.sqrt(rx*rx + ry*ry);
    univPoint.nu = Math.atan2(ry, rx)/piOver180;
    univPoint.fdot = sqrtMuCanonical*x*(z*s - 1)/(r0*r);
    univPoint.gdot = 1 - x*x*c/r;
    
    //(f*univPoint.gdot - 1)/g;
    universalArray.push(univPoint);

    // console.log(f*univPoint.gdot - g*univPoint.fdot);
  }

  universalArray[0].nu = -180;//set the first one to -180 because atan2 makes it +180
  univPoint = {...universalArray[0]};
  universalArray.push(univPoint);//make the last one equal the first one
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
  planetRotationPeriodSeconds = 3600*theCB.srp;
  muDisplay.innerHTML = `${Number(+theCB.mu*1e6).toExponential(6).toString()} km&sup3;/s&sup2;`;//GM
  radiusDisplay.innerHTML = `${theCB.radius} km`;//radius
  vescDisplay.innerHTML = `${theCB.vesc} km/s`;//escape velocity from surface
  aCBDisplay.innerHTML = `${theCB.a} AU`;//semimajor axis
  eCBDisplay.innerHTML = `${theCB.e}`;//orbital eccentricity
  iDisplay.innerHTML = `${theCB.i}&deg;`;//orbital inclination
  OmegaDisplay.innerHTML = `${theCB.Om}&deg;`;//longitude of ascending node
  omegaDisplay.innerHTML = `${theCB.om}&deg;`;//longitude of perihelion
  omt.setMuIndex(theCB.id);

  // START OF UNCERTAIN SECTION
  const temp1 = sliderEcanChange;
  const temp2 = sliderAcanChange;
  doESliderOnInput(+eSlider.value);
  doASliderOnInput(+aSlider.value);
  sliderEcanChange = temp1;
  sliderAcanChange = temp2;
  rp = Number(a*(1-e));
  ra = Number(a*(1+e));
  vp = Math.sqrt((muCanonical/a)*((1+e)/(1-e)));
  h = rp*vp;
  // doNuSliderOnInput(nuDegrees);
  // handlePeriapseCheck();
  // END Of UNCERTAIN SECTION

  doTwoSunOptionChoice();
}

muMenu.addEventListener('change', () => {
  centralBody = muMenu.value;
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

centralBodyTransparencySlider.oninput = function(){
  setCentralBodyTransparency(this.value);
}

centralBodyTransparencySlider.onpointerup = function(){
  setCentralBodyTransparency(this.value);
  replaceAerovisualizerData('centralBodyTransparency',this.value);
  saveToLocalStorage();
}

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

toggleConicSectionButton.addEventListener('click', () => {
  conicSection = conicSection === 'ellipse' ? 'hyperbola' : 'ellipse';

  if (conicSection === 'ellipse'){
    toggleConicSectionButton.innerHTML = 'ELLIPSE&nbsp;/&nbsp;hyperbola';
  }else{
    toggleConicSectionButton.innerHTML = 'ellipse&nbsp;/&nbsp;HYPERBOLA';
  }

  sliderEcanChange = false;
  sliderAcanChange = false;
  doESliderOnInput(+eSlider.value);
  doASliderOnInput(+aSlider.value);
  rp = Number(a*(1-e));
  ra = Number(a*(1+e));
  vp = Math.sqrt((muCanonical/a)*((1+e)/(1-e)));
  h = rp*vp;
  doNuSliderOnInput(nuDegrees);
  handlePeriapseCheck();
  displayNumerical();
  replaceAerovisualizerData('conic-section',conicSection);
  saveToLocalStorage();
});

const handlePeriapseCheck = function(){
  periapseTooSmall = rp < cbRadius ? true : false;

  if (periapseTooSmall === false){
    periapseWarning.innerHTML = '&nbsp';
    muButton.style.backgroundColor = "#5555ff";
    aeButton.style.backgroundColor = "#5555ff";
    orientationButton.style.backgroundColor = "#5555ff";
    rvButton.style.backgroundColor = "#5555ff";
    numericalButton.style.backgroundColor = "#5555ff";
    mainReturnButton.style.backgroundColor = "#5555ff";
    toggleConicSectionButton.style.backgroundColor = "#5555ff";
    prefsButton.style.backgroundColor = "#5555ff";
    infoButton.style.backgroundColor = "#5555ff";

    if (!periapseLocked){
      lockPeriapseButton.style.backgroundColor = "#5555ff";
    }

    if (!apoapseLocked){
      lockApoapseButton.style.backgroundColor = "#5555ff";
    }
  }else{
    periapseWarning.innerHTML = 'PERIAPSE TOO SMALL';
    muButton.style.backgroundColor = 'red';
    aeButton.style.backgroundColor = 'red';
    orientationButton.style.backgroundColor = 'red';
    rvButton.style.backgroundColor = 'red';
    numericalButton.style.backgroundColor = 'red';
    mainReturnButton.style.backgroundColor = 'red';
    toggleConicSectionButton.style.backgroundColor = 'red';
    prefsButton.style.backgroundColor = 'red';
    infoButton.style.backgroundColor = 'red';
    lockPeriapseButton.style.backgroundColor = 'red';
    lockApoapseButton.style.backgroundColor = 'red';
  }
}

const handleInfoMenuChoice = function(choice){
  switch (choice){
    case 'info-intro': //Introduction
      infoText.innerHTML = `<p class="p-normal">The purpose of Aerovisualizer is to 
      assist in teaching or reinforcing concepts in aerospace engineering by presenting 
      them in interesting and engaging ways.  Subjects are displayed as 2D and 3D 
      animations to complement the dry equations found in textbooks and online.  Controls
      are also provided to manipulate the displays.</p>
      
      <p class="p-normal"><em>Aerovisualizer - Orbital Mechanics</em> focuses on, well, orbital 
      mechanics.  Set the values of the orbital elements and click the play button to start 
      the animation.  It is assumed that you have taken or are currently taking a course in this 
      topic.</p>`;
      break;

    case 'info-how-to-use': //how to use aerovisualizer
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
      Data of interest appear, including &mu;.</p>
      <p class="p-normal">The sun has two menu choices.  One sets the canonical distance unit 
      (CDU) equal to the sun's radius.  The other sets it equal to 1 astronomical unit (AU) to 
      allow for greater distances from the sun.</p>
      `;
      break;

    case 'info-a-and-e':
      infoText.innerHTML = `
      <p class="p-normal">Click <em>a&nbsp;e</em>.  Use the slider controls to set the 
      <em>semi-major axis (a)</em> and the <em>orbital eccentricity (e)</em>.  The 
      displayed orbit changes in accordance with the sliders.  If the orbit intersects  
      the central body, the buttons change to red.</p>
      <p class="p-normal">The value of 'a' is displayed in canonical 
      distance units (CDU).  Its range is 1 to 60 for elliptical orbits and -1 to -60 
      for hyperbolic orbits.</p>
      <p class="p-normal">The value of 'e' is displayed and ranges from 0 to 0.98 for 
      elliptical orbits and 1.02 to 5 hyperbolic orbits.  Nearly parabolic orbits (e~=1) 
      are avoided.</p>
      <p class="p-normal">If you click the buttons labeled 'lock periapse' or 'lock 
      apoapse', Aerovisualizer attempts to keep those values constant while you move 
      the sliders.</p>
      `;
      break;

    case 'info-Omega-i-omega':
      infoText.innerHTML = `
      <p class="p-normal">Click <em>&Omega;&nbsp;i&nbsp;&omega;</em>.  Use the slider 
      controls to set the orbital elements the <em>longitude of the ascending node (&Omega;)</em>, the 
      <em>orbital inclination (i)</em>, and the <em>argument of periapsis (&omega;)</em>.  Their values are displayed in degrees next to their respective 
      sliders.  The displayed orbit changes in accordance with the sliders.  Use the 
      buttons to set the values to zero.</p>
      `;
      break;

    case 'info-nu':
      infoText.innerHTML = `
      <p class="p-normal">Click <em>&nu;</em>.  Use the slider 
      control to set the <em>true anomaly (&nu;)</em> .  The true anomaly is displayed in 
      degrees as is the time since periapse passage.  Various vectors change in accordance 
      with the slider.  Use the button to set &nu; to zero.  Choose the time scale 
      from the menu.</p>
      `;
      break;

    case 'info-numerical-1':
      infoText.innerHTML = `<p class="p-normal">Click <em>1 2 3</em> and choose display 
      option <em>1</em> to show the following information:</p>
      
      <p class="p-normal">time after periapse (t), orbital period (TP), true anomaly (&nu;), 
      eccentric anomaly (E), hyperbolic anomaly (F), mean anomaly (M), mean motion (n), 
      semi-major axis (a), orbital eccentricity (e), longitude of the ascending node 
      (&Omega;), orbital inclination (i), argument of periapsis (&omega;), semi-latus 
      rectum (P), specific angular momentum (h), specific energy (energy), velocity of 
      circular satellite (vcs), escape velocity (vesc), and the Q parameter (Q).
      </p>
      <p class="p-normal">Click <em>units</em> to switch between canonical and metric 
      units.</p>`;
      break;

    case 'info-numerical-2-3':
      infoText.innerHTML = `<p class="p-normal">Click <em>1 2 3</em> and choose display 
      option <em>2</em> to display the <em>r</em> and <em>v</em> vectors in the 
      IJK, PQW, and UVW coordinate frames.  The IJK frame is an inertial frame such as 
      the geocentric-equatorial frame or the heliocentric-ecliptic frame.  The 
      PQW frame is the perifocal frame.  The UVW frame is described in sources such as 
      "Fundamentals of Astrodynamics" by Bate, Mueller, and White.</p>
      <p class="p-normal">Click <em>units</em> to switch between canonical and metric 
      units.</p>
      <p class="p-normal">Choose display option <em>3</em> to display the direction 
      cosine matrices from the PQW frame to the IJK frame and from the UVW frame to 
      the PQW frame.</p>`;
      break;

    case 'info-ellipse-hyperbola':
      infoText.innerHTML = `<p class="p-normal">Click <em>ellipse / hyperbola</em> to toggle between the 
      two types of orbits.  If the buttons suddenly appear red, click the 'a e' button and 
      adjust the semi-major axis and/or the orbital eccentricity to increase the 
      periapse.</p>`;
      break;

    case 'info-prefs-main':
      infoText.innerHTML = `<p class="p-normal">Click <em>preferences</em>.  Another menu 
      appears letting you choose from several preferences categories.</p>`;
      break;

    case 'info-prefs-general':
      infoText.innerHTML = `<p class="p-normal">Under <em>general preferences</em>, use the slider to set the 
      transparency of the sun/moon/planet.  Use the checkbox to specify whether or not to show 
      the out of plane (W) vectors of both the PWQ frame and the UVW frame.</p>`;
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
      please contact us at github.com/eastmanrj/aerovisualizer.</p>

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
          case 'timeScaleMenuChoice':
            timeScaleMenuChoice  = o.value;
            break;
          case 'centralBodyTransparency':
            centralBodyTransparency  = o.value;
            break;
          case 'showOutOfPlaneVectors':
            showOutOfPlaneVectors  = o.value;
            break;
      }
    }
  }

  if (omt === null){
    omt = new OrbitalMechThings(scene, camera);
  }

  muMenu.value = centralBody;
  handlePlanetChange();

  eSlider.value = +eSl;
  aSlider.value = +aSl;
  doESliderOnInput(+eSl);
  doASliderOnInput(+aSl);
  rp = Number(a*(1-e));
  ra = Number(a*(1+e));
  vp = Math.sqrt((muCanonical/a)*((1+e)/(1-e)));
  h = rp*vp;
  handlePeriapseCheck();

  lanSlider.value = lanDegrees;
  incSlider.value = incDegrees;
  aopSlider.value = aopDegrees;
  handleOrientationOnInput('lan',true);
  handleOrientationOnInput('inc',true);
  handleOrientationOnInput('aop');

  timeScaleMenu.value = timeScaleMenuChoice;
  doTimeScaleMenu();

  nuSlider.value = nuDegrees;
  computeUniversal();
  doUniversalPointCalculations(1);
  doNuSliderOnInput(nuDegrees);
  centralBodyTransparencySlider.value = centralBodyTransparency;
  setCentralBodyTransparency(centralBodyTransparency);

  if (conicSection === 'ellipse'){
    toggleConicSectionButton.innerHTML = 'ELLIPSE&nbsp;/&nbsp;hyperbola';
  }else{
    toggleConicSectionButton.innerHTML = 'ellipse&nbsp;/&nbsp;HYPERBOLA';
  }

  handleMainPrefs(mainPrefsMenu.value);
}

const completeInitialization = function(continueAnimation = true) {
  // the reason for this is that the OrbitalMechThings.js file contains
  // the function _constructLabels() which contains a FontLoader 
  // object called loader that creates code that runs asynchronously.
  // Once omt.constructionComplete is true, we can complete
  // our initialization

  if (continueAnimation && !(omt.constructionComplete)) {
    requestAnimationFrame(completeInitialization);
  }
  
  if (omt.constructionComplete){
    handleMainButtons('numerical');//'mu' <-- set back to this
    
    camera.aspect = 1;
    camera.updateProjectionMatrix();

    cpx = camera.position.x;
    cpy = camera.position.y;
    cpz = camera.position.z;

    renderer.setSize(threeDWorld.clientWidth, threeDWorld.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // defaultButton.style.display = 'none';
    // generalPrefButton.style.display = 'none';
    // infoElements.style.display = 'none';
    // infoMenu.value = 'info-intro';

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

    omt.needsRefresh = true;
  }
};

const doPlayPause = function(){
  //icons came from tabler-icons.io
  playing = playing ? false : true;

  if (playing && needToComputeUniversal){
    computeUniversal();
    doUniversalPointCalculations(1);
  }

  playPauseButton.innerHTML = playing ? `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-pause-filled" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
  <path d="M9 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" stroke-width="0" fill="currentColor"></path>
  <path d="M17 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" stroke-width="0" fill="currentColor"></path>
</svg>` : `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-play-filled" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
  <path d="M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z" stroke-width="0" fill="currentColor"></path>
</svg>`;
  // sdo.realTime = 0;
  // sdo.simulationTime = 0;
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
    // sdo.realTime = 0;
    // sdo.simulationTime = 0;
    clock.getDelta();
  }
}

resetButton.addEventListener('click', () => {
  doNuSliderOnInput(+(nuSlider.value));
  doUniversalPointCalculations(1);
  omt.resetPlanetRotationParameters();
});

const doUniversalPointCalculations = function(opt=0){
  let p = false;

  if (!universalArray){
    return;
  }

  // option 0: set the current values to the next ones and
  // then compute the next ones
  // option 1: compute both the current values and the next ones 
  if (opt === 0){
    let safety = 0;

    while (timeAfterPeriapseInSeconds > timeAfterPeriapseInSeconds1 && safety<10){
      p = true;
      safety++;
      universalArrayIndex0 = universalArrayIndex1;
      universalArrayIndex1 = (universalArrayIndex0 + 1)%universalArraySize;
      timeAfterPeriapseInSeconds0 = universalArray[universalArrayIndex0].t*ctu;
      timeAfterPeriapseInSeconds1 = universalArray[universalArrayIndex1].t*ctu;
      
      if (universalArrayIndex1 === 0){
        universalArrayIndex0 = universalArrayIndex1;
        universalArrayIndex1 = (universalArrayIndex0 + 1)%universalArraySize;
        timeAfterPeriapseInSeconds0 = universalArray[universalArrayIndex0].t*ctu;
        timeAfterPeriapseInSeconds1 = universalArray[universalArrayIndex1].t*ctu;
        timeAfterPeriapseInSeconds = timeAfterPeriapseInSeconds0;
        timeAfterPeriapse = timeAfterPeriapseInSeconds/ctu;
        nuDegrees = -180;
        nu = nuDegrees*piOver180;
        // x0 = universalArray[universalArrayIndex0%universalArraySize].f*rp;
        // y0 = universalArray[universalArrayIndex0%universalArraySize].g*sqrtMuOverP*(e + 1);
        // vx0 = universalArray[universalArrayIndex0%universalArraySize].fdot*rp;
        // vy0 = universalArray[universalArrayIndex0%universalArraySize].gdot*sqrtMuOverP*(e + 1);
        // timeAfterPeriapse = timeAfterPeriapse - animationPeriod*360/361;
        // timeAfterPeriapseInSeconds = timeAfterPeriapseInSeconds - (animationPeriod*ctu*360/361);
      }

      x0 = px;
      y0 = py;
      vx0 = vx;
      vy0 = vy;

      if (p){
        let x1 = universalArray[universalArrayIndex1%universalArraySize].f*rp;
        let y1 = universalArray[universalArrayIndex1%universalArraySize].g*sqrtMuOverP*(e + 1);
        let vx1 = universalArray[universalArrayIndex1%universalArraySize].fdot*rp;
        let vy1 = universalArray[universalArrayIndex1%universalArraySize].gdot*sqrtMuOverP*(e + 1);
        let deltaTime = timeAfterPeriapseInSeconds1 - timeAfterPeriapseInSeconds0;
        nu0 = universalArray[universalArrayIndex0%universalArraySize].nu;
        nu1 = universalArray[universalArrayIndex1%universalArraySize].nu;
        dpxdt = (x1 - x0)/deltaTime;
        dpydt = (y1 - y0)/deltaTime;
        dvxdt = (vx1 - vx0)/deltaTime;
        dvydt = (vy1 - vy0)/deltaTime;
        dnudt = (nu1 - nu0)/deltaTime;
      }
    }
  }else{
    p = true;
    doNuSliderOnInput(nuDegrees);
    // computeKeplerAndTimeAfterPeriapse();
    x0 = universalArray[universalArrayIndex0%universalArraySize].f*rp;
    y0 = universalArray[universalArrayIndex0%universalArraySize].g*sqrtMuOverP*(e + 1);
    vx0 = universalArray[universalArrayIndex0%universalArraySize].fdot*rp;
    vy0 = universalArray[universalArrayIndex0%universalArraySize].gdot*sqrtMuOverP*(e + 1);
    if (p){
      let x1 = universalArray[universalArrayIndex1%universalArraySize].f*rp;
      let y1 = universalArray[universalArrayIndex1%universalArraySize].g*sqrtMuOverP*(e + 1);
      let vx1 = universalArray[universalArrayIndex1%universalArraySize].fdot*rp;
      let vy1 = universalArray[universalArrayIndex1%universalArraySize].gdot*sqrtMuOverP*(e + 1);
      let deltaTime = timeAfterPeriapseInSeconds1 - timeAfterPeriapseInSeconds0;
      nu0 = universalArray[universalArrayIndex0%universalArraySize].nu;
      nu1 = universalArray[universalArrayIndex1%universalArraySize].nu;
      dpxdt = (x1 - x0)/deltaTime;
      dpydt = (y1 - y0)/deltaTime;
      dvxdt = (vx1 - vx0)/deltaTime;
      dvydt = (vy1 - vy0)/deltaTime;
      dnudt = (nu1 - nu0)/deltaTime;
    }
  }
}

const animate = function(continueAnimation = true) {
  if (continueAnimation) {
    requestAnimationFrame(animate);
  }
  
  orbitControls.update();

  if (cpx !== camera.position.x && cpy !== camera.position.y && cpz !== camera.position.z){
    cpx = camera.position.x;
    cpy = camera.position.y;
    cpz = camera.position.z;
    omt.needsRefresh = true;
  } 

  renderer.clear();
  renderer.render(scene, camera);

  if (playing){
    const deltaT = timeScale*clock.getDelta();
    timeAfterPeriapseInSeconds += deltaT;// deltaT for 60 fps is 0.01666
    timeAfterPeriapse = timeAfterPeriapseInSeconds/ctu;
    doUniversalPointCalculations();

    //do the linear interpolation between computed points on the ellipse or
    //hyperbola.  The conic sections are approximated as multi-sided
    //polygons, and thus positions and velocities are affected by this.  To
    //reduce the error, increase the universalArraySize variable
    px = x0 + dpxdt*(timeAfterPeriapseInSeconds - timeAfterPeriapseInSeconds0);
    py = y0 + dpydt*(timeAfterPeriapseInSeconds - timeAfterPeriapseInSeconds0);
    vx = vx0 + dvxdt*(timeAfterPeriapseInSeconds - timeAfterPeriapseInSeconds0);
    vy = vy0 + dvydt*(timeAfterPeriapseInSeconds - timeAfterPeriapseInSeconds0);
    nuDegrees = nu0 + dnudt*(timeAfterPeriapseInSeconds - timeAfterPeriapseInSeconds0);
    nu = nuDegrees*piOver180;
    // console.log('animate nu0=',nu0,' nuDegrees=',nuDegrees,' nu=',nu,' dnudt=',dnudt);

    // if (universalArrayIndex0 > 5 && universalArrayIndex0 < 9){
    //   console.log('xxxxx',timeAfterPeriapseInSeconds, universalArrayIndex0, universalArrayIndex1, timeAfterPeriapseInSeconds0, timeAfterPeriapseInSeconds1, x0, dpxdt, px, py);
    // }
    omt.setR(px, py, 0, a);
    omt.setV(vx, vy, 0);
    omt.rotatePlanet2(timeAfterPeriapseInSeconds, planetRotationPeriodSeconds, animationPeriod*ctu);
    doNuAndTimeDisplay();

    if (numericalDisplayIsOccurring){
      displayNumerical();
    }

    omt.needsRefresh = true;
  }

  omt.refresh();// refresh only happens if needsRefresh === true
};

let data = getFromLocalStorage();

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

/*
function exit(status){
  // http://kevin.vanzonneveld.net
  // +   original by: Brett Zamir (http://brettz9.blogspot.com)
  // +      input by: Paul
  // +   bugfixed by: Hyam Singer (http://www.impact-computing.com/)
  // +   improved by: Philip Peterson
  // +   bugfixed by: Brett Zamir (http://brettz9.blogspot.com)
  // %        note 1: Should be considered expirimental. Please comment on this function.
  // *     example 1: exit();
  // *     returns 1: null

  var i;

  if (typeof status === 'string'){
      alert(status);
  }

  window.addEventListener('error', function (e) {e.preventDefault();e.stopPropagation();}, false);

  var handlers = [
      'copy', 'cut', 'paste',
      'beforeunload', 'blur', 'change', 'click', 'contextmenu', 'dblclick', 'focus', 'keydown', 'keypress', 'keyup', 'mousedown', 'mousemove', 'mouseout', 'mouseover', 'mouseup', 'resize', 'scroll',
      'DOMNodeInserted', 'DOMNodeRemoved', 'DOMNodeRemovedFromDocument', 'DOMNodeInsertedIntoDocument', 'DOMAttrModified', 'DOMCharacterDataModified', 'DOMElementNameChanged', 'DOMAttributeNameChanged', 'DOMActivate', 'DOMFocusIn', 'DOMFocusOut', 'online', 'offline', 'textInput',
      'abort', 'close', 'dragdrop', 'load', 'paint', 'reset', 'select', 'submit', 'unload'
  ];

  function stopPropagation (e){
      e.stopPropagation();
      // e.preventDefault(); // Stop for the form controls, etc., too?
  }

  for (i=0; i < handlers.length; i++){
      window.addEventListener(handlers[i], function (e) {stopPropagation(e);}, true);
  }

  if (window.stop){
      window.stop();
  }

  throw '';
}
*/
