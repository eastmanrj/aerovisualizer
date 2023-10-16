import * as THREE from '../../../../node_modules/three/build/three.module.js';
import OrbitalMechThings from './OrbitalMechThings.js';
import {OrbitControls} from './OrbitControls.js';

const piOver180 = Math.PI / 180;
let scene, camera, renderer;
let background = null;
const cameraRadius = 5;
let nominalCameraPos = new THREE.Vector3(cameraRadius/4, -cameraRadius, cameraRadius/2);
nominalCameraPos.normalize();
nominalCameraPos.multiplyScalar(cameraRadius);
let cpx, cpy, cpz;// camera position
const centerOfRotation = [0, 0, 0];
let clock = null;
let omt = null;//"vectors object" (handles all of the vectors)
let orbitControls = null;//in this context, "orbit" refers to the camera
let playing = false;

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
const defaultRColor = 'blue';
const defaultCoordinateFrameChoice = 'hAndE';

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
  {name:'true-anomaly', value:defaultNu}
  // {name:'vectorSize', value:defaultVectorSize},
  // {name:'rColor', value:defaultRColor},
];

let centralBody = defaultCentralBody;
let conicSection = defaultConicSection;
let a = defaultA;
let e = defaultE;
let lanDegrees = defaultLan;
let lan = lanDegrees*piOver180; // longitude of the ascending node
let incDegrees = defaultInclination;
let inc = incDegrees*piOver180;// inclination
let aopDegrees = defaultAop;
let aop = aopDegrees*piOver180;// argument of periapsis
let nuDegrees = defaultNu;
let nu = nuDegrees*piOver180;// true anomaly

let p;//parameter (semi-latus rectum)
let delta = defaultDelta;//turning angle for hyperbolic orbits
let rp = a*(1-e);//r vector magnitude at periapse

const aMin = 1;
const aMax = 60;
const aRange = aMax - aMin;
const eMinEllipse = 0;
const eMaxEllipse = 0.95;
const eEllipseRange = eMaxEllipse - eMinEllipse;
const eMinHyperbola = 1.05;
const eMaxHyperbola = 5;
const eHyperbolaRange = eMaxHyperbola - eMinHyperbola;
const aSliderRange = 100;
const eSliderRange = 100;

let coordinateFrameChoice = defaultCoordinateFrameChoice;
// let vectorSize = defaultVectorSize;
// let rColor = defaultRColor;

const threeDWorld = document.getElementById('threeD-world');

const muButton = document.getElementById('mu-btn');
const aeButton = document.getElementById('a-e-btn');
const orientationButton = document.getElementById('orientation-btn');
const rvButton = document.getElementById('r-v-btn');
const numericalButton = document.getElementById('numerical-btn');

const prefsButton = document.getElementById('preferences-btn');
const infoButton = document.getElementById('info-btn');
const infoReturnButton = document.getElementById('info-return-btn');

const muMenu = document.getElementById('central-body-menu');

const conicSectionMenu = document.getElementById('conic-section-menu');
const aDisplay = document.getElementById('a-display');    
const eDisplay = document.getElementById('e-display');    
const aSlider = document.getElementById('a-slider');
const eSlider = document.getElementById('e-slider');
const defaultAButton = document.getElementById('default-a-btn');
const defaultEButton = document.getElementById('default-e-btn');

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
const playPauseButton = document.getElementById('play-pause-btn');
const resetButton = document.getElementById('reset-btn');

// const infoMenu = document.getElementById('info-menu');
// const infoText = document.getElementById('info-text');

// const infoElements = document.getElementById('info-elements');
const muElements = document.getElementById('central-body-elements');
const aeElements = document.getElementById('a-e-elements');
const orientationElements = document.getElementById('orientation-elements');
const rvElements = document.getElementById('r-v-elements');
const numericalElements = document.getElementById('numerical-elements');
const prefsElements = document.getElementById('prefs-elements');

const muDisplay = document.getElementById('mu');
const aCBDisplay = document.getElementById('a');
const eCBDisplay = document.getElementById('e');
const iDisplay = document.getElementById('i');
const OmegaDisplay = document.getElementById('Omega');
const omegaDisplay = document.getElementById('omega');
const radiusDisplay = document.getElementById('radius');
const vescDisplay = document.getElementById('vesc');
const muUnitsDisplay = document.getElementById('mu-units');
const aUnitsDisplay = document.getElementById('a-units');
const eUnitsDisplay = document.getElementById('e-units');
const iUnitsDisplay = document.getElementById('i-units');
const OmegaUnitsDisplay = document.getElementById('Omega-units');
const omegaUnitsDisplay = document.getElementById('omega-units');
const radiusUnitsDisplay = document.getElementById('radius-units');
const vescUnitsDisplay = document.getElementById('vesc-units');

const coordinateFrameMenu = document.getElementById('coordinate-frame-menu');
coordinateFrameMenu.value = coordinateFrameChoice;

// const generalElements = document.getElementById('general-elements');
// const defaultElements = document.getElementById('default-elements');

// const vectorSizeSlider = document.getElementById('vector-size');
// const rColorMenu = document.getElementById('r-color-menu');

/*
name     = name
m        = mass (x1e24 kg)
radius   = Volumetric mean radius (km)
gravSurf = Surface gravity (mean) (m/s^2)
vesc     = Escape velocity (km/s)
mu       = GM (x1e6 km^3/s^2)
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

sun, 1.98847E+06, 696340, x, 615, 1.32712440018E+11
{name:'sun', radius:696000},

G, 6.67430E-11, m3/kg/s2
G, 39.478, AU3/M(sun)/yr2
G, 6.67430E-20, km3/kg/s2

1.495979E+11, m/AU
1.495979E+08, km/AU

moon
Trev = Revolution period (days) 27.3217
incEcl = Inclination to ecliptic (deg) 5.145
{name:'moon', m:0.07346, radius:1737.4, gravSurf:1.62, vesc:2.38,
 mu:0.0049, akm:0.3844, Tsid:x, perihel:0.3633, aphel:0.4055, Tsyn:29.53,
  vmean:1.022, vmax:1.082, vmin:0.97, inc:18.28, -28.58, srp:0.0549, 
  daylen:655.72, obliqu:x, incEqu:6.68, a:x,  e:0.002569555, i:0.0554, 
  Om:5.16, om:125.08, ml:318.15, 135.27, 
*/

let centralBodyData = [
  {name:'sun', id:0},
  {name:'moon', id:1},
  {name:'Mercury', id:2, m:0.3301, radius:2439.7, gravSurf:3.7, 
  vesc:4.3, mu:0.022032, Tsid:87.969, perihel:46., 
  aphel:69.818, Tsyn:115.88, vmean:47.36, vmax:58.97, vmin:38.86, 
  srp:1407.6, daylen:4222.6, obliqu:0.034, incEqu:0.034, 
  a:0.38709893, e:0.20563069, i:7.00487, Om:48.33167, 
  om:77.45645, ml:252.25084},
  {name:'Venus', id:3, m:4.8673, radius:6051.8, gravSurf:8.87, 
  vesc:10.36, mu:0.32486, Tsid:224.701, perihel:107.48, 
  aphel:108.941, Tsyn:583.92, vmean:35.02, vmax:35.26, vmin:34.78, 
  srp:-5832.6, daylen:2802., obliqu:177.36, incEqu:2.64, 
  a:0.72333199, e:0.00677323, i:3.39471, Om:76.68069, 
  om:131.53298, ml:181.97973},
  {name:'Earth', id:4, m:5.9722, radius:6371, gravSurf:9.82, 
  vesc:11.186, mu:0.3986004418, Tsid:365.256, perihel:147.095, 
  aphel:152.1, Tsyn:0, vmean:29.78, vmax:30.29, vmin:29.29, 
  srp:23.9345, daylen:24., obliqu:23.44, incEqu:23.44, 
  a:1.00000011, e:0.01671022, i:0.00005, Om:-11.26064, 
  om:102.94719, ml:100.46435},
  {name:'Mars', id:5, m:0.64169, radius:3389.5, gravSurf:3.73, 
  vesc:5.03, mu:0.042828, Tsid:686.98, perihel:206.65, 
  aphel:249.261, Tsyn:779.94, vmean:24.08, vmax:26.5, vmin:21.97, 
  srp:24.6229, daylen:24.6597, obliqu:25.19, incEqu:25.19, 
  a:1.52366231, e:0.09341233, i:1.85061, Om:49.57854, 
  om:336.04084, ml:355.45332},
  {name:'Jupiter', id:6, m:1898.13, radius:69911, gravSurf:25.92, 
  vesc:59.5, mu:126.687, Tsid:4332.59, perihel:740.595, 
  aphel:816.363, Tsyn:398.88, vmean:13.06, vmax:13.72, vmin:12.44, 
  srp:9.925, daylen:9.9259, obliqu:3.13, incEqu:3.13, 
  a:5.20336301, e:0.04839266, i:1.3053, Om:100.55615, 
  om:14.75385, ml:34.40438},
  {name:'Saturn', id:7, m:568.32, radius:58232, gravSurf:11.19, 
  vesc:35.5, mu:37.931, Tsid:10759.22, perihel:1357.55, 
  aphel:1506.53, Tsyn:378.09, vmean:9.67, vmax:10.14, vmin:9.14, 
  srp:10.656, daylen:10.656, obliqu:26.73, incEqu:undefined, 
  a:9.53707032, e:0.0541506, i:2.48446, Om:113.71504, 
  om:92.43194, ml:49.94432},
  {name:'Uranus', id:8, m:86.811, radius:25362, gravSurf:9.01, 
  vesc:21.3, mu:5.794, Tsid:30685.40, perihel:2732.70, 
  aphel:3001.39, Tsyn:369.66, vmean:6.79, vmax:7.13, vmin:6.49, 
  srp:-17.24, daylen:17.24, obliqu:97.77, incEqu:82.23, 
  a:19.19126393, e:0.04716771, i:0.76986, Om:74.22988, 
  om:170.96424, ml:313.23218},
  {name:'Neptune', id:9, m:102.409, radius:24622, gravSurf:11.27, 
  vesc:23.5, mu:6.8351, Tsid:60189.00, perihel:4471.05, 
  aphel:4558.86, Tsyn:367.49, vmean:5.45, vmax:5.47, vmin:5.37, 
  srp:16.11, daylen:16.11, obliqu:28.32, incEqu:28.32, 
  a:30.06896348, e:0.00858587, i:1.76917, Om:131.72169, 
  om:44.97135, ml:304.88003}
];

const replaceAerovisualizerData = function(name, value){
  aerovisualizerData.forEach(o => {
    if (o.name === name){
      o.value = value;
    }});
}

const saveToLocalStorage = function(){
  localStorage.setItem('aerovisualizerData', JSON.stringify(aerovisualizerData));
}

const getFromLocalStorage = function(){
  const data = JSON.parse(localStorage.getItem('aerovisualizerData'));
  return data;
}

// const setVector = function(opt, mag, x, y, z){
//   const xyz = new THREE.Vector3(x, y, z);
//   xyz.normalize();
//   xyz.multiplyScalar(mag);

//   switch (opt){
//     case 1:
//       r.copy(xyz);
//       omt.setR(xyz.x, xyz.y, xyz.z);
//       break;
//     case 2:
//       h.copy(xyz);
//       omt.setH(xyz.x, xyz.y, xyz.z);
//       break;
//     case 3:
//       e.copy(xyz);
//       omt.setE(xyz.x, xyz.y, xyz.z);
//       break;
//   }
// }

// const sendVectorData = function(){
//   return [this._r, this._h, this._h, this._quat];
// }

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

const handleMainButtons = function(button){
  muButton.disabled = false;
  aeButton.disabled = false;
  orientationButton.disabled = false;
  rvButton.disabled = false;
  numericalButton.disabled = false;
  prefsButton.disabled = false;
  muElements.style.display = 'none';
  aeElements.style.display = 'none';
  orientationElements.style.display = 'none';
  rvElements.style.display = 'none';
  numericalElements.style.display = 'none';
  prefsElements.style.display = 'none';

  switch (button){
    case 'mu':
      muElements.style.display = 'grid';
      muButton.disabled = true;
      break;
    case 'aeP':
      aeElements.style.display = 'grid';
      aeButton.disabled = true;
      break;
    case 'orientation':
      orientationElements.style.display = 'grid';
      orientationButton.disabled = true;
      break;
    case 'rv':
      rvElements.style.display = 'grid';
      rvButton.disabled = true;
      break;
    case 'numerical':
      numericalElements.style.display = 'grid';
      numericalButton.disabled = true;
      break;
    case 'prefs':
      prefsElements.style.display = 'grid';
      prefsButton.disabled = true;
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

const computeP = function(){
  // a > 0 and e < 1 for ellipses
  // a < 0 and e > 1 for hyperbolas
  // thus p is always positive
  p = a*(1 - e*e);
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

const doASliderOnInput = function(value){
  let c = aRange/(Math.log(aSliderRange+1));;
  let d = aMax;
  value = aSliderRange - value;
  a = d - c*Math.log(value+1);

  if (conicSection === 'hyperbola'){
    // a > 0 for ellipses, a < 0 for hyperbolas
    a = -a;
  }

  // a = value/aSliderRange*aRange + aMin;
  aDisplay.innerHTML = `a: ${Number(a).toFixed(2).toString()}`;
  computeP();
  rp = a*(1-e);
  omt.shapeOrbitCurve(a, e);
}

const doESliderOnInput = function(value){
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
      // c = eHyperbolaRange/(Math.exp(eSliderRange));
      // d = eMinHyperbola - c;
      // e = c*Math.exp(+this.value) + d;
      c = eHyperbolaRange/(Math.log(eSliderRange+1));
      d = eMaxHyperbola;
      e = d - c*Math.log(value+1);
      computeDelta();//hypberbolic turning angle
      // e = value/eSliderRange*eHyperbolaRange + eMinHyperbola;
      eDisplay.innerHTML = `e: ${Number(e).toFixed(3).toString()}`;
      break;
  }

  computeP();
  rp = a*(1-e);
  omt.shapeOrbitCurve(a, e);
}

aSlider.oninput = function(){
  doASliderOnInput(+this.value);
}

aSlider.onpointerup = function(){
  replaceAerovisualizerData('semimajor-axis',+this.value);
  saveToLocalStorage();
}

eSlider.oninput = function(){
  doESliderOnInput(+this.value);
}

eSlider.onpointerup = function(){
  replaceAerovisualizerData('eccentricity',+this.value);
  saveToLocalStorage();
}

defaultAButton.addEventListener('click', () => {
  aSlider.value = 0;
  doASliderOnInput(+aSlider.value);
  aDisplay.innerHTML = `a: ${a}`;
  rp = a*(1-e);
  omt.needsRefresh = true;
  replaceAerovisualizerData('semimajor-axis',+aSlider.value);
  saveToLocalStorage();
});

defaultEButton.addEventListener('click', () => {
  eSlider.value = 0;
  doESliderOnInput(+eSlider.value);
  eDisplay.innerHTML = `e: ${e}`;
  rp = a*(1-e);
  omt.needsRefresh = true;
  replaceAerovisualizerData('eccentricity',+eSlider.value);
  saveToLocalStorage();
});

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
    omt.computeRotation(lan, inc, aop);
    omt.shapeOrbitCurve(a, e);
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
  lan = 0;
  lanDegrees = 0;
  lanSlider.value = lanDegrees;
  lanDisplay.innerHTML = lanDegrees;
  omt.computeRotation(lan, inc, aop);
  omt.needsRefresh = true;
  replaceAerovisualizerData('longitude-of-ascending-node',0);
  saveToLocalStorage();
});

zeroIncButton.addEventListener('click', () => {
  inc = 0;
  incDegrees = 0;
  incSlider.value = incDegrees;
  incDisplay.innerHTML = incDegrees;
  omt.computeRotation(lan, inc, aop);
  omt.needsRefresh = true;
  replaceAerovisualizerData('inclination',0);
  saveToLocalStorage();
});

zeroAopButton.addEventListener('click', () => {
  aop = 0;
  aopDegrees = 0;
  aopSlider.value = aopDegrees;
  aopDisplay.innerHTML = aopDegrees;
  omt.computeRotation(lan, inc, aop);
  omt.needsRefresh = true;
  replaceAerovisualizerData('argument-of-periapsis',0);
  saveToLocalStorage();
});

const computeREllipse = function(){
  const r = p/(1 + e*Math.cos(nu));
  omt.setR(r*Math.cos(nu), r*Math.sin(nu), 0, a);
}

const computeRHyperbola = function(){
  // don't render the r vector when the true anomaly
  // is in a range such that r would point to the
  // wrong branch of the hyperbola.
  // do this if going from 0 to 360 -->
  // if (nu > (Math.PI + delta)/2 && nu < 1.5*Math.PI - delta/2){

  if (nu > (Math.PI + delta)/2 || nu < -(Math.PI + delta)/2){
    omt.setRVisible(false);
    return;
  }

  omt.setRVisible(true);
  const r = p/(1 + e*Math.cos(nu));
  omt.setR(r*Math.cos(nu), r*Math.sin(nu), 0, -a);
}

const doNuSliderOnInput = function(value){
  nuDegrees = value;
  nu = nuDegrees*piOver180;
  nuDisplay.innerHTML = `&nu;: ${Number(nuDegrees)}`;

  switch (conicSection){
    case 'ellipse':
      computeREllipse();
      break;
      
    case 'hyperbola':
      computeRHyperbola();
      break;
  }
}

nuSlider.oninput = function(){
  doNuSliderOnInput(+this.value);
}

nuSlider.onpointerup = function(){
  replaceAerovisualizerData('true-anomaly',nuDegrees);
  saveToLocalStorage();
}

zeroNuButton.addEventListener('click', () => {
  nu = 0;
  nuDegrees = 0;
  nuSlider.value = nuDegrees;
  nuDisplay.innerHTML = `true anomaly: ${Number(nuDegrees)}`;
  // omt.needsRefresh = true;

  localStorage.clear();//temporary
  location.reload();//temporary
  // temporary, add these back in!!!
  // replaceAerovisualizerData('true-anomaly',nuDegrees);
  // saveToLocalStorage();
});

// vectorSizeSlider.onpointerup = function(){
//   omt.setVectorSize(this.value);
//   replaceAerovisualizerData('vectorSize',this.value);
//   saveToLocalStorage();
// }

// const setRColor = function(color, save=false){
//   omt.setColor('r', color);

//   if (save){
//     replaceAerovisualizerData('rColor',color);
//   }
// }

// rColorMenu.addEventListener('change', () => {
//   rColor = rColorMenu.value;
//   setRColor(rColor, true);
//   saveToLocalStorage();
// });

// const toggleShowInfo = function(){
//   if (threeDWorld.style.display === 'none'){
//     threeDWorld.style.display = 'block';
//     prefsButton.style.display = 'block';
//     playPauseButton.style.display = 'block';
//     resetButton.style.display = 'block';
//     infoElements.style.display = 'none';
//     doWindowResizeOrOrientationChange();
//     handleMainButtons('numerical');
//   }else{
//     threeDWorld.style.display = 'none';
//     prefsButton.style.display = 'none';
//     playPauseButton.style.display = 'none';
//     resetButton.style.display = 'none';
//     infoElements.style.display = 'grid';
//     handleMainButtons('none');
//   }
// }

// infoButton.addEventListener('click', () => {
//   haltPlay();
//   toggleShowInfo();
// });

// infoReturnButton.addEventListener('click', () => {
//   toggleShowInfo();
// });

const handleMuChange = function(){
  const theCB = centralBodyData.find(x => x.name === centralBody);
  const cbIndex = Number(theCB.id);

  muDisplay.innerHTML = +theCB.mu*1e6;//GM
  aCBDisplay.innerHTML = theCB.a;//semimajor axis
  eCBDisplay.innerHTML = theCB.e;//orbital eccentricity
  iDisplay.innerHTML = theCB.i;//orbital inclination
  OmegaDisplay.innerHTML = theCB.Om;//longitude of ascending node
  omegaDisplay.innerHTML = theCB.om;//longitude of perihelion
  radiusDisplay.innerHTML = theCB.radius;//volumetric mean radius
  vescDisplay.innerHTML = theCB.vesc;//escape velocity
  muUnitsDisplay.innerHTML = ' km&sup3;/s&sup2;';
  aUnitsDisplay.innerHTML = ' AU';
  eUnitsDisplay.innerHTML = ' nd';
  iUnitsDisplay.innerHTML = ' &deg;';
  OmegaUnitsDisplay.innerHTML = ' &deg;';
  omegaUnitsDisplay.innerHTML = ' &deg;';
  radiusUnitsDisplay.innerHTML = ' km';
  vescUnitsDisplay.innerHTML = ' km/s';
  omt.setMuIndex(cbIndex);
}

muMenu.addEventListener('change', () => {
  centralBody = muMenu.value;
  handleMuChange();
  replaceAerovisualizerData('central-body',centralBody);
  saveToLocalStorage();
});

coordinateFrameMenu.addEventListener('change', () => {
  coordinateFrameChoice = coordinateFrameMenu.value;

  switch (coordinateFrameChoice){
    case 'hOnly':
      omt.showPQWFrame(false);
      omt.showH(true);
      omt.showE(false);
      break;

    case 'eOnly':
      omt.showPQWFrame(false);
      omt.showH(false);
      omt.showE(true);
      break;

    case 'hAndE':
      omt.showPQWFrame(false);
      omt.showH(true);
      omt.showE(true);
      break;
    
    case 'pqw':
      omt.showPQWFrame(true);
      omt.showE(false);
      omt.showH(false);
      break;

    case 'none':
      omt.showPQWFrame(false);
      omt.showE(false);
      omt.showH(false);
      break;
  }

  // saveToLocalStorage();
});

conicSectionMenu.addEventListener('change', () => {
  conicSection = conicSectionMenu.value;
  doASliderOnInput(+aSlider.value);
  doESliderOnInput(+eSlider.value);
  replaceAerovisualizerData('conic-section',conicSection);
  saveToLocalStorage();
});

// defaultDoResetButton.addEventListener('click', () => {
//   localStorage.clear();
//   location.reload();
// });

// prefsReturnButton.addEventListener('click', () => {
//   toggleShowPrefs();
// });

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
    // const tl = new THREE.TextureLoader();
}

const initTHREE = function() {
  scene = new THREE.Scene();
  clock = new THREE.Clock();
  clock.getElapsedTime();// sets 'oldTime'
  
  const ambientLight = new THREE.AmbientLight(0xffffff);
  scene.add(ambientLight);

  renderer = new THREE.WebGLRenderer({
    devicePixelRatio: window.devicePixelRatio,
    alpha: true,
  });

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
};

const createAndInitialize = function(data, camera){
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
            aSl  = o.value;
            break;
          case 'eccentricity':
            eSl  = o.value;
            break;
          case 'longitude-of-ascending-node':
            lanDegrees  = o.value;
            break;
          case 'inclination':
            incDegrees  = o.value;
            break;
          case 'argument-of-periapsis':
            aopDegrees  = o.value;
            break;
          case 'true-anomaly':
            nuDegrees  = o.value;
            break;
          // case 'rColor':
          //   rColor  = o.value;
          //   break;
          // case 'vectorSize':
          //   vectorSize  = o.value;
          //   break;
      }
    }
  }

  if (omt === null){
    omt = new OrbitalMechThings(scene, camera);
  }
  
  muMenu.value = centralBody;
  handleMuChange();

  conicSectionMenu.value = conicSection;
  aSlider.value = aSl;
  eSlider.value = eSl;
  doASliderOnInput(+aSl);
  doESliderOnInput(+eSl);

  lanSlider.value = lanDegrees;
  incSlider.value = incDegrees;
  aopSlider.value = aopDegrees;
  handleOrientationOnInput('lan',true);
  handleOrientationOnInput('inc',true);
  handleOrientationOnInput('aop');

  nuSlider.value = nuDegrees;
  doNuSliderOnInput(nuDegrees);

  // rColorMenu.value = rColor;
}

const completeInitialization = function(continueAnimation = true) {
  // the reason for this is that the OrbitalMechThings.js file contains
  // the function _constructLabels() which contains a FontLoader 
  // object called loader that creates code that runs asynchronously.
  // Once omt.constructionComplete is true, we can finish
  // our initialization

  if (continueAnimation && !(omt.constructionComplete)) {
    requestAnimationFrame(completeInitialization);
  }
  
  if (omt.constructionComplete){
    handleMainButtons('aeP');//'mu' <-- set back to this
    
    camera.aspect = 1;
    camera.updateProjectionMatrix();

    cpx = camera.position.x;
    cpy = camera.position.y;
    cpz = camera.position.z;

    renderer.setSize(threeDWorld.clientWidth, threeDWorld.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // defaultButton.style.display = 'none';
    // generalPrefButton.style.display = 'none';
    // prefsReturnButton.style.display = 'none';
    // infoElements.style.display = 'none';
    // infoMenu.value = 'info-intro';
    // handleInfoMenuChoice(infoMenu.value);
    loadBackground();
    omt.showR(true);
    // setRColor(rColor);
    // omt.setVectorSize(vectorSize);

    omt.setColor('pqwFrame','yellow');
    omt.setColor('xyzFrame','red');
    omt.setColor('r','yellow');
    omt.setColor('v','blue');
    omt.setColor('h','red');
    omt.setColor('e','green');

    // omt.setMuIndex(0);
    // omt.computeRotation(lan, inc, aop);
    // computeP();
    // omt.shapeOrbitCurve(a, e);
    // vectorSizeSlider.value = Number(vectorSize);
  // }
  }
};

const doPlayPause = function(){
  //icons came from tabler-icons.io
  playing = playing ? false : true;
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

// resetButton.addEventListener('click', () => {
// });

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
    const dt = clock.getDelta();// dt for 60 fps is 0.01666
    omt.needsRefresh = true;
    doPlayPause();
  }

  omt.refresh();
};

const data = getFromLocalStorage();
initTHREE();
createAndInitialize(data, camera);
completeInitialization();
animate();



/*
orbitalCurveMesh = null;

if (orbitalCurveMesh != null){
  quat.set(0, 0, 0, 1);
  orbitalCurveMesh.matrix.compose(origin, quat, scale);
}

initializeOrbitalCurve();

initializeOrbitalCurve(){
  const hMag = h.length();
  refresh();
}

refresh(){
  if (!constructionComplete){
    return;
  }

  if (needsRefresh === false){
    return;
  }

  needsRefresh = false;

  if (orbitalCurveMesh != null){
    orbitalCurveMesh.matrix.compose(origin, quat, scale);
  }
*/
