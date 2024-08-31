import * as THREE from 'three';
import {FontLoader} from './FontLoader.js';
import {TextGeometry} from './TextGeometry.js';

/**
 UFO is a class that encapsulates the rendering of a flying object and 
 the shock waves that form as it travels through a gas medium at
 supersonic speeds.  For simplicity, the object has no wings nor apparent 
 means of propulsion nor stabilization.  It consists of three sections: a 
 forward cone, a middle cylinder, and an aft cone.  The pointed cones allow 
 for the formation of attached oblique shock waves at the forward and aft ends.  
 Two Prandtl-Meyer expansion fans form where the cones join the cylinder, but 
 these are not rendered.  Detached shock waves are also not rendered if and 
 when they occur.  This class also handles the labels for 5 flow regions 
 about the object.
**/

const oneOverSqrt2 = Math.sqrt(0.5);
const piOver180 = Math.PI / 180;

class UFO {
  constructor(scene, camera) {
    this._quat = new THREE.Quaternion();
    this._camera = camera;
    this._scene = scene;
    this.needsRefresh = true;
    this._unitScale = new THREE.Vector3(1,1,1);
    this._cylinderScale = new THREE.Vector3(1,1,1);
    this._forwardConeScale = new THREE.Vector3();
    this._aftConeScale = new THREE.Vector3();
    this._forwardScaleY = 1;
    this._aftScaleY = 1;
    this._scaleXZ = 1;
    this._halfConeSwitchAngle = 25;
    this._forwardConeScale.set(this._scaleXZ, this._forwardScaleY, this._scaleXZ);
    this._aftConeScale.set(this._scaleXZ, this._aftScaleY, this._scaleXZ);
    this._forwardShockConeScale = new THREE.Vector3();
    this._aftShockConeScale = new THREE.Vector3();
    this._forwardShockScaleY = 1;
    this._aftShockScaleY = 1;
    this._shockScaleXZ = 1;
    this._forwardShockConeScale.set(this._shockScaleXZ, this._forwardShockScaleY, this._shockScaleXZ);
    this._aftShockConeScale.set(this._shockScaleXZ, this._aftShockScaleY, this._shockScaleXZ);
    this._shockConeHeight = 100;
    this._halfShockConeHeight = new THREE.Vector3(this._shockConeHeight/2, 0, 0);
    this._origin = new THREE.Vector3(0,0,0);
    this._flip180quat = new THREE.Quaternion();
    this._flip180quat.setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI);
    this._cylinderLength = 4;
    this._cylinderRadius = 2;
    this._coneHeight = 2;
    this._halfCylinderLength = new THREE.Vector3(this._cylinderLength/2, 0, 0);
    this._halfConeHeight = new THREE.Vector3(this._coneHeight/2, 0, 0);
    this._zeroVector = new THREE.Vector3(0,0,0);
    this._q1 = new THREE.Quaternion();
    this._q2 = new THREE.Quaternion();
    this._qn = new THREE.Quaternion();//used for making the labels always face forward
    this._v0 = new THREE.Vector3();
    this._v1 = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._v3 = new THREE.Vector3();
    this._v4 = new THREE.Vector3();
    this._v5 = new THREE.Vector3();
    this._v6 = new THREE.Vector3();
    this._cylinderMesh = null;
    this._forwardConeMesh = null;
    this._aftConeMesh = null;
    this._forwardShockMesh = null;
    this._aftShockMesh = null;
    this._ufoQuat = new THREE.Quaternion();
    this._1Label = null;
    this._2Label = null;
    this._3Label = null;
    this._4Label = null;
    this._5Label = null;
    this._defaultOpacity = 0;
    this._defaultColor = 0xffff00;//0xffff55;//light yellow

    this._constructUFO();
    this._constructLabels('helvetiker', 'regular');
    this.needsRefresh = true;

    // make quaternion with zero rotation
    const euler = new THREE.Euler();
    euler.set(0,0,0,'ZYX');
    this._quat.setFromEuler(euler);
  }

  _constructUFO(){
    //alternatives to MeshLambertMaterial are MeshPhongMaterial and MeshBasicMaterial

    const ufoMat = new THREE.MeshLambertMaterial({
      color: this._defaultColor,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      side: THREE.FrontSide
    });

    const forwardShockMat = new THREE.MeshLambertMaterial({
      color: this._defaultColor,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      side: THREE.DoubleSide
    });

    const aftShockMat = new THREE.MeshLambertMaterial({
      color: this._defaultColor,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      side: THREE.DoubleSide
    });

    const cylinderLength = this._cylinderLength;
    const coneHeight = this._coneHeight;
    const radius = this._cylinderRadius;
    const cylinderGeometry = 
     new THREE.CylinderGeometry(radius, radius,  cylinderLength, 32, 1, true);
    const forwardConeGeometry = 
     new THREE.ConeGeometry(radius, coneHeight, 32, 1, true);
    const aftConeGeometry = 
     new THREE.ConeGeometry(radius, coneHeight, 32, 1, true);
    const forwardShockGeometry = 
     new THREE.ConeGeometry(this._shockConeHeight, this._shockConeHeight, 32, 1, true);
    const aftShockGeometry = 
     new THREE.ConeGeometry(this._shockConeHeight, this._shockConeHeight, 32, 1, true);

    this._cylinderMesh = new THREE.Mesh(cylinderGeometry, ufoMat);
    this._cylinderMesh.matrixAutoUpdate = false;
    this._forwardConeMesh = new THREE.Mesh(forwardConeGeometry, ufoMat);
    this._forwardConeMesh.matrixAutoUpdate = false;
    this._aftConeMesh = new THREE.Mesh(aftConeGeometry, ufoMat);
    this._aftConeMesh.matrixAutoUpdate = false;
    this._forwardShockMesh = new THREE.Mesh(forwardShockGeometry, forwardShockMat);
    this._forwardShockMesh.matrixAutoUpdate = false;
    this._aftShockMesh = new THREE.Mesh(aftShockGeometry, aftShockMat);
    this._aftShockMesh.matrixAutoUpdate = false;
    this._ufoQuat.set(0, 0, oneOverSqrt2, oneOverSqrt2);// quaternion for 90 deg rotation about z
  }

  setHalfConeAngles(forwardHCA, aftHCA){
    // 1 is forward, 2 is aft
    // forwardHCA and aftHCA angles are in DEGREES
    const tan1 = Math.tan(forwardHCA*piOver180);
    const tan2 = Math.tan(aftHCA*piOver180);
    const tanSw = Math.tan(this._halfConeSwitchAngle*piOver180);
    const a = 2*tan2/(tanSw*(tan1+tan2));
    this._forwardScaleY = a;
    this._aftScaleY = 2/tanSw - a;
    this._scaleXZ = a*tan1;

    if (this._scaleXZ > 1){
      this._scaleXZ = 1;
      this._forwardScaleY = this._scaleXZ/tan1;
      this._aftScaleY = this._scaleXZ/tan2;
    }

    this._cylinderScale.set(this._scaleXZ, 1, this._scaleXZ);
    this._forwardConeScale.set(this._scaleXZ, this._forwardScaleY, this._scaleXZ);
    this._aftConeScale.set(this._scaleXZ, this._aftScaleY, this._scaleXZ);

    const rToLRatio = this._cylinderRadius*this._scaleXZ/(this._coneHeight*this._forwardScaleY 
      + this._cylinderLength + this._coneHeight*this._aftScaleY);
    const waveDragCoef = 9*Math.PI*Math.PI*rToLRatio*rToLRatio/2;//from en.wikipedia.org/wiki/Sears–Haack_body
    return waveDragCoef;
  }

  setShockWaveHalfConeAngles(forwardHCA, aftHCA){
    // 1 is forward, 2 is aft
    // forwardHCA and aftHCA angles are in RADIANS
    const tan1 = Math.tan(forwardHCA);
    const tan2 = Math.tan(aftHCA);
    this._forwardShockScaleY = this._shockScaleXZ/tan1;
    this._aftShockScaleY = this._shockScaleXZ/tan2;
    this._forwardShockConeScale.set(this._shockScaleXZ, this._forwardShockScaleY, this._shockScaleXZ);
    this._aftShockConeScale.set(this._shockScaleXZ, this._aftShockScaleY, this._shockScaleXZ);
  }

  drawUFO(){
    let cylinderMesh;
    let forwardConeMesh;
    let aftConeMesh;
    let forwardShockMesh;
    let aftShockMesh;
    let label1;
    let label2;
    let label3;
    let label4;
    let label5;
    // constants below help to place the labels away from the UFO
    const label1AdjustmentFactor = 1.1;
    const label2AdjustmentFactor = 0.8;
    const label3AdjustmentFactor = 3;
    const label5AdjustmentFactor = 1.1;
    const labels1And3AdjustmentFactor = 2.5;
    cylinderMesh = this._cylinderMesh;
    forwardConeMesh = this._forwardConeMesh;
    aftConeMesh = this._aftConeMesh;
    forwardShockMesh = this._forwardShockMesh;
    aftShockMesh = this._aftShockMesh;

    label1 = this._1Label;
    label2 = this._2Label;
    label3 = this._3Label;
    label4 = this._4Label;
    label5 = this._5Label;
    this._q1.multiplyQuaternions(this._quat,this._ufoQuat);
    this._q2.copy(this._q1);
    this._q1.multiplyQuaternions(this._q1,this._flip180quat);
    this._v0.copy(this._halfCylinderLength);
    this._v1.copy(this._halfConeHeight);
    this._v1.multiplyScalar(this._forwardScaleY);
    this._v2.copy(this._halfConeHeight);
    this._v2.multiplyScalar(-(this._aftScaleY));
    this._v1.add(this._v0);
    this._v2.sub(this._v0);

    this._v5.copy(this._halfConeHeight);
    this._v5.multiplyScalar(this._forwardScaleY);
    this._v3.copy(this._halfShockConeHeight);
    this._v3.multiplyScalar(this._forwardShockScaleY);
    this._v4.copy(this._v1);
    this._v4.add(this._v5);
    this._v4.sub(this._v3);

    this._v5.copy(this._halfConeHeight);
    this._v5.multiplyScalar(this._aftScaleY);
    this._v3.copy(this._halfShockConeHeight);
    this._v3.multiplyScalar(this._aftShockScaleY);
    this._v6.copy(this._v2);
    this._v6.sub(this._v5);
    this._v6.sub(this._v3);

    cylinderMesh.matrix.compose(this._zeroVector, this._q1, this._cylinderScale);
    forwardConeMesh.matrix.compose(this._v1, this._q1, this._forwardConeScale);
    aftConeMesh.matrix.compose(this._v2, this._q2, this._aftConeScale);
    forwardShockMesh.matrix.compose(this._v4, this._q1, this._forwardShockConeScale);
    aftShockMesh.matrix.compose(this._v6, this._q1, this._aftShockConeScale);

    this._v0.copy(this._halfConeHeight);
    this._v0.multiplyScalar(this._forwardScaleY*label1AdjustmentFactor + this._cylinderLength/3);
    this._v0.add(this._v1);
    label1.matrix.compose(this._v0, this._qn, this._unitScale);

    this._v4.copy(this._halfConeHeight);
    this._v4.multiplyScalar(-(this._aftScaleY)*label5AdjustmentFactor - this._cylinderLength/2);
    this._v4.add(this._v2);
    label5.matrix.compose(this._v4, this._qn, this._unitScale);

    this._v2.copy(this._zeroVector);
    this._v2.y = this._scaleXZ*label3AdjustmentFactor;
    label3.matrix.compose(this._v2, this._qn, this._unitScale);

    this._v1.copy(this._halfCylinderLength);
    this._v0.copy(this._halfConeHeight);
    this._v0.multiplyScalar(this._forwardScaleY*label2AdjustmentFactor);
    this._v1.add(this._v0);
    this._v1.y = this._scaleXZ*labels1And3AdjustmentFactor;
    label2.matrix.compose(this._v1, this._qn, this._unitScale);

    this._v3.copy(this._halfCylinderLength);
    this._v3.multiplyScalar(-1);
    this._v0.copy(this._halfConeHeight);
    this._v0.multiplyScalar(-(this._aftScaleY));
    this._v3.add(this._v0);
    this._v3.y = this._scaleXZ*labels1And3AdjustmentFactor;
    label4.matrix.compose(this._v3, this._qn, this._unitScale);
  }

  refresh(){
    if (!this.constructionComplete){
      return;
    }
    
    if (this.needsRefresh === false){
      return;
    }

    this.needsRefresh = false;
    this._qn.setFromRotationMatrix(this._camera.matrixWorld);
    this.drawUFO();
  }

  _constructLabels(fontName, fontWeight) {
    // IMPORTANT: The FontLoader.load function generates a Javascript promise
    // which results in asynchronous code execution.  The variable
    // constructionComplete is initialized to false but is set to true once
    // the asynchronous code is complete.  Until then, the refresh function
    // should not be allowed to execute.

    THREE.Cache.enabled = true;
    let font = undefined;
    // body frame
    let lettersArray = ['1', '2', '3', '4', '5'];
    //fontName = helvetiker
    //fontWeight = normal bold
    const loader = new FontLoader();
    // loader.load('./fonts/' + fontName + '_' + fontWeight + '.typeface.json', (response) => {
    // let fontJSON = new URL('/static/fonts/helvetiker_regular_mod.typeface.json', import.meta.url);
    // console.log('fontJSON = ',fontJSON);
    // loader.load(fontJSON.pathname, (response) => {
    loader.load('USED TO BE ./fonts/helvetiker_regular.typeface.json BUT NOT REQURED ANYMORE', (response) => {
      font = response;
      const size = 0.75;
      const height = 0.1;
      const curveSegments = 4;
      const bevelEnabled = false;
  
      let labelsMat = [
        new THREE.MeshLambertMaterial({
          color: this._defaultColor,
          transparent: true,
          depthTest: true,
          depthWrite: false,
          blending: THREE.CustomBlending,
          blendEquation: THREE.AddEquation,
          blendSrc: THREE.SrcAlphaFactor,
          blendDst: THREE.OneMinusSrcAlphaFactor,
          side: THREE.FrontSide
        }),// front
        new THREE.MeshLambertMaterial({
          color: this._defaultColor,
          transparent: true,
          depthTest: true,
          depthWrite: false,
          blending: THREE.CustomBlending,
          blendEquation: THREE.AddEquation,
          blendSrc: THREE.SrcAlphaFactor,
          blendDst: THREE.OneMinusSrcAlphaFactor,
          side: THREE.FrontSide
        }),// side
      ];

      for (let i=0; i<lettersArray.length; i++) {
        let textGeo = new TextGeometry(lettersArray[i], {
          font: font,
          size: size,
          height: height,
          curveSegments: curveSegments,
          bevelEnabled: bevelEnabled,
          depth: 0.1
        });

        switch (i){
          case 0:
            this._1Label = new THREE.Mesh(textGeo, labelsMat);
            this._1Label.matrixAutoUpdate = false;
            break;
          case 1:
            this._2Label = new THREE.Mesh(textGeo, labelsMat);
            this._2Label.matrixAutoUpdate = false;
            break;
          case 2:
            this._3Label = new THREE.Mesh(textGeo, labelsMat);
            this._3Label.matrixAutoUpdate = false;
            break;
          case 3:
            this._4Label = new THREE.Mesh(textGeo, labelsMat);
            this._4Label.matrixAutoUpdate = false;
            break;
          case 4:
            this._5Label = new THREE.Mesh(textGeo, labelsMat);
            this._5Label.matrixAutoUpdate = false;
            break;
        }
      }

      this.constructionComplete = true;
    });
  }

  addObjectsToScene(){
    this.needsRefresh = true;
    const scene = this._scene;
    
    scene.add(this._cylinderMesh);
    scene.add(this._forwardConeMesh);
    scene.add(this._aftConeMesh);
    scene.add(this._forwardShockMesh);
    scene.add(this._aftShockMesh);
    scene.add(this._1Label);
    scene.add(this._2Label);
    scene.add(this._3Label);
    scene.add(this._4Label);
    scene.add(this._5Label);
  }

  setOpacity(thing,opacity){  
    this.needsRefresh = true;

    switch (thing){
      case 'ufo':
        this._defaultOpacity = opacity;
        this._cylinderMesh.material.opacity = opacity;
        this._forwardConeMesh.material.opacity = opacity;
        this._aftConeMesh.material.opacity = opacity;
        break;
      case 'forward-shock':
        this._forwardShockMesh.material.opacity = opacity;
        break;
      case 'aft-shock':
        this._aftShockMesh.material.opacity = opacity;
        break;
      case 'labels':
        this._1Label.material[0].opacity = opacity;
        this._1Label.material[1].opacity = opacity;
        this._2Label.material[0].opacity = opacity;
        this._2Label.material[1].opacity = opacity;
        this._3Label.material[0].opacity = opacity;
        this._3Label.material[1].opacity = opacity;
        this._4Label.material[0].opacity = opacity;
        this._4Label.material[1].opacity = opacity;
        this._5Label.material[0].opacity = opacity;
        this._5Label.material[1].opacity = opacity;
        break;
    }
  }
  
  _colorForName(color){
    let theColor;

    switch (color){
      case 'red':
        theColor = 0xff0000;//0xff5555;//light red (pink)
        break;
      case 'green':
        theColor = 0x00ff00;//0x55ff55;//light green
        break;
      case 'blue':
        theColor = 0x0000ff;//0x5555ff;//light blue
        break;
      case 'yellow':
        theColor = 0xffff00;//0xffff55;//light yellow
        break;
      case 'purple':
        theColor = 0x800080;//0xcbc3e3;//light purple
        break;
      case 'orange':
        theColor = 0xffa500; //0xffd580;//light orange
        break;
    }

    return theColor;
  }

  setColor(thing, color){
    this.needsRefresh = true;
    const theColor = this._colorForName(color);
    
    switch (thing){
      case 'ufo':
        this._cylinderMesh.material.color.set(theColor);
        this._forwardConeMesh.material.color.set(theColor);
        this._aftConeMesh.material.color.set(theColor);
        break;
      case 'forward-shock':
        this._forwardShockMesh.material.color.set(theColor);
        break;
      case 'aft-shock':
        this._aftShockMesh.material.color.set(theColor);
        break;
      case 'labels':
        this._1Label.material[0].color.set(theColor);
        this._1Label.material[1].color.set(theColor);
        this._2Label.material[0].color.set(theColor);
        this._2Label.material[1].color.set(theColor);
        this._3Label.material[0].color.set(theColor);
        this._3Label.material[1].color.set(theColor);
        this._4Label.material[0].color.set(theColor);
        this._4Label.material[1].color.set(theColor);
        this._5Label.material[0].color.set(theColor);
        this._5Label.material[1].color.set(theColor);
        break;
    }
  }
}

export default UFO;
