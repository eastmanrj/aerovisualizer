import * as THREE from '../../../../node_modules/three/build/three.module.js';
import UFO from './UFO.js';
import {OrbitControls} from './OrbitControls.js';

/**
The purpose of Aerovisualizer is to assist in the teaching and 
reinforcement of concepts in aerospace engineering by presenting 
them in interesting and engaging ways.  3D animations are displayed 
to complement the dry equations found in textbooks and online, and 
controls are also provided to manipulate the displays.

One of the concepts is oblique shock waves, and this file contains the 
main code for it.

 Revision History
 Date    Name                  Description
 10/7/24 R. Eastman            v0.2.3 beta
*/

let scene, camera, renderer;
let background = null;
let orbitControls = null;
let ufo = null;
const cameraRadius = 25;
let nominalCameraPos = new THREE.Vector3(0, 0, -cameraRadius);
let cpx, cpy, cpz;// camera position
const lookAtPoint = [0, 0, 0];
const piOver180 = Math.PI / 180;

const defaultMachNumber = 2;
const defaultR = 287.05;//dry air at 20 deg C in J/(kg deg K)
const defaultGamma = 1.4;
const defaultSpeedOfSound = Math.sqrt(defaultGamma*defaultR*293.15);//temp is 20 deg C
const defaultDeltaMenuSelection = 'forward';
const defaultForwardDelta = 10;
const defaultAftDelta = 10;
const defaultTemperatureScaleMenuSelection = 'celsius';
const defaultDensityUnitsMenuSelection = 'kg-per-m3';
const defaultPressureUnitsMenuSelection = 'pascal';
const defaultSpeedUnitsMenuSelection = 'meters-per-second';
const defaultGasMediumMenuSelection = 'dry_air_20';
const defaultRhoTPMenuSelection = '1';
const defaultAltitudeSliderIndex = 0;
const defaultDensitySliderIndex = 0;
const defaultTemperatureSliderIndex = 0;
const defaultPressureSliderIndex = 0;
const defaultUFOTransparency = 0;
const defaultForwardShockTransparency = 85;
const defaultAftShockTransparency = 85;
const defaultLabelsTransparency = 0;
const defaultUFOColor = 'orange';
const defaultForwardShockColor = 'blue';
const defaultAftShockColor = 'blue';
const defaultLabelsColor = 'orange';
const defaultAltitudeIsInFeet = false;

//aerovisualizerData is modified and saved to local storage when preferences are 
//changed and is retrieved from local storage at startup
let aerovisualizerData = [
  {name:'mach-number', value:defaultMachNumber},
  {name:'delta-menu-selection', value:defaultDeltaMenuSelection},
  {name:'forward-delta', value:defaultForwardDelta},
  {name:'aft-delta', value:defaultAftDelta},
  {name:'temperature-scale-menu-selection', value:defaultTemperatureScaleMenuSelection},
  {name:'density-units-menu-selection', value:defaultDensityUnitsMenuSelection},
  {name:'pressure-units-menu-selection', value:defaultPressureUnitsMenuSelection},
  {name:'speed-units-menu-selection', value:defaultSpeedUnitsMenuSelection},
  {name:'gas-medium-menu-selection', value:defaultGasMediumMenuSelection},
  {name:'rhoTP-menu-selection', value:defaultRhoTPMenuSelection},
  {name:'altitude-slider-index', value:defaultAltitudeSliderIndex},
  {name:'density-slider-index', value:defaultDensitySliderIndex},
  {name:'temperature-slider-index', value:defaultTemperatureSliderIndex},
  {name:'pressure-slider-index', value:defaultPressureSliderIndex},
  {name:'ufo-transparency', value:defaultUFOTransparency},
  {name:'forward-shock-transparency', value:defaultForwardShockTransparency},
  {name:'aft-shock-transparency', value:defaultAftShockTransparency},
  {name:'labels-transparency', value:defaultLabelsTransparency},
  {name:'ufo-color', value:defaultUFOColor},
  {name:'forward-shock-color', value:defaultForwardShockColor},
  {name:'aft-shock-color', value:defaultAftShockColor},
  {name:'labels-color', value:defaultLabelsColor},
  {name:'altitude-is-in-feet', value:defaultAltitudeIsInFeet},
  {name:'mach-speed-state', value:1},
  {name:'current-main-button', value:'rhoTP'}
];

//preferences are declared and defined here and set to their default values.
//They are later set to their local storage values

let mach1 = defaultMachNumber;
let mach2 = 0;
let mach3 = 0;
let mach4 = 0;
let mach5 = 0;
let dens1 = 0;
let dens2 = 0;
let dens3 = 0;
let dens4 = 0;
let dens5 = 0;
let pres1 = 0;
let pres2 = 0;
let pres3 = 0;
let pres4 = 0;
let pres5 = 0;
let temp1 = 0;
let temp2 = 0;
let temp3 = 0;
let temp4 = 0;
let temp5 = 0;

let stagDens1 = 0;
let stagDens2 = 0;
let stagDens3 = 0;
let stagDens4 = 0;
let stagDens5 = 0;
let stagTemp1 = 0;
let stagTemp2 = 0;
let stagTemp3 = 0;
let stagTemp4 = 0;
let stagTemp5 = 0;
let q1 = 0;
let q2 = 0;
let q3 = 0;
let q4 = 0;
let q5 = 0;
let stagPres1 = 0;
let stagPres2 = 0;
let stagPres3 = 0;
let stagPres4 = 0;
let stagPres5 = 0;
let a1 = defaultSpeedOfSound;
let a2 = defaultSpeedOfSound;
let a3 = defaultSpeedOfSound;
let a4 = defaultSpeedOfSound;
let a5 = defaultSpeedOfSound;

let gasConstant = defaultR;
let gamma = defaultGamma;
let deltaMenuSelection = defaultDeltaMenuSelection;
let forwardDelta = defaultForwardDelta;
let aftDelta = defaultAftDelta;
let temperatureScaleMenuSelection = defaultTemperatureScaleMenuSelection;
let densityUnitsMenuSelection = defaultDensityUnitsMenuSelection;
let pressureUnitsMenuSelection = defaultPressureUnitsMenuSelection;
let speedUnitsMenuSelection = defaultSpeedUnitsMenuSelection;
let gasMediumMenuSelection = defaultGasMediumMenuSelection;
let rhoTPMenuSelection = defaultRhoTPMenuSelection;
let altitudeSliderIndex = defaultAltitudeSliderIndex;
let densitySliderIndex = defaultDensitySliderIndex;
let temperatureSliderIndex = defaultTemperatureSliderIndex;
let pressureSliderIndex = defaultPressureSliderIndex;
let ufoTransparency = defaultUFOTransparency;
let forwardShockTransparency = defaultForwardShockTransparency;
let aftShockTransparency = defaultAftShockTransparency;
let labelsTransparency = defaultLabelsTransparency;
let ufoColor = defaultUFOColor;
let forwardShockColor = defaultForwardShockColor;
let aftShockColor = defaultAftShockColor;
let labelsColor = defaultLabelsColor;
let altitudeIsInFeet = defaultAltitudeIsInFeet;
let machSpeedState = 1;//display Mach #, not speed
let currentMainButton = "rhoTP";
let numericalDisplayOption = 1;
let shockIsDetached = false;
let waveDragCoef = 0;

const threeDWorld = document.getElementById('threeD-world');

const rhoTPButton = document.getElementById('rho-t-p-btn');
const machButton = document.getElementById('mach-btn');
const deltaButton = document.getElementById('delta-btn');
const preferencesButton = document.getElementById('preferences-btn');
const infoButton = document.getElementById("info-btn");
const infoReturnButton = document.getElementById('info-return-btn');
const mainReturnButton = document.getElementById('main-return-btn');

const machSlider = document.getElementById('mach-slider');
const machSliderDisplay = document.getElementById('mach-slider-display');
const toggleMachSpeedButton = document.getElementById('toggle-mach-speed-btn');
const cycleNumbersButton = document.getElementById('cycle-numbers-btn');

const deltaMenu = document.getElementById('delta-menu');
const deltaSlider = document.getElementById('delta-slider');
const deltaSliderDisplay = document.getElementById('delta-slider-display');

const gasMediumMenu = document.getElementById('gas-medium-menu');
const rhoTPMenu = document.getElementById('rhoTP-menu');
const rhoTP1Slider = document.getElementById('rhoTP1-slider');
const rhoTP1SliderDisplay = document.getElementById('rhoTP1-slider-display');
const rhoTP2Slider = document.getElementById('rhoTP2-slider');
const rhoTP2SliderDisplay = document.getElementById('rhoTP2-slider-display');
const rGammaDisplay = document.getElementById('r-gamma-display');
const tempADisplay = document.getElementById('temp-a-display');
const presDensDisplay = document.getElementById('pres-dens-display');

const transparencyPrefButton = document.getElementById('transparency-pref-btn');
const colorPrefButton = document.getElementById('color-pref-btn');
const miscPrefButton = document.getElementById('misc-pref-btn');
const prefsReturnButton = document.getElementById('prefs-return-btn');

const infoMenu = document.getElementById('info-menu');
const infoText = document.getElementById('info-text');

const numericalButtonsElements = document.getElementById('numerical-btns-elements');
const numerical1Elements = document.getElementById('numerical1-elements');
const numerical2Elements = document.getElementById('numerical2-elements');
const numerical3Elements = document.getElementById('numerical3-elements');
const gasPropertyElements = document.getElementById('gas-prop-elements');
const machElements = document.getElementById('mach-elements');
const deltaElements = document.getElementById('delta-elements');
const infoElements = document.getElementById('info-elements');
const transparencyPrefElements = document.getElementById('transparency-pref-elements');
const colorPrefElements = document.getElementById('color-pref-elements');
const miscElements = document.getElementById('misc-elements');

const ufoTransparencySlider = document.getElementById("transparency-ufo");
const ufoTransparencyDisplay = document.getElementById("transparency-ufo-display");
const forwardShockTransparencySlider = document.getElementById("transparency-forward-shock");
const forwardShockTransparencyDisplay = document.getElementById("transparency-forward-shock-display");
const aftShockTransparencySlider = document.getElementById("transparency-aft-shock");
const aftShockTransparencyDisplay = document.getElementById("transparency-aft-shock-display");
const labelsTransparencySlider = document.getElementById("transparency-labels");
const labelsTransparencyDisplay = document.getElementById("transparency-labels-display");

const ufoColorMenu = document.getElementById("ufo-color-menu");
const forwardShockColorMenu = document.getElementById("forward-shock-color-menu");
const aftShockColorMenu = document.getElementById("aft-shock-color-menu");
const labelsColorMenu = document.getElementById("labels-color-menu");
const altitudeFeetCheckbox = document.getElementById("altitude-feet");
const temperatureScaleMenu = document.getElementById("temperature-scale-menu");
const densityUnitsMenu = document.getElementById("density-units-menu");
const pressureUnitsMenu = document.getElementById("pressure-units-menu");
const speedUnitsMenu = document.getElementById("speed-units-menu");

const machSpeedLabelDisplay1 = document.getElementById("mach-speed-label-display1");
const machSpeedLabelDisplay2 = document.getElementById("mach-speed-label-display2");
const machSpeedLabelDisplay3 = document.getElementById("mach-speed-label-display3");
const densLabelDisplay = document.getElementById("dens-label-display");
const tempLabelDisplay = document.getElementById("temp-label-display");
const presLabelDisplay = document.getElementById("pres-label-display");
const qLabelDisplay = document.getElementById("q-label-display");
const stagnationPresLabelDisplay = document.getElementById("p0-label-display");
const stagnationTempLabelDisplay = document.getElementById("t0-label-display");
const stagnationDensLabelDisplay = document.getElementById("rho0-label-display");
const speedOfSoundLabelDisplay = document.getElementById("a-label-display");

const mach1Display = document.getElementById("mach1-display");
const rho1Display = document.getElementById("rho1-display");
const p1Display = document.getElementById("p1-display");
const t1Display = document.getElementById("t1-display");
const mach2Display = document.getElementById("mach2-display");
const rho2Display = document.getElementById("rho2-display");
const p2Display = document.getElementById("p2-display");
const t2Display = document.getElementById("t2-display");
const mach3Display = document.getElementById("mach3-display");
const rho3Display = document.getElementById("rho3-display");
const p3Display = document.getElementById("p3-display");
const t3Display = document.getElementById("t3-display");
const mach4Display = document.getElementById("mach4-display");
const rho4Display = document.getElementById("rho4-display");
const p4Display = document.getElementById("p4-display");
const t4Display = document.getElementById("t4-display");
const mach5Display = document.getElementById("mach5-display");
const rho5Display = document.getElementById("rho5-display");
const p5Display = document.getElementById("p5-display");
const t5Display = document.getElementById("t5-display");

const mach1Display2 = document.getElementById("mach1-display2");
const mach2Display2 = document.getElementById("mach2-display2");
const mach3Display2 = document.getElementById("mach3-display2");
const mach4Display2 = document.getElementById("mach4-display2");
const mach5Display2 = document.getElementById("mach5-display2");
const dynamicPressure1Display = document.getElementById("q1-display");
const dynamicPressure2Display = document.getElementById("q2-display");
const dynamicPressure3Display = document.getElementById("q3-display");
const dynamicPressure4Display = document.getElementById("q4-display");
const dynamicPressure5Display = document.getElementById("q5-display");
const stagnationPressure1Display = document.getElementById("p01-display");
const stagnationPressure2Display = document.getElementById("p02-display");
const stagnationPressure3Display = document.getElementById("p03-display");
const stagnationPressure4Display = document.getElementById("p04-display");
const stagnationPressure5Display = document.getElementById("p05-display");
const stagnationTemperature1Display = document.getElementById("t01-display");
const stagnationTemperature2Display = document.getElementById("t02-display");
const stagnationTemperature3Display = document.getElementById("t03-display");
const stagnationTemperature4Display = document.getElementById("t04-display");
const stagnationTemperature5Display = document.getElementById("t05-display");
const stagnationDensity1Display = document.getElementById("rho01-display");
const stagnationDensity2Display = document.getElementById("rho02-display");
const stagnationDensity3Display = document.getElementById("rho03-display");
const stagnationDensity4Display = document.getElementById("rho04-display");
const stagnationDensity5Display = document.getElementById("rho05-display");
const machAngle1Display = document.getElementById("mach-angle-1");
const machAngle2Display = document.getElementById("mach-angle-2");
const machAngle3Display = document.getElementById("mach-angle-3");
const machAngle4Display = document.getElementById("mach-angle-4");
const machAngle5Display = document.getElementById("mach-angle-5");
const speedOfSound1Display = document.getElementById("a1-display");
const speedOfSound2Display = document.getElementById("a2-display");
const speedOfSound3Display = document.getElementById("a3-display");
const speedOfSound4Display = document.getElementById("a4-display");
const speedOfSound5Display = document.getElementById("a5-display");
const mach1Display3 = document.getElementById("mach1-display3");
const mach2Display3 = document.getElementById("mach2-display3");
const mach3Display3 = document.getElementById("mach3-display3");
const mach4Display3 = document.getElementById("mach4-display3");
const mach5Display3 = document.getElementById("mach5-display3");

// each of the arrays has 76 values for a one to one 
// correspondence with the slider values which range from
// a min value of 0 to a max value of 75.  The slider values
// act as indices to these arrays

// altitude data are from the 1976 Standard Atmosphere (dry air)

// kilometers
const altitude =
[-2.0,-0.5,0.0,0.5,1.0,1.5,2.0,2.5,3.0,3.5,4.0,4.5,5.0,
5.5,6.0,6.5,7.0,7.5,8.0,8.5,9.0,9.5,10.0,10.5,11.0,11.5,12.0,
12.5,13.0,13.5,14.0,14.5,15.0,15.5,16.0,16.5,17.0,17.5,18.0,
18.5,19.0,19.5,20.0,22.0,24.0,26.0,28.0,30.0,32.0,34.0,36.0,
38.0,40.0,42.0,44.0,46.0,48.0,50.0,52.0,54.0,56.0,58.0,60.0,
62.0,64.0,66.0,68.0,70.0,72.0,74.0,76.0,78.0,80.0,82.0,84.0,86.0];

// Kelvin
const temperatureForAltitude =
[301.2,291.4,288.1,284.9,281.7,278.4,275.2,271.9,268.7,265.4,
262.2,258.9,255.7,252.4,249.2,245.9,242.7,239.5,236.2,233.0,
229.7,226.5,223.3,220.0,216.8,216.6,216.6,216.6,216.6,216.6,
216.6,216.6,216.6,216.6,216.6,216.6,216.6,216.6,216.6,216.6,
216.6,216.6,216.6,218.6,220.6,222.5,224.5,226.5,228.5,233.7,
239.3,244.8,250.4,255.9,261.4,266.9,270.6,270.6,269.0,263.5,
258.0,252.5,247.0,241.5,236.0,230.5,225.1,219.6,214.3,210.3,
206.4,202.5,198.6,194.7,190.8,186.9];

// Celsius
const temperatureForUserSelect =
[-260, -240, -220, -200, -180, -160, -140, -120, -100, -80,
  -60,  -40,  -20,    0,   20,   40,   60,   80,  100, 120,
  140,  160,  180,  200,  220,  240,  260,  280,  300, 320,
  340,  360,  380,  400,  420,  440,  460,  480,  500, 520,
  540,  560,  580,  600,  620,  640,  660,  680,  700, 720,
  740,  760,  780,  800,  820,  840,  860,  880,  900, 920,
  940,  960,  980, 1000, 1020, 1040, 1060, 1080, 1100,1120,
 1140, 1160, 1180, 1200, 1220, 1240];

// Pascals
const pressureForAltitude =
[1.2780E+05,1.07477E+05,1.01325E+05,9.5461E+04,8.9876E+04,8.4559E+04,
7.9501E+04,7.4691E+04,7.0121E+04,6.5780E+04,6.1660E+04,5.7752E+04,
5.4048E+04,5.0539E+04,4.7217E+04,4.4075E+04,4.1105E+04,3.8299E+04,
3.5651E+04,3.3154E+04,3.0800E+04,2.8584E+04,2.6499E+04,2.4540E+04,
2.2699E+04,2.0984E+04,1.9399E+04,1.7933E+04,1.6579E+04,1.5327E+04,
1.4170E+04,1.3100E+04,1.2111E+04,1.1197E+04,1.0352E+04,9.5710E+03,
8.8490E+03,8.1820E+03,7.5650E+03,6.9940E+03,6.4670E+03,5.9790E+03,
5.5290E+03,4.0470E+03,2.9720E+03,2.1880E+03,1.6160E+03,1.1970E+03,
8.8900E+02,6.6340E+02,4.9850E+02,3.7710E+02,2.8710E+02,2.2000E+02,
1.6950E+02,1.3130E+02,1.0230E+02,7.9770E+01,6.2210E+01,4.8330E+01,
3.7360E+01,2.8720E+01,2.1960E+01,1.6690E+01,1.2600E+01,9.4590E+00,
7.0510E+00,5.2200E+00,3.8350E+00,2.8000E+00,2.0330E+00,1.4670E+00,
1.0520E+00,7.49800E-01,5.30800E-01,3.73200E-01];

// Pascals
const pressureForUserSelect =
[1.0E-01,2.0E-01,3.0E-01,4.0E-01,5.0E-01,6.0E-01,7.0E-01,8.0E-01,9.0E-01,
1.0E+00,2.0E+00,3.0E+00,4.0E+00,5.0E+00,6.0E+00,7.0E+00,8.0E+00,9.0E+00,
1.0E+01,2.0E+01,3.0E+01,4.0E+01,5.0E+01,6.0E+01,7.0E+01,8.0E+01,9.0E+01,
1.0E+02,2.0E+02,3.0E+02,4.0E+02,5.0E+02,6.0E+02,7.0E+02,8.0E+02,9.0E+02,
1.0E+03,2.0E+03,3.0E+03,4.0E+03,5.0E+03,6.0E+03,7.0E+03,8.0E+03,9.0E+03,
1.0E+04,2.0E+04,3.0E+04,4.0E+04,5.0E+04,6.0E+04,7.0E+04,8.0E+04,9.0E+04,
1.0E+05,2.0E+05,3.0E+05,4.0E+05,5.0E+05,6.0E+05,7.0E+05,8.0E+05,9.0E+05,
1.0E+06,2.0E+06,3.0E+06,4.0E+06,5.0E+06,6.0E+06,7.0E+06,8.0E+06,9.0E+06,
1.0E+07,2.0E+07,3.0E+07,4.0E+07];

// kg/m^3
const densityForAltitude =
[1.478E+00,1.285E+00,1.225E+00,1.167E+00,1.112E+00,1.058E+00,
1.007E+00,9.570E-01,9.090E-01,8.630E-01,8.193E-01,7.770E-01,
7.360E-01,6.970E-01,6.601E-01,6.240E-01,5.900E-01,5.570E-01,
5.258E-01,4.960E-01,4.670E-01,4.400E-01,4.135E-01,3.890E-01,
3.650E-01,3.370E-01,3.119E-01,2.880E-01,2.670E-01,2.460E-01,
2.279E-01,2.110E-01,1.950E-01,1.800E-01,1.665E-01,1.540E-01,
1.420E-01,1.320E-01,1.216E-01,1.120E-01,1.040E-01,9.600E-02,
8.891E-02,6.451E-02,4.694E-02,3.426E-02,2.508E-02,1.841E-02,
1.355E-02,9.887E-03,7.257E-03,5.366E-03,3.995E-03,2.995E-03,
2.259E-03,1.714E-03,1.317E-03,1.027E-03,8.055E-04,6.389E-04,
5.044E-04,3.962E-04,3.096E-04,2.407E-04,1.860E-04,1.429E-04,
1.091E-04,8.281E-05,6.236E-05,4.637E-05,3.430E-05,2.523E-05,
1.845E-05,1.341E-05,9.690E-06,6.955E-06];

// kg/m^3
const densityForUserSelect =
[1.0E-06,2.0E-06,3.0E-06,4.0E-06,5.0E-06,6.0E-06,7.0E-06,8.0E-06,9.0E-06,
1.0E-05,2.0E-05,3.0E-05,4.0E-05,5.0E-05,6.0E-05,7.0E-05,8.0E-05,9.0E-05,
1.0E-04,2.0E-04,3.0E-04,4.0E-04,5.0E-04,6.0E-04,7.0E-04,8.0E-04,9.0E-04,
1.0E-03,2.0E-03,3.0E-03,4.0E-03,5.0E-03,6.0E-03,7.0E-03,8.0E-03,9.0E-03,
1.0E-02,2.0E-02,3.0E-02,4.0E-02,5.0E-02,6.0E-02,7.0E-02,8.0E-02,9.0E-02,
1.0E-01,2.0E-01,3.0E-01,4.0E-01,5.0E-01,6.0E-01,7.0E-01,8.0E-01,9.0E-01,
1.0E+00,2.0E+00,3.0E+00,4.0E+00,5.0E+00,6.0E+00,7.0E+00,8.0E+00,9.0E+00,
1.0E+01,2.0E+01,3.0E+01,4.0E+01,5.0E+01,6.0E+01,7.0E+01,8.0E+01,9.0E+01,
1.0E+02,2.0E+02,8.0E+02,4.0E+02];

//gas constants from www.engineeringtoolbox.com
// units J/Kg K
// air (dry) is 78.08% N, 20.95% O, 0.93% Ar, 0.04% other
const rData = {dry_air_MINUS15:287.05, dry_air_0:287.05, dry_air_20:287.05, 
  dry_air_200:287.05, dry_air_400:287.05, dry_air_1000:287.05, 
  ammonia_15:488.21, argon_MINUS180:208.13, argon_20:208.13, 
  carbon_dioxide_0:188.92, carbon_dioxide_20:188.92, 
  carbon_dioxide_100:188.92, carbon_dioxide_400:188.92, 
  carbon_dioxide_1000:188.92, carbon_monoxide_20:296.84, 
  chlorine_20:117.26, ethane_15:276.51, helium_20:2077.1, 
  hydrogen_MINUS181:4124.2, hydrogen_MINUS76:4124.2,
  hydrogen_20:4124.2, hydrogen_100:4124.2, hydrogen_400:4124.2,
  hydrogen_1000:4124.2, hydrogen_2000:4124.2, krypton_19:99.22,
  methane_MINUS115:518.28, methane_MINUS74:518.28,
  methane_20:518.28, neon_19:412.02, nitrogen_MINUS181:296.80,
  nitrous_oxide_20:188.91, oxygen_MINUS181:259.84, 
  oxygen_MINUS76:259.84, oxygen_20:259.84, oxygen_100:259.84, 
  oxygen_200:259.84, oxygen_400:259.84, propane_16:188.56, 
  sulfur_dioxide_15:129.78, water_vapor_20:461.52,
  water_vapor_100:461.52, water_vapor_200:461.52, xenon_19:63.33};

const gammaData = {dry_air_MINUS15:1.404, dry_air_0:1.403, dry_air_20:1.400, 
  dry_air_200:1.398, dry_air_400:1.393, dry_air_1000:1.365, 
  ammonia_15:1.310, argon_MINUS180:1.760, argon_20:1.670, 
  carbon_dioxide_0:1.310, carbon_dioxide_20:1.300, 
  carbon_dioxide_100:1.281, carbon_dioxide_400:1.235, 
  carbon_dioxide_1000:1.195, carbon_monoxide_20:1.400, 
  chlorine_20:1.340, ethane_15:1.220, helium_20:1.66, 
  hydrogen_MINUS181:1.597, hydrogen_MINUS76:1.453, hydrogen_20:1.410, 
  hydrogen_100:1.404, hydrogen_400:1.387, hydrogen_1000:1.358, 
  hydrogen_2000:1.318, krypton_19:1.680, methane_MINUS115:1.410, 
  methane_MINUS74:1.350, methane_20:1.320, neon_19:1.640, 
  nitrogen_MINUS181:1.470, nitrous_oxide_20:1.310, oxygen_MINUS181:1.450, 
  oxygen_MINUS76:1.415, oxygen_20:1.400, oxygen_100:1.399, 
  oxygen_200:1.397, oxygen_400:1.394, propane_16:1.130, 
  sulfur_dioxide_15:1.290, water_vapor_20:1.330, water_vapor_100:1.324, 
  water_vapor_200:1.310, xenon_19:1.660};//numbers in name indicate temperature in degrees Celsius

const handleMainButtons = function(button){
  machButton.disabled = false;
  deltaButton.disabled = false;
  rhoTPButton.disabled = false;

  gasPropertyElements.style.display = 'none';
  machElements.style.display = 'none';
  deltaElements.style.display = 'none';

  switch (button){
    case 'rhoTP':
      gasPropertyElements.style.display = 'grid';
      rhoTPButton.disabled = true;
      currentMainButton = 'rhoTP';
      numericalButtonsElements.style.display = 'none';
      numerical1Elements.style.display = 'none';
      numerical2Elements.style.display = 'none';
      numerical3Elements.style.display = 'none';
      break;
    case 'mach':
      machElements.style.display = 'grid';
      machButton.disabled = true;
      currentMainButton = 'mach';
      setNumericalDisplay();
      break;
    case 'delta':
      deltaElements.style.display = 'grid';
      deltaButton.disabled = true;
      currentMainButton = 'delta';
      setNumericalDisplay();
      break;
    case 'none':
      numericalButtonsElements.style.display = 'none';
      numerical1Elements.style.display = 'none';
      numerical2Elements.style.display = 'none';
      numerical3Elements.style.display = 'none';
      // currentMainButton = 'none';
      break;
  }

  replaceAerovisualizerData('current-main-button',currentMainButton);
  saveToLocalStorage();
}

rhoTPButton.addEventListener('click', () => {
  handleMainButtons('rhoTP');
});

machButton.addEventListener('click', () => {
  handleMainButtons('mach');
});

deltaButton.addEventListener('click', () => {
  handleMainButtons('delta');
});

preferencesButton.addEventListener('click', () => {
  toggleShowPrefs();
  handlePreferencesButtons('transparency');
});

const setNumericalDisplay = function(cycle = false){
  numerical1Elements.style.display = 'none';
  numerical2Elements.style.display = 'none';
  numerical3Elements.style.display = 'none';
  numericalDisplayOption = cycle ? numericalDisplayOption%3 + 1 : numericalDisplayOption;

  switch(numericalDisplayOption){
    case 1:
      numerical1Elements.style.display = 'grid';
      cycleNumbersButton.innerHTML = "P&nbsp;&rarr;&nbsp;T";
      break;
    case 2:
      numerical2Elements.style.display = 'grid';
      cycleNumbersButton.innerHTML = "T&nbsp;&rarr;&nbsp;&rho;";
      break;
    case 3:
      numerical3Elements.style.display = 'grid';
      cycleNumbersButton.innerHTML = "&rho;&nbsp;&rarr;&nbsp;P";
      break;
  }

  if (currentMainButton !== 'rhoTP'){
    numericalButtonsElements.style.display = 'grid';
  }else{
    numericalButtonsElements.style.display = 'none';
    numerical1Elements.style.display = 'none';
    numerical2Elements.style.display = 'none';
    numerical3Elements.style.display = 'none';
  }
}

const toggleShowPrefs = function(){
  if (threeDWorld.style.display === 'none'){
    threeDWorld.style.display = 'block';
    machButton.style.display = 'block';
    deltaButton.style.display = 'block';
    rhoTPButton.style.display = 'block';
    preferencesButton.style.display = 'block';
    infoButton.style.display = 'block';
    mainReturnButton.style.display = 'block';

    miscPrefButton.style.display = 'none';
    transparencyPrefButton.style.display = 'none';
    colorPrefButton.style.display = 'none';
    prefsReturnButton.style.display = 'none';
    handlePreferencesButtons('none');
    doWindowResizeOrOrientationChange();
    handleMainButtons(currentMainButton);
    setNumericalDisplay();
  }else{
    threeDWorld.style.display = 'none';
    machButton.style.display = 'none';
    deltaButton.style.display = 'none';
    rhoTPButton.style.display = 'none';
    preferencesButton.style.display = 'none';
    infoButton.style.display = 'none';
    mainReturnButton.style.display = 'none';

    miscPrefButton.style.display = 'block';
    transparencyPrefButton.style.display = 'block';
    colorPrefButton.style.display = 'block';
    prefsReturnButton.style.display = 'block';
    handleMainButtons('none');
    numericalButtonsElements.style.display = 'none';
    numerical1Elements.style.display = 'none';
    numerical2Elements.style.display = 'none';
    numerical3Elements.style.display = 'none';
  }
}

machSlider.oninput = function(){
  mach1 = machSlider.value;
  displayMachOrSpeed();
}

machSlider.onpointerup = function(){
  setRhoTP();
  computeAllFlow();
  // displayMachOrSpeed();
  replaceAerovisualizerData('mach-number',mach1);
  saveToLocalStorage();
}

deltaMenu.addEventListener('change', () => {
  deltaMenuSelection = deltaMenu.value;

  switch (deltaMenuSelection){
    case 'forward':
      deltaSlider.value = forwardDelta;
      break;
    case 'aft':
      deltaSlider.value = aftDelta;
      break;
  }

  handleDeltaOnInput();
  replaceAerovisualizerData('delta-menu-selection',deltaMenuSelection);
  saveToLocalStorage();
});

const handleDeltaOnInput = function(){
  switch (deltaMenuSelection){
    case 'forward':
      forwardDelta = +deltaSlider.value;
      deltaSliderDisplay.innerHTML = `${Number(forwardDelta).toFixed(0).toString()}&deg;`;
      break;
    case 'aft':
      aftDelta = +deltaSlider.value;
      deltaSliderDisplay.innerHTML = `${Number(aftDelta).toFixed(0).toString()}&deg;`;
      break;
  }

  waveDragCoef = ufo.setHalfConeAngles(forwardDelta,aftDelta);
  displayRGammaACD();
  ufo.needsRefresh = true;
}

deltaSlider.oninput = function(){
  handleDeltaOnInput();
}

deltaSlider.onpointerup = function(){
  computeAllFlow();

  switch (deltaMenuSelection){
    case 'forward':
      replaceAerovisualizerData('forward-delta',forwardDelta);
      break;
    case 'aft':
      replaceAerovisualizerData('aft-delta',aftDelta);
      break;
  }

  saveToLocalStorage();
}

const handleRhoTPMenu = function(){
  rhoTPMenuSelection = rhoTPMenu.value;
  rhoTP2SliderDisplay.innerHTML = ``;

  switch (rhoTPMenuSelection){
    case '1':
      rhoTP1Slider.value = altitudeSliderIndex;
      rhoTP2Slider.value = 38;
      rhoTP2Slider.disabled = true;
      break;
    case '2':
      rhoTP1Slider.value = densitySliderIndex;
      rhoTP2Slider.disabled = false;
      rhoTP2Slider.value = pressureSliderIndex;
      break;
    case '3':
      rhoTP1Slider.value = pressureSliderIndex;
      rhoTP2Slider.disabled = false;
      rhoTP2Slider.value = temperatureSliderIndex;
      break;
    case '4':
      rhoTP1Slider.value = temperatureSliderIndex;
      rhoTP2Slider.disabled = false;
      rhoTP2Slider.value = densitySliderIndex;
      break;
  }

  setRhoTP();
  computeAllFlow();
}

rhoTPMenu.addEventListener('change', () => {
  handleRhoTPMenu();
  replaceAerovisualizerData('rhoTP-menu-selection',rhoTPMenuSelection);
  saveToLocalStorage();
});

const temperatureFromKelvin = function(temp, fixedOption=2, withLabel=true){
  //supply a temerature in degrees Kelvin, function
  //returns a string based on temperatureScaleMenuSelection
  let displayedTemp;
  let t = Number(temp);
  let fo = Number(fixedOption);

  if (withLabel){
    switch(temperatureScaleMenuSelection){
      case 'celsius':
        displayedTemp = `${Number(t-273.15).toFixed(fo).toString()} &deg;C`;
        break;
      case 'kelvin':
        displayedTemp = `${Number(t).toFixed(fo).toString()} &deg;K`;
        break;
      case 'fahrenheit':
        displayedTemp = `${Number((t-273.15)*1.8 + 32).toFixed(fo).toString()} &deg;F`;
        break;
      case 'rankine':
        displayedTemp = `${Number(t*1.8).toFixed(fo).toString()} &deg;R`;
        break;
    }
  }else{
    switch(temperatureScaleMenuSelection){
      case 'celsius':
        displayedTemp = `${Number(t-273.15).toFixed(fo).toString()}`;
        break;
      case 'kelvin':
        displayedTemp = `${Number(t).toFixed(fo).toString()}`;
        break;
      case 'fahrenheit':
        displayedTemp = `${Number((t-273.15)*1.8 + 32).toFixed(fo).toString()}`;
        break;
      case 'rankine':
        displayedTemp = `${Number(t*1.8).toFixed(fo).toString()}`;
        break;
    }
  }

  return displayedTemp;
}

const densityFromMetric = function(density, fixedOption=3, withLabel=true){
  //supply a density in kg/m^3, function
  //returns a string based on densityUnitsMenuSelection
  //1 pound/cubic foot = 16.01846337396 kilogram/cubic meter
  //1 slug = 32.1740485564266 pounds mass
  const lbmPerFt3PerkgPerM3 = 1/16.01846337396;
  const slugsPerLbm = 1/32.1740485564266;
  let displayedDens;
  let dens = Number(density);
  let fo = Number(fixedOption);
   
  if (withLabel){
    switch(densityUnitsMenuSelection){
      case 'kg-per-m3':
        displayedDens = `${Number(dens).toExponential(fo).toString()} kg/m³`;
        break;
      case 'lbm-per-ft3':
        displayedDens = `${Number(dens*lbmPerFt3PerkgPerM3).toExponential(fo).toString()} lbm/ft³`;
        break;
      case 'slugs-per-ft3':
        displayedDens = `${Number(dens*lbmPerFt3PerkgPerM3*slugsPerLbm).toExponential(fo).toString()} slugs/ft³`;
        break;
    }
  }else{
    switch(densityUnitsMenuSelection){
      case 'kg-per-m3':
        displayedDens = `${Number(dens).toExponential(fo).toString()}`;
        break;
      case 'lbm-per-ft3':
        displayedDens = `${Number(dens*lbmPerFt3PerkgPerM3).toExponential(fo).toString()}`;
        break;
      case 'slugs-per-ft3':
        displayedDens = `${Number(dens*lbmPerFt3PerkgPerM3*slugsPerLbm).toExponential(fo).toString()}`;
        break;
    }
  }

  return displayedDens;
}

const pressureFromPascals = function(pressure, fixedOption=4, withLabel=true){
  //supply a pressure in Pascals (N/m^2), function
  //returns a string based on pressureUnitsMenuSelection
  //1 psi = 6894.76 Pascals
  //1 kg(f)/cm² = 98066.5 Pascals
  //1 standard atmosphere (atm) = 101325 Pascals exactly
  //1 Torr = 1/760 atm exactly = 101325/760 Pascals exactly
  //1 Pascal = 10 barye
  //1 inch of mercury = 3386.39 Pascals
  //1 Hectopascal (hPa) = 100 Pascals

  let displayedPres;
  let pres = Number(pressure);
  let fo = Number(fixedOption);
  const psiPerPascals = 1/6894.76;
  const kgfPerCm2PerPascals = 1/98066.5;
  const atmPerPascals = 1/101325;
  const torrPerPascals = 760*atmPerPascals;
  const baryePerPascals = 10;
  const inHgPerPascals = 1/3386.39;
  const hectopascalPerPascals = 0.01;

  if (withLabel){
    switch(pressureUnitsMenuSelection){
      case 'pascal':
        displayedPres = `${Number(pres).toExponential(fo).toString()} Pa`;
        break;
      case 'bar':
        displayedPres = `${Number(pres/100000).toExponential(fo).toString()} bar`;
        break;
      case 'kilo-pascal':
        displayedPres = `${Number(pres/1000).toExponential(fo).toString()} kPa`;
        break;
      case 'mega-pascal':
        displayedPres = `${Number(pres/1000000).toExponential(fo).toString()} MPa`;
        break;
      case 'psi':
        displayedPres = `${Number(pres*psiPerPascals).toExponential(fo).toString()} psi`;
        break;
      case 'kgf-per-cm2':
        displayedPres = `${Number(pres*kgfPerCm2PerPascals).toExponential(fo).toString()} kg(f)/cm²`;
        break;
      case 'inches-mercury':
        displayedPres = `${Number(pres*inHgPerPascals).toExponential(fo).toString()} inHg`;
        break;
      case 'barye':
        displayedPres = `${Number(pres*baryePerPascals).toExponential(fo).toString()} Ba`;
        break;
      case 'hectopascal':
        displayedPres = `${Number(pres*hectopascalPerPascals).toExponential(fo).toString()} hPa`;
        break;
      case 'standard-atmosphere':
        displayedPres = `${Number(pres*atmPerPascals).toExponential(fo).toString()} atm`;
        break;
      case 'torr':
        displayedPres = `${Number(pres*torrPerPascals).toExponential(fo).toString()} torr`;
        break;
    }
  }else{
    switch(pressureUnitsMenuSelection){
      case 'pascal':
        displayedPres = `${Number(pres).toExponential(fo).toString()}`;
        break;
      case 'bar':
        displayedPres = `${Number(pres/100000).toExponential(fo).toString()}`;
        break;
      case 'kilo-pascal':
        displayedPres = `${Number(pres/1000).toExponential(fo).toString()}`;
        break;
      case 'mega-pascal':
        displayedPres = `${Number(pres/1000000).toExponential(fo).toString()}`;
        break;
      case 'psi':
        displayedPres = `${Number(pres*psiPerPascals).toExponential(fo).toString()}`;
        break;
      case 'kgf-per-cm2':
        displayedPres = `${Number(pres*kgfPerCm2PerPascals).toExponential(fo).toString()}`;
        break;
      case 'inches-mercury':
        displayedPres = `${Number(pres*inHgPerPascals).toExponential(fo).toString()}`;
        break;
      case 'barye':
        displayedPres = `${Number(pres*baryePerPascals).toExponential(fo).toString()}`;
        break;
      case 'hectopascal':
        displayedPres = `${Number(pres*hectopascalPerPascals).toExponential(fo).toString()}`;
        break;
      case 'standard-atmosphere':
        displayedPres = `${Number(pres*atmPerPascals).toExponential(fo).toString()}`;
        break;
      case 'torr':
        displayedPres = `${Number(pres*torrPerPascals).toExponential(fo).toString()}`;
        break;
    }
  }

  return displayedPres;
}

const speedForMetric = function(speed, fixedOption=1, withLabel=true){
  //supply a speed in m/s, function
  //returns a string based on speedUnitsMenuSelection
  //1 meter per second equals 1.9438452 knots
  let displayedSpeed;
  let v = Number(speed);
  let fo = Number(fixedOption);
  const knotsPerMeterPerSecond = 1.9438452;
  const feetPerMeter = 1/0.3048;//exact
  const feetPerMile = 5280;
  const secondsPerHour = 60*60;
  const mphPerMeterPerSecond = feetPerMeter*secondsPerHour/feetPerMile;

  if (withLabel){
    switch(speedUnitsMenuSelection){
      case 'meters-per-second':
        displayedSpeed = `${Number(v).toFixed(fo).toString()} m/s`;
        break;
      case 'knots':
        displayedSpeed = `${Number(v*knotsPerMeterPerSecond).toFixed(fo).toString()} knots`;
        break;
      case 'feet-per-second':
        displayedSpeed = `${Number(v*feetPerMeter).toFixed(fo).toString()} ft/s`;
        break;
      case 'kilometers-per-hour':
        displayedSpeed = `${Number(v*secondsPerHour/1000).toFixed(fo).toString()} km/h`;
        break;
      case 'miles-per-hour':
        displayedSpeed = `${Number(v*mphPerMeterPerSecond).toFixed(fo).toString()} mph`;
        break;
    }
  }else{
    switch(speedUnitsMenuSelection){
      case 'meters-per-second':
        displayedSpeed = `${Number(v).toFixed(fo).toString()}`;
        break;
      case 'knots':
        displayedSpeed = `${Number(v*knotsPerMeterPerSecond).toFixed(fo).toString()}`;
        break;
      case 'feet-per-second':
        displayedSpeed = `${Number(v*feetPerMeter).toFixed(fo).toString()}`;
        break;
      case 'kilometers-per-hour':
        displayedSpeed = `${Number(v*secondsPerHour/1000).toFixed(fo).toString()}`;
        break;
      case 'miles-per-hour':
        displayedSpeed = `${Number(v*mphPerMeterPerSecond).toFixed(fo).toString()}`;
        break;
    }
  }

  return displayedSpeed;
}

const setRhoTP = function(sliderNumber = 0){
  let alt;
  const slider1Index = Number(rhoTP1Slider.value);
  const slider2Index = Number(rhoTP2Slider.value);

  switch (rhoTPMenuSelection){
    case '1':
      altitudeSliderIndex = slider1Index;
      alt = altitude[slider1Index];
      dens1 = densityForAltitude[slider1Index];
      temp1 = temperatureForAltitude[slider1Index];
      pres1 = pressureForAltitude[slider1Index];

      if (altitudeIsInFeet){
        rhoTP1SliderDisplay.innerHTML = `altitude: ${Number(alt/0.0003048).toFixed(0).toString()} ft`;
      }else{
        rhoTP1SliderDisplay.innerHTML = `altitude: ${Number(alt).toFixed(1).toString()} km`;
      }
      break;
    case '2':
      densitySliderIndex = slider1Index;
      pressureSliderIndex = slider2Index;

      if (sliderNumber === 0 || sliderNumber === 1){
        dens1 = densityForUserSelect[slider1Index];
        rhoTP1SliderDisplay.innerHTML = `density: ${densityFromMetric(dens1)}`;
      }

      if (sliderNumber === 0 || sliderNumber === 2){
        pres1 = pressureForUserSelect[slider2Index];
        rhoTP2SliderDisplay.innerHTML = `pressure: ${pressureFromPascals(pres1)}`;
      }
      
      temp1 = pres1/dens1/gasConstant;
      break;
    case '3':
      pressureSliderIndex = slider1Index;
      temperatureSliderIndex = slider2Index;

      if (sliderNumber === 0 || sliderNumber === 1){
        pres1 = pressureForUserSelect[slider1Index];
        rhoTP1SliderDisplay.innerHTML = `pressure: ${pressureFromPascals(pres1)}`;
      }

      if (sliderNumber === 0 || sliderNumber === 2){
        temp1 = temperatureForUserSelect[slider2Index] + 273.15;//convert from Celsius to Kelvin
        rhoTP2SliderDisplay.innerHTML = `temperature: ${temperatureFromKelvin(temp1,0)}`;
      }
      
      dens1 = pres1/temp1/gasConstant;
      break;
    case '4':
      temperatureSliderIndex = slider1Index;
      densitySliderIndex = slider2Index;

      if (sliderNumber === 0 || sliderNumber === 1){
        temp1 = temperatureForUserSelect[slider1Index] + 273.15;//convert from Celsius to Kelvin
        rhoTP1SliderDisplay.innerHTML = `temperature: ${temperatureFromKelvin(temp1,0)}`;
      }

      if (sliderNumber === 0 || sliderNumber === 2){
        dens1 = densityForUserSelect[slider2Index];
        rhoTP2SliderDisplay.innerHTML = `density: ${densityFromMetric(dens1)}`;
      }
      
      pres1 = dens1*gasConstant*temp1;
      break;
  }

  const [dens10, temp10, pres10] = computeStagnationDensTempPres(mach1, dens1, temp1, pres1);
  stagDens1 = dens10;
  stagTemp1 = temp10;
  stagPres1 = pres10;

  //en.wikipedia.org/wiki/Dynamic_pressure
  
  //The above Wikipedia page describes dynamic pressure this way:

  //"Many authors define dynamic pressure only for incompressible flows. 
  //For compressible flows, these authors use the concept of impact 
  //pressure. However, the definition of dynamic pressure can be extended 
  //to include compressible flows.  For compressible flow, the isentropic 
  //relations can be used (also valid for incompressible flow)."

  //Thus, the following code DOES NOT APPLY TO COMPRESSIBLE FLOW:
  //q1 = 0.5*gamma*pres1*mach1*mach1;

  //Do this instead:
  q1 = stagPres1 - pres1;

  a1 = Math.sqrt(gamma*gasConstant*temp1);
  tempADisplay.innerHTML = `T<sub>&infin;</sub> = ${temperatureFromKelvin(temp1)}&nbsp;&nbsp;&nbsp;&nbsp;a = &Sqrt;<span STYLE="text-decoration:overline">&gamma;RT</span> = ${speedForMetric(a1,2)}`;
  presDensDisplay.innerHTML = `P<sub>&infin;</sub> = ${pressureFromPascals(pres1)}&nbsp;&nbsp;&nbsp;&nbsp;&rho;<sub>&infin;</sub> = ${densityFromMetric(dens1)}`;
  displayRGammaACD();
}

rhoTP1Slider.oninput = function(){
  setRhoTP(1);
}

rhoTP1Slider.onpointerup = function(){
  computeAllFlow();
  replaceAerovisualizerData('altitude-slider-index',altitudeSliderIndex);
  replaceAerovisualizerData('density-slider-index',densitySliderIndex);
  replaceAerovisualizerData('temperature-slider-index',temperatureSliderIndex);
  replaceAerovisualizerData('pressure-slider-index',pressureSliderIndex);
  saveToLocalStorage();
}

rhoTP2Slider.oninput = function(){
  setRhoTP(2);
}

rhoTP2Slider.onpointerup = function(){
  computeAllFlow();
  replaceAerovisualizerData('density-slider-index',densitySliderIndex);
  replaceAerovisualizerData('temperature-slider-index',temperatureSliderIndex);
  replaceAerovisualizerData('pressure-slider-index',pressureSliderIndex);
  saveToLocalStorage();
}

gasMediumMenu.addEventListener('change', () => {
  gasMediumMenuSelection = gasMediumMenu.value;
  handleGasMediumOnChange();
  replaceAerovisualizerData('gas-medium-menu-selection',gasMediumMenuSelection);
  saveToLocalStorage();
});

const displayRGammaACD = function(){
  rGammaDisplay.innerHTML = `R = ${Number(gasConstant).toFixed(2).toString()} J/kg/&deg;K&nbsp;&nbsp;&nbsp;&nbsp;&gamma; = ${Number(gamma).toFixed(3).toString()}&nbsp;&nbsp;&nbsp;&nbsp;C<sub>Dwave</sub> = ${Number(waveDragCoef).toExponential(3).toString()}`;
}

const handleGasMediumOnChange = function(){
  switch (rhoTPMenuSelection){
    case '1':
      let alt = altitude[+rhoTP1Slider.value];
      rhoTP1SliderDisplay.innerHTML = `altitude: ${Number(alt).toFixed(1).toString()} km`;
      rhoTP2SliderDisplay.innerHTML = '';
      break;
    case '2':
      rhoTP1SliderDisplay.innerHTML = `density: ${Number(dens1).toExponential(3).toString()} kg/m³`;
      rhoTP2SliderDisplay.innerHTML = `pressure: ${Number(pres1).toExponential(4).toString()} N/m²`;
      break;
    case '3':
      rhoTP1SliderDisplay.innerHTML = `pressure: ${Number(pres1).toExponential(4).toString()} N/m²`;
      rhoTP2SliderDisplay.innerHTML = `temperature: ${Number(temp1-273.15).toFixed(0).toString()} &deg;C`;
      break;
    case '4':
      rhoTP1SliderDisplay.innerHTML = `temperature: ${Number(temp1-273.15).toFixed(0).toString()} &deg;C`;
      rhoTP2SliderDisplay.innerHTML = `density: ${Number(dens1).toExponential(3).toString()} kg/m³`;
      break;
  }

  gamma = gammaData[gasMediumMenuSelection];
  gasConstant = rData[gasMediumMenuSelection];
  a1 = Math.sqrt(gamma*gasConstant*temp1);
  rhoTPMenu[0].disabled = true;

  if (gasMediumMenuSelection.startsWith('dry_air')){
    rhoTPMenu[0].disabled = false;
  }else{
    if (rhoTPMenu.selectedIndex === 0){
      rhoTPMenuSelection = "2";
      replaceAerovisualizerData('rhoTP-menu-selection',rhoTPMenuSelection);
      saveToLocalStorage();
      rhoTPMenu.selectedIndex = 1;
    }
  }

  setRhoTP();
  computeAllFlow();
}

const setTransparency = function(thing, transparency){
  const opacity = (100 - transparency)/100;
  ufo.setOpacity(thing,opacity);

  switch (thing){
    case 'ufo':
      ufoTransparencyDisplay.innerHTML = transparency;
      break;
    case 'forward-shock':
      forwardShockTransparencyDisplay.innerHTML = transparency;
      break;
    case 'aft-shock':
      aftShockTransparencyDisplay.innerHTML = transparency;
      break;
    case 'labels':
      labelsTransparencyDisplay.innerHTML = transparency;
      break;
  }
}

ufoTransparencySlider.oninput = function(){
  ufoTransparencyDisplay.innerText = ufoTransparencySlider.value;
  setTransparency('ufo',this.value);
}

ufoTransparencySlider.onpointerup = function(){
  replaceAerovisualizerData('ufo-transparency',this.value);
  saveToLocalStorage();
}

forwardShockTransparencySlider.oninput = function(){
  forwardShockTransparencyDisplay.innerText = forwardShockTransparencySlider.value;
  setTransparency('forward-shock',this.value);
}

forwardShockTransparencySlider.onpointerup = function(){
  replaceAerovisualizerData('forward-shock-transparency',this.value);
  saveToLocalStorage();
}

aftShockTransparencySlider.oninput = function(){
  aftShockTransparencyDisplay.innerText = aftShockTransparencySlider.value;
  setTransparency('aft-shock',this.value);
}

aftShockTransparencySlider.onpointerup = function(){
  replaceAerovisualizerData('aft-shock-transparency',this.value);
  saveToLocalStorage();
}

labelsTransparencySlider.oninput = function(){
  labelsTransparencyDisplay.innerText = labelsTransparencySlider.value;
  setTransparency('labels',this.value);
}

labelsTransparencySlider.onpointerup = function(){
  replaceAerovisualizerData('labels-transparency',this.value);
  saveToLocalStorage();
}

ufoColorMenu.addEventListener('change', () => {
  ufoColor = ufoColorMenu.value;
  ufo.setColor('ufo', ufoColor);
  replaceAerovisualizerData('ufo-color',ufoColor);
  saveToLocalStorage();
});

forwardShockColorMenu.addEventListener('change', () => {
  forwardShockColor = forwardShockColorMenu.value;
  ufo.setColor('forward-shock', forwardShockColor);
  replaceAerovisualizerData('forward-shock-color',forwardShockColor);
  saveToLocalStorage();
});

aftShockColorMenu.addEventListener('change', () => {
  aftShockColor = aftShockColorMenu.value;
  ufo.setColor('aft-shock', aftShockColor);
  replaceAerovisualizerData('aft-shock-color',aftShockColor);
  saveToLocalStorage();
});

labelsColorMenu.addEventListener('change', () => {
  labelsColor = labelsColorMenu.value;
  ufo.setColor('labels', labelsColor);
  replaceAerovisualizerData('labels-color',labelsColor);
  saveToLocalStorage();
});

const toggleShowInfo = function(){
  if (threeDWorld.style.display === 'none'){
    threeDWorld.style.display = 'block';
    rhoTPButton.style.display = 'block';
    machButton.style.display = 'block';
    deltaButton.style.display = 'block';
    preferencesButton.style.display = 'block';
    infoButton.style.display = 'block';
    mainReturnButton.style.display = 'block';
    setNumericalDisplay();
    infoElements.style.display = 'none';
    doWindowResizeOrOrientationChange();
    handleMainButtons(currentMainButton);
  }else{
    threeDWorld.style.display = 'none';
    rhoTPButton.style.display = 'none';
    machButton.style.display = 'none';
    deltaButton.style.display = 'none';
    preferencesButton.style.display = 'none';
    infoButton.style.display = 'none';
    mainReturnButton.style.display = 'none';
    numericalButtonsElements.style.display = 'none';
    numerical1Elements.style.display = 'none';
    numerical2Elements.style.display = 'none';
    numerical3Elements.style.display = 'none';
    infoElements.style.display = 'grid';
    handleMainButtons('none');
  }
}

infoButton.addEventListener('click', () => {
  toggleShowInfo();
});

infoReturnButton.addEventListener('click', () => {
  toggleShowInfo();
});

//Note the static &rho;, T, P, the stagnation &rho;<sub>0</sub>, 
//T<sub>0</sub>, P<sub>0</sub>, the dynamic pressure (q), the speed of sound (a), and the Mach angles in the 5 flow regions around the UFO.
//<p class="p-normal">2) Click <em>Mach #</em> to set the Mach number or speed of the UFO.</p>
//<p class="p-normal">  Choose the <em>Mach #</em> and use the slider to set the Mach number and 
//      <p class="p-normal">Use the second menu to choose how you want to set the ambient density (&rho;<sub>&infin;</sub>), 
//temperature (T<sub>&infin;</sub>), and pressure (P<sub>&infin;</sub>).  Set them using 
//      <p class="p-normal">Oblique shock waves form in the shape of a cone.</p>

const handleInfoMenuChoice = function(choice){
  switch (choice){
    case 'info-intro': //introduction
      infoText.innerHTML = `<p class="p-normal">The purpose of <em>Aerovisualizer</em> is to 
      assist in the teaching of concepts in aerospace engineering by presenting 
      them in interesting and engaging ways.  Subjects are displayed in 3D to 
      complement the dry equations found in textbooks and online.  Buttons and sliders 
      are provided for user interaction.</p>
      
      <p class="p-normal"><em>Aerovisualizer - Oblique Shocks</em> focuses on the formation 
      of oblique shock waves.  It is assumed that the user has taken or is currently taking 
      a course covering this topic.</p>

      <p class="p-normal">In Aerovisualizer, shock waves form around a pointed shaped UFO flying supersonically.  
      For simplicity, the UFO has no wings nor apparent means of propulsion nor stabilization.  
      It consists of three sections: a forward cone, a middle cylinder, and an aft cone.  
      Oblique shocks form at the forward and aft ends.  The UFO flies at zero angle of attack.</p>
      
      <p class="p-normal">Prandtl-Meyer expansion fans form where the cones 
      join the cylinder, but are not rendered.  Also not modeled nor rendered are detached shock 
      waves and the turbulent wake.  Boundary layer effects are not considered.</p>`;
      break;

    case 'info-how-to-use': //how to use aerovisualizer
      infoText.innerHTML = `
      <p class="p-normal">Click or tap the buttons labeled <em>&gamma;R&rho;<sub>&infin;</sub>T<sub>&infin;</sub>P<sub>&infin;</sub></em>
      , <em>Mach #</em>, and <em>defl</em>. Manipulate the buttons, menus, and sliders that appear.  Observe 
      how the shock waves and data change in response.</p>`;
      break;

    case 'info-how-to-use-rhoTP-btn-gas-menu': //gas medium menu
      infoText.innerHTML = `<p class="p-normal">Click or tap the <em>&gamma;R&rho;<sub>&infin;</sub>T<sub>&infin;</sub>P<sub>&infin;</sub></em>
      button.  Use the top menu to state the gas that the UFO flies in.  This sets the <em>gas constant</em>, <em>R</em>, and the <em>heat capacity ratio</em>, <em>&gamma;</em>.</p>`;
      break;

    case 'info-how-to-use-rhoTP-btn-rhotp-menu': //rho, T, P menu
      infoText.innerHTML = `<p class="p-normal">Click or tap the <em>&gamma;R&rho;<sub>&infin;</sub>T<sub>&infin;</sub>P<sub>&infin;</sub></em>
      button.  Use the second menu to set how to set the <em> density (&rho;<sub>&infin;</sub>)</em>, <em>temperature (T<sub>&infin;</sub>)</em>, and <em>pressure (P<sub>&infin;</sub>)</em> of 
      the gas. Use the sliders to set the values.</p>
      <p class="p-normal">You can set &rho;<sub>&infin;</sub>, T<sub>&infin;</sub>, and P<sub>&infin;</sub> using altitude data from the 1976 Standard Atmosphere (dry air only).</p>
      <p class="p-normal">The other menu options let you set two of either &rho;<sub>&infin;</sub>, P<sub>&infin;</sub>, or T<sub>&infin;</sub> individually while enforcing the equation <em>P=&rho;RT</em>.</p>
      <p class="p-normal"><em>Important:</em> Extremely high and low temperatures and pressures are allowed by Aerovisualizer.  Since gases can become 
      a plasma or a liquid or a solid under the right conditions, these conditions should be considered when viewing and interpreting the data.</p>`;
      break;

    case 'info-how-to-use-mach-num-btn': // Mach number
      infoText.innerHTML = `<p class="p-normal">Click or tap the <em>Mach #</em> button 
      to set the <em>Mach number</em>, <em>M</em>, of the UFO as it flies through the abient gas.  M is the ratio of the speed of 
      the local flow to the local speed of sound.  Use the slider to set the value of M in Region 1 (see <em>flow regions</em> in this menu).  The range is from 1.1 to 10.</p>

      <p class="p-normal">Shock waves can become detached at low mach numbers.  See <em>detached shock waves</em> in this menu for more information.</p>`;
      break;

    case 'info-how-to-use-defl-btn': // deflection angle
      infoText.innerHTML = `<p class="p-normal">Click or tap the <em>defl</em> button to set the half cone angles 
      of the cones at the forward and aft ends of the UFO.  This sets boundary conditions on the flow, and thus the 
      <em>deflection angles</em> for the two shock waves and two Prandtl-Meyer expansion fans.</p>
      
      <p class="p-normal">Use the menu to specify whether to modify the forward cone or the aft cone.  Use the slider 
      to set the value (from 1&deg; to 30&deg;).</p>

      <p class="p-normal">Shock waves can become detached at high deflection angles.  See <em>detached shock waves</em> in this menu for more information.</p>`;
      break;

    case 'info-how-to-use-display-toggle-cycle-btns': // display toggle and cycle buttons
      infoText.innerHTML = `<p class="p-normal">Click or tap either the <em>Mach #</em> or the <em>defl</em> button.  
      Click or tap the <em>Mach/speed</em> button to toggle the display between Mach number and speed.  The speed of the 
      flow in a region equals the local Mach number times the local speed of sound.</p>

      <p class="p-normal">Click or tap either the <em>P&rarr;T</em>, the <em>T&rarr;&rho;</em>, or the <em>&rho;&rarr;P</em> button. 
      The displayed data changes to one of three options:</p>
      
      <p class="p-normal"><em>1-</em> static pressure (P), stagnation pressure (P<sub>0</sub>), and dynamic pressure (q),</p>
      <p class="p-normal"><em>2-</em> static temperature (T), stagnation temperature (T<sub>0</sub>), and the speed of sound (a),</p>
      <p class="p-normal"><em>3-</em> static density (&rho;), stagnation density (&rho;<sub>0</sub>), and the Mach angle in degrees.</p>

      <p class="p-normal"><em>Note 1:</em> The <em>dynamic pressure</em>, <em>q</em>, for compressed gas does <em>not</em> equal &half;&rho;v<sup>2</sup>.  It is simply P<sub>0</sub> minus P.</p>
      <p class="p-normal"><em>Note 2:</em> The <em>Mach angle</em> equals sin<sup>-1</sup>(1/M).</p>`;
      break;

    case 'info-flow-regions': // flow regions
      infoText.innerHTML = `<p class="p-normal">
      <em>There are 5 flow regions about the UFO:</em></p>
      <p class="p-normal"><em>1-</em> before the forward shock,</p>
      <p class="p-normal"><em>2-</em> after the forward shock but before the first expansion fan,</p>
      <p class="p-normal"><em>3-</em> after the first expansion fan but before the second one,</p>
      <p class="p-normal"><em>4-</em> after second expansion fan but before the aft shock, and</p>
      <p class="p-normal"><em>5-</em> after the aft shock.</p><p></p>
      <p class="p-normal">These 5 flow regions are labeled on the 3D image and are referred to as "N" in the data display.</p><p></p>
      <p class="p-normal"><em>IMPORTANT:</em> In region 1, &rho;&equals;&rho;<sub>&infin;</sub>, T&equals;T<sub>&infin;</sub>, 
      and P&equals;P<sub>&infin;</sub>.  <em>These boundary conditions must apply to both region 1 and region 5!</em> 
      Deltas between &rho;, T, P and the flow speed in regions 1 and 5 result from the software implementation.  Aerovisualizer is open source, so if you know a better way, please let us know!  
      For now, reduce the &Delta;s by lowering the Mach # or the deflection angles.</p>`;
      break;

    case 'info-gas-constant':
      infoText.innerHTML = `<p class="p-normal">The <em>specific gas constant</em>, R<sub>spec</sub>, for a gas is related to the universal gas constant, R<sub>univ</sub> by the formula, R<sub>spec</sub> = R<sub>univ</sub>&div;M, where M = the mass of a mole of the gas.</p>
      <p class="p-normal">In Aerovisualizer, R<sub>spec</sub> is referred to by just <em>R</em>.  R is larger for lighter gases like hydrogen and smaller for heavier ones like xenon. The speed of sound, <em>a</em>, is 
      proportional to &Sqrt;<span STYLE="text-decoration:overline">R</span>.</p>`;
      break;

    case 'info-heat-capacity-ratio':
      infoText.innerHTML = `<p class="p-normal">The <em>heat capacity ratio</em>, <em>&gamma;</em>, (also known as the adiabatic index, the ratio of specific heats, or Laplace's coefficient), is the ratio of the heat capacity at constant pressure (C<sub>P</sub>) to the heat capacity at constant volume (C<sub>V</sub>).</p>
      <p class="p-normal">The equipartition theorem predicts that &gamma; for an ideal gas is related to the <em>thermally accessible degrees of freedom</em> (<em>f</em>) of a molecule by the relation, <em>&gamma;&nbsp;&equals;&nbsp;1&nbsp;&plus;&nbsp;(2/f)</em>.  &gamma; is larger for monatomic molecules 
      such as helium and smaller for more complex ones such as propane.  The vibrational degrees of freedom are less 
      prominent than the translational and rotational ones, but come more into play at higher temperatures.  Rotational degrees of freedom 
      are more prominent at low temperatures.</p>`;
      break; 

    case 'info-speed-of-sound':
      infoText.innerHTML = `<p class="p-normal">The <em>speed of sound</em>, <em>a</em>, depends on temperature as well as the medium through which a sound wave is propagating.  Although it has a weak dependence on frequency and pressure, the speed of sound for all pratical purposes is equal to &Sqrt;<span STYLE="text-decoration:overline">&gamma;RT</span>.</p>
      <p class="p-normal">The Mach number, M, is the ratio of the speed of the local flow to the local speed of sound.  Shock waves form in <em>supersonic flow</em> (<em>M > 1</em>) and in <em>transonic flow</em> (<em>0.8 < M < 1.2</em>) in areas of the body where local airflow accelerates to supersonic speed.  They appear at lower flow speeds in gases with a lower speed of sound (gases with complex molecules such as propane, 
      heavy gases such as xenon, and at low temperatures for all gases).  Conversely, shock waves appear at high speeds in gases such as hydrogen and in gases at high temperatures.</p>`;
      break;
      
    case 'info-detached-shock-waves':
      infoText.innerHTML = `<p class="p-normal">The points of the shock cones in Aerovisualizer coincide with the points of the UFO.  The shocks would become rounded and detached from the UFO when the Mach number is set too low or the deflection angles too high.</p>
      <p class="p-normal">Aerovisualizer does not attempt to model nor render these types of shock waves. <em>That does not mean that they do not occur!</em>  It just means that they are too difficult to implement here.</p>`;
      break;

    case 'info-wave-drag':
      infoText.innerHTML = `<p class="p-normal">Wave drag is a component of the pressure drag on objects moving at transonic and supersonic speeds due to the presence of shock waves.  Shock waves form in supersonic flow and at subsonic speeds starting at Mach 0.8 on areas of the body where local airflow accelerates to supersonic speed.</p>
      <p class="p-normal">Aerovisualizer calculates the <em>wave drag coefficient (C<sub>Dwave</sub>)</em> for a <em>Sears–Haack body</em>, a body with the lowest theoretical wave drag.  It is a slender body that assumes a small-disturbance in flow.  The derivation and shape were published independently by Wolfgang Haack in 1941 and later by William Sears in 1947.</p>
      <p class="p-normal">The Sears–Haack body is pointed at each end and grows smoothly to a maximum in the middle.  Aerovisualizer's UFO is not smooth, nor is it slender for large deflection angles.  Choose low deflection angles for C<sub>Dwave</sub> to most closely match that of a Sears–Haack body.  Its value equals 9&pi;<sup>2</sup>R<sup>2</sup>&div;(2L<sup>2</sup>), where R is the maximum radius and L is the length.</p>`;
      break;

    case 'info-sonic-boom':
      infoText.innerHTML = `<p class="p-normal">Sonic booms occur when shock waves pass observers who hear them.  The sudden rise in pressure from the first shock wave is followed by a decrease in pressure, and then a sudden return to normal pressure after the second shock wave. This "overpressure profile" is known as an N-wave because of its shape.  Sonic booms are often perceived in pairs when the two shock waves are sufficiently separated.  More than two shock waves are possible,  depending on the vehicle (listen for 3 of them in videos of SpaceX booster landings).</p>
      <p class="p-normal">A sonic boom does <em>not</em> occur only at the moment an object passes through Mach 1.  It is also <em>not</em> heard in all directions from the supersonic object. Rather, the boom is heard only by observers within the "boom carpet", the intersection of the moving shock cones with the ground.</p>
      <p class="p-normal">Lastly, the phrase, "breaking the sound barrier" is often used when referring to sonic booms.  This antiquated expression originated in the mid 20th century when it was believed that aircraft were not capable of surpassing Mach 1.  This "sound barrier" is a fiction, and yet the expression somehow lives on.</p>`;
      break;

    case 'info-prefs-main': //preferences - main
      infoText.innerHTML = `<p class="p-normal">Click <em>pref</em>.  Buttons appear 
      labeled as below:</p>
      <p class="p-normal"><em>transparency</em></p>
      <p class="p-normal"><em>color</em>, and</p>
      <p class="p-normal"><em>misc</em>.</p>`;
      break;

    case 'info-prefs-transparency': //preferences - transparency
      infoText.innerHTML = `<p class="p-normal">Use the sliders to set the <em>transparency</em> 
      (visibility) of the UFO, the two shock waves, and the number labels for the 5 flow regions.  
      Move the sliders completely to the right to make objects disappear.</p>`;
      break;

    case 'info-prefs-color': //preferences - color
      infoText.innerHTML = `<p class="p-normal">Use the menus to choose the <em>color</em> of 
      the UFO, the two shock waves, and the number labels for the 5 flow regions.</p>`;
      break;

    case 'info-prefs-misc': //preferences - miscellaneous
      infoText.innerHTML = `<p class="p-normal">Use the menus to specify the <em>units</em> for the following:</p>
      <p class="p-normal"><em>Density</em> - kg/m³, lbm/ft³, slugs/ft³,</p>
      <p class="p-normal"><em>Temperature</em> - degrees Celsius, Kelvin, Fahrenheit, Rankine,</p>
      <p class="p-normal"><em>Pressure</em> - Pascals (Pa, N/m²), bar, kPa, MPa, pounds per square inch (psi), kg(force)/cm², 
      inches of Mercury (inHg), Ba, hectopascals (hPa, millibar), Standard Atmospheres (atm), Torr, and</p>
      <p class="p-normal"><em>Speed</em> - meters per second (m/s), knots, feet per second (ft/s), kilometers per hour (km/h), miles per hour (mph).</p>
      <p class="p-normal">Click the checkbox to display the <em>altitude</em> in units of 
      feet (default is kilometers).</p>`;
      break;

    case 'info-references':
      infoText.innerHTML = `<p class="p-normal">en.wikipedia.org/wiki/</p>
      <p class="p-normal">&nbsp;&nbsp;Gas_constant, Heat_capacity, Heat_capacity_ratio,</p>
      <p class="p-normal">&nbsp;&nbsp;Normal_shock_tables, Prandtl–Meyer_expansion_fan,</p>
      <p class="p-normal">&nbsp;&nbsp;Dynamic_pressure, Wave_drag, Sears–Haack_body, Sonic_boom</p>
      <p class="p-normal">www.grc.nasa.gov/www/k-12/airplane/normal, machang</p>
      <p class="p-normal">kyleniemeyer.github.io/gas-dynamics-notes</p>
      <p class="p-normal">www.pdas.com/atmos</p>
      <p class="p-normal">arc.aiaa.org/doi/epdf/10.2514/3.46670</p>
      <p class="p-normal">www.engineeringtoolbox.com</p>`;
      break;
      
    case 'info-contact-disclaimer':
      infoText.innerHTML = `<p class="p-normal">Aerovisualizer is an open source 
      project.  To report bugs or suggestions or to contribute to its development, 
      please contact us at github.com/eastmanrj/aerovisualizer.  The source code is 
      free to download.</p>

      <p class="p-normal">We do not take responsibility for missed problems on 
      quizes, tests, projects, or homework due to software errors or the 
      misinterpretation of displays in Aerovisualizer.  Do not use Aerovisualizer 
      for hardware or software qualification in aerospace or other industries nor 
      in any other applications except as a learning aid.</p>`;
      break;
  }
}

infoMenu.addEventListener('change', () => {
  const choice = infoMenu.value;
  handleInfoMenuChoice(choice);
});

const handlePreferencesButtons = function(button){
  miscPrefButton.disabled = false;
  transparencyPrefButton.disabled = false;
  colorPrefButton.disabled = false;
  
  numericalButtonsElements.style.display = 'none';
  numerical1Elements.style.display = 'none';
  numerical2Elements.style.display = 'none';
  numerical3Elements.style.display = 'none';
  transparencyPrefElements.style.display = 'none';
  colorPrefElements.style.display = 'none';
  miscElements.style.display = 'none';

  switch (button){
    case 'transparency':
      transparencyPrefElements.style.display = 'grid';
      transparencyPrefButton.disabled = true;
      break;
    case 'color':
      colorPrefElements.style.display = 'grid';
      colorPrefButton.disabled = true;
      break;
    case 'misc':
      miscElements.style.display = 'grid';
      miscPrefButton.disabled = true;
      break;
    case 'none':
      setNumericalDisplay();
      break;
  }
}

miscPrefButton.addEventListener('click', () => {
  handlePreferencesButtons('misc');
});

transparencyPrefButton.addEventListener('click', () => {
  handlePreferencesButtons('transparency');
});

colorPrefButton.addEventListener('click', () => {
  handlePreferencesButtons('color');
});

altitudeFeetCheckbox.addEventListener('change', () => {
  altitudeIsInFeet = altitudeFeetCheckbox.checked;
  setRhoTP(1);
  replaceAerovisualizerData('altitude-is-in-feet',altitudeIsInFeet);
  saveToLocalStorage();
});

temperatureScaleMenu.addEventListener('change', () => {
  temperatureScaleMenuSelection = temperatureScaleMenu.value;
  setRhoTP();
  updateDisplay();
  displayDensTempPresLabels();
  replaceAerovisualizerData('temperature-scale-menu-selection',temperatureScaleMenuSelection);
  saveToLocalStorage();
});

densityUnitsMenu.addEventListener('change', () => {
  densityUnitsMenuSelection = densityUnitsMenu.value;
  setRhoTP();
  updateDisplay();
  displayDensTempPresLabels();
  replaceAerovisualizerData('density-units-menu-selection',densityUnitsMenuSelection);
  saveToLocalStorage();
});

pressureUnitsMenu.addEventListener('change', () => {
  pressureUnitsMenuSelection = pressureUnitsMenu.value;
  setRhoTP();
  updateDisplay();
  displayDensTempPresLabels();
  replaceAerovisualizerData('pressure-units-menu-selection',pressureUnitsMenuSelection);
  saveToLocalStorage();
});

speedUnitsMenu.addEventListener('change', () => {
  speedUnitsMenuSelection = speedUnitsMenu.value;
  setRhoTP();
  updateDisplay();
  replaceAerovisualizerData('speed-units-menu-selection',speedUnitsMenuSelection);
  saveToLocalStorage();
});

prefsReturnButton.addEventListener('click', () => {
  toggleShowPrefs();
});

// finds the turning angle when given a Mach number
const prandtlMeyer = function(m, gamma){
  const gammaThing = (gamma + 1)/(gamma - 1);
  const sqrtGammaThing = Math.sqrt(gammaThing);
  const nu = sqrtGammaThing*Math.atan(Math.sqrt((m*m - 1)/gammaThing))
   - Math.atan(Math.sqrt(m*m - 1));

  return nu;// nu is in radians
}

// finds the Mach number when given a turning angle.
// The algorithm was found here -->
// ftp.demec.ufpr.br/CFD/bibliografia/propulsao/Hall_1975.pdf
// and there is another article here -->
// arc.aiaa.org/doi/epdf/10.2514/3.46670
const inversePrandtlMeyer = function(nu, gamma){
  // nu must be in radians
  const lamda = Math.sqrt((gamma - 1)/(gamma + 1));

  // first guess of Mach number
  let m = (1/(lamda*lamda) - 1)/(Math.PI*(1/lamda - 1)/2 - nu);
  let beta = Math.sqrt(m*m - 1);

  // iterate a few times
  m = Math.sqrt(beta*beta + 1);
  let f = Math.tan(lamda*(nu + Math.atan(beta)))/lamda - beta;
  beta = beta + (1 + beta*beta)*f/((1 - lamda*lamda)*beta*beta);
  m = Math.sqrt(beta*beta + 1);
  f = Math.tan(lamda*(nu + Math.atan(beta)))/lamda - beta;
  beta = beta + (1 + beta*beta)*f/((1 - lamda*lamda)*beta*beta);
  m = Math.sqrt(beta*beta + 1);
  f = Math.tan(lamda*(nu + Math.atan(beta)))/lamda - beta;
  beta = beta + (1 + beta*beta)*f/((1 - lamda*lamda)*beta*beta);
  m = Math.sqrt(beta*beta + 1);

  return m;
}

// computes the stagnation temperature, pressure, and density
// given the Mach number and the static values
const computeStagnationDensTempPres = function(m, rho, t, p){
  const t0OverT = 1 + m*m*(gamma - 1)/2;
  const oneOverGammaMinus1 = 1/(gamma - 1);
  const gammaOverGammaMinus1 = gamma*oneOverGammaMinus1;
  const rho0OverRho = Math.pow(t0OverT,oneOverGammaMinus1);
  const p0OverP = Math.pow(t0OverT,gammaOverGammaMinus1);
  const rho0 = rho*rho0OverRho;
  const t0 = t*t0OverT;
  const p0 = p*p0OverP;

  return [rho0, t0, p0];
}

// computes the static temperature, pressure, and density ratios
// given two Mach numbers
const computeDensTempPresRatios = function(m1, m2){
  if (m2 === NaN){
    return [NaN, NaN, NaN];
  }

  const t0OverT1 = 1 + m1*m1*(gamma - 1)/2;
  const t0OverT2 = 1 + m2*m2*(gamma - 1)/2;
  const t2OverT1 = t0OverT1/t0OverT2;
  const oneOverGammaMinus1 = 1/(gamma - 1);
  const gammaOverGammaMinus1 = gamma*oneOverGammaMinus1;
  const rho2OverRho1 = Math.pow(t2OverT1,oneOverGammaMinus1);
  const p2OverP1 = Math.pow(t2OverT1,gammaOverGammaMinus1);

  return [rho2OverRho1, t2OverT1, p2OverP1];
}

const computeAllFlow = function(){
  let [forwardShockHalfConeAngle,m2,m0Norm,m1Norm,rho21,t21,p21] = shock(mach1,forwardDelta,gamma);
  // m0Norm and m1Norm are the normal components of the Mach number before and
  // after the shock.  They are not displayed at present

  if (!m2){
    // detached shock, function was not able to find a value for sigma.
    // We do not change the 3D image to indicate this, although we probably 
    // should in the future using ufo.setShockWaveHalfConeAngles
    updateDisplay(true);
    return;
  }

  machAngle1Display.innerHTML = Number(Math.asin(1/mach1)/piOver180).toFixed(1).toString();
  mach2 = m2;
  machAngle2Display.innerHTML = Number(Math.asin(1/mach2)/piOver180).toFixed(1).toString();

  //static values in region 2
  dens2 = dens1*rho21;
  temp2 = temp1*t21;
  pres2 = pres1*p21;

  const [dens20, temp20, pres20] = computeStagnationDensTempPres(mach2, dens2, temp2, pres2);

  //stagnation values in region 2
  stagDens2 = dens20;
  stagTemp2 = temp20;
  stagPres2 = pres20;
  q2 = stagPres2 - pres2;
  a2 = Math.sqrt(gamma*gasConstant*temp2);

  mach3 = NaN;
  let nu;

  if (mach2 != NaN){
    // determine the Prandtl-Meyer angle in region 2, then
    // add the forward deflection angle where the cone meets
    // the cylinder.  Then find the Mach number for this angle
    // which is for region 3
    nu = prandtlMeyer(mach2,gamma) + forwardDelta*piOver180;
    mach3 = inversePrandtlMeyer(nu, gamma);
    machAngle3Display.innerHTML = Number(Math.asin(1/mach3)/piOver180).toFixed(1).toString();
  }

  let [rho32,t32,p32] = computeDensTempPresRatios(mach2, mach3);

  //static values in region 3
  dens3 = dens2*rho32;
  temp3 = temp2*t32;
  pres3 = pres2*p32;

  const [dens30, temp30, pres30] = computeStagnationDensTempPres(mach3, dens3, temp3, pres3);

  //stagnation values in region 3
  stagDens3 = dens30;
  stagTemp3 = temp30;
  stagPres3 = pres30;
  q3 = stagPres3 - pres3;
  a3 = Math.sqrt(gamma*gasConstant*temp3);

  mach4 = NaN;

  if (mach3 != NaN){
    // determine the Prandtl-Meyer angle in region 3, then
    // add the aft deflection angle where the cone meets
    // the cylinder.  Then find the Mach number for this angle
    // which is for region 4
    nu = prandtlMeyer(mach3,gamma) + aftDelta*piOver180;
    mach4 = inversePrandtlMeyer(nu, gamma);
    machAngle4Display.innerHTML = Number(Math.asin(1/mach4)/piOver180).toFixed(1).toString();
  }

  let [rho43,t43,p43] = computeDensTempPresRatios(mach3, mach4);

  //static values in region 4
  dens4 = dens3*rho43;
  temp4 = temp3*t43;
  pres4 = pres3*p43;

  const [dens40, temp40, pres40] = computeStagnationDensTempPres(mach4, dens4, temp4, pres4);

  //stagnation values in region 4
  stagDens4 = dens40;
  stagTemp4 = temp40;
  stagPres4 = pres40;
  q4 = stagPres4 - pres4;
  a4 = Math.sqrt(gamma*gasConstant*temp4);

  let [aftShockHalfConeAngle,m5,m3Norm,m4Norm,rho54,t54,p54] = shock(mach4,aftDelta,gamma);

  mach5 = m5;
  machAngle5Display.innerHTML = Number(Math.asin(1/mach5)/piOver180).toFixed(1).toString();

  //static values in region 5
  dens5 = dens4*rho54;
  temp5 = temp4*t54;
  pres5 = pres4*p54;

  const [dens50, temp50, pres50] = computeStagnationDensTempPres(mach5, dens5, temp5, pres5);
  
  //stagnation values in region 5
  stagDens5 = dens50;
  stagTemp5 = temp50;
  stagPres5 = pres50;
  q5 = stagPres5 - pres5;
  a5 = Math.sqrt(gamma*gasConstant*temp5);

  // earlier we found the forward and aft half cone angles for the two shock cones.
  // Here, we update the values for the ufo object so that it can display
  // them properly.  We also update the numerical display
  ufo.setShockWaveHalfConeAngles(forwardShockHalfConeAngle,aftShockHalfConeAngle);
  ufo.needsRefresh = true;
  updateDisplay();

  if (!m5){
    // detached aft shock, function was not able to find a value for sigma.
    // We do not change the 3D image to indicate this, although we probably 
    // should in the future using ufo.setShockWaveHalfConeAngles
    displayForDetachedShockForRegion5();
    return;
  }
}

const shock = function(m1,deltaDegrees,gamma){
  // m1 is the Mach number before the shock
  // gamma is the heat capacity ratio
  const delta = deltaDegrees*piOver180;//flow turning angle in radians, 
  //same as half cone angles of forward and aft cones
  let dsig = 0.1;// a small angle in radians 
  let sigma = Math.PI/2-dsig;//sigma is the angle of the oblique shock wave
  // to the initial flow direction.  We set it to slightly less than pi/2
  // as an initial guess and work down from there
  let tanSigma;// tangent of sigma
  let tanSigmaMinusDelta;// tangent of (sigma - delta)
  let tanRatio;// ratio of tanSigma to tanSigmaMinusDelta
  let m1n;// normal component to shock of Mach # before the shock
  let m1nSqu;// m1n squared
  let rho2OverRho1;// ratio of density after to before the shock
  let ratio = 2;// this is the ratio of tanRatio to rho2OverRho1.
  // These are two methods of computing rho2/rho1. Set this to 
  // anything greater than 1.  We want this ratio to be 1 in order 
  // to solve for sigma.  When we can't find sigma, that means that
  // there is a detached shock wave
  let previousRatio = ratio;
  let m2n;// normal component of Mach # after shock
  let m2;// Mach number after the shock
  let p2OverP1;//ratio of pressure after to before the shock
  let t2OverT1;//ratio of temperature after to before the shock

  //sigma starts at just under pi/2, work down to zero from there 
  while (sigma > 0){
    tanSigma = Math.tan(sigma);
    tanSigmaMinusDelta = Math.tan(sigma - delta);
    tanRatio = tanSigma/tanSigmaMinusDelta;
    m1n = m1*Math.sin(sigma);
    m1nSqu = m1n*m1n;
    rho2OverRho1 = (gamma + 1)*m1nSqu/((gamma - 1)*m1nSqu + 2);
    previousRatio = ratio;
    ratio = tanRatio/rho2OverRho1;

    // keep checking the new ratio and the old one.
    // If it is near 1, adjust dsig down an order of magnitude
    if (previousRatio <= 1 && ratio >= 1){
      if (dsig <= 0.0001){
        // don't try to solve for sigma less than 1000s place
        break;
      }

      sigma += dsig;
      ratio = previousRatio;
      dsig /= 10;
    }

    sigma -= dsig;
  }

  if (sigma <= 0){
    return [NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN];
  }

  // now we have sigma, so compute all of the data based on it
  p2OverP1 = (2*gamma*m1nSqu - (gamma - 1))/(gamma +1);
  m2n = Math.sqrt((m1nSqu*(gamma - 1) + 2)/(2*gamma*m1nSqu - (gamma-1)));
  m2 = m2n/Math.sin(sigma - delta);
  t2OverT1 = (m1nSqu*(gamma - 1) + 2)*(2*gamma*m1nSqu - (gamma 
      - 1))/((gamma + 1)*(gamma + 1)*m1nSqu);

  return [sigma,m2,m1n,m2n,rho2OverRho1,t2OverT1,p2OverP1];
}

const displayDensTempPresLabels = function(){
  let tld;

  switch(temperatureScaleMenuSelection){
    case 'celsius':
      tld = "&deg;C";
      break;
    case 'kelvin':
      tld = "&deg;K";
      break;
    case 'fahrenheit':
      tld = "&deg;F";
      break;
    case 'rankine':
      tld = "&deg;R";
      break;
  }

  tempLabelDisplay.innerHTML = `T ${tld}`;
  stagnationTempLabelDisplay.innerHTML = `T<sub>0</sub> ${tld}`;
  let rhold;

  switch(densityUnitsMenuSelection){
    case 'kg-per-m3':
      rhold = "kg/m³";
      break;
    case 'lbm-per-ft3':
      rhold = "lbm/ft³";
      break;
    case 'slugs-per-ft3':
      rhold = "slugs/ft³";
      break;
  }

  densLabelDisplay.innerHTML = `&rho; ${rhold}`;
  stagnationDensLabelDisplay.innerHTML = `&rho;<sub>0</sub> ${rhold}`;

  let pld;

  switch(pressureUnitsMenuSelection){
    case 'pascal':
      pld = "Pa";
      break;
    case 'bar':
      pld = "bar";
      break;
    case 'kilo-pascal':
      pld = "kPa";
      break;
    case 'mega-pascal':
      pld = "MPa";
      break;
    case 'psi':
      pld = "psi";
      break;
    case 'kgf-per-cm2':
      pld = "kg(f)/cm²";
      break;
    case 'inches-mercury':
      pld = "inHg";
      break;
    case 'barye':
      pld = "Ba";
      break;
    case 'hectopascal':
      pld = "hPa";
      break;
    case 'standard-atmosphere':
      pld = "atm";
      break;
    case 'torr':
      pld = "torr";
      break;
  }

  presLabelDisplay.innerHTML = `P ${pld}`;
  qLabelDisplay.innerHTML = `q ${pld}`;
  stagnationPresLabelDisplay.innerHTML = `P<sub>0</sub> ${pld}`;
}

const displayMachOrSpeed = function(){
  if (shockIsDetached){
    return;
  }

  let m1d;
  let m2d;
  let m3d;
  let m4d;
  let m5d;
  let msld;

  switch(speedUnitsMenuSelection){
    case 'meters-per-second':
      msld = "m/s";
      break;
    case 'knots':
      msld = "knots";
      break;
    case 'feet-per-second':
      msld = "ft/s";
      break;
    case 'kilometers-per-hour':
      msld = "km/h";
      break;
    case 'miles-per-hour':
      msld = "mph";
      break;
  }

  if (machSpeedState === 1){
    machSliderDisplay.innerHTML = `Mach ${Number(mach1).toFixed(1).toString()}`;
    machSpeedLabelDisplay1.innerHTML = "M";
    machSpeedLabelDisplay2.innerHTML = "M";
    machSpeedLabelDisplay3.innerHTML = "M";
    m1d = Number(mach1).toFixed(2).toString();
    m2d = Number(mach2).toFixed(2).toString();
    m3d = Number(mach3).toFixed(2).toString();
    m4d = Number(mach4).toFixed(2).toString();
    m5d = Number(mach5).toFixed(2).toString();
  }else{
    machSliderDisplay.innerHTML = `Speed ${speedForMetric(mach1*a1,2)}`;
    machSpeedLabelDisplay1.innerHTML = msld;
    machSpeedLabelDisplay2.innerHTML = msld;
    machSpeedLabelDisplay3.innerHTML = msld;
    m1d = speedForMetric(a1*mach1,2,false);
    m2d = speedForMetric(a2*mach2,2,false);
    m3d = speedForMetric(a3*mach3,2,false);
    m4d = speedForMetric(a4*mach4,2,false);
    m5d = speedForMetric(a5*mach5,2,false);
  }

  mach1Display.innerHTML = m1d;
  mach2Display.innerHTML = m2d;
  mach3Display.innerHTML = m3d;
  mach4Display.innerHTML = m4d;
  mach5Display.innerHTML = m5d;
  mach1Display2.innerHTML = m1d;
  mach2Display2.innerHTML = m2d;
  mach3Display2.innerHTML = m3d;
  mach4Display2.innerHTML = m4d;
  mach5Display2.innerHTML = m5d;
  mach1Display3.innerHTML = m1d;
  mach2Display3.innerHTML = m2d;
  mach3Display3.innerHTML = m3d;
  mach4Display3.innerHTML = m4d;
  mach5Display3.innerHTML = m5d;
  speedOfSoundLabelDisplay.innerHTML = `a ${msld}`;
  speedOfSound1Display.innerHTML = speedForMetric(a1,2,false);
  speedOfSound2Display.innerHTML = speedForMetric(a2,2,false);
  speedOfSound3Display.innerHTML = speedForMetric(a3,2,false);
  speedOfSound4Display.innerHTML = speedForMetric(a4,2,false);
  speedOfSound5Display.innerHTML = speedForMetric(a5,2,false);
}

toggleMachSpeedButton.addEventListener('click', () => {
  machSpeedState = machSpeedState === 1 ? 2 : 1;
  displayMachOrSpeed();
  replaceAerovisualizerData('mach-speed-state',machSpeedState);
  saveToLocalStorage();
});

cycleNumbersButton.addEventListener('click', () => {
  setNumericalDisplay(true);
});

const updateDisplay = function(detachedShock = false){
  shockIsDetached = false;

  if (detachedShock){
    shockIsDetached = true;
    mach1Display.innerHTML = "Detached";
    mach2Display.innerHTML = "Increase";
    mach3Display.innerHTML = "or";
    mach4Display.innerHTML = "reduce";
    mach5Display.innerHTML = "";
    mach1Display2.innerHTML = "Detached";
    mach2Display2.innerHTML = "Increase";
    mach3Display2.innerHTML = "or";
    mach4Display2.innerHTML = "reduce";
    mach5Display2.innerHTML = "";
    mach1Display3.innerHTML = "Detached";
    mach2Display3.innerHTML = "Increase";
    mach3Display3.innerHTML = "or";
    mach4Display3.innerHTML = "reduce";
    mach5Display3.innerHTML = "";
    p1Display.innerHTML = "shock.";
    p2Display.innerHTML = "the";
    p3Display.innerHTML = "";
    p4Display.innerHTML = "the";
    p5Display.innerHTML = "";
    t1Display.innerHTML = "shock.";
    t2Display.innerHTML = "the";
    t3Display.innerHTML = "";
    t4Display.innerHTML = "the";
    t5Display.innerHTML = "";
    rho1Display.innerHTML = "shock.";
    rho2Display.innerHTML = "the";
    rho3Display.innerHTML = "";
    rho4Display.innerHTML = "the";
    rho5Display.innerHTML = "";
    stagnationPressure1Display.innerHTML = "";
    stagnationPressure2Display.innerHTML = "Mach";
    stagnationPressure3Display.innerHTML = "";
    stagnationPressure4Display.innerHTML = "deflection.";
    stagnationPressure5Display.innerHTML = "";
    stagnationTemperature1Display.innerHTML = "";
    stagnationTemperature2Display.innerHTML = "Mach";
    stagnationTemperature3Display.innerHTML = "";
    stagnationTemperature4Display.innerHTML = "deflection";
    stagnationTemperature5Display.innerHTML = "";
    stagnationDensity1Display.innerHTML = "";
    stagnationDensity2Display.innerHTML = "Mach";
    stagnationDensity3Display.innerHTML = "";
    stagnationDensity4Display.innerHTML = "deflection";
    stagnationDensity5Display.innerHTML = "";
    dynamicPressure1Display.innerHTML = "";
    dynamicPressure2Display.innerHTML = "number";
    dynamicPressure3Display.innerHTML = "";
    dynamicPressure4Display.innerHTML = "angle.";
    dynamicPressure5Display.innerHTML = "";
    speedOfSound1Display.innerHTML = "";
    speedOfSound2Display.innerHTML = "number";
    speedOfSound3Display.innerHTML = "";
    speedOfSound4Display.innerHTML = "angle.";
    speedOfSound5Display.innerHTML = "";
    machAngle1Display.innerHTML = "";
    machAngle2Display.innerHTML = "number";
    machAngle3Display.innerHTML = "";
    machAngle4Display.innerHTML = "angle.";
    machAngle5Display.innerHTML = "";
    return;
  }

  p1Display.innerHTML = pressureFromPascals(pres1,4,false);
  p2Display.innerHTML = pressureFromPascals(pres2,4,false);
  p3Display.innerHTML = pressureFromPascals(pres3,4,false);
  p4Display.innerHTML = pressureFromPascals(pres4,4,false);
  p5Display.innerHTML = pressureFromPascals(pres5,4,false);
  stagnationPressure1Display.innerHTML = pressureFromPascals(stagPres1,4,false);
  stagnationPressure2Display.innerHTML = pressureFromPascals(stagPres2,4,false);
  stagnationPressure3Display.innerHTML = pressureFromPascals(stagPres3,4,false);
  stagnationPressure4Display.innerHTML = pressureFromPascals(stagPres4,4,false);
  stagnationPressure5Display.innerHTML = pressureFromPascals(stagPres5,4,false);
  dynamicPressure1Display.innerHTML = pressureFromPascals(q1,4,false);
  dynamicPressure2Display.innerHTML = pressureFromPascals(q2,4,false);
  dynamicPressure3Display.innerHTML = pressureFromPascals(q3,4,false);
  dynamicPressure4Display.innerHTML = pressureFromPascals(q4,4,false);
  dynamicPressure5Display.innerHTML = pressureFromPascals(q5,4,false);
  t1Display.innerHTML = temperatureFromKelvin(temp1,1,false);
  t2Display.innerHTML = temperatureFromKelvin(temp2,1,false);
  t3Display.innerHTML = temperatureFromKelvin(temp3,1,false);
  t4Display.innerHTML = temperatureFromKelvin(temp4,1,false);
  t5Display.innerHTML = temperatureFromKelvin(temp5,1,false);
  stagnationTemperature1Display.innerHTML = temperatureFromKelvin(stagTemp1,1,false);
  stagnationTemperature2Display.innerHTML = temperatureFromKelvin(stagTemp2,1,false);
  stagnationTemperature3Display.innerHTML = temperatureFromKelvin(stagTemp3,1,false);
  stagnationTemperature4Display.innerHTML = temperatureFromKelvin(stagTemp4,1,false);
  stagnationTemperature5Display.innerHTML = temperatureFromKelvin(stagTemp5,1,false);
  rho1Display.innerHTML = densityFromMetric(dens1,3,false);
  rho2Display.innerHTML = densityFromMetric(dens2,3,false);
  rho3Display.innerHTML = densityFromMetric(dens3,3,false);
  rho4Display.innerHTML = densityFromMetric(dens4,3,false);
  rho5Display.innerHTML = densityFromMetric(dens5,3,false);
  stagnationDensity1Display.innerHTML = densityFromMetric(stagDens1,3,false);
  stagnationDensity2Display.innerHTML = densityFromMetric(stagDens2,3,false);
  stagnationDensity3Display.innerHTML = densityFromMetric(stagDens3,3,false);
  stagnationDensity4Display.innerHTML = densityFromMetric(stagDens4,3,false);
  stagnationDensity5Display.innerHTML = densityFromMetric(stagDens5,3,false);
  displayMachOrSpeed();
}

const displayForDetachedShockForRegion5 = function(){
  mach5Display.innerHTML = "Detached";
  mach5Display2.innerHTML = "Detached";
  mach5Display3.innerHTML = "Detached";
  p5Display.innerHTML = "shock.";
  t5Display.innerHTML = "shock.";
  rho5Display.innerHTML = "shock.";
  stagnationPressure5Display.innerHTML = "Reduce aft";
  stagnationTemperature5Display.innerHTML = "Reduce aft";
  stagnationDensity5Display.innerHTML = "Reduce aft";
  dynamicPressure5Display.innerHTML = "defl angle.";
  speedOfSound5Display.innerHTML = "defl angle.";
  machAngle5Display.innerHTML = "defl angle.";
}

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

window.addEventListener("orientationchange", () => {
  doWindowResizeOrOrientationChange();
});

const loadBackground = function(option='atmosphere'){
  switch (option){
    case 'atmosphere':
      if (background != null){
        background = null;
      }

      let stormydays_ft = new URL('../../static/img/stormydays_ft.jpg', import.meta.url);
      let stormydays_bk = new URL('../../static/img/stormydays_bk.jpg', import.meta.url);
      let stormydays_up = new URL('../../static/img/stormydays_up.jpg', import.meta.url);
      let stormydays_dn = new URL('../../static/img/stormydays_dn.jpg', import.meta.url);
      let stormydays_rt = new URL('../../static/img/stormydays_rt.jpg', import.meta.url);
      let stormydays_lf = new URL('../../static/img/stormydays_lf.jpg', import.meta.url);

      background = new THREE.CubeTextureLoader().load([stormydays_ft.pathname,stormydays_bk.pathname,stormydays_up.pathname,stormydays_dn.pathname,stormydays_rt.pathname,stormydays_lf.pathname]);
      // background = new THREE.CubeTextureLoader().load(['./static/img/stormydays_ft.jpg','./static/img/stormydays_bk.jpg','./static/img/stormydays_up.jpg','./static/img/stormydays_dn.jpg','./static/img/stormydays_rt.jpg','./static/img/stormydays_lf.jpg']);

      scene.background = background;
  }
}

const initTHREE = function() {
  scene = new THREE.Scene();
  
  const ambientLight = new THREE.AmbientLight(0x909090);
  const sunLight = new THREE.SpotLight(0xffffff);

  sunLight.position.set(-20, 20, 20);
  sunLight.castShadow = false;
  sunLight.decay = 0;
  sunLight.intensity = 1;
  scene.add(ambientLight);
  scene.add(sunLight);

  renderer = new THREE.WebGLRenderer({
    devicePixelRatio: window.devicePixelRatio,
    alpha: true,
  });

  renderer.setClearColor(0x000000);
  renderer.setSize(threeDWorld.clientWidth, threeDWorld.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.autoClear = false;
  camera = new THREE.PerspectiveCamera(45, 1, 0.5, 1000);
  camera.aspect = 1;
  camera.position.set(nominalCameraPos.x, nominalCameraPos.y, nominalCameraPos.z);
  camera.lookAt(lookAtPoint);
  renderer.shadowMap.enabled = false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  threeDWorld.appendChild(renderer.domElement);
  orbitControls = new OrbitControls(camera, renderer.domElement);
  // orbitControls.enableDamping;
  orbitControls.enableZoom = false;
};

const createAndInitialize = function(data, camera){
  if (data){
    aerovisualizerData = JSON.parse(JSON.stringify(data));

    for (let o of data) {
      switch (o.name){
        case 'mach-number':
          mach1 = o.value;
          break;
        case 'delta-menu-selection':
          deltaMenuSelection = o.value;
          break;
        case 'forward-delta':
          forwardDelta = o.value;
          break;
        case 'aft-delta':
          aftDelta = o.value;
          break;
        case 'temperature-scale-menu-selection':
          temperatureScaleMenuSelection = o.value;
          break;
        case 'density-units-menu-selection':
          densityUnitsMenuSelection = o.value;
          break;
        case 'pressure-units-menu-selection':
          pressureUnitsMenuSelection = o.value;
          break;
        case 'speed-units-menu-selection':
          speedUnitsMenuSelection = o.value;
          break;
        case 'gas-medium-menu-selection':
          gasMediumMenuSelection = o.value;
          break;
        case 'rhoTP-menu-selection':
          rhoTPMenuSelection = o.value;
          break;
        case 'altitude-slider-index':
          altitudeSliderIndex = o.value;
          break;
        case 'density-slider-index':
          densitySliderIndex = o.value;
          break;
        case 'temperature-slider-index':
          temperatureSliderIndex = o.value;
          break;
        case 'pressure-slider-index':
          pressureSliderIndex = o.value;
          break;
        case 'ufo-transparency':
          ufoTransparency = o.value;
          break;
        case 'forward-shock-transparency':
          forwardShockTransparency = o.value;
          break;
        case 'aft-shock-transparency':
          aftShockTransparency = o.value;
          break;
        case 'labels-transparency':
          labelsTransparency = o.value;
          break;
        case 'ufo-color':
          ufoColor = o.value;
          break;
        case 'forward-shock-color':
          forwardShockColor = o.value;
          break;
        case 'aft-shock-color':
          aftShockColor = o.value;
          break;
        case 'labels-color':
          labelsColor = o.value;
          break;
        case 'altitude-is-in-feet':
          altitudeIsInFeet = o.value;
          break;
        case 'mach-speed-state':
          machSpeedState = o.value;
          break;
        case 'current-main-button':
          currentMainButton = o.value;
          break;
      }
    }
  }

  if (ufo === null){
    ufo = new UFO(scene, camera);
  }

  machSlider.value = mach1;
  ufoTransparencySlider.value = ufoTransparency;
  forwardShockTransparencySlider.value = forwardShockTransparency;
  aftShockTransparencySlider.value = aftShockTransparency;
  labelsTransparencySlider.value = labelsTransparency;
  ufoColorMenu.value = ufoColor;
  forwardShockColorMenu.value = forwardShockColor;
  aftShockColorMenu.value = aftShockColor;
  labelsColorMenu.value = labelsColor;
  altitudeFeetCheckbox.checked = altitudeIsInFeet;
  temperatureScaleMenu.value = temperatureScaleMenuSelection;
  densityUnitsMenu.value = densityUnitsMenuSelection;
  pressureUnitsMenu.value = pressureUnitsMenuSelection;
  speedUnitsMenu.value = speedUnitsMenuSelection;
  gasMediumMenu.value = gasMediumMenuSelection;
  rhoTPMenu.value = rhoTPMenuSelection;
  deltaMenu.value = deltaMenuSelection;

  switch (deltaMenuSelection){
    case 'forward':
      deltaSlider.value = forwardDelta;
      break;
    case 'aft':
      deltaSlider.value = aftDelta;
      break;
  }

  handleMainButtons(currentMainButton);
  handleDeltaOnInput();
  handleRhoTPMenu();
  handleGasMediumOnChange();
  setRhoTP();
  displayMachOrSpeed();
  displayDensTempPresLabels();
  loadBackground();
}

const completeInitialization = function(continueAnimation = true) {
  // the reason for this is that the UFO.js file contains
  // the function _constructLabels() which contains a FontLoader 
  // object called loader that creates code that runs asynchronously.
  // Once ufo.constructionComplete is true, we can finish
  // our initialization
  if (continueAnimation && !(ufo.constructionComplete)) {
    requestAnimationFrame(completeInitialization);
  }
  
  if (ufo.constructionComplete){
    handlePreferencesButtons('none');

    camera.aspect = 1;
    camera.updateProjectionMatrix();

    cpx = camera.position.x;
    cpy = camera.position.y;
    cpz = camera.position.z;

    renderer.setSize(threeDWorld.clientWidth, threeDWorld.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    ufo.addObjectsToScene();

    setTransparency('ufo',ufoTransparency);
    setTransparency('forward-shock',forwardShockTransparency);
    setTransparency('aft-shock',aftShockTransparency);
    setTransparency('labels',labelsTransparency);

    miscPrefButton.style.display = 'none';
    transparencyPrefButton.style.display = 'none';
    colorPrefButton.style.display = 'none';
    prefsReturnButton.style.display = 'none';
    infoElements.style.display = 'none';
    infoMenu.value = 'info-intro';
    handleInfoMenuChoice(infoMenu.value);
    ufo.setColor('ufo', ufoColor);
    ufo.setColor('forward-shock', forwardShockColor);
    ufo.setColor('aft-shock', aftShockColor);
    ufo.setColor('labels', labelsColor);
    //check that it displays 'a' value for temp1, temp1 should be set before here
    handleDeltaOnInput();
    ufo.needsRefresh = true;
  }
};

const animate = function(continueAnimation = true) {
  if (continueAnimation) {
    requestAnimationFrame(animate);
  }
  
  orbitControls.update();

  if (cpx !== camera.position.x && cpy !== camera.position.y && cpz !== camera.position.z){
    cpx = camera.position.x;
    cpy = camera.position.y;
    cpz = camera.position.z;
    ufo.needsRefresh = true;
  } 

  renderer.clear();
  renderer.render(scene, camera);
  ufo.refresh();
};

const replaceAerovisualizerData = function(name, value){
  aerovisualizerData.forEach(o => {
    if (o.name === name){
      o.value = value;
    }});
}

const saveToLocalStorage = function(){
  localStorage.setItem('aerovisualizerData3', JSON.stringify(aerovisualizerData));
}

// uncomment this temporarily to clear the storage after making
// changes to the aerovisualizerData array
// localStorage.clear();
// saveToLocalStorage();

let data = JSON.parse(localStorage.getItem('aerovisualizerData3'));

if (!data){
  localStorage.clear();
  saveToLocalStorage();
  location.reload();
  data = JSON.parse(localStorage.getItem('aerovisualizerData3'));
}

initTHREE();
createAndInitialize(data, camera);
completeInitialization();
animate();
