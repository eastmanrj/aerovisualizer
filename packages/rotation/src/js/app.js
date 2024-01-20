import * as THREE from '../../../../node_modules/three/build/three.module.js';
import SixDOFObject from './SixDOFObject.js';
import Vectors from './Vectors.js';
import PoinsotAndCones from './PoinsotAndCones.js';
import {OrbitControls} from './OrbitControls.js';

/**
The purpose of Aerovisualizer is to assist in the teaching and 
reinforcement of concepts in aerospace engineering by presenting 
them in interesting and engaging ways.  3D animations are displayed 
to complement the dry equations found in textbooks and online, and 
controls are also provided to manipulate the displays.

One of the concepts is rotational dynamics, and this file contains the 
main code for it.

 Revision History
 Date    Name                  Description
 1/19/24 R. Eastman            v0.1 beta
*/

let scene, camera, renderer;
let background = null;
let jupiter = null;
let sun = null;
const cameraRadius = 25;
let nominalCameraPos = new THREE.Vector3(-cameraRadius, 0, 0);
let cpx, cpy, cpz;// camera position
const centerOfRotation = [0, 0, 0];
let clock = null;
let sdo = null;//"six degree of freedom object" (currently only handles rotational)
let vo = null;//"vectors object" (handles all of the vectors)
let pac = null;//"Poinsot and cones" (handles the Poinsot ellipsoid and plane,
                //polode and herpolhode, and the space and body cones)
let orbitControls = null;
let playing = false;
const piOver180 = Math.PI / 180;

const muOverR3Choices = [0.000001451422, 0.0001451422, 0.01451422, 0.0725711, 0.1451422,
 0.2902844, 0.725711, 1.451422];
const muOverR3ChoiceDisplay = ['LEO', '100 X LEO', '10K X LEO', '50K X LEO',
 '100K X LEO', '200K X LEO', '500K X LEO', '1M X LEO'];
let muOverR3 = muOverR3Choices[5];

const defaultMass = 1;
const masses = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
const defaultDimX = 4;
const defaultDimY = 4;
const defaultDimZ = 7;

const defaultAttitudeOption = 1;//1=Euler angles, 2=quaternion
const defaultEuler1 = -10;
const defaultEuler2 = -20;
const defaultEuler3 = -30;

const defaultOmegaMagnitude = 3;
const defaultOmHihat = 0;//slider position
const defaultOmHjhat = 100;//slider position
const defaultOmHkhat = 100;//slider position
const defaultOmegaOrH = 'omega';

const defaultTorqueOption = 1;//No Torque
let previousTorqueOption = -1;
const defaultTorqueMag = 4;
const defaultTorqueIhat = 100;
const defaultTorqueJhat = 0;
const defaultTorqueKhat = 0;
const defaultTorqueACSDZ = 0.5;
const defaultTorqueACSTorque = 0.1;
const defaultTorqueGG = 5;
const defaultTorqueTopR = 1;
const defaultTorqueTopGrav = 1;

const defaultObjectAppearance = 'axis-labels';
const defaultObjectMassProperties =  'select-an-object';
const defaultEnvironment = 'atmosphere';
const defaultMaxOmega = 720;//degrees/sec
const defaultVectorSize = 6;

const defaultObjectTransparency = 0;//0=completely opaque, 100=completely transparent
const defaultBodyFrameTransparency = 0;
const defaultShowBodyXVector = true;//x vector of body frame
const defaultShowBodyYVector = true;//y vector of body frame
const defaultShowBodyZVector = true;//z vector of body frame
const defaultSpaceFrameTransparency = 0;
const defaultOmegaTransparency = 0;
const defaultHTransparency = 0;
const defaultTorqueTransparency = 0;
const defaultConesTransparency = 50;
const defaultPoinsotTransparency = 100;
// 95 maxTransparency is arbirary and considered close enough to being completely 
// invisible, this allows for a little slop when using the slider controls
const maxTransparency = 95;

const defaultObjectOffset = false;
const defaultBodyFrameOffset = false;
const defaultSpaceFrameOffset = true;
const defaultOmegaOffset = false;
const defaultHOffset = false;
const defaultTorqueOffset = false;
const defaultConesOffset = false;
const defaultPoinsotOffset = false;

const defaultBodyFrameColor = 'orange';
const defaultSpaceFrameColor = 'blue';
const defaultOmegaColor = 'blue';
const defaultHColor = 'orange';
const defaultTorqueColor = 'blue';
const defaultBodyConeColor = 'orange';
const defaultSpaceConeColor = 'blue';
const defaultEllipsoidColor = 'orange';
const defaultPlaneColor = 'blue';

const defaultOrientation = 'Z Down';
const defaultEulerOrder = 'ZYX';

//aerovisualizerData is modified and saved to local storage when preferences are 
//changed and is retrieved from local storage at startup
let aerovisualizerData = [
  {name:'mass', value:defaultMass},
  {name:'length', value:defaultDimX},
  {name:'width', value:defaultDimY},
  {name:'height', value:defaultDimZ},
  {name:'attitudeOption', value:defaultAttitudeOption},
  {name:'eulerAngle1', value:defaultEuler1},
  {name:'eulerAngle2', value:defaultEuler2},
  {name:'eulerAngle3', value:defaultEuler3},
  {name:'omegaMagnitude', value:defaultOmegaMagnitude},
  {name:'omHihat', value:defaultOmHihat},
  {name:'omHjhat', value:defaultOmHjhat},
  {name:'omHkhat', value:defaultOmHkhat},
  {name:'omegaOrH', value:defaultOmegaOrH},
  {name:'torqueOption', value:defaultTorqueOption},
  {name:'torqueMag', value:defaultTorqueMag},
  {name:'torqueIhat', value:defaultTorqueIhat},
  {name:'torqueJhat', value:defaultTorqueJhat},
  {name:'torqueKhat', value:defaultTorqueKhat},
  {name:'torqueACSDZ', value:defaultTorqueACSDZ},
  {name:'torqueACSTorque', value:defaultTorqueACSTorque},
  {name:'torqueGG', value:defaultTorqueGG},
  {name:'torqueTopR', value:defaultTorqueTopR},
  {name:'torqueTopGrav', value:defaultTorqueTopGrav},
  {name:'objectAppearance', value:defaultObjectAppearance},
  {name:'objectMassProperties', value:defaultObjectMassProperties},
  {name:'environment', value:defaultEnvironment},
  {name:'maxOmega', value:defaultMaxOmega},
  {name:'vectorSize', value:defaultVectorSize},
  {name:'objectTransparency', value:defaultObjectTransparency},
  {name:'bodyFrameTransparency', value:defaultBodyFrameTransparency},
  {name:'showBodyXVector', value:defaultShowBodyXVector},
  {name:'showBodyYVector', value:defaultShowBodyYVector},
  {name:'showBodyZVector', value:defaultShowBodyZVector},
  {name:'spaceFrameTransparency', value:defaultSpaceFrameTransparency},
  {name:'omegaTransparency', value:defaultOmegaTransparency},
  {name:'hTransparency', value:defaultHTransparency},
  {name:'torqueTransparency', value:Number(defaultTorqueTransparency)},
  {name:'conesTransparency', value:Number(defaultConesTransparency)},
  {name:'poinsotTransparency', value:Number(defaultPoinsotTransparency)},
  {name:'objectOffset', value:defaultObjectOffset},
  {name:'bodyFrameOffset', value:defaultBodyFrameOffset},
  {name:'spaceFrameOffset', value:defaultSpaceFrameOffset},
  {name:'omegaOffset', value:defaultOmegaOffset},
  {name:'hOffset', value:defaultHOffset},
  {name:'torqueOffset', value:defaultTorqueOffset},
  {name:'conesOffset', value:defaultConesOffset},
  {name:'poinsotOffset', value:defaultPoinsotOffset},
  {name:'bodyFrameColor', value:defaultBodyFrameColor},
  {name:'spaceFrameColor', value:defaultSpaceFrameColor},
  {name:'omegaColor', value:defaultOmegaColor},
  {name:'hColor', value:defaultHColor},
  {name:'torqueColor', value:defaultTorqueColor},
  {name:'bodyConeColor', value:defaultBodyConeColor},
  {name:'spaceConeColor', value:defaultSpaceConeColor},
  {name:'ellipsoidColor', value:defaultEllipsoidColor},
  {name:'planeColor', value:defaultPlaneColor},
  {name:'axesOrientation', value:defaultOrientation},
  {name:'eulerOrder', value:defaultEulerOrder}
];

//preferences are declared and defined here and set to their default values.
//They are later set to their local storage values
let mass = defaultMass;
let dimX = defaultDimX;
let dimY = defaultDimY;
let dimZ = defaultDimZ;

let euler1 = defaultEuler1;
let euler2 = defaultEuler2;
let euler3 = defaultEuler3;
// quaternion is set from Euler angles
let quatW = 0;
let quatX = 0;
let quatY = 0;
let quatZ = 0;

let omegaMag = defaultOmegaMagnitude;
let omHihat = defaultOmHihat;
let omHjhat = defaultOmHjhat;
let omHkhat = defaultOmHkhat;
let omegaOrH = defaultOmegaOrH;

let torqueOption = defaultTorqueOption;
let torqueMag = defaultTorqueMag;
let torqueIhat = defaultTorqueIhat;
let torqueJhat = defaultTorqueJhat;
let torqueKhat = defaultTorqueKhat;
let torqueACSDZ = defaultTorqueACSDZ;
let torqueACSTorque = defaultTorqueACSTorque;
let torqueGG = defaultTorqueGG;
let torqueTopR = defaultTorqueTopR;
let torqueTopGrav = defaultTorqueTopGrav;

let objectAppearance = defaultObjectAppearance;
let objectMassProperties = defaultObjectMassProperties;
let environment = defaultEnvironment;
let maxOmega = defaultMaxOmega;
let vectorSize = defaultVectorSize;

let objectTransparency = defaultObjectTransparency;
let bodyFrameTransparency = defaultBodyFrameTransparency;
let showBodyXVector = defaultShowBodyXVector;
let showBodyYVector = defaultShowBodyYVector;
let showBodyZVector = defaultShowBodyZVector;
let spaceFrameTransparency = defaultSpaceFrameTransparency;
let omegaTransparency = defaultOmegaTransparency;
let hTransparency = defaultHTransparency;
let torqueTransparency = defaultTorqueTransparency;
let conesTransparency = defaultConesTransparency;
let poinsotTransparency = defaultPoinsotTransparency;

let objectOffset = defaultObjectOffset;
let bodyFrameOffset = defaultBodyFrameOffset;
let spaceFrameOffset = defaultSpaceFrameOffset;
let omegaOffset = defaultOmegaOffset;
let hOffset = defaultHOffset;
let torqueOffset = defaultTorqueOffset;
let conesOffset = defaultConesOffset;
let poinsotOffset = defaultPoinsotOffset;

let bodyFrameColor = defaultBodyFrameColor;
let spaceFrameColor = defaultSpaceFrameColor;
let omegaColor = defaultOmegaColor;
let hColor = defaultHColor;
let torqueColor = defaultTorqueColor;
let bodyConeColor = defaultBodyConeColor;
let spaceConeColor = defaultSpaceConeColor;
let ellipsoidColor = defaultEllipsoidColor;
let planeColor = defaultPlaneColor;

let attitudeOption = defaultAttitudeOption;
let eulerOrder = defaultEulerOrder;

const sixDOFworld = document.getElementById('sixDOF-world');
const playPauseButton = document.getElementById('play-pause-btn');
const resetButton = document.getElementById('reset-btn');

const numericalButton = document.getElementById('numerical-btn');
const preferencesButton = document.getElementById('preferences-btn');
const infoButton = document.getElementById("info-btn");
const infoReturnButton = document.getElementById('info-return-btn');
const massPropButton = document.getElementById('mass-prop-btn');
const attitudeButton = document.getElementById('attitude-btn');
const rotationRateButton = document.getElementById('rotation-btn');
const torqueButton = document.getElementById('torque-btn');
const mainReturnButton = document.getElementById('main-return-btn');

const massSlider = document.getElementById("mass-slider");
const dimXSlider = document.getElementById("dimX-slider");
const dimYSlider = document.getElementById("dimY-slider");
const dimZSlider = document.getElementById("dimZ-slider");
const massDisplay = document.getElementById("mass-display");
const dimXDisplay = document.getElementById("dimX-display");
const dimYDisplay = document.getElementById("dimY-display");
const dimZDisplay = document.getElementById("dimZ-display");
const ixxNumber = document.getElementById("ixx-number");
const iyyNumber = document.getElementById("iyy-number");
const izzNumber = document.getElementById("izz-number");

const attitudeOptionButton1 = document.getElementById('attitude-input-btn1');
const attitudeOptionButton2 = document.getElementById('attitude-input-btn2');
const euler1Slider = document.getElementById("euler1-slider");
const euler2Slider = document.getElementById("euler2-slider");
const euler3Slider = document.getElementById("euler3-slider");
const euler1Display = document.getElementById("euler1-display");
const euler2Display = document.getElementById("euler2-display");
const euler3Display = document.getElementById("euler3-display");
const zeroEuler1Button = document.getElementById("zero-euler1-btn");
const zeroEuler2Button = document.getElementById("zero-euler2-btn");
const zeroEuler3Button = document.getElementById("zero-euler3-btn");
const quaternianAngleSlider = document.getElementById("quat-angle");
const quaternianIhatSlider = document.getElementById("quat-ihat-slider");
const quaternianJhatSlider = document.getElementById("quat-jhat-slider");
const quaternianKhatSlider = document.getElementById("quat-khat-slider");
const quaternianAngleDisplay = document.getElementById("quat-angle-display");
const quaternianIhatDisplay = document.getElementById("quat-ihat-display");
const quaternianJhatDisplay = document.getElementById("quat-jhat-display");
const quaternianKhatDisplay = document.getElementById("quat-khat-display");
const zeroQuaternionAngleButton = document.getElementById("zero-quat-angle-btn");
const zeroQuaternionIhatButton = document.getElementById("zero-quatX-btn");
const zeroQuaternionJhatButton = document.getElementById("zero-quatY-btn");
const zeroQuaternionKhatButton = document.getElementById("zero-quatZ-btn");
const quatWDisplay = document.getElementById("quatW-display");
const quatXDisplay = document.getElementById("quatX-display");
const quatYDisplay = document.getElementById("quatY-display");
const quatZDisplay = document.getElementById("quatZ-display");

const omegaOrHRadios = document.querySelectorAll('input[name="omega-or-H-radio"]');
const omegaOrHOmegaRadio = document.getElementById("omega-or-H-omega");
const omegaOrHHRadio = document.getElementById("omega-or-H-H");
const omegaMagnitudeSlider = document.getElementById("omegaMag");
const omegaIhatSlider = document.getElementById("omegaIhat");
const omegaJhatSlider = document.getElementById("omegaJhat");
const omegaKhatSlider = document.getElementById("omegaKhat");
const omegaMagnitudeDisplay = document.getElementById("omegaMag-display");
const hMagnitudeDisplay = document.getElementById("hMag-display");
const omegaIhatDisplay = document.getElementById("omega-ihat-display");
const omegaJhatDisplay = document.getElementById("omega-jhat-display");
const omegaKhatDisplay = document.getElementById("omega-khat-display");
const zeroOmegaIhatButton = document.getElementById("zero-omegax-btn");
const zeroOmegaJhatButton = document.getElementById("zero-omegay-btn");
const zeroOmegaKhatButton = document.getElementById("zero-omegaz-btn");
const omegaPDisplay = document.getElementById("omegaP-display");
const omegaQDisplay = document.getElementById("omegaQ-display");
const omegaRDisplay = document.getElementById("omegaR-display");

const torqueOptionMenu = document.getElementById("torque-option-menu");
const torqueMagnitudeSlider = document.getElementById("torqueMag");
const torqueIhatSlider = document.getElementById("torqueIhat");
const torqueJhatSlider = document.getElementById("torqueJhat");
const torqueKhatSlider = document.getElementById("torqueKhat");
const zeroTorqueXButton = document.getElementById("zero-torqueIhat-btn");
const zeroTorqueYButton = document.getElementById("zero-torqueJhat-btn");
const zeroTorqueZButton = document.getElementById("zero-torqueKhat-btn");
const acsDeadZoneSlider = document.getElementById("acs-omega-dead-zone-slider");
const acsTorqueMagnitudeSlider = document.getElementById("acs-torque-magnitude-slider");
const torqueMuOverR3Slider = document.getElementById("torque-muOverR3");
const torqueTopRDistanceSlider = document.getElementById("torque-top-rdistance");
const torqueTopGravitySlider = document.getElementById("torque-top-gravity");
const torqueMagnitudeDisplay = document.getElementById("torqueMag-display");
const torqueIhatDisplay = document.getElementById("torqueIhat-display");
const torqueJhatDisplay = document.getElementById("torqueJhat-display");
const torqueKhatDisplay = document.getElementById("torqueKhat-display");
const acsDeadZoneDisplay = document.getElementById( "acs-omega-dead-zone");
const acsTorqueMagnitudeDisplay = document.getElementById( "acs-torque-magnitude");
const torqueMuOverR3Display = document.getElementById("torque-muOverR3-display");
const torqueTopRDistanceDisplay = document.getElementById("torque-top-rdistance-display");
const torqueTopGravityDisplay = document.getElementById("torque-top-gravity-display");

const defaultButton = document.getElementById('default-btn');
const defaultDoResetButton = document.getElementById('default-do-reset-btn');
const generalPrefButton = document.getElementById('general-btn');
const objectPrefButton = document.getElementById('object-btn');
const bodyFramePrefButton = document.getElementById('body-frame-btn');
const spaceFramePrefButton = document.getElementById('space-frame-btn');
const omegaPrefButton = document.getElementById('omega-btn');
const hPrefButton = document.getElementById('h-btn');
const torquePrefButton = document.getElementById('torque-prefs-btn');
const axisOrientationPrefButton = document.getElementById('axis-orientation-btn');
const eulerAngleOrderPrefButton = document.getElementById('euler-angle-order-btn');
const conesPrefButton = document.getElementById('cones-btn');
const poinsotPrefButton = document.getElementById('poinsot-btn');
const prefsReturnButton = document.getElementById('prefs-return-btn');

const infoMenu = document.getElementById('info-menu');
const infoText = document.getElementById('info-text');

const numericalElements = document.getElementById('numerical-elements-general');
const infoElements = document.getElementById('info-elements');
const attitudeEulerElements = document.getElementById('attitude-euler-elements');
const attitudeQuaternionElements = document.getElementById('attitude-quaternion-elements');
const generalElements = document.getElementById('general-elements');
const massPropElements = document.getElementById('mass-prop-elements');
const rotationElements = document.getElementById('rotation-elements');
const torqueFrameElements = document.getElementById('torque-frame-elements');
const acsElements = document.getElementById('acs-elements');
const torqueGGElements = document.getElementById('torque-gg-elements');
const torqueTopElements = document.getElementById('torque-top-elements');
const torqueOptionElements = document.getElementById('torque-option-elements');
const defaultElements = document.getElementById('default-elements');
const axisOrientationElements = document.getElementById('axis-orientation-elements');
const eulerAngleOrderElements = document.getElementById('euler-angle-order-elements');
const objectElements = document.getElementById('object-elements');
const bodyFrameElements = document.getElementById('body-frame-elements');
const spaceFrameElements = document.getElementById('space-frame-elements');
const omegaElements = document.getElementById('omega-elements');
const hElements = document.getElementById('h-elements');
const torqueElements = document.getElementById('torque-elements');
const conesElements = document.getElementById('cones-elements');
const poinsotElements = document.getElementById('poinsot-elements');

const ixxDisplay = document.getElementById("ixx-display");
const iyyDisplay = document.getElementById("iyy-display");
const izzDisplay = document.getElementById("izz-display");
const dcm11Number = document.getElementById("dcm11-number");
const dcm12Number = document.getElementById("dcm12-number");
const dcm13Number = document.getElementById("dcm13-number");
const dcm21Number = document.getElementById("dcm21-number");
const dcm22Number = document.getElementById("dcm22-number");
const dcm23Number = document.getElementById("dcm23-number");
const dcm31Number = document.getElementById("dcm31-number");
const dcm32Number = document.getElementById("dcm32-number");
const dcm33Number = document.getElementById("dcm33-number");
const omegaPNumber = document.getElementById("omega-P-number");
const omegaQNumber = document.getElementById("omega-Q-number");
const omegaRNumber = document.getElementById("omega-R-number");
const hXNumber = document.getElementById("hx-number");
const hYNumber = document.getElementById("hy-number");
const hZNumber = document.getElementById("hz-number");
const tauLNumber = document.getElementById("tau-L-number");
const tauMNumber = document.getElementById("tau-M-number");
const tauNNumber = document.getElementById("tau-N-number");
const quatWNumber = document.getElementById("quatW-number");
const quatXNumber = document.getElementById("quatX-number");
const quatYNumber = document.getElementById("quatY-number");
const quatZNumber = document.getElementById("quatZ-number");
const kineticEnergy = document.getElementById("kinetic-energy-number");

const objectAppearanceChoiceMenu = document.getElementById("object-appearance-choice-menu");
const presetMassPropertiesMenu = document.getElementById("preset-mass-properties-menu");
const environmentRadios = document.querySelectorAll('input[name="environment-radio"]');
const maxOmegaSlider = document.getElementById("max-omega");
const maxOmegaDisplay = document.getElementById("max-omega-display");
const vectorSizeSlider = document.getElementById("vector-size");

const objectTransparencySlider = document.getElementById("transparency-block");
const objectTransparencyDisplay = document.getElementById("transparency-block-display");
const bodyFrameTransparencySlider = document.getElementById("transparency-body-frame");
const bodyFrameTransparencyDisplay = document.getElementById("transparency-body-frame-display");
const showBodyXVectorCheckbox = document.getElementById("body-x");
const showBodyYVectorCheckbox = document.getElementById("body-y");
const showBodyZVectorCheckbox = document.getElementById("body-z");
const spaceFrameTransparencySlider = document.getElementById("transparency-space-frame");
const spaceFrameTransparencyDisplay = document.getElementById("transparency-space-frame-display");
const omegaTransparencySlider = document.getElementById("transparency-omega");
const omegaTransparencyDisplay = document.getElementById("transparency-omega-display");
const hTransparencySlider = document.getElementById("transparency-h");
const hTransparencyDisplay = document.getElementById("transparency-h-display");
const torqueTransparencySlider = document.getElementById("transparency-torque");
const torqueTransparencyDisplay = document.getElementById("transparency-torque-display");
const conesTransparencySlider = document.getElementById("transparency-cones");
const conesTransparencyDisplay = document.getElementById("transparency-cones-display");
const poinsotTransparencySlider = document.getElementById("transparency-poinsot");
const poinsotTransparencyDisplay = document.getElementById("transparency-poinsot-display");

const objectOffsetCheckbox = document.getElementById("offset-object");
const bodyFrameOffsetCheckbox = document.getElementById("offset-body-frame");
const spaceFrameOffsetCheckbox = document.getElementById("offset-space-frame");
const omegaOffsetCheckbox = document.getElementById("offset-omega");
const hOffsetCheckbox = document.getElementById("offset-h");
const torqueOffsetCheckbox = document.getElementById("offset-torque");
const conesOffsetCheckbox = document.getElementById("offset-cones");
const poinsotOffsetCheckbox = document.getElementById("offset-poinsot");

const bodyFrameColorMenu = document.getElementById("body-frame-color-menu");
const spaceFrameColorMenu = document.getElementById("space-frame-color-menu");
const omegaColorMenu = document.getElementById("omega-color-menu");
const hColorMenu = document.getElementById("h-color-menu");
const torqueColorMenu = document.getElementById("torque-color-menu");
const bodyConeColorMenu = document.getElementById("body-cone-color-menu");
const spaceConeColorMenu = document.getElementById("space-cone-color-menu");
const ellipsoidColorMenu = document.getElementById("inertia-ellipsoid-color-menu");
const planeColorMenu = document.getElementById("invariable-plane-color-menu");

const orientationRadios = document.querySelectorAll('input[name="orientation-radio"]');
const eulerOrderRadios = document.querySelectorAll('input[name="euler-order-radio"]');

const replaceAerovisualizerData = function(name, value){
  aerovisualizerData.forEach(o => {
    if (o.name === name){
      o.value = value;
    }});
}

const saveToLocalStorage = function(){
  localStorage.setItem('aerovisualizerData2', JSON.stringify(aerovisualizerData));
}

const getFromLocalStorage = function(){
  const data = JSON.parse(localStorage.getItem('aerovisualizerData2'));
  return data;
}

const haltPlay = function(){
  if (playing){
    playing = false;
    playPauseButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-play-filled" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
    <path d="M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z" stroke-width="0" fill="currentColor"></path>
 </svg>`;
    sdo.realTime = 0;
    sdo.simulationTime = 0;
    clock.getDelta();
  }
}

const handleMainButtons = function(button){
  numericalButton.disabled = false;
  massPropButton.disabled = false;
  attitudeButton.disabled = false;
  rotationRateButton.disabled = false;
  torqueButton.disabled = false;
  numericalElements.style.display = 'none';
  massPropElements.style.display = 'none';
  attitudeEulerElements.style.display = 'none';
  attitudeQuaternionElements.style.display = 'none';
  rotationElements.style.display = 'none';
  torqueFrameElements.style.display = 'none';
  acsElements.style.display = 'none';
  torqueGGElements.style.display = 'none';
  torqueTopElements.style.display = 'none';
  torqueOptionElements.style.display = 'none';

  switch (button){
    case 'numerical':
      numericalElements.style.display = 'grid';
      numericalButton.disabled = true;
      displayNumerical();
      break;
    case 'attitude':
      if (attitudeOption === 1){
        attitudeEulerElements.style.display = 'grid';
      }else{
        attitudeQuaternionElements.style.display = 'grid';
        setQuatSlidersToQuat();
        sdo.refresh();
        vo.refresh();
        pac.refresh();
      }
      attitudeButton.disabled = true;
      break;
    case 'massProp':
      massPropButton.disabled = true;

      if (objectMassProperties === 'select-an-object'){
        massPropElements.style.display = 'grid';
      }else{
        massPropElements.style.display = 'none';
      }
      break;
    case 'rates':
      rotationElements.style.display = 'grid';
      rotationRateButton.disabled = true;
      displayOmegaValues();
      break;
    case 'torque':
      torqueOptionElements.style.display = 'grid';
      torqueButton.disabled = true;
      handleTorqueOptionMenu();
      break;
    case 'none':
      break;
  }
}

const handleAllRadioButtons = function(){
  for (let radio of eulerOrderRadios) {
    if (radio.checked) {
      sdo.setEulerOrder(radio.value);
      replaceAerovisualizerData('eulerOrder',radio.value);
    }
  }

  for (let radio of orientationRadios) {
    if (radio.checked) {
      sdo.setOrientation(radio.value);
      vo.setOrientation(radio.value);
      pac.setOrientation(radio.value);
      replaceAerovisualizerData('axesOrientation',radio.value);
    }
  }

  setEnvironment(environment, true);
  setOmegaOrHChoice(omegaOrH, true);
}

numericalButton.addEventListener('click', () => {
  handleMainButtons('numerical');
});

massPropButton.addEventListener('click', () => {
  handleMainButtons('massProp');
});

attitudeButton.addEventListener('click', () => {
  handleMainButtons('attitude');
});

rotationRateButton.addEventListener('click', () => {
  handleMainButtons('rates');
});

torqueButton.addEventListener('click', () => {
  handleMainButtons('torque');
});

preferencesButton.addEventListener('click', () => {
  haltPlay();
  toggleShowPrefs();
});

const toggleShowPrefs = function(){
  if (sixDOFworld.style.display === 'none'){
    sixDOFworld.style.display = 'block';
    numericalButton.style.display = 'block';
    attitudeButton.style.display = 'block';
    massPropButton.style.display = 'block';
    rotationRateButton.style.display = 'block';
    torqueButton.style.display = 'block';
    preferencesButton.style.display = 'block';
    infoButton.style.display = 'block';
    mainReturnButton.style.display = 'block';
    playPauseButton.style.display = 'block';
    resetButton.style.display = 'block';

    defaultButton.style.display = 'none';
    axisOrientationPrefButton.style.display = 'none';
    eulerAngleOrderPrefButton.style.display = 'none';
    objectPrefButton.style.display = 'none';
    bodyFramePrefButton.style.display = 'none';
    spaceFramePrefButton.style.display = 'none';
    omegaPrefButton.style.display = 'none';
    hPrefButton.style.display = 'none';
    torquePrefButton.style.display = 'none';
    conesPrefButton.style.display = 'none';
    poinsotPrefButton.style.display = 'none';
    generalPrefButton.style.display = 'none';
    prefsReturnButton.style.display = 'none';
    handleAllRadioButtons();
    handlePreferencesButtons('none');
    doWindowResizeOrOrientationChange();
    handleMainButtons('numerical');
    resetAttitudeAndRates();
  }else{
    sixDOFworld.style.display = 'none';
    numericalButton.style.display = 'none';
    attitudeButton.style.display = 'none';
    massPropButton.style.display = 'none';
    rotationRateButton.style.display = 'none';
    torqueButton.style.display = 'none';
    preferencesButton.style.display = 'none';
    infoButton.style.display = 'none';
    mainReturnButton.style.display = 'none';
    playPauseButton.style.display = 'none';
    resetButton.style.display = 'none';

    defaultButton.style.display = 'block';
    axisOrientationPrefButton.style.display = 'block';
    eulerAngleOrderPrefButton.style.display = 'block';
    objectPrefButton.style.display = 'block';
    bodyFramePrefButton.style.display = 'block';
    spaceFramePrefButton.style.display = 'block';
    omegaPrefButton.style.display = 'block';
    hPrefButton.style.display = 'block';
    torquePrefButton.style.display = 'block';
    conesPrefButton.style.display = 'block';
    poinsotPrefButton.style.display = 'block';
    generalPrefButton.style.display = 'block';
    prefsReturnButton.style.display = 'block';
    handleMainButtons('none');
  }
}

const handleTorqueOptionMenu = function(){
  switch (torqueOption){
    case 1:
      handleTorqueSlidersOnpointerup(0);
      break;
    case 2:
      torqueFrameElements.style.display = 'grid';

      if (torqueOption != previousTorqueOption){
        handleTorqueSlidersOnpointerup(1);
      }
      break;
    case 3:
      torqueFrameElements.style.display = 'grid';

      if (torqueOption != previousTorqueOption){
        handleTorqueSlidersOnpointerup(1);
      }
      break;
    case 4:
      acsElements.style.display = 'grid';

      if (torqueOption != previousTorqueOption){
        handleTorqueSlidersOnpointerup(2);
      }
      break;
    case 5:
      torqueGGElements.style.display = 'grid';

      if (torqueOption != previousTorqueOption){
        torqueMuOverR3Slider.value = muOverR3Choices.indexOf(muOverR3);
        torqueMuOverR3Display.innerHTML = muOverR3ChoiceDisplay[+torqueMuOverR3Slider.value];
        sdo.set3MuOverR3(3*muOverR3);
        handleTorqueSlidersOnpointerup(3);
      }
      break;
    case 6:
      torqueTopElements.style.display = 'grid';

      if (torqueOption != previousTorqueOption){
        sdo.setTopRDistance(torqueTopR);
        sdo.setTopGravity(torqueTopGrav);
        torqueTopRDistanceDisplay.innerHTML = torqueTopR;
        torqueTopGravityDisplay.innerHTML = torqueTopGrav;
        handleTorqueSlidersOnpointerup(4);
      }
      break;
  }

  if (torqueOption === 1){
    pac.showCones(conesTransparency < maxTransparency);
    pac.showPoinsot(poinsotTransparency < maxTransparency);
    pac.initializePolhodeAndHerpolhode();
  }else{
    pac.showCones(false);
    pac.showPoinsot(false);
  }

  sdo.needsRefresh = true;
  vo.needsRefresh = true;
  pac.needsRefresh = true;
  sdo.setOmega(omegaOrH,omegaMag,omHihat,omHjhat,omHkhat);
  sdo.reset();
  sdo.refresh();
  vo.refresh();
  pac.refresh();
  displayNumerical();
  previousTorqueOption = torqueOption;
}

const handleMassPropsSliders = function(){
  displayMomentsOfInertia();
  sdo.setDimensionsAndInertiaProperties(mass, dimX, dimY, dimZ);
  resetAttitudeAndRates();
  sdo.reset();
  //make sure that massSlider, dimXSlider, dimYSlider, and dimZSlider are
  //such that there are not too many choices, otherwise things get called many
  //times here as the slider is being moved. use onpointerup instead of oninput
}

const doMassPropOnPointerUp = function(){
  displayNumerical(true);

  if (objectMassProperties !== 'select-an-object'){
    presetMassPropertiesMenu.value = 'select-an-object';
    objectMassProperties = 'select-an-object';
    replaceAerovisualizerData('objectMassProperties',objectMassProperties);
    replaceAerovisualizerData('mass',mass);
    replaceAerovisualizerData('length',dimX);
    replaceAerovisualizerData('width',dimY);
    replaceAerovisualizerData('height',dimZ);
  }

  saveToLocalStorage();
}

massSlider.oninput = function(){
  mass = masses[+massSlider.value];
  massDisplay.innerHTML = mass;
  handleMassPropsSliders();
}

dimXSlider.oninput = function(){
  const temp = +dimXSlider.value;

  // ensure that there are never two dimensions that are both
  // zero.  This comment also applies to dimYSlider and dimZSlider
  if ((temp === 0 && dimY === 0) || (temp === 0 && dimZ === 0) ){
    dimXSlider.value = 1;
    return;
  }

  dimX = temp;
  dimXDisplay.innerHTML = dimX;
  handleMassPropsSliders();
}

dimYSlider.oninput = function(){
  const temp = +dimYSlider.value;

  if ((temp === 0 && dimX === 0) || (temp === 0 && dimZ === 0) ){
    dimYSlider.value = 1;
    return;
  }

  dimY = temp;
  dimYDisplay.innerHTML = dimY;
  handleMassPropsSliders();
}

dimZSlider.oninput = function(){
  const temp = +dimZSlider.value;

  if ((temp === 0 && dimX === 0) || (temp === 0 && dimY === 0) ){
    dimZSlider.value = 1;
    return;
  }

  dimZ = temp;
  dimZDisplay.innerHTML = dimZ;
  handleMassPropsSliders();
}

massSlider.onpointerup = function(){
  replaceAerovisualizerData('mass',mass);
  doMassPropOnPointerUp();
}

dimXSlider.onpointerup = function(){
  replaceAerovisualizerData('length',dimX);
  doMassPropOnPointerUp();
}

dimYSlider.onpointerup = function(){
  replaceAerovisualizerData('width',dimY);
  doMassPropOnPointerUp();
}

dimZSlider.onpointerup = function(){
  replaceAerovisualizerData('height',dimZ);
  doMassPropOnPointerUp();
}

const syncQuatToObject = function(){
  const [qw, qx, qy, qz] = sdo.getQuaternionElements();
  quatW = qw;
  quatX = qx;
  quatY = qy;
  quatZ = qz;
}

const setQuatSlidersToQuat = function(){
  let rss = Math.sqrt(quatX*quatX + quatY*quatY + quatZ*quatZ);

  if (rss === 0){
    //quatX is chosen at random, any unit vector is okay to use
    quatX = 1;
    rss = 1;
  }

  const lamdaX = quatX/rss;
  const lamdaY = quatY/rss;
  const lamdaZ = quatZ/rss;

  //safety check so that acos does not fail
  quatW = quatW > 1 ? 1 : quatW;
  quatW = quatW < -1 ? -1 : quatW;
  let theta = 2*Math.acos(quatW)/piOver180;
  
  //acos returns angle from 0 to 2pi but want negative angles
  if (theta >= 180){
    theta = theta - 360;
  }

  //possibly unnecessary check so that theta goes
  //from -180 to 179 like quaternianAngleSlider
  theta = theta > 179 ? 179 : theta;
  theta = theta < -180 ? -180 : theta;

  //slider ihat, jhat, and khat values range from -100 to 100
  quaternianAngleSlider.value = theta;
  quaternianIhatSlider.value = lamdaX*100;
  quaternianJhatSlider.value = lamdaY*100;
  quaternianKhatSlider.value = lamdaZ*100;
  quaternianAngleDisplay.innerHTML = Number(theta).toFixed(0).toString();
  quaternianIhatDisplay.innerHTML = Number(lamdaX).toFixed(2).toString();
  quaternianJhatDisplay.innerHTML = Number(lamdaY).toFixed(2).toString();
  quaternianKhatDisplay.innerHTML = Number(lamdaZ).toFixed(2).toString();
  quatWDisplay.innerHTML = Number(quatW).toFixed(4).toString();
  quatXDisplay.innerHTML = Number(quatX).toFixed(4).toString();
  quatYDisplay.innerHTML = Number(quatY).toFixed(4).toString();
  quatZDisplay.innerHTML = Number(quatZ).toFixed(4).toString();
}

const syncEulerAnglesToObject = function(){
  const [e1, e2, e3] = sdo.getEulerAngles();
  euler1 = e1;
  euler2 = e2;
  euler3 = e3;
}

const resetAttitudeAndRates = function(includeRates = true){
  if (includeRates){
    if (torqueOption === 1){
      pac.showCones(conesTransparency < maxTransparency);
      pac.showPoinsot(poinsotTransparency < maxTransparency);
    }else{
      pac.showCones(false);
      pac.showPoinsot(false);
    }

    sdo.setOmega(omegaOrH,omegaMag,omHihat,omHjhat,omHkhat);
    sdo.setEulerAngles(euler1,euler2,euler3);
    vo.receiveVectorData(...sdo.sendVectorData());
    pac.receiveEphemeralData(...sdo.sendPaCEphemeralData());
    pac.receiveNonEphemeralData(...sdo.sendPaCNonEphemeralData());
    pac.construct();
  }

  sdo.reset();
  syncQuatToObject();

  sdo.needsRefresh = true;
  vo.needsRefresh = true;
  pac.needsRefresh = true;

  sdo.refresh();
  vo.refresh();
  pac.refresh();
  displayEulerAngles();
  displayNumerical(true);
  haltPlay();
}

attitudeOptionButton1.addEventListener('click', () => {
  setQuatSlidersToQuat();
  sdo.refresh();
  vo.refresh();
  pac.refresh();
  attitudeOption = attitudeOption === 1 ? 2 : 1;
  handleMainButtons('attitude');
  replaceAerovisualizerData('attitudeOption',2);
  saveToLocalStorage();
});

attitudeOptionButton2.addEventListener('click', () => {
  euler1Slider.value = euler1;
  euler2Slider.value = euler2;
  euler3Slider.value = euler3;
  displayEulerAngles();
  sdo.refresh();
  vo.refresh();
  pac.refresh();
  attitudeOption = attitudeOption === 1 ? 2 : 1;
  handleMainButtons('attitude');
  replaceAerovisualizerData('attitudeOption',1);
  replaceAerovisualizerData('eulerAngle1',euler1);
  replaceAerovisualizerData('eulerAngle2',euler2);
  replaceAerovisualizerData('eulerAngle3',euler3);
  saveToLocalStorage();
});

const handleEulerOnInput = function(){
  euler1 = euler1Slider.value;
  euler2 = euler2Slider.value;
  euler3 = euler3Slider.value;
  sdo.setEulerAngles(euler1, euler2, euler3);
  syncQuatToObject();
  displayEulerAngles();
  haltPlay();
  vo.needsRefresh = true;
  pac.needsRefresh = true;
}

euler1Slider.oninput = function(){
  handleEulerOnInput();
}

euler2Slider.oninput = function(){
  handleEulerOnInput();
}

euler3Slider.oninput = function(){
  handleEulerOnInput();
}

euler1Slider.onpointerup = function(){
  resetAttitudeAndRates(false);
  sdo.syncDCMtoQuat();
  replaceAerovisualizerData('eulerAngle1',this.value);
  saveToLocalStorage();
}

euler2Slider.onpointerup = function(){
  resetAttitudeAndRates(false);
  sdo.syncDCMtoQuat();
  replaceAerovisualizerData('eulerAngle2',this.value);
  saveToLocalStorage();
}

euler3Slider.onpointerup = function(){
  resetAttitudeAndRates(false);
  sdo.syncDCMtoQuat();
  replaceAerovisualizerData('eulerAngle3',this.value);
  saveToLocalStorage();
}

zeroEuler1Button.addEventListener('click', () => {
  euler1Slider.value = 0;
  handleEulerOnInput();
  resetAttitudeAndRates(false);
  sdo.syncDCMtoQuat();
  replaceAerovisualizerData('eulerAngle1',0);
  saveToLocalStorage();
});

zeroEuler2Button.addEventListener('click', () => {
  euler2Slider.value = 0;
  handleEulerOnInput();
  resetAttitudeAndRates(false);
  sdo.syncDCMtoQuat();
  replaceAerovisualizerData('eulerAngle2',0);
  saveToLocalStorage();
});

zeroEuler3Button.addEventListener('click', () => {
  euler3Slider.value = 0;
  handleEulerOnInput();
  resetAttitudeAndRates(false);
  sdo.syncDCMtoQuat();
  replaceAerovisualizerData('eulerAngle3',0);
  saveToLocalStorage();
});

const setAndDisplayQuaternionValues = function(){
  let thetaOver2 = Number(quaternianAngleSlider.value)/2*piOver180;
  let ihat = quaternianIhatSlider.value;
  let jhat = quaternianJhatSlider.value;
  let khat = quaternianKhatSlider.value;
  let rss = Math.sqrt(ihat*ihat + jhat*jhat + khat*khat);
  const sinThetaOver2 = Math.sin(thetaOver2);
  const cosThetaOver2 = Math.cos(thetaOver2);

  if (rss === 0){
    quaternianIhatDisplay.innerHTML = "?";
    quaternianJhatDisplay.innerHTML = "?";
    quaternianKhatDisplay.innerHTML = "?";
    quatWDisplay.innerHTML = "?";
    quatXDisplay.innerHTML = "?";
    quatYDisplay.innerHTML = "?";
    quatZDisplay.innerHTML = "?";
    return;
  }

  ihat = ihat/rss;
  jhat = jhat/rss;
  khat = khat/rss;

  quatW = cosThetaOver2;
  quatX = sinThetaOver2*ihat;
  quatY = sinThetaOver2*jhat;
  quatZ = sinThetaOver2*khat;

  // normalize the quaternion
  rss = Math.sqrt(quatW*quatW + quatX*quatX + quatY*quatY + quatZ*quatZ);

  if (rss === 0){
    quatW = 1;
    quatX = 0;
    quatY = 0;
    quatZ = 0;
  }else{
    quatW = quatW/rss;
    quatX = quatX/rss;
    quatY = quatY/rss;
    quatZ = quatZ/rss;
  }

  quaternianAngleDisplay.innerHTML = quaternianAngleSlider.value;
  quaternianIhatDisplay.innerHTML = Number(ihat).toFixed(2).toString();
  quaternianJhatDisplay.innerHTML = Number(jhat).toFixed(2).toString();
  quaternianKhatDisplay.innerHTML = Number(khat).toFixed(2).toString();
  quatWDisplay.innerHTML = Number(quatW).toFixed(4).toString();
  quatXDisplay.innerHTML = Number(quatX).toFixed(4).toString();
  quatYDisplay.innerHTML = Number(quatY).toFixed(4).toString();
  quatZDisplay.innerHTML = Number(quatZ).toFixed(4).toString();
  sdo.syncDCMtoQuat();
}

const handleQuatOnInput = function(){
  setAndDisplayQuaternionValues();
  sdo.setEulerAnglesFromQuaternion(quatW, quatX, quatY, quatZ);
  syncEulerAnglesToObject();
  haltPlay();
  vo.needsRefresh = true;
  pac.needsRefresh = true;
}

quaternianAngleSlider.oninput = function(){
  handleQuatOnInput();
}

quaternianIhatSlider.oninput = function(){
  handleQuatOnInput();
}

quaternianJhatSlider.oninput = function(){
  handleQuatOnInput();
}

quaternianKhatSlider.oninput = function(){
  handleQuatOnInput();
}

const handleQuatOnPointerUp = function(){
  resetAttitudeAndRates(false);
  sdo.syncDCMtoQuat();
  replaceAerovisualizerData('eulerAngle1',euler1);
  replaceAerovisualizerData('eulerAngle2',euler2);
  replaceAerovisualizerData('eulerAngle3',euler3);
  saveToLocalStorage();
}

quaternianAngleSlider.onpointerup = function(){
  handleQuatOnPointerUp();
}

quaternianIhatSlider.onpointerup = function(){
  handleQuatOnPointerUp();
}

quaternianJhatSlider.onpointerup = function(){
  handleQuatOnPointerUp();
}

quaternianKhatSlider.onpointerup = function(){
  handleQuatOnPointerUp();
}

zeroQuaternionAngleButton.addEventListener('click', () => {
  quaternianAngleSlider.value = 0;
  handleQuatOnInput();
  resetAttitudeAndRates(false);
  replaceAerovisualizerData('eulerAngle1',euler1);
  replaceAerovisualizerData('eulerAngle2',euler2);
  replaceAerovisualizerData('eulerAngle3',euler3);
  saveToLocalStorage();
});

zeroQuaternionIhatButton.addEventListener('click', () => {
  quaternianIhatSlider.value = 0;
  handleQuatOnInput();
  resetAttitudeAndRates(false);
  replaceAerovisualizerData('eulerAngle1',euler1);
  replaceAerovisualizerData('eulerAngle2',euler2);
  replaceAerovisualizerData('eulerAngle3',euler3);
  saveToLocalStorage();
});

zeroQuaternionJhatButton.addEventListener('click', () => {
  quaternianJhatSlider.value = 0;
  handleQuatOnInput();
  resetAttitudeAndRates(false);
  replaceAerovisualizerData('eulerAngle1',euler1);
  replaceAerovisualizerData('eulerAngle2',euler2);
  replaceAerovisualizerData('eulerAngle3',euler3);
  saveToLocalStorage();
});

zeroQuaternionKhatButton.addEventListener('click', () => {
  quaternianKhatSlider.value = 0;
  handleQuatOnInput();
  resetAttitudeAndRates(false);
  replaceAerovisualizerData('eulerAngle1',euler1);
  replaceAerovisualizerData('eulerAngle2',euler2);
  replaceAerovisualizerData('eulerAngle3',euler3);
  saveToLocalStorage();
});

const handleOmegaSliderOnpointerup = function(){
  // slider goes from 0 to 100, we want 10 to be the
  // upper limit, so we divide by 10 here
  omegaMag = omegaMagnitudeSlider.value/10;
  omHihat = omegaIhatSlider.value;
  omHjhat = omegaJhatSlider.value;
  omHkhat = omegaKhatSlider.value;
  
  resetAttitudeAndRates();
  vo.needsRefresh = true;
  displayOmegaValues();
}

omegaMagnitudeSlider.oninput = function(){
  displayOmegaValues();
  haltPlay();
}

omegaIhatSlider.oninput = function(){
  displayOmegaValues();
  haltPlay();
}

omegaJhatSlider.oninput = function(){
  displayOmegaValues();
  haltPlay();
}

omegaKhatSlider.oninput = function(){
  displayOmegaValues();
  haltPlay();
}

omegaMagnitudeSlider.onchange = function(){
  handleOmegaSliderOnpointerup();
  replaceAerovisualizerData('omegaMagnitude',this.value);
  saveToLocalStorage();
}

omegaIhatSlider.onpointerup = function(){
  handleOmegaSliderOnpointerup();
  replaceAerovisualizerData('omHihat',this.value);
  saveToLocalStorage();
}

omegaJhatSlider.onpointerup = function(){
  handleOmegaSliderOnpointerup();
  replaceAerovisualizerData('omHjhat',this.value);
  saveToLocalStorage();
}

omegaKhatSlider.onpointerup = function(){
  handleOmegaSliderOnpointerup();
  replaceAerovisualizerData('omHkhat',this.value);
  saveToLocalStorage();
}

zeroOmegaIhatButton.addEventListener('click', () => {
  omegaIhatSlider.value = 0;
  displayOmegaValues();
  haltPlay();
  handleOmegaSliderOnpointerup();
  replaceAerovisualizerData('omHihat',0);
  saveToLocalStorage();
});

zeroOmegaJhatButton.addEventListener('click', () => {
  omegaJhatSlider.value = 0;
  displayOmegaValues();
  haltPlay();
  handleOmegaSliderOnpointerup();
  replaceAerovisualizerData('omHjhat',0);
  saveToLocalStorage();
});

zeroOmegaKhatButton.addEventListener('click', () => {
  omegaKhatSlider.value = 0;
  displayOmegaValues();
  haltPlay();
  handleOmegaSliderOnpointerup();
  replaceAerovisualizerData('omHkhat',0);
  saveToLocalStorage();
});

omegaOrHOmegaRadio.addEventListener('click', () => {
  omegaOrH = 'omega';
  handleOmegaSliderOnpointerup();
  replaceAerovisualizerData('omegaOrH',omegaOrH);
  saveToLocalStorage();
});

omegaOrHHRadio.addEventListener('click', () => {
  omegaOrH = 'H';
  handleOmegaSliderOnpointerup();
  replaceAerovisualizerData('omegaOrH',omegaOrH);
  saveToLocalStorage();
});

const setOmegaOrHChoice = function(omOrH, getFromRadios=false){
  for (let radio of omegaOrHRadios) {
    if (getFromRadios){
      if (radio.checked){
        replaceAerovisualizerData('omegaOrH',radio.value);
      }
    }else{
      radio.checked = radio.value === omOrH;
    }

    if (radio.checked){
      omegaOrH = radio.value;
    }
  }
}

torqueOptionMenu.addEventListener('change', () => {
  const choice = torqueOptionMenu.value;

  switch (choice){
    case 'no-torque':
      torqueOption = 1;
      break;
    case 'space-frame':
      torqueOption = 2;
      break;
    case 'body-frame':
      torqueOption = 3;
      break;
    case 'ACS-stabilization':
      torqueOption = 4;
      break;
    case 'gravity-gradient':
      torqueOption = 5;
      break;
    case 'top':
      torqueOption = 6;
      break;
  }

  replaceAerovisualizerData('torqueOption',torqueOption);
  saveToLocalStorage();
  handleMainButtons('torque');
  resetAttitudeAndRates();
});

torqueMagnitudeSlider.oninput = function(){
  displayTorqueValues();
  haltPlay();
}

torqueIhatSlider.oninput = function(){
  displayTorqueValues();
  haltPlay();
}

torqueJhatSlider.oninput = function(){
  displayTorqueValues();
  haltPlay();
}

torqueKhatSlider.oninput = function(){
  displayTorqueValues();
  haltPlay();
}

acsDeadZoneSlider.oninput = function(){
  haltPlay();
  torqueACSDZ = Number(acsDeadZoneSlider.value)/10;
  acsDeadZoneDisplay.innerHTML = Number(torqueACSDZ).toFixed(1).toString();
  sdo.setACSDeadzoneOmega(torqueACSDZ*piOver180);
  displayNumerical();
}

acsTorqueMagnitudeSlider.oninput = function(){
  haltPlay();
  torqueACSTorque = Number(acsTorqueMagnitudeSlider.value)/100;
  acsTorqueMagnitudeDisplay.innerHTML = Number(torqueACSTorque).toFixed(2).toString();
  sdo.setACSTorque(torqueACSTorque);
  displayNumerical();
}

torqueMuOverR3Slider.oninput = function(){
  torqueGG = +torqueMuOverR3Slider.value;
  muOverR3 = muOverR3Choices[torqueGG];
  torqueMuOverR3Display.innerHTML = muOverR3ChoiceDisplay[+torqueMuOverR3Slider.value];
  sdo.set3MuOverR3(3*muOverR3);
  haltPlay();
}

torqueTopRDistanceSlider.oninput = function(){
  torqueTopR = Number(torqueTopRDistanceSlider.value);
  torqueTopRDistanceDisplay.innerHTML = torqueTopR;
  sdo.setTopRDistance(torqueTopR);
  haltPlay();
}

torqueTopGravitySlider.oninput = function(){
  torqueTopGrav = torqueTopGravitySlider.value;
  torqueTopGravityDisplay.innerHTML = torqueTopGrav;
  sdo.setTopGravity(torqueTopGrav);
  haltPlay();
}

const handleTorqueSlidersOnpointerup = function(option){
  // slider goes from 0 to 50, but we want 10 to be the
  // upper limit, so we divide by 5 here
  torqueMag = torqueMagnitudeSlider.value/5;
  torqueIhat = torqueIhatSlider.value;
  torqueJhat = torqueJhatSlider.value;
  torqueKhat = torqueKhatSlider.value;

  switch (option){
    case 0:// no torque
      replaceAerovisualizerData('torqueMag',torqueMag);
      replaceAerovisualizerData('torqueIhat',torqueIhat);
      replaceAerovisualizerData('torqueJhat',torqueJhat);
      replaceAerovisualizerData('torqueKhat',torqueKhat);
      break;
    case 1:// space or body frame
      replaceAerovisualizerData('torqueMag',torqueMag);
      replaceAerovisualizerData('torqueIhat',torqueIhat);
      replaceAerovisualizerData('torqueJhat',torqueJhat);
      replaceAerovisualizerData('torqueKhat',torqueKhat);
      break;
    case 2:// acs
      replaceAerovisualizerData('torqueACSDZ',torqueACSDZ);
      replaceAerovisualizerData('torqueACSTorque',torqueACSTorque);
      break;
    case 3:// gravity gradient
      replaceAerovisualizerData('torqueGG',torqueGG);
      break;
    case 4:// top
      replaceAerovisualizerData('torqueTopR',torqueTopR);
      replaceAerovisualizerData('torqueTopGrav',torqueTopGrav);
      break;
  }

  sdo.setEulerAngles(euler1,euler2,euler3);
  sdo.setOmega(omegaOrH,omegaMag,omHihat,omHjhat,omHkhat);
  sdo.setTorque(torqueOption, torqueMag, torqueIhat, torqueJhat, torqueKhat);
  vo.receiveVectorData(...sdo.sendVectorData());
  vo.needsRefresh = true;
  saveToLocalStorage();
  resetAttitudeAndRates();
  haltPlay();
  displayTorqueValues();
}

torqueMagnitudeSlider.onpointerup = function(){
  handleTorqueSlidersOnpointerup(1);
}

torqueIhatSlider.onpointerup = function(){
  handleTorqueSlidersOnpointerup(1);
}

torqueJhatSlider.onpointerup = function(){
  handleTorqueSlidersOnpointerup(1);
}

torqueKhatSlider.onpointerup = function(){
  handleTorqueSlidersOnpointerup(1);
}

zeroTorqueXButton.addEventListener('click', () => {
  torqueIhatSlider.value = 0;
  handleTorqueSlidersOnpointerup(1);
});

zeroTorqueYButton.addEventListener('click', () => {
  torqueJhatSlider.value = 0;
  handleTorqueSlidersOnpointerup(1);
});

zeroTorqueZButton.addEventListener('click', () => {
  torqueKhatSlider.value = 0;
  handleTorqueSlidersOnpointerup(1);
});

acsDeadZoneSlider.onpointerup = function(){
  handleTorqueSlidersOnpointerup(2);
}

acsTorqueMagnitudeSlider.onpointerup = function(){
  handleTorqueSlidersOnpointerup(2);
}

torqueMuOverR3Slider.onpointerup = function(){
  handleTorqueSlidersOnpointerup(3);
}

torqueTopRDistanceSlider.onpointerup = function(){
  handleTorqueSlidersOnpointerup(4);
}

torqueTopGravitySlider.onpointerup = function(){
  handleTorqueSlidersOnpointerup(4);
}

const displayMomentsOfInertia = function(){
  let ixx = 0;
  let iyy = 0;
  let izz = 0;

  if (objectMassProperties === 'select-an-object'){
    // allow one dimension to be zero but not two or more,
    // this is not necessary if we check before the function
    // but might be good for safety
    const p1 = dimX === 0;
    const p2 = dimY === 0;
    const p3 = dimZ === 0;
    
    if ((p1 && p2) || (p1 && p3) || (p2 && p3)){
      ixx = 0;
      iyy = 0;
      izz = 0;
    }else{
      ixx = Math.round((dimY*dimY + dimZ*dimZ)*mass/12*100)/100;
      iyy = Math.round((dimX*dimX + dimZ*dimZ)*mass/12*100)/100;
      izz = Math.round((dimX*dimX + dimY*dimY)*mass/12*100)/100;
    }
  }else{
    [ixx, iyy, izz] = sdo.getMomentsOfInertia();
  }

  ixxNumber.innerHTML = ixx;
  iyyNumber.innerHTML = iyy;
  izzNumber.innerHTML = izz;
  ixxDisplay.innerHTML = ixx;
  iyyDisplay.innerHTML = iyy;
  izzDisplay.innerHTML = izz;
}

const displayEulerAngles = function(){
  euler1Display.innerHTML = +euler1Slider.value;
  euler2Display.innerHTML = +euler2Slider.value;
  euler3Display.innerHTML = +euler3Slider.value;
  displayNumerical(true);
}

const displayOmegaValues = function(){
  let omx = omHihat;
  let omy = omHjhat;
  let omz = omHkhat;
  let omm = omegaMag;
  const rss = Math.sqrt(omx*omx + omy*omy + omz*omz);

  if (rss === 0){
    omegaIhatDisplay.innerHTML = "?";
    omegaJhatDisplay.innerHTML = "?";
    omegaKhatDisplay.innerHTML = "?";
    omegaPDisplay.innerHTML = "?";
    omegaQDisplay.innerHTML = "?";
    omegaRDisplay.innerHTML = "?";
    return;
  }

  omx = Number(omx/rss).toFixed(2).toString();
  omy = Number(omy/rss).toFixed(2).toString();
  omz = Number(omz/rss).toFixed(2).toString();
  omegaMagnitudeDisplay.innerHTML = Number(omm).toFixed(2).toString();
  hMagnitudeDisplay.innerHTML = Number(sdo.getAngularMomentumMagnitude()).toFixed(2).toString();
  // the slider goes from 0 to 100, but the displayed
  // value should go from 0 to 10
  omegaIhatDisplay.innerHTML = omx;
  omegaJhatDisplay.innerHTML = omy;
  omegaKhatDisplay.innerHTML = omz;
  omegaPDisplay.innerHTML = Number(omx*omm).toFixed(2).toString();
  omegaQDisplay.innerHTML = Number(omy*omm).toFixed(2).toString();
  omegaRDisplay.innerHTML = Number(omz*omm).toFixed(2).toString();
}

const displayTorqueValues = function(){
  let taux = torqueIhatSlider.value;
  let tauy = torqueJhatSlider.value;
  let tauz = torqueKhatSlider.value;
  // the slider goes from 0 to 50, but the value should go from 0 to 10
  let taumag = torqueMagnitudeSlider.value/5;
  const rss = Math.sqrt(taux*taux + tauy*tauy + tauz*tauz);

  if (rss === 0){
    torqueIhatDisplay.innerHTML = "?";
    torqueJhatDisplay.innerHTML = "?";
    torqueKhatDisplay.innerHTML = "?";
    return;
  }

  torqueMagnitudeDisplay.innerHTML = taumag;
  torqueIhatDisplay.innerHTML = Number(taux/rss).toFixed(2).toString();
  torqueJhatDisplay.innerHTML = Number(tauy/rss).toFixed(2).toString();
  torqueKhatDisplay.innerHTML = Number(tauz/rss).toFixed(2).toString();
  displayNumerical(true);
}

const displayNumerical = function(display = false){
  if ((display || numericalElements.style.display === 'grid') && sdo != null){
    const omegaX = Number(sdo._omega.x).toFixed(3).toString();
    const omegaY = Number(sdo._omega.y).toFixed(3).toString();
    const omegaZ = Number(sdo._omega.z).toFixed(3).toString();
    const hX = Number(sdo._Hinertial.x).toFixed(2).toString();
    const hY = Number(sdo._Hinertial.y).toFixed(2).toString();
    const hZ = Number(sdo._Hinertial.z).toFixed(2).toString();
    const tauL = Number(sdo._torque.x).toFixed(3).toString();
    const tauM = Number(sdo._torque.y).toFixed(3).toString();
    const tauN = Number(sdo._torque.z).toFixed(3).toString();
    const dcm11 = Number(sdo._dcm.elements[0]).toFixed(3).toString();
    const dcm12 = Number(sdo._dcm.elements[4]).toFixed(3).toString();
    const dcm13 = Number(sdo._dcm.elements[8]).toFixed(3).toString();
    const dcm21 = Number(sdo._dcm.elements[1]).toFixed(3).toString();
    const dcm22 = Number(sdo._dcm.elements[5]).toFixed(3).toString();
    const dcm23 = Number(sdo._dcm.elements[9]).toFixed(3).toString();
    const dcm31 = Number(sdo._dcm.elements[2]).toFixed(3).toString();
    const dcm32 = Number(sdo._dcm.elements[6]).toFixed(3).toString();
    const dcm33 = Number(sdo._dcm.elements[10]).toFixed(3).toString();
    let [qw, qx, qy, qz] = sdo.getQuaternionElements();
    qw = Number(qw).toFixed(4).toString();
    qx = Number(qx).toFixed(4).toString();
    qy = Number(qy).toFixed(4).toString();
    qz = Number(qz).toFixed(4).toString();

    omegaPNumber.innerHTML = omegaX.charAt(0) === '-' ? omegaX : ` ${omegaX}`;
    omegaQNumber.innerHTML = omegaY.charAt(0) === '-' ? omegaY : ` ${omegaY}`;
    omegaRNumber.innerHTML = omegaZ.charAt(0) === '-' ? omegaZ : ` ${omegaZ}`;
    hXNumber.innerHTML = hX.charAt(0) === '-' ? hX : ` ${hX}`;
    hYNumber.innerHTML = hY.charAt(0) === '-' ? hY : ` ${hY}`;
    hZNumber.innerHTML = hZ.charAt(0) === '-' ? hZ : ` ${hZ}`;
    tauLNumber.innerHTML = tauL.charAt(0) === '-' ? tauL : ` ${tauL}`;
    tauMNumber.innerHTML = tauM.charAt(0) === '-' ? tauM : ` ${tauM}`;
    tauNNumber.innerHTML = tauN.charAt(0) === '-' ? tauN : ` ${tauN}`;
    dcm11Number.innerText = dcm11.charAt(0) === '-' ? dcm11 : ` ${dcm11}`;
    dcm12Number.innerText = dcm12.charAt(0) === '-' ? dcm12 : ` ${dcm12}`;
    dcm13Number.innerText = dcm13.charAt(0) === '-' ? dcm13 : ` ${dcm13}`;
    dcm21Number.innerText = dcm21.charAt(0) === '-' ? dcm21 : ` ${dcm21}`;
    dcm22Number.innerText = dcm22.charAt(0) === '-' ? dcm22 : ` ${dcm22}`;
    dcm23Number.innerText = dcm23.charAt(0) === '-' ? dcm23 : ` ${dcm23}`;
    dcm31Number.innerText = dcm31.charAt(0) === '-' ? dcm31 : ` ${dcm31}`;
    dcm32Number.innerText = dcm32.charAt(0) === '-' ? dcm32 : ` ${dcm32}`;
    dcm33Number.innerText = dcm33.charAt(0) === '-' ? dcm33 : ` ${dcm33}`;
    quatWNumber.innerHTML = qw.charAt(0) === '-' ? qw : ` ${qw}`;
    quatXNumber.innerHTML = qx.charAt(0) === '-' ? qx : ` ${qx}`;
    quatYNumber.innerHTML = qy.charAt(0) === '-' ? qy : ` ${qy}`;
    quatZNumber.innerHTML = qz.charAt(0) === '-' ? qz : ` ${qz}`;

    const ke = sdo.getKineticEnergy();
    kineticEnergy.innerHTML = Number(ke).toFixed(2).toString();
  }
}

objectAppearanceChoiceMenu.addEventListener('change', () => {
  objectAppearance = objectAppearanceChoiceMenu.value;
  sdo.constructBlock(objectAppearance);

  if (objectAppearance === 'axis-labels'){
    handleMassPropsSliders();
  }else if (objectAppearance === 'cessna-172'){
    dimX = 9;
    dimY = 7;
    dimZ = 4;
    dimXDisplay.innerHTML = dimX;
    dimYDisplay.innerHTML = dimY;
    dimZDisplay.innerHTML = dimZ;
    dimXSlider.value = dimX;
    dimYSlider.value = dimY;
    dimZSlider.value = dimZ;
    // sdo._scale.set(9*0.5, 7*0.5, 4*0.5);
  }else if (objectAppearance === 'new-horizons'){
    dimX = 9;
    dimY = 4;
    dimZ = 6;
    dimXDisplay.innerHTML = dimX;
    dimYDisplay.innerHTML = dimY;
    dimZDisplay.innerHTML = dimZ;
    dimXSlider.value = dimX;
    dimYSlider.value = dimY;
    dimZSlider.value = dimZ;
    // sdo._scale.set(9*0.5, 4*0.5, 6*0.5);
  }

  replaceAerovisualizerData('objectAppearance',objectAppearance);
  replaceAerovisualizerData('dimX',dimX);
  replaceAerovisualizerData('dimY',dimY);
  replaceAerovisualizerData('dimZ',dimZ);
  saveToLocalStorage();
});

const setMassProperties = function(option){
  // mass, Ixx, Iyy, Izz metric
  //Cessna 172 1043.3,1285.3,1824.9,2666.9
  //New Horizons Probe  401,161.38,402.12,316
  objectMassProperties = option;
  replaceAerovisualizerData('objectMassProperties',objectMassProperties);

  if (!(option === 'select-an-object')){
    if (option === 'cessna-172'){
      dimX = 9;
      dimY = 7;
      dimZ = 4;
    }else if (option === 'new-horizons'){
      dimX = 9;
      dimY = 4;
      dimZ = 6;
    }

    dimXDisplay.innerHTML = dimX;
    dimYDisplay.innerHTML = dimY;
    dimZDisplay.innerHTML = dimZ;
    dimXSlider.value = dimX;
    dimYSlider.value = dimY;
    dimZSlider.value = dimZ;
    sdo.setPresetMassProperties(option);
  }else{
    sdo.setDimensionsAndInertiaProperties(mass, dimX, dimY, dimZ);
  }

  replaceAerovisualizerData('mass',mass);
  replaceAerovisualizerData('length',dimX);
  replaceAerovisualizerData('width',dimY);
  replaceAerovisualizerData('height',dimZ);

  displayMomentsOfInertia();
  //look into this!  check if this is still true!!!!!
  //moments of inertia are not displayed correctly for other than
  //the first case, need to fix this
  displayNumerical(true);

  if (torqueOption === 1){
    pac.showPoinsot(poinsotTransparency < maxTransparency);

    if (dimX === dimY || dimX === dimZ || dimY === dimZ){
      pac.showCones(conesTransparency < maxTransparency);
    }
  }

  resetAttitudeAndRates();
  saveToLocalStorage();
  sdo.needsRefresh = true;
}

presetMassPropertiesMenu.addEventListener('change', () => {
  setMassProperties(presetMassPropertiesMenu.value);
});

const setEnvironment = function(env, getFromRadios=false){
  for (let radio of environmentRadios) {
    if (getFromRadios){
      if (radio.checked){
        replaceAerovisualizerData('environment',radio.value);
        saveToLocalStorage();
      }
    }else{
      radio.checked = radio.value === env;
    }

    if (radio.checked){
      loadBackground(radio.value);
    }
  }
}

maxOmegaSlider.oninput = function(){
  maxOmegaDisplay.innerText = maxOmegaSlider.value;
}

maxOmegaSlider.onpointerup = function(){
  maxOmega = Number(this.value);
  replaceAerovisualizerData('maxOmega',maxOmega);
  saveToLocalStorage();
}

vectorSizeSlider.onpointerup = function(){
  vo.setVectorSize(this.value);
  pac.setConeSize(this.value);
  replaceAerovisualizerData('vectorSize',this.value);
  saveToLocalStorage();
}

const setTransparency = function(thing, transparency){
  const opacity = (100 - transparency)/100;
  sdo.setOpacity(thing, opacity);
  vo.setOpacity(thing, opacity);
  pac.setOpacity(thing, opacity);

  switch (thing){
    case 'object':
      objectTransparencyDisplay.innerHTML = transparency;
      break;
    case 'bodyFrame':
      bodyFrameTransparencyDisplay.innerHTML = transparency; 
      break;
    case 'spaceFrame':
      spaceFrameTransparencyDisplay.innerHTML = transparency;
      break;
    case 'omega':
      omegaTransparencyDisplay.innerHTML = transparency;
      break;
    case 'h':
      hTransparencyDisplay.innerHTML = transparency;
      break;
    case 'torque':
      torqueTransparencyDisplay.innerHTML = transparency;
      break;
    case 'cones':
      conesTransparencyDisplay.innerHTML = transparency;
      break;
    case 'poinsot':
      poinsotTransparencyDisplay.innerHTML = transparency;
      break;
  }
}

objectTransparencySlider.oninput = function(){
  objectTransparencyDisplay.innerText = objectTransparencySlider.value;
  setTransparency('object',this.value);
}

objectTransparencySlider.onpointerup = function(){
  setTransparency('object',this.value);
  replaceAerovisualizerData('objectTransparency',this.value);
  sdo.showObject(this.value < maxTransparency);
  saveToLocalStorage();
}

bodyFrameTransparencySlider.oninput = function(){
  bodyFrameTransparencyDisplay.innerText = bodyFrameTransparencySlider.value;
  setTransparency('bodyFrame',this.value);
}

bodyFrameTransparencySlider.onpointerup = function(){
  setTransparency('bodyFrame',this.value);
  replaceAerovisualizerData('bodyFrameTransparency',this.value);
  vo.showBodyFrame(this.value < maxTransparency);
  saveToLocalStorage();
}

const showBodyVector = function(){
  vo.showBodyAxis(showBodyXVectorCheckbox.checked, showBodyYVectorCheckbox.checked, showBodyZVectorCheckbox.checked);
  renderer.clear();
  renderer.render(scene, camera);
}

showBodyXVectorCheckbox.addEventListener('change', () => {
  showBodyVector();
  replaceAerovisualizerData('showBodyXVector',showBodyXVectorCheckbox.checked);
  saveToLocalStorage();
});

showBodyYVectorCheckbox.addEventListener('change', () => {
  showBodyVector();
  replaceAerovisualizerData('showBodyYVector',showBodyYVectorCheckbox.checked);
  saveToLocalStorage();
});

showBodyZVectorCheckbox.addEventListener('change', () => {
  showBodyVector();
  replaceAerovisualizerData('showBodyZVector',showBodyZVectorCheckbox.checked);
  saveToLocalStorage();
});

spaceFrameTransparencySlider.oninput = function(){
  spaceFrameTransparencyDisplay.innerText = spaceFrameTransparencySlider.value;
  setTransparency('spaceFrame',this.value);
}

spaceFrameTransparencySlider.onpointerup = function(){
  replaceAerovisualizerData('spaceFrameTransparency',this.value);
  vo.showSpaceFrame(this.value < maxTransparency);
  saveToLocalStorage();
}

omegaTransparencySlider.oninput = function(){
  omegaTransparencyDisplay.innerText = omegaTransparencySlider.value;
  setTransparency('omega',this.value);
}

omegaTransparencySlider.onpointerup = function(){
  setTransparency('omega',this.value);
  replaceAerovisualizerData('omegaTransparency',this.value);
  vo.showOmega(this.value < maxTransparency);
  saveToLocalStorage();
}

hTransparencySlider.oninput = function(){
  hTransparencyDisplay.innerText = hTransparencySlider.value;
  setTransparency('h',this.value);
}

hTransparencySlider.onpointerup = function(){
  setTransparency('h',this.value);
  replaceAerovisualizerData('hTransparency',this.value);
  vo.showAngularMomentum(this.value < maxTransparency);
  saveToLocalStorage();
}

torqueTransparencySlider.oninput = function(){
  torqueTransparencyDisplay.innerText = torqueTransparencySlider.value;
  setTransparency('torque',this.value);
}

torqueTransparencySlider.onpointerup = function(){
  setTransparency('torque',this.value);
  replaceAerovisualizerData('torqueTransparency',this.value);
  vo.showTorque(this.value < maxTransparency);
  saveToLocalStorage();
}

conesTransparencySlider.oninput = function(){
  conesTransparency = Number(this.value);
  conesTransparencyDisplay.innerText = this.value;
  setTransparency('cones',this.value);
}

conesTransparencySlider.onpointerup = function(){
  setTransparency('cones',this.value);
  replaceAerovisualizerData('conesTransparency',this.value);

  if (torqueOption === 1){
    pac.showCones(this.value < maxTransparency);
  }
  
  saveToLocalStorage();
}

poinsotTransparencySlider.oninput = function(){
  poinsotTransparency = Number(this.value);
  poinsotTransparencyDisplay.innerText = this.value;
}

poinsotTransparencySlider.onpointerup = function(){
  setTransparency('poinsot',this.value);
  replaceAerovisualizerData('poinsotTransparency',this.value);
  pac.showPoinsot(this.value < maxTransparency);
  saveToLocalStorage();
}

objectOffsetCheckbox.addEventListener('change', () => {
  sdo.setOrigin('object', objectOffsetCheckbox.checked);
  replaceAerovisualizerData('objectOffset',objectOffsetCheckbox.checked);
  saveToLocalStorage();
  sdo.refresh();
});

bodyFrameOffsetCheckbox.addEventListener('change', () => {
  vo.setOrigin('bodyFrame', bodyFrameOffsetCheckbox.checked);
  replaceAerovisualizerData('bodyFrameOffset',bodyFrameOffsetCheckbox.checked);
  saveToLocalStorage();
  vo.refresh();
});

spaceFrameOffsetCheckbox.addEventListener('change', () => {
  vo.setOrigin('spaceFrame', spaceFrameOffsetCheckbox.checked);
  replaceAerovisualizerData('spaceFrameOffset',spaceFrameOffsetCheckbox.checked);
  saveToLocalStorage();
  vo.refresh();
});

omegaOffsetCheckbox.addEventListener('change', () => {
  vo.setOrigin('omega', omegaOffsetCheckbox.checked);
  replaceAerovisualizerData('omegaOffset',omegaOffsetCheckbox.checked);
  saveToLocalStorage();
  vo.refresh();
});

hOffsetCheckbox.addEventListener('change', () => {
  vo.setOrigin('h', hOffsetCheckbox.checked);
  replaceAerovisualizerData('hOffset',hOffsetCheckbox.checked);
  saveToLocalStorage();
  vo.refresh();
});

torqueOffsetCheckbox.addEventListener('change', () => {
  vo.setOrigin('torque', torqueOffsetCheckbox.checked);
  replaceAerovisualizerData('torqueOffset',torqueOffsetCheckbox.checked);
  saveToLocalStorage();
  vo.refresh();
});

conesOffsetCheckbox.addEventListener('change', () => {
  pac.setOrigin('cones', conesOffsetCheckbox.checked);
  replaceAerovisualizerData('conesOffset',conesOffsetCheckbox.checked);
  saveToLocalStorage();
  pac.refresh();
});

poinsotOffsetCheckbox.addEventListener('change', () => {
  pac.setOrigin('poinsot', poinsotOffsetCheckbox.checked);
  replaceAerovisualizerData('poinsotOffset',poinsotOffsetCheckbox.checked);
  saveToLocalStorage();
  pac.refresh();
});

const setBodyFrameColor = function(color, save=false){
  vo.setColor('bodyFrame', color);

  if (save){
    replaceAerovisualizerData('bodyFrameColor',color);
  }
}

const setSpaceFrameColor = function(color, save=false){
  vo.setColor('spaceFrame', color);

  if (save){
    replaceAerovisualizerData('spaceFrameColor',color);
  }
}

const setOmegaColor = function(color, save=false){
  vo.setColor('omega', color);

  if (save){
    replaceAerovisualizerData('omegaColor',color);
  }
}

const setHColor = function(color, save=false){
  vo.setColor('h', color);

  if (save){
    replaceAerovisualizerData('hColor',color);
  }
}

const setTorqueColor = function(color, save=false){
  vo.setColor('torque', color);

  if (save){
    replaceAerovisualizerData('torqueColor',color);
  }
}

const setBodyConeColor = function(color, save=false){
  pac.setColor('bodyCone', color);

  if (save){
    replaceAerovisualizerData('bodyConeColor',color);
  }
}

const setSpaceConeColor = function(color, save=false){
  pac.setColor('spaceCone', color);

  if (save){
    replaceAerovisualizerData('spaceConeColor',color);
  }
}

const setEllipsoidColor = function(color, save=false){
  pac.setColor('ellipsoid', color);

  if (save){
    replaceAerovisualizerData('ellipsoidColor',color);
  }
}

const setPlaneColor = function(color, save=false){
  pac.setColor('plane', color);

  if (save){
    replaceAerovisualizerData('planeColor',color);
  }
}

bodyFrameColorMenu.addEventListener('change', () => {
  bodyFrameColor = bodyFrameColorMenu.value;
  setBodyFrameColor(bodyFrameColor, true);
  saveToLocalStorage();
});

spaceFrameColorMenu.addEventListener('change', () => {
  spaceFrameColor = spaceFrameColorMenu.value;
  setSpaceFrameColor(spaceFrameColor, true);
  saveToLocalStorage();
});

omegaColorMenu.addEventListener('change', () => {
  omegaColor = omegaColorMenu.value;
  setOmegaColor(omegaColor, true);
  saveToLocalStorage();
});

hColorMenu.addEventListener('change', () => {
  hColor = hColorMenu.value;
  setHColor(hColor, true);
  saveToLocalStorage();
});

torqueColorMenu.addEventListener('change', () => {
  torqueColor = torqueColorMenu.value;
  setTorqueColor(torqueColor, true);
  saveToLocalStorage();
});

bodyConeColorMenu.addEventListener('change', () => {
  bodyConeColor = bodyConeColorMenu.value;
  setBodyConeColor(bodyConeColor, true);
  saveToLocalStorage();
});

spaceConeColorMenu.addEventListener('change', () => {
  spaceConeColor = spaceConeColorMenu.value;
  setSpaceConeColor(spaceConeColor, true);
  saveToLocalStorage();
});

ellipsoidColorMenu.addEventListener('change', () => {
  ellipsoidColor = ellipsoidColorMenu.value;
  setEllipsoidColor(ellipsoidColor, true);
  saveToLocalStorage();
});

planeColorMenu.addEventListener('change', () => {
  planeColor = planeColorMenu.value;
  setPlaneColor(planeColor, true);
  saveToLocalStorage();
});

const toggleShowInfo = function(){
  if (sixDOFworld.style.display === 'none'){
    sixDOFworld.style.display = 'block';
    numericalButton.style.display = 'block';
    massPropButton.style.display = 'block';
    attitudeButton.style.display = 'block';
    rotationRateButton.style.display = 'block';
    torqueButton.style.display = 'block';
    preferencesButton.style.display = 'block';
    infoButton.style.display = 'block';
    mainReturnButton.style.display = 'block';
    playPauseButton.style.display = 'block';
    resetButton.style.display = 'block';
    infoElements.style.display = 'none';
    doWindowResizeOrOrientationChange();
    handleTorqueOptionMenu();
    handleMainButtons('numerical');
  }else{
    sixDOFworld.style.display = 'none';
    numericalButton.style.display = 'none';
    massPropButton.style.display = 'none';
    attitudeButton.style.display = 'none';
    rotationRateButton.style.display = 'none';
    torqueButton.style.display = 'none';
    preferencesButton.style.display = 'none';
    infoButton.style.display = 'none';
    mainReturnButton.style.display = 'none';
    playPauseButton.style.display = 'none';
    resetButton.style.display = 'none';
    infoElements.style.display = 'grid';
    handleMainButtons('none');
  }
}

infoButton.addEventListener('click', () => {
  haltPlay();
  toggleShowInfo();
});

infoReturnButton.addEventListener('click', () => {
  toggleShowInfo();
});

const handleInfoMenuChoice = function(choice){
  switch (choice){
    case 'info-intro': //Introduction
      infoText.innerHTML = `<p class="p-normal">The purpose of Aerovisualizer is to 
      assist in teaching or reinforcing concepts in aerospace engineering by presenting 
      them in interesting and engaging ways.  Subjects are displayed as 2D and 3D 
      animations to complement the dry equations found in textbooks and online.  Controls
      are also provided to manipulate the displays.</p>
      
      <p class="p-normal"><em>Aerovisualizer - Rotation</em> focuses on the orientation and 
      rotational dynamics of rigid bodies.  Topics include Euler angles, quaternions, 
      direction cosines, angular velocity and momentum and torque (ACS engines, gravity 
      gradient, spinning top).  Also included are space and body cones and Poinsot's 
      construction.  It is assumed that the user has taken or is currently taking a course 
      covering these subjects.</p>`;
      break;

    case 'info-how-to-use': //how to use aerovisualizer
      infoText.innerHTML = `
      <p class="p-normal">1) Click <em>mass</em> to set the mass and the three moments of inertia 
      of the rigid body.</p>
      <p class="p-normal">2) Click <em>&psi;&nbsp;&theta;&nbsp;&phi;</em> to set the initial 
      orientation (attitude).</p>
      <p class="p-normal">3) Click <em>&omega;&nbsp;/&nbsp;H</em> to set the initial angular velocity 
      or angular momentum.</p>
      <p class="p-normal">4) Click <em>&tau;</em> to set the the type of torque (if any) that you want 
      to apply.</p>
      <p class="p-normal">5) Click the <em>play</em> button to run the simulation.  Click the 
      <em>reset</em> button to return the rigid body to its initial state.</p>`;
      break;

    case 'info-mass-prop': //mass properties
      infoText.innerHTML = `<p class="p-normal"><em>Mass Properties</em> is a 
      term that refers to the mass, moments of inertia, and products of 
      inertia of a physical object. A body-fixed vector basis can always 
      be chosen such that the products of inertia are zero, which 
      Aerovisualizer does.  In this case, the moments of inertia are 
      referred to as the principal moments of inertia.</p>

      <p class="p-normal">Every object has a companion object shaped like 
      a brick that has the exact same mass properties as the object itself.  
      For simplicity, Aerovisualizer displays only brick shaped objects.</p>
    
      <p class="p-normal">Click <em>mass</em>.  Use the slider 
      controls to set the mass and the 3 dimensions of the brick 
      representing the rigid body.  The 3 moments of inertia are displayed
      as Ixx, Iyy, and Izz for the x, y, and z body axes, respectively.</p>`;
      break;

    case 'info-attitude': //Euler angles & quaternions
      infoText.innerHTML = `<p class="p-normal">The two most common ways 
      to specify orientation are 1) Euler angles, and 2) quaternions.  
      Click <em>&psi;&nbsp;&theta;&nbsp;&phi;</em>, and use the button that appears 
      to toggle between Euler angles and quaternions.</p>

      <p class="p-normal"><em>Euler Angles</em>: By default, Aervisualizer uses the "ZYX" 
      sequence of Euler rotations, where the first rotation is &psi; (yaw), the 
      second is &theta; (pitch), and the third is &phi; (roll).  Use the sliders to set 
      these values in degrees.  Use the buttons to set the values to zero.  Tait-Bryan 
      rotation sequences are a subset of the set of the Euler angle sequences.  Choose 
      from 6 intrinsic Tait-Bryan sequences in the preferences.

      <p class="p-normal"><em>Quaternions</em>: Use the sliders to set the 
      rotation angle of the object in degrees and also the components of the unit 
      vector &lambda; about which the rotation is made.  Use the buttons to set 
      the values to zero.  The components of the quaternion are displayed as 
      w, x, y, and z.</p>`;
      break;

    case 'info-angular-rates': //angular velocity & momentum
      infoText.innerHTML = `<p class="p-normal">Click <em>&omega;&nbsp;/&nbsp;H</em>  
      and use the radio buttons to select either &omega; (angular velocity) or H 
      (angular momentum).</p>
      
      <p class="p-normal">Use the sliders to set the magnitude of &omega; or 
      H and the 3 components of a unit vector in the direction of the chosen 
      vector (body-frame).  Use the buttons to set the values to zero.</p>
    
      <p class="p-normal">Angular velocity is specified in radians/second.  
      Angular momentum is in the units of your choice (see <em>units</em>).  
      The x, y, and z components of &omega; are displayed as P, Q, and R, 
      respectively.</p>`;
      break;

    case 'info-cones': //space and body cones
      infoText.innerHTML = `<p class="p-normal">Rigid bodies for which 2 of 
      the 3 principal moments of inertia at the center of mass are equal are 
      said to be axially symmetric whether or not the mass distribution is 
      symmetrical.  Such bodies exhibit a characteristic behavior while 
      rotating without torque.</p>
      
      <p class="p-normal">For these rigid bodies, &omega; traces a cone about 
      the H vector.  This cone is referred to as the <em>space cone</em> and remains 
      inertially fixed. The &omega; vector also traces a body-fixed cone called the 
      <em>body cone</em> about the axis of symmetry.</p>
    
      <p class="p-normal">Long thin objects undergo direct precession, and the 
      body cone rolls without slipping on the outside of the space cone.  Flat 
      objects undergo retrograde precession, and the inside surface of the body 
      cone rolls without slipping on the outside surface of the space cone.</p>

      <p class="p-normal">The following conditions must be met for the cones to 
      appear: 1) Two of the three moments of inertia must be equal, 2) &omega; 
      must not be zero, 3) &omega; and H cannot be colinear, 4) the <em>no torque</em> 
      option must be selected, and 5) the cones must be set non-transparent in the 
      preferences.</p>`;
      break;

    case 'info-poinsot': //Poinsot's construction
      infoText.innerHTML = `<p class="p-normal">A method of analyzing the free 
      motion of a rigid body was developed by <em>Louis Poinsot</em> in 1834.  In the 
      Poinsot method, the rotational inertia characteristics can be expressed 
      with an <em>ellipsoid of inertia</em>.</p>
    
      <p class="p-normal">The angular momentum can be represented by a plane called
      the <em>invariable plane</em> which is perpendicular to the H vector.  Under 
      torque-free motion, the ellipsoid touches the plane at a point on a line along 
      the &omega; vector.  Curves called the <em>polhode</em> and the <em>herpolhode</em> 
      can be constructed from the osculation points.  Aerovisualizer generates these 
      curves for up to half a minute and then displays them when complete.</p>

      <p class="p-normal">The following conditions must be met for the Poinsot's 
      construction to appear: 1) &omega; must not be zero, 2) the <em>no torque</em> 
      option must be selected, and 3) the Poinsot construction must be set 
      non-transparent in the preferences.</p>`;
      break;

    case 'info-torque-general': //torque - general
      infoText.innerHTML = `<p class="p-normal">Click <em>&tau;</em> and use the menu 
      that appears to choose from the following torque options:</p>
      
      <p class="p-normal">1) no torque, 2) space frame, 3) body frame, 4) ACS stabilization, 
      5) gravity gradient, and 6) spinning top.</p>`;
      break;

    case 'info-torque-no-torque': //torque - no torque
      infoText.innerHTML = `<p class="p-normal">Choose <em>no torque</em>. Set the 
      initial attitude and rotation rate.  Click the <em>play</em> button.</p>
      
      <p class="p-normal"><em>Note</em>: Space and body cones and Poinsot's 
      construction only appear when using this option.
      </p>`;
      break;

    case 'info-torque-space-body': //torque - space and body frames
      infoText.innerHTML = `<p class="p-normal"> 
      Choose the <em>space frame</em> torque or <em>body frame</em> torque option.  
      Set the magnitude of the constant torque vector and the 3 component of a unit 
      vector in that direction.  Use the buttons to set the values to zero.</p>

      <p class="p-normal">Click the <em>play</em> button to observe the effect of the 
      torque.  The angular rate increases until you click <em>pause</em> or 
      <em>reset</em> or until &omega; reaches the maximum allowed (see 
      <em>preferences/general</em>).</p>`;
      break;

    case 'info-torque-acs': //torque - ACS stabilization
      infoText.innerHTML = `<p class="p-normal">The attitude control system 
      (ACS) stabilization torque option implements a basic logical 
      algorithm for reducing the rotational rate of the object.  If the 
      absolute value of a component of &omega; is greater than 
      <em>&omega; dead zone</em>, a torque equal to <em>torque</em> is applied 
      to reduce the rate in that direction.  ACS thrusters and flames are not 
      rendered and are left to the imagination.</p>

      <p class="p-normal">  
      Choose the <em>ACS stabilization</em> torque and use the sliders to 
      set the values of <em>&omega; dead zone</em> (deg/sec) and <em>torque</em>.  
      Set the initial attitude and &omega;/H.  Click the <em>play</em> button to 
      observe the effect of the torque.`;
      break;

    case 'info-torque-gg': //torque - gravity gradient
      infoText.innerHTML = `<p class="p-normal">The gravity gradient torque 
      results from the difference in the pull of gravity along the gravitational 
      potential field gradient going from one end of the rotating body to the other.  
      It is most pronounced for long thin objects whose long direction is at a 
      45&deg; angle to the local vertical.</p>

      <p class="p-normal">This torque is proportional to &mu;&nbsp;/&nbsp;R&sup3;, 
      where &mu; is the gravitational constant of the planet, and R is the 
      distance to the center of the planet.  Because the gravity gradient effect is 
      very small for earth-orbiting objects, Aerovisualizer lets you exagerate 
      this effect up to 1 million times the value for low earth orbit.  The gravity 
      gradient torque is also a function of the orbital period, but this effect is 
      ignored.</p>

      <p class="p-normal">Choose the <em>gravity gradient</em> torque and use the 
      slider to set the value of the torque magnification.  Set the initial 
      attitude (45&deg; for example) and rotation rate (such as zero).  
      Click the <em>play</em> button to observe the effect of the torque.`
      break;

    case 'info-torque-top': //torque - spinning top
      infoText.innerHTML = `<p class="p-normal">The spinning top torque is the 
      torque generated by the normal force from a table top acting at the point 
      of a spinning top.  The torque is equal to r&KHcy;f, where r is a vector from 
      the center of mass of the top to the point where it meets the table, and f 
      equals -mg.</p>

      <p class="p-normal">Aerovisualizer does not render either a top shape nor 
      a table, so these are left to the imagination.</p>
    
      <p class="p-normal">Choose the <em>spinning top</em> torque.  Use the <em>r</em>
      slider to set the length and sign of the r vector.  Its direction is along 
      the x body axis.  Use the <em>g</em> slider to set the magnitude of the 
      gravity vector.  Its direction is downward along the local vertical.</p>

      <p class="p-normal">Set &omega; to be mostly in the x body axis direction.  
      Click the <em>play</em> button to observe the effect of the torque.</p>`;
      break;

    case 'info-numerical': //numerical display
      infoText.innerHTML = `<p class="p-normal">Click <em>1 2 3</em> to show a numerical  
      display of the current state of the object. It consists of the 
      following:</p>
      
      <p class="p-normal">the moments of inertia, the angular velocity (&omega;, body frame), 
      the angular momentum (H, space frame), the applied external torque (&tau;, 
      body frame), the direction cosine matrix (DCM, body to space frame), the quaternion, 
      and the kinetic energy of rotation (T).</p>`;
      break;

    case 'info-prefs-main': //preferences
      infoText.innerHTML = `<p class="p-normal">Click <em>pref</em>.  Buttons appear 
      labeled as below:</p>
      <p class="p-normal">default, general, object, body frame, space frame, angular 
      velocity vector, angular momentum vector,
      torque vector, axis orientation, Euler angle order, space and body cones, and
      Poinsot's construction.</p>`;
      break;

    case 'info-prefs-default': //preferences - default
      infoText.innerHTML = `<p class="p-normal">Click the button to set the 
      preferences to their default values.</p>`;
      break;

    case 'info-prefs-general': //preferences - general
      infoText.innerHTML = `<p class="p-normal"><em>object &ldquo;skin&rdquo;</em> - Use the menu 
      to set the image being rendered for the 
      object.  Choose Cessna 172, the New Horizons space probe, or axis labels. 
      The object retains the brick shape.</p>
      <p class="p-normal"><em>mass properties</em> - Use the menu to set the mass properties to those of 
      the Cessna 172 or the New Horizons space probe (metric units) if desired.</p>
      <p class="p-normal"><em>environment</em> - Use the radio buttons to set the environment to 
      be either a stormy atmosphere or outer space above Jupiter.</p>
      <p class="p-normal"><em>maximum rotation rate</em> - Use the slider to set the maximum rotation 
      rate (&vert;&omega;&vert;) that the object can attain.  The range is from 100 &deg;/sec to 
      1000 &deg;/sec.  The default is 720 &deg;/sec.  The simulation stops if &vert;&omega;&vert; surpasses 
      the maximum.  Click the reset button to return to normal.</p>
      <p class="p-normal"><em>vector size</em> - Use the slider to set how large all of the vectors 
      appear (body frame, space frame, &omega;, H, &tau;).  This also affects 
      the size of the space and body cones.  NOTE: The rendered vectors are designed to convey direction 
      only and not magnitude.  The magnitudes are obtained from the numerical display.</p>`;
      break;

    case 'info-prefs-trans-offset-color': //preferences - transparency, offset, color
      infoText.innerHTML = `<p class="p-normal">Use the sliders to set the <em>transparency</em> 
      (visibility) of the brick object, the vectors and vector frames, the space and body cones, 
      and Poinsot's construction.  Move the sliders completely to the right to remove items from 
      the scene.</p>

      <p class="p-normal">Check <em>offset</em> to make the items listed above appear off center.</p>
    
      <p class="p-normal">Use the menu to choose the <em>color</em> of the items listed above 
      (excluding the brick object).</p>`;
      break;
    
    case 'info-prefs-axis-orientation': //preferences - axis orientation
      infoText.innerHTML = `<p class="p-normal">Use the radio buttons to set 
      the orientation of the space (inertial) frame.  The z axis points 
      down by the north-east-down (NED) convention and by default.</p>`;
      break;
    
    case 'info-prefs-euler-angle-order': //preferences - Euler angle order
      infoText.innerHTML = `<p class="p-normal">Use the radio buttons to set 
      the sequence of Euler rotations to be used when designating Euler angles.</p>

      <p class="p-normal">Choose from 6 intrinsic Tait-Bryan rotation sequences.  
      By default, Aerovisualizer uses the "ZYX" sequence, where the first rotation 
      is &psi; (yaw) about the Z axis, the second is &theta; (pitch) about the 
      rotated Y&prime; axis, and the third is &phi; (roll) about the twice-rotated 
      X&Prime; axis.</p>`;
      break;

    case 'info-units': //units
      infoText.innerHTML = `<p class="p-normal">You might ask, "What are the units of 
      length and mass"?  The answer is that it does not matter.  It is up to you.</p>

      <p class="p-normal">If you choose the meter for length and the kilogram for mass, then 
      torque is expressed as kg m&sup2;/s&sup2; (Newton-meters), angular momentum is in 
      kg m&sup2;/s, and the moment of inertia is in kg m&sup2;.  The English units are the 
      foot and the slug.  You can use the verst and the dalton if that is your 
      preference.</p>
      
      <p class="p-normal">The unit of time is the second.</p>`;
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

const handlePreferencesButtons = function(button){
  defaultButton.disabled = false;
  generalPrefButton.disabled = false;
  objectPrefButton.disabled = false;
  bodyFramePrefButton.disabled = false;
  spaceFramePrefButton.disabled = false;
  omegaPrefButton.disabled = false;
  hPrefButton.disabled = false;
  torquePrefButton.disabled = false;
  conesPrefButton.disabled = false;
  axisOrientationPrefButton.disabled = false;
  eulerAngleOrderPrefButton.disabled = false;
  poinsotPrefButton.disabled = false;
  
  defaultElements.style.display = 'none';
  generalElements.style.display = 'none';
  objectElements.style.display = 'none';
  bodyFrameElements.style.display = 'none';
  spaceFrameElements.style.display = 'none';
  omegaElements.style.display = 'none';
  hElements.style.display = 'none';
  torqueElements.style.display = 'none';
  axisOrientationElements.style.display = 'none';
  eulerAngleOrderElements.style.display = 'none';
  conesElements.style.display = 'none';
  poinsotElements.style.display = 'none';

  switch (button){
    case 'default':
      defaultElements.style.display = 'grid';
      defaultButton.disabled = true;
      break;
    case 'general':
      generalElements.style.display = 'grid';
      generalPrefButton.disabled = true;
      break;
    case 'object':
      objectElements.style.display = 'grid';
      objectPrefButton.disabled = true;
      break;
    case 'bodyFrame':
      bodyFrameElements.style.display = 'grid';
      bodyFramePrefButton.disabled = true;
      break;
    case 'spaceFrame':
      spaceFrameElements.style.display = 'grid';
      spaceFramePrefButton.disabled = true;
      break;
    case 'omega':
      omegaElements.style.display = 'grid';
      omegaPrefButton.disabled = true;
      break;
    case 'h':
      hElements.style.display = 'grid';
      hPrefButton.disabled = true;
      break;
    case 'torque':
      torqueElements.style.display = 'grid';
      torquePrefButton.disabled = true;
      break;
    case 'axisOrientation':
      axisOrientationElements.style.display = 'grid';
      axisOrientationPrefButton.disabled = true;
      break;
    case 'eulerAngleOrder':
      eulerAngleOrderElements.style.display = 'grid';
      eulerAngleOrderPrefButton.disabled = true;
      break;
    case 'cones':
      conesElements.style.display = 'grid';
      conesPrefButton.disabled = true;
      break;
    case 'poinsot':
      poinsotElements.style.display = 'grid';
      poinsotPrefButton.disabled = true;
      break;
    case 'none':
      break;
  }
}

defaultButton.addEventListener('click', () => {
  handlePreferencesButtons('default');
});

defaultDoResetButton.addEventListener('click', () => {
  localStorage.clear();
  location.reload();
});

axisOrientationPrefButton.addEventListener('click', () => {
  handlePreferencesButtons('axisOrientation');
});

eulerAngleOrderPrefButton.addEventListener('click', () => {
  handlePreferencesButtons('eulerAngleOrder');
});

objectPrefButton.addEventListener('click', () => {
  handlePreferencesButtons('object');
});

bodyFramePrefButton.addEventListener('click', () => {
  handlePreferencesButtons('bodyFrame');
});

spaceFramePrefButton.addEventListener('click', () => {
  handlePreferencesButtons('spaceFrame');
});

omegaPrefButton.addEventListener('click', () => {
  handlePreferencesButtons('omega');
});

hPrefButton.addEventListener('click', () => {
  handlePreferencesButtons('h');
});

torquePrefButton.addEventListener('click', () => {
  handlePreferencesButtons('torque');
});

conesPrefButton.addEventListener('click', () => {
  handlePreferencesButtons('cones');
});

poinsotPrefButton.addEventListener('click', () => {
  handlePreferencesButtons('poinsot');
});

generalPrefButton.addEventListener('click', () => {
  handlePreferencesButtons('general');
});

prefsReturnButton.addEventListener('click', () => {
  toggleShowPrefs();
});

const doWindowResizeOrOrientationChange = function(){
  camera.aspect = 1;
  camera.updateProjectionMatrix();
  renderer.setSize(sixDOFworld.clientWidth, sixDOFworld.clientHeight);
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

const displayMaxOmega = function(trueOrFalse){
  if (trueOrFalse === false){
    numericalButton.innerHTML = '1&nbsp;2&nbsp;3';
    massPropButton.innerHTML = 'mass';
    attitudeButton.innerHTML = '&psi;&nbsp;&theta;&nbsp;&phi;';
    rotationRateButton.innerHTML = '&omega;&nbsp;/&nbsp;H';
    torqueButton.innerHTML = '&tau;';
    numericalButton.style.backgroundColor = "#5555ff";
    massPropButton.style.backgroundColor = "#5555ff";
    attitudeButton.style.backgroundColor = "#5555ff";
    rotationRateButton.style.backgroundColor = "#5555ff";
    torqueButton.style.backgroundColor = "#5555ff";
    mainReturnButton.style.backgroundColor = "#5555ff";
    preferencesButton.style.backgroundColor = "#5555ff";
    infoButton.style.backgroundColor = "#5555ff";
    resetButton.style.backgroundColor = "#5555ff";
    playPauseButton.style.backgroundColor = "#5555ff";
  }else{
    numericalButton.innerHTML = 'max';
    massPropButton.innerHTML = '&omega;';
    attitudeButton.innerHTML = 'max';
    rotationRateButton.innerHTML = '&omega;';
    torqueButton.innerHTML = 'max';
    numericalButton.style.backgroundColor = 'red';
    massPropButton.style.backgroundColor = 'red';
    attitudeButton.style.backgroundColor = 'red';
    rotationRateButton.style.backgroundColor = 'red';
    torqueButton.style.backgroundColor = 'red';
    mainReturnButton.style.backgroundColor = 'red';
    preferencesButton.style.backgroundColor = 'red';
    infoButton.style.backgroundColor = 'red';
    resetButton.style.backgroundColor = 'red';
    playPauseButton.style.backgroundColor = 'red';
  }
}

const loadBackground = function(option='atmosphere'){
  switch (option){
    case 'atmosphere':
      if (background != null){
        background = null;
      }

      // let img = document.createElement('img');
      // img.src = new URL('hero.jpg', import.meta.url);
      // document.body.appendChild(img);

      let stormydays_ft = new URL('../../static/img/stormydays_ft.jpg', import.meta.url);
      let stormydays_bk = new URL('../../static/img/stormydays_bk.jpg', import.meta.url);
      let stormydays_up = new URL('../../static/img/stormydays_up.jpg', import.meta.url);
      let stormydays_dn = new URL('../../static/img/stormydays_dn.jpg', import.meta.url);
      let stormydays_rt = new URL('../../static/img/stormydays_rt.jpg', import.meta.url);
      let stormydays_lf = new URL('../../static/img/stormydays_lf.jpg', import.meta.url);

      background = new THREE.CubeTextureLoader().load([stormydays_ft.pathname,stormydays_bk.pathname,stormydays_up.pathname,stormydays_dn.pathname,stormydays_rt.pathname,stormydays_lf.pathname]);
      // background = new THREE.CubeTextureLoader().load(['./static/img/stormydays_ft.jpg','./static/img/stormydays_bk.jpg','./static/img/stormydays_up.jpg','./static/img/stormydays_dn.jpg','./static/img/stormydays_rt.jpg','./static/img/stormydays_lf.jpg']);

      scene.background = background;

      if (jupiter != null){
        scene.remove(jupiter);
      }

      if (sun != null){
        scene.remove(sun);
      }
      break;

    case 'space':
      if (background != null){
        background = null;
      }

      let stars = new URL('../../static/img/stars.jpg', import.meta.url);
      // background = new THREE.CubeTextureLoader().load(['./img/stars.jpg','./img/stars.jpg','./img/stars.jpg','./img/stars.jpg','./img/stars.jpg','./img/stars.jpg']);
      background = new THREE.CubeTextureLoader().load([stars.pathname,stars.pathname,stars.pathname,stars.pathname,stars.pathname,stars.pathname]);

      scene.background = background;
      const tl = new THREE.TextureLoader();

      if (jupiter === null){
        jupiter = null;
        const jupiterGeometry = new THREE.PlaneGeometry(150, 150, 1, 1);
        let jup = new URL('../../static/img/Jupiter.png', import.meta.url);
        // const jupiterTexture = tl.load('./img/Jupiter.png');
        const jupiterTexture = tl.load(jup.pathname);
        const jupiterMat = new THREE.MeshBasicMaterial({
          map: jupiterTexture,
          visible: true,
          side: THREE.DoubleSide,
          color: 0xffffff,
          transparent: true,
          opacity: 1
        });
        jupiter = new THREE.Mesh(jupiterGeometry, jupiterMat);
        jupiter.receiveShadow = false;
        jupiter.castShadow = false;
        jupiter.position.set(0,-30,0);
        jupiter.rotation.x = 0.5 * Math.PI;
      }
    
      if (sun === null){
        const sunGeometry = new THREE.PlaneGeometry(15, 15, 1, 1);
        let sol = new URL('../../static/img/sun.png', import.meta.url);
        // const sunTexture = tl.load('./img/sun.png');
        const sunTexture = tl.load(sol.pathname);
        const sunMat = new THREE.MeshBasicMaterial({
          map: sunTexture,
          visible: true,
          side: THREE.DoubleSide,
          color: 0xffffff,
        });
        sun = new THREE.Mesh(sunGeometry, sunMat);
        sun.receiveShadow = false;
        sun.castShadow = false;
        sun.position.set(-100,100,100);
        // need to rotate the image of the sun to make it appear round
        const quat = new THREE.Quaternion();
        const pos = new THREE.Vector3(-100,100,100);
        const scale = new THREE.Vector3(1,1,1);
        quat.setFromAxisAngle(new THREE.Vector3(-1,0,1),Math.PI/4);
        sun.matrix.compose(pos, quat, scale);

        sun.applyQuaternion(quat);
      }

      scene.add(jupiter);
      scene.add(sun);
      break;
  }
}

const initTHREE = function() {
  scene = new THREE.Scene();
  clock = new THREE.Clock();
  clock.getElapsedTime();// sets 'oldTime'
  
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
  renderer.setSize(sixDOFworld.clientWidth, sixDOFworld.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.autoClear = false;
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.aspect = 1;
  camera.position.set(nominalCameraPos.x, nominalCameraPos.y, nominalCameraPos.z);
  camera.lookAt(centerOfRotation);
  renderer.shadowMap.enabled = false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  sixDOFworld.appendChild(renderer.domElement);
  orbitControls = new OrbitControls(camera, renderer.domElement);
  // orbitControls.enableDamping;
  orbitControls.enableZoom = false;
};

const createAndInitialize = function(data, camera){
  let axesOrientation = defaultOrientation;

  if (data){
    aerovisualizerData = JSON.parse(JSON.stringify(data));

    for (let o of data) {
      switch (o.name){
          case 'mass':
            mass = +o.value;
            break;
          case 'length':
            dimX = o.value;
            break;
          case 'width':
            dimY = +o.value;
            break;
          case 'height':
            dimZ = +o.value;
            break;
          case 'attitudeOption':
            attitudeOption = o.value;
            break;
          case 'eulerAngle1':
            euler1  = o.value;
            break;
          case 'eulerAngle2':
            euler2  = o.value;
            break;
          case 'eulerAngle3':
            euler3  = o.value;
            break;
          case 'eulerOrder':
            eulerOrder  = o.value;
            break;
          case 'omegaMagnitude':
            omegaMag  = o.value/10;//stored value is from 0 to 100
            break;
          case 'maxOmega':
            maxOmega = o.value;
            break;
          case 'omHihat':
            omHihat  = o.value;
            break;
          case 'omHjhat':
            omHjhat  = o.value;
            break;
          case 'omHkhat':
            omHkhat  = o.value;
            break;
          case 'omegaOrH':
            omegaOrH = o.value;
            break;
          case 'torqueOption':
            torqueOption = o.value;
            break;
          case 'axesOrientation':
            axesOrientation  = o.value;
            break;
          case 'environment':
            environment = o.value;
            break;
          case 'showBodyXVector':
            showBodyXVector  = o.value;
            break;
          case 'showBodyYVector':
            showBodyYVector  = o.value;
            break;
          case 'showBodyZVector':
            showBodyZVector  = o.value;
            break;
          case 'objectTransparency':
            objectTransparency  = o.value;
            break;
          case 'bodyFrameTransparency':
            bodyFrameTransparency  = o.value;
            break;
          case 'spaceFrameTransparency':
            spaceFrameTransparency  = o.value;
            break;
          case 'omegaTransparency':
            omegaTransparency  = o.value;
            break;
          case 'hTransparency':
            hTransparency  = o.value;
            break;
          case 'torqueTransparency':
            torqueTransparency  = o.value;
            break;
          case 'conesTransparency':
            conesTransparency  = o.value;
            break;
          case 'poinsotTransparency':
            poinsotTransparency  = o.value;
            break;
          case 'bodyFrameColor':
            bodyFrameColor  = o.value;
            break;
          case 'spaceFrameColor':
            spaceFrameColor  = o.value;
            break;
          case 'omegaColor':
            omegaColor  = o.value;
            break;
          case 'hColor':
            hColor  = o.value;
            break;
          case 'torqueColor':
            torqueColor  = o.value;
            break;
          case 'bodyConeColor':
            bodyConeColor  = o.value;
            break;
          case 'spaceConeColor':
            spaceConeColor  = o.value;
            break;
          case 'ellipsoidColor':
            ellipsoidColor  = o.value;
            break;
          case 'planeColor':
            planeColor  = o.value;
            break;
          case 'objectOffset':
            objectOffset  = o.value;
            break;
          case 'bodyFrameOffset':
            bodyFrameOffset  = o.value;
            break;
          case 'spaceFrameOffset':
            spaceFrameOffset  = o.value;
            break;
          case 'omegaOffset':
            omegaOffset  = o.value;
            break;
          case 'hOffset':
            hOffset  = o.value;
            break;
          case 'torqueOffset':
            torqueOffset  = o.value;
            break;
          case 'conesOffset':
            conesOffset  = o.value;
            break;
          case 'poinsotOffset':
            poinsotOffset  = o.value;
            break;
          case 'objectMassProperties':
            objectMassProperties  = o.value;
            break;
          case 'objectAppearance':
            objectAppearance  = o.value;
            break;
          case 'vectorSize':
            vectorSize  = o.value;
            break;
          case 'torqueMag':
            torqueMag  = o.value;
            break;
          case 'torqueIhat':
            torqueIhat  = o.value;
            break;
          case 'torqueJhat':
            torqueJhat  = o.value;
            break;
          case 'torqueKhat':
            torqueKhat  = o.value;
            break;
          case 'torqueACSDZ':
            torqueACSDZ  = o.value;
            break;
          case 'torqueACSTorque':
            torqueACSTorque  = o.value;
            break;
          case 'torqueGG':
            torqueGG  = o.value;
            break;
          case 'torqueTopR':
            torqueTopR  = o.value;
            break;
          case 'torqueTopGrav':
            torqueTopGrav  = o.value;
            break;
      }
    }
  }

  if (sdo === null){
    sdo = new SixDOFObject(mass, dimX, dimY, dimZ, scene, camera, objectAppearance, objectMassProperties);
  }

  if (vo === null){
    vo = new Vectors(scene, camera);
  }

  if (pac === null){
    pac = new PoinsotAndCones(scene);
  }

  displayMomentsOfInertia();
  sdo.setEulerOrder(eulerOrder);
  euler1Slider.value = euler1;
  euler2Slider.value = euler2;
  euler3Slider.value = euler3;
  handleEulerOnInput();
  massSlider.value = masses.indexOf(mass);
  dimXSlider.value = dimX;
  dimYSlider.value = dimY;
  dimZSlider.value = dimZ;
  omegaMagnitudeSlider.value = omegaMag*10;
  maxOmegaSlider.value = maxOmega;
  maxOmegaDisplay.innerText = maxOmega;
  omegaIhatSlider.value = omHihat;
  omegaJhatSlider.value = omHjhat;
  omegaKhatSlider.value = omHkhat;
  objectTransparencySlider.value = objectTransparency;
  objectTransparencyDisplay.innerText = objectTransparency;
  bodyFrameTransparencySlider.value = bodyFrameTransparency;
  spaceFrameTransparencySlider.value = spaceFrameTransparency;
  omegaTransparencySlider.value = omegaTransparency;
  hTransparencySlider.value = hTransparency;
  torqueTransparencySlider.value = torqueTransparency;
  conesTransparencySlider.value = conesTransparency;
  poinsotTransparencySlider.value = poinsotTransparency;

  switch (torqueOption){
    case 1:
      torqueOptionMenu.value = 'no-torque';
      break;
    case 2:
      torqueOptionMenu.value = 'space-frame';
      break;
    case 3:
      torqueOptionMenu.value = 'body-frame';
      break;
    case 4:
      torqueOptionMenu.value = 'ACS-stabilization';
      break;
    case 5:
      torqueOptionMenu.value = 'gravity-gradient';
      break;
    case 6:
      torqueOptionMenu.value = 'top';
      break;
  }

  torqueMagnitudeSlider.value = torqueMag*5;
  torqueIhatSlider.value = torqueIhat;
  torqueJhatSlider.value = torqueJhat;
  torqueKhatSlider.value = torqueKhat;
  acsDeadZoneSlider.value = torqueACSDZ*10;
  acsTorqueMagnitudeSlider.value = torqueACSTorque*100;
  torqueTopRDistanceSlider.value = torqueTopR;
  torqueTopGravitySlider.value = torqueTopGrav;
  torqueMagnitudeDisplay.innerHTML = torqueMag;
  torqueIhatDisplay.innerHTML = torqueIhat;
  torqueJhatDisplay.innerHTML = torqueJhat;
  torqueKhatDisplay.innerHTML = torqueKhat;
  acsDeadZoneDisplay.innerHTML = Number(torqueACSDZ).toFixed(1).toString();
  acsTorqueMagnitudeDisplay.innerHTML = Number(torqueACSTorque).toFixed(2).toString();

  sdo.setACSDeadzoneOmega(torqueACSDZ*piOver180);
  sdo.setACSTorque(torqueACSTorque);
  muOverR3 = muOverR3Choices[torqueGG];
  torqueMuOverR3Display.innerHTML = muOverR3ChoiceDisplay[torqueGG];
  sdo.set3MuOverR3(3*muOverR3);
  torqueTopRDistanceDisplay.innerHTML = torqueTopR;
  torqueTopGravityDisplay.innerHTML = torqueTopGrav;

  for (let radio of eulerOrderRadios) {
    radio.checked = radio.value === eulerOrder ? true : false;
  }
  
  for (let radio of orientationRadios) {
    radio.checked = radio.value === axesOrientation ? true : false;
  }
  
  showBodyXVectorCheckbox.checked = showBodyXVector;
  showBodyYVectorCheckbox.checked = showBodyYVector;
  showBodyZVectorCheckbox.checked = showBodyZVector;
  massDisplay.innerHTML = mass;
  dimXDisplay.innerHTML = dimX;
  dimYDisplay.innerHTML = dimY;
  dimZDisplay.innerHTML = dimZ;
  
  objectOffsetCheckbox.checked = objectOffset;
  bodyFrameOffsetCheckbox.checked = bodyFrameOffset;
  spaceFrameOffsetCheckbox.checked = spaceFrameOffset;
  omegaOffsetCheckbox.checked = omegaOffset;
  hOffsetCheckbox.checked = hOffset;
  conesOffsetCheckbox.checked = conesOffset;
  poinsotOffsetCheckbox.checked = poinsotOffset;

  bodyFrameColorMenu.value = bodyFrameColor;
  spaceFrameColorMenu .value = spaceFrameColor;
  omegaColorMenu.value = omegaColor;
  hColorMenu.value = hColor;
  torqueColorMenu.value = torqueColor;
  bodyConeColorMenu.value = bodyConeColor;
  spaceConeColorMenu.value = spaceConeColor;
  ellipsoidColorMenu.value = ellipsoidColor;
  planeColorMenu.value = planeColor;

  sdo.setOffset(objectOffset);
  vo.setOffsets(bodyFrameOffset, spaceFrameOffset, omegaOffset, hOffset, torqueOffset);
  pac.setOffsets(conesOffset, poinsotOffset);
  sdo.setOrientation(axesOrientation);
  vo.setOrientation(axesOrientation);
  pac.setOrientation(axesOrientation);

  presetMassPropertiesMenu.value = objectMassProperties;
  objectAppearanceChoiceMenu.value = objectAppearance;
}

const completeInitialization = function(continueAnimation = true) {
  // the reason for this is that the Vectors.js file contains
  // the function _constructLabels() which contains a FontLoader 
  // object called loader that creates code that runs asynchronously.
  // Once vo.constructionComplete is true, we can finish
  // our initialization
  if (continueAnimation && !(vo.constructionComplete)) {
    requestAnimationFrame(completeInitialization);
  }
  
  if (vo.constructionComplete){
    sdo.constructionComplete = true;
    pac.constructionComplete = true;
    handleMainButtons('numerical');
    handlePreferencesButtons('none');
    
    camera.aspect = 1;
    camera.updateProjectionMatrix();

    cpx = camera.position.x;
    cpy = camera.position.y;
    cpz = camera.position.z;

    renderer.setSize(sixDOFworld.clientWidth, sixDOFworld.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    setTransparency('object',objectTransparency);
    setTransparency('bodyFrame',bodyFrameTransparency);
    setTransparency('spaceFrame',spaceFrameTransparency);
    setTransparency('omega',omegaTransparency);
    setTransparency('h',hTransparency);
    setTransparency('torque',torqueTransparency);
    setTransparency('cones',conesTransparency);
    setTransparency('poinsot',poinsotTransparency);
    defaultButton.style.display = 'none';
    axisOrientationPrefButton.style.display = 'none';
    eulerAngleOrderPrefButton.style.display = 'none';
    objectPrefButton.style.display = 'none';
    bodyFramePrefButton.style.display = 'none';
    spaceFramePrefButton.style.display = 'none';
    omegaPrefButton.style.display = 'none';
    hPrefButton.style.display = 'none';
    torquePrefButton.style.display = 'none';
    conesPrefButton.style.display = 'none';
    poinsotPrefButton.style.display = 'none';
    generalPrefButton.style.display = 'none';
    prefsReturnButton.style.display = 'none';
    infoElements.style.display = 'none';
    infoMenu.value = 'info-intro';
    handleInfoMenuChoice(infoMenu.value);
    sdo.showObject(objectTransparency < maxTransparency);
    vo.showBodyFrame(bodyFrameTransparency < maxTransparency);
    vo.showBodyAxis(showBodyXVector, showBodyYVector, showBodyZVector);
    vo.showSpaceFrame(spaceFrameTransparency < maxTransparency);
    vo.showOmega(omegaTransparency < maxTransparency);
    vo.showAngularMomentum(hTransparency < maxTransparency);
    vo.showTorque(torqueTransparency < maxTransparency);

    setEnvironment(environment);
    setOmegaOrHChoice(omegaOrH);
    pac.showCones(false);
    pac.showPoinsot(false);

    if (torqueOption === 1){
      pac.showCones(conesTransparency < maxTransparency);
      pac.showPoinsot(poinsotTransparency < maxTransparency);
    }

    displayTorqueValues();
    setBodyFrameColor(bodyFrameColor);
    setSpaceFrameColor(spaceFrameColor);
    setOmegaColor(omegaColor);
    setHColor(hColor);
    setTorqueColor(torqueColor);
    setBodyConeColor(bodyConeColor);
    setSpaceConeColor(spaceConeColor);
    setEllipsoidColor(ellipsoidColor);
    setPlaneColor(planeColor);
    resetAttitudeAndRates();

    sdo.setTorque(torqueOption, torqueMag, torqueIhat, torqueJhat, torqueKhat);
    displayNumerical(true);
    vo.setVectorSize(vectorSize);
    vo.needsRefresh = true;
    pac.setConeSize(vectorSize);
    vectorSizeSlider.value = Number(vectorSize);
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
  sdo.realTime = 0;
  sdo.simulationTime = 0;
  clock.getDelta();
}

playPauseButton.addEventListener('click', () => {
  doPlayPause();
});

resetButton.addEventListener('click', () => {
  displayMaxOmega(false);
  resetAttitudeAndRates();
});

const animate = function(continueAnimation = true) {
  if (continueAnimation) {
    requestAnimationFrame(animate);
  }
  
  orbitControls.update();

  if (cpx !== camera.position.x && cpy !== camera.position.y && cpz !== camera.position.z){
    cpx = camera.position.x;
    cpy = camera.position.y;
    cpz = camera.position.z;
    vo.needsRefresh = true;
    pac.needsRefresh = true;
  } 

  renderer.clear();
  renderer.render(scene, camera);
  
  if (playing){
    const dt = clock.getDelta();// dt for 60 fps is 0.01666
    sdo.simulate(dt);

    if (torqueOption === 1){// no torque
      if (poinsotTransparency < maxTransparency){
        pac.receiveEphemeralData(...sdo.sendPaCEphemeralData());
        pac.doPolhodeHerpolhodeComputations();
      }

      pac.needsRefresh = true;
    }

    vo.needsRefresh = true;

    if (sdo.getOmegaMagnitude() > maxOmega){
      displayMaxOmega(true);
      doPlayPause();
    }

    displayNumerical();
  }

  sdo.refresh();
  vo.receiveVectorData(...sdo.sendVectorData());
  vo.refresh();
  pac.refresh();
};

const data = getFromLocalStorage();
initTHREE();
createAndInitialize(data, camera);
completeInitialization();
animate();
