import * as THREE from '../../../../node_modules/three/build/three.module.js';
import {FontLoader} from './FontLoader.js';
import {TextGeometry} from './TextGeometry.js';

/**
 OrbitalMechThings is a class that encapsulates the computation and rendering 
 of central bodies (sun, moon, planets), trajectory curves, and vectors associated
 with orbital mechanics.  The curves and vectors are the ellipse curve, the hyperbola
 curve, the perifocal frame vectors, the inertial frame vectors, and the r, v, h, and
 e vectors.  This class also handles the vector labels.
**/

const piOver180 = Math.PI / 180;
const oneOverSqrt2 = Math.sqrt(0.5);

class OrbitalMechThings {
  constructor(scene, camera) {
    this._quat = new THREE.Quaternion();
    this._quat.setFromAxisAngle(new THREE.Vector3(1,0,0),0);
    this._camera = camera;
    this._scene = scene;
    this.needsRefresh = true;
    this._unitScale = new THREE.Vector3();
    this._unitScale.set(1, 1, 1);
    this._scale = new THREE.Vector3();
    this._scale.copy(this._unitScale);
    this._rVectorScale = new THREE.Vector3();
    this._rVectorScale.copy(this._scale);
    this._vVectorScale = new THREE.Vector3();
    this._vVectorScale.copy(this._scale);
    this._orbitCurveScale = new THREE.Vector3();
    this._orbitCurveScale.copy(this._unitScale);
    this._curveCenter = new THREE.Vector3(0,0,0);
    this._planetScale = new THREE.Vector3();
    this._planetScale.copy(this._unitScale);

    this._null = new THREE.Vector3(0,0,0);
    this._xunit = new THREE.Vector3(1,0,0);
    this._yunit = new THREE.Vector3(0,1,0);
    this._zunit = new THREE.Vector3(0,0,1);

    this._orbitEccentricity = 0;
    this._r = new THREE.Vector3();
    this._r.set(1,1,1);//arbitrary, will change later
    this._v = new THREE.Vector3();
    this._v.set(1,-1,1);//arbitrary, will change later
    this._h = new THREE.Vector3();
    this._h.copy(this._zunit);//perpendicular to orbit plane
    this._e = new THREE.Vector3();
    this._e.copy(this._xunit);//points toward periapsis
    this._dcm = new THREE.Matrix3();
    this._dcm4x4 = new THREE.Matrix4();

    this._origin = new THREE.Vector3(0,0,0);
    this._flip180quat = new THREE.Quaternion();
    this._flip180quat.setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI);
    this._xVectorPos = new THREE.Vector3(0.5, 0, 0);
    this._yVectorPos = new THREE.Vector3(0, 0.5, 0);
    this._zVectorPos = new THREE.Vector3(0, 0, 0.5);
    this._q1 = new THREE.Quaternion();
    this._qn = new THREE.Quaternion();
    this._nullQuat = new THREE.Quaternion();
    this._nullQuat.setFromAxisAngle(new THREE.Vector3(1,0,0),0);
    this._turn90Quat = new THREE.Quaternion();
    this._turn90Quat.setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2);
    this._v0 = new THREE.Vector3();
    this._v1 = new THREE.Vector3();
    this._v2 = new THREE.Vector3();

    this._circle = [];//radius 1
    this._hyperbola = [];//"square" hyperbola
    this._ellipticalCurveMesh = null;
    this._hyperbolicCurveMesh = null;

    this._fractionForShaft = 0.925;
    // fraction of a vector's length that is the shaft

    this._pVectorShaftMesh = null;
    this._qVectorShaftMesh = null;
    this._wVectorShaftMesh = null;
    this._xVectorShaftMesh = null;
    this._yVectorShaftMesh = null;
    this._zVectorShaftMesh = null;
    this._rVectorShaftMesh = null;
    this._vVectorShaftMesh = null;
    this._hVectorShaftMesh = null;
    this._eVectorShaftMesh = null;

    this._pVectorArrowheadMesh = null;
    this._qVectorArrowheadMesh = null;
    this._wVectorArrowheadMesh = null;
    this._xVectorArrowheadMesh = null;
    this._yVectorArrowheadMesh = null;
    this._zVectorArrowheadMesh = null;
    this._rVectorArrowheadMesh = null;
    this._vVectorArrowheadMesh = null;
    this._hVectorArrowheadMesh = null;
    this._eVectorArrowheadMesh = null;
    
    this._planetMeshArray = new Array(10).fill(null);
    this._planetMeshArrayIndex = 0;

    this._xQuat = new THREE.Quaternion();
    this._yQuat = new THREE.Quaternion();
    this._zQuat = new THREE.Quaternion();
    this._rQuat = new THREE.Quaternion();
    this._vQuat = new THREE.Quaternion();
    this._hQuat = new THREE.Quaternion();
    this._hQuat.setFromAxisAngle(new THREE.Vector3(1,0,0),0);
    this._eQuat = new THREE.Quaternion();
    
    this._pVectorLabel = null;
    this._qVectorLabel = null;
    this._wVectorLabel = null;
    this._xVectorLabel = null;
    this._yVectorLabel = null;
    this._zVectorLabel = null;
    this._rVectorLabel = null;
    this._vVectorLabel = null;
    this._hVectorLabel = null;
    this._eVectorLabel = null;
        
    this._pqwFrameOpacity = 1;
    this._xyzFrameOpacity = 1;
    this._rOpacity = 1;
    this._vOpacity = 1;
    this._hOpacity = 1;
    this._eOpacity = 1;
    this._orbitFixedVectorColor = 0xffff00;//0xffff55;//light yellow
    this._inertialVectorColor = 0x0000ff;//0x5555ff;//light blue
    this._rColor = 0x00ff00;//0x55ff55;//light green
    this._vColor = 0x800080;
    this._hColor = 0x800080;//0xcbc3e3;//light purple, 0x800080;//purple
    this._eColor = 0xff0000;//0xff5555;//light red

    this._constructOrbitCurves();
    this._constructVectors();
    this._constructVectorLabels();

    this._showPQWFrame = false;
    this._showXYZFrame = false;
    this._showR = false;
    this._showV = false;
    this._showH = false;
    this._showE = false;

    this._addRemoveVectorsAndLabels('pqwFrame',false);
    this._addRemoveVectorsAndLabels('xyzFrame',true);
    this._addRemoveVectorsAndLabels('r',true);
    this._addRemoveVectorsAndLabels('v',true);
    this._addRemoveVectorsAndLabels('h',true);
    this._addRemoveVectorsAndLabels('e',true);
    this._constructPlanets();
  }

  // receiveVectorData(r, h, quat, e){
  //   this._r = r;
  //   this._h = h;
  //   this._quat = quat;
  //   this._e = e;
  // }

  drawOrbitCurveAndVectors(){
    this._qn.setFromRotationMatrix(this._camera.matrixWorld);

    if (this._showPQWFrame){
      this._q1.multiplyQuaternions(this._quat,this._xQuat);
      this._v0.copy(this._xVectorPos);
      this._v0.x *= this._fractionForShaft;
      this._v1.copy(this._v0);
      this._v0.applyQuaternion(this._quat);
      this._q1.multiplyQuaternions(this._q1,this._flip180quat);
      this._v1.add(this._xVectorPos);
      this._v1.applyQuaternion(this._quat);
      this._pVectorShaftMesh.matrix.compose(this._v0, this._q1, this._scale);
      this._pVectorArrowheadMesh.matrix.compose(this._v1, this._q1, this._scale);
      this._v1.multiplyScalar(1.1);
      this._pVectorLabel.matrix.compose(this._v1, this._qn, this._scale);
      
      this._q1.multiplyQuaternions(this._quat,this._yQuat);
      this._v0.copy(this._yVectorPos);
      this._v0.y *= this._fractionForShaft;
      this._v1.copy(this._v0);
      this._v0.applyQuaternion(this._quat);
      this._v1.add(this._yVectorPos);
      this._v1.applyQuaternion(this._quat);
      this._qVectorShaftMesh.matrix.compose(this._v0, this._q1, this._scale);
      this._qVectorArrowheadMesh.matrix.compose(this._v1, this._q1, this._scale);
      this._v1.multiplyScalar(1.1);
      this._qVectorLabel.matrix.compose(this._v1, this._qn, this._scale);

      this._q1.multiplyQuaternions(this._quat,this._zQuat);
      this._v0.copy(this._zVectorPos);
      this._v0.z *= this._fractionForShaft;
      this._v1.copy(this._v0);
      this._v0.applyQuaternion(this._quat);
      this._v1.add(this._zVectorPos);
      this._v1.applyQuaternion(this._quat);
      this._wVectorShaftMesh.matrix.compose(this._v0, this._q1, this._scale);
      this._wVectorArrowheadMesh.matrix.compose(this._v1, this._q1, this._scale);
      this._v1.multiplyScalar(1.1);
      this._wVectorLabel.matrix.compose(this._v1, this._qn, this._scale);
    }

    if (this._orbitEccentricity < 1){
      this._ellipticalCurveMesh.matrix.compose(this._curveCenter, this._quat, this._orbitCurveScale);
    }else{
      this._hyperbolicCurveMesh.matrix.compose(this._curveCenter, this._quat, this._orbitCurveScale);
    }
    // console.log('xxxx ',this._v0.x, this._v0.y, this._v0.z, this._scale.x,this._scale.y,this._scale.z);
    if (this._showXYZFrame){
      this._q1.copy(this._xQuat);
      this._v0.copy(this._xVectorPos);
      this._v0.x *= this._fractionForShaft;
      this._v1.copy(this._v0);
      this._v1.add(this._xVectorPos);
      this._q1.multiply(this._flip180quat);
      this._xVectorShaftMesh.matrix.compose(this._v0, this._q1, this._scale);
      this._xVectorArrowheadMesh.matrix.compose(this._v1, this._q1, this._scale);
      this._v1.multiplyScalar(1.1);
      this._xVectorLabel.matrix.compose(this._v1, this._qn, this._scale);

      this._q1.copy(this._yQuat);
      this._v0.copy(this._yVectorPos);
      this._v0.y *= this._fractionForShaft;
      this._v1.copy(this._v0);
      this._v1.add(this._yVectorPos);
      this._yVectorShaftMesh.matrix.compose(this._v0, this._q1, this._scale);
      this._yVectorArrowheadMesh.matrix.compose(this._v1, this._q1, this._scale);
      this._v1.multiplyScalar(1.1);
      this._yVectorLabel.matrix.compose(this._v1, this._qn, this._scale);

      this._q1.copy(this._zQuat);
      this._v0.copy(this._zVectorPos);
      this._v0.z *= this._fractionForShaft;
      this._v1.copy(this._v0);
      this._v1.add(this._zVectorPos);
      this._zVectorShaftMesh.matrix.compose(this._v0, this._q1, this._scale);
      this._zVectorArrowheadMesh.matrix.compose(this._v1, this._q1, this._scale);
      this._v1.multiplyScalar(1.1);
      this._zVectorLabel.matrix.compose(this._v1, this._qn, this._scale);
    }

    if (this._showR){
      this._v0.copy(this._r);
      this._v0.normalize();
      this._rQuat.setFromUnitVectors(this._yunit, this._v0);
      this._q1.multiplyQuaternions(this._quat,this._rQuat);
      this._v1.copy(this._v0);
      this._v2.copy(this._v0);
      this._v0.multiplyScalar(this._rVectorScale.y*0.5*this._fractionForShaft);
      //_v0 is the location of the center of the shaft portion of the vector
      this._v1.multiplyScalar(this._rVectorScale.y*0.5);
      this._v1.add(this._v0);
      //_v1 is the location of the center of the arrowhead portion of the vector
      this._v2.multiplyScalar(this._rVectorScale.y);
      //_v2 is the tip of the r vector (the base of the v vector below)
      this._v0.applyQuaternion(this._quat);
      this._v1.applyQuaternion(this._quat);

      this._rVectorShaftMesh.matrix.compose(this._v0, this._q1, this._rVectorScale);
      this._rVectorArrowheadMesh.matrix.compose(this._v1, this._q1, this._rVectorScale);
      this._v1.multiplyScalar(1.1);
      this._rVectorLabel.matrix.compose(this._v1, this._qn, this._scale);
    }

    if (this._showV){
      this._v0.copy(this._v);
      this._v0.normalize();
      this._v1.copy(this._v0);
      this._vQuat.setFromUnitVectors(this._yunit, this._v0);
      this._q1.multiplyQuaternions(this._quat,this._vQuat);
      this._v0.multiplyScalar(this._vVectorScale.y*0.5);
      this._v1.multiplyScalar(this._vVectorScale.y*0.5);
      this._v1.add(this._v0);
      this._v0.add(this._v2);
      this._v1.add(this._v2);
      this._v0.applyQuaternion(this._quat);
      this._v1.applyQuaternion(this._quat);

      this._vVectorShaftMesh.matrix.compose(this._v0, this._q1, this._vVectorScale);
      this._vVectorArrowheadMesh.matrix.compose(this._v1, this._q1, this._vVectorScale);
      this._v1.multiplyScalar(1.1);
      this._vVectorLabel.matrix.compose(this._v1, this._qn, this._scale);
    }

    if (this._showH){
      this._v0.copy(this._h);
      this._v0.normalize();
      this._hQuat.setFromUnitVectors(this._yunit, this._v0);
      this._q1.multiplyQuaternions(this._quat,this._hQuat);
      this._v0.multiplyScalar(0.5*this._fractionForShaft);
      this._v1.copy(this._v0);
      this._v0.applyQuaternion(this._quat);
      this._v1.multiplyScalar(2);
      this._v1.applyQuaternion(this._quat);
      this._hVectorShaftMesh.matrix.compose(this._v0, this._q1, this._scale);
      this._hVectorArrowheadMesh.matrix.compose(this._v1, this._q1, this._scale);
      this._v1.multiplyScalar(1.1);
      this._hVectorLabel.matrix.compose(this._v1, this._qn, this._scale);
    }

    if (this._showE){
      this._v0.copy(this._e);
      this._v0.normalize();
      this._eQuat.setFromUnitVectors(this._yunit, this._v0);
      this._q1.multiplyQuaternions(this._quat,this._eQuat);
      this._v0.multiplyScalar(0.5*this._fractionForShaft);
      this._v1.copy(this._v0);
      this._v0.applyQuaternion(this._quat);
      this._v1.multiplyScalar(2);
      this._v1.applyQuaternion(this._quat);
      this._eVectorShaftMesh.matrix.compose(this._v0, this._q1, this._scale);
      this._eVectorArrowheadMesh.matrix.compose(this._v1, this._q1, this._scale);
      this._v1.multiplyScalar(1.1);
      this._eVectorLabel.matrix.compose(this._v1, this._qn, this._scale);
    }
  }

  refresh(){
    if (!this.constructionComplete){
      return;
    }

    if (this.needsRefresh === false){
      return;
    }

    this.needsRefresh = false;
    this.drawOrbitCurveAndVectors();
  }

  _colorForName(color){
    let theColor;

    switch (color){
      case 'red':
        theColor = 0xff0000;//0xff5555;//light red (pink)
        break;
      case 'green':
        theColor = 0x00ff00;//0x55ff55;//light green
        break
      case 'blue':
        theColor = 0x5555ff;//light blue //blue 0x0000ff
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
      case 'pqwFrame':
        this._orbitFixedVectorColor = theColor;
        this._pVectorShaftMesh.material.color.set(theColor);
        this._qVectorShaftMesh.material.color.set(theColor);
        this._wVectorShaftMesh.material.color.set(theColor);
        this._pVectorArrowheadMesh.material.color.set(theColor);
        this._qVectorArrowheadMesh.material.color.set(theColor);
        this._wVectorArrowheadMesh.material.color.set(theColor);
        this._pVectorLabel.material[0].color.set(theColor);
        this._pVectorLabel.material[1].color.set(theColor);
        this._qVectorLabel.material[0].color.set(theColor);
        this._qVectorLabel.material[1].color.set(theColor);
        this._wVectorLabel.material[0].color.set(theColor);
        this._wVectorLabel.material[1].color.set(theColor);
        break;

      case 'xyzFrame':
        this._inertialVectorColor = theColor;
        this._xVectorShaftMesh.material.color.set(theColor);
        this._yVectorShaftMesh.material.color.set(theColor);
        this._zVectorShaftMesh.material.color.set(theColor);
        this._xVectorArrowheadMesh.material.color.set(theColor);
        this._yVectorArrowheadMesh.material.color.set(theColor);
        this._zVectorArrowheadMesh.material.color.set(theColor);
        this._xVectorLabel.material[0].color.set(theColor);
        this._xVectorLabel.material[1].color.set(theColor);
        this._yVectorLabel.material[0].color.set(theColor);
        this._yVectorLabel.material[1].color.set(theColor);
        this._zVectorLabel.material[0].color.set(theColor);
        this._zVectorLabel.material[1].color.set(theColor);
        break;

      case 'r':
        this._rColor = theColor;
        this._rVectorShaftMesh.material.color.set(theColor);
        this._rVectorArrowheadMesh.material.color.set(theColor);
        this._rVectorLabel.material[0].color.set(theColor);
        this._rVectorLabel.material[1].color.set(theColor);
        break;

      case 'v':
        this._vColor = theColor;
        this._vVectorShaftMesh.material.color.set(theColor);
        this._vVectorArrowheadMesh.material.color.set(theColor);
        this._vVectorLabel.material[0].color.set(theColor);
        this._vVectorLabel.material[1].color.set(theColor);
        break;

      case 'h':
        this._hColor = theColor;
        this._hVectorShaftMesh.material.color.set(theColor);
        this._hVectorArrowheadMesh.material.color.set(theColor);
        this._hVectorLabel.material[0].color.set(theColor);
        this._hVectorLabel.material[1].color.set(theColor);
        break;

      case 'e':
        this._eColor = theColor;
        this._eVectorShaftMesh.material.color.set(theColor);
        this._eVectorArrowheadMesh.material.color.set(theColor);
        this._eVectorLabel.material[0].color.set(theColor);
        this._eVectorLabel.material[1].color.set(theColor);
        break;
    }
  }

  _constructOrbitCurves(){
    let curvePoint;
    let r;
    const sqrt2 = Math.SQRT2; 
    const cPlusA = Math.SQRT2 + 1;//amount to move the square hyperbola
    // to the left in order to make it a normal hyperbola graph

    for (let i=0; i<360; i+=2){
      curvePoint = new THREE.Vector3(Math.cos(i*piOver180),Math.sin(i*piOver180),0);
      this._circle.push(curvePoint);      
    }
  
    for (let i=-130; i<130; i+=2){
      // go from -130 degrees to 130 degrees, 135 is infinity
      r = 1/(1 + sqrt2*Math.cos(i*piOver180));

      // e and c equal sqrt(2), a, b, and P equal 1 for a "square" hyperbola
      curvePoint = new THREE.Vector3(r*Math.cos(i*piOver180)-cPlusA,r*Math.sin(i*piOver180),0);
      this._hyperbola.push(curvePoint);      
    }

    // curvePoint.multiplyScalar(10);
    // curvePoint.applyQuaternion(quat);
  
    if (this._ellipticalCurveMesh == null && this._hyperbolicCurveMesh == null){
      const lineMaterial1 = new THREE.LineBasicMaterial({color: 0xffffff});
      let cp1 = new THREE.CurvePath();
  
      for (let i=1; i<this._circle.length; i++){
        cp1.add(new THREE.LineCurve3(this._circle[i-1],this._circle[i]));
      }
  
      let tubeGeometry1 = new THREE.TubeGeometry(
        cp1,
        512,// path segments
        0.002,// THICKNESS
        4, //Roundness of Tube
        true //closed
      );
  
      this._ellipticalCurveMesh = new THREE.Line(tubeGeometry1, lineMaterial1);
      this._ellipticalCurveMesh.matrixAutoUpdate = false;
      // this._scene.add(this._ellipticalCurveMesh);

      const lineMaterial2 = new THREE.LineBasicMaterial({color: 0xffffff});
      let cp2 = new THREE.CurvePath();
  
      for (let i=1; i<this._hyperbola.length; i++){
        cp2.add(new THREE.LineCurve3(this._hyperbola[i-1],this._hyperbola[i]));
      }
  
      let tubeGeometry2 = new THREE.TubeGeometry(
        cp2,
        512,// path segments
        0.002,// THICKNESS
        4, //Roundness of Tube
        false //closed
      );
  
      this._hyperbolicCurveMesh = new THREE.Line(tubeGeometry2, lineMaterial2);
      this._hyperbolicCurveMesh.matrixAutoUpdate = false;
      this._scene.add(this._ellipticalCurveMesh);
      this._scene.add(this._hyperbolicCurveMesh);
    }
  }

  shapeOrbitCurve(a, e){
    this._orbitEccentricity = e;
    
    // the scale and center of the curve are not affected by "a"
    // since we scale the planet size and not the curve.
    // a is positive for ellipses (e<1) and negative for
    // hyperbolas (e>1)
    if (e < 1){
      this._orbitCurveScale.x = 1;
      this._orbitCurveScale.y = Math.sqrt(1 - e*e);
      this._curveCenter.set(-e,0,0);
      this._ellipticalCurveMesh.material.visible = true;
      this._hyperbolicCurveMesh.material.visible = false;
      this._curveCenter.applyQuaternion(this._quat);
      this._planetScale.set(1/a, 1/a, 1/a);
    }else{
      this._orbitCurveScale.x = 1;
      this._orbitCurveScale.y = Math.sqrt(e*e - 1);
      this._curveCenter.set((1+e)*this._orbitCurveScale.x,0,0);
      this._ellipticalCurveMesh.material.visible = false;
      this._hyperbolicCurveMesh.material.visible = true;
      this._curveCenter.applyQuaternion(this._quat);
      this._planetScale.set(-1/a, -1/a, -1/a);
    }

    this._planetMeshArray[this._planetMeshArrayIndex].matrix.compose(this._origin, this._turn90Quat, this._planetScale);
    this.needsRefresh = true;
  }

  computeRotation(lan, inc, aop){
    // direction cosine matrix from perifocal frame to geocentric 
    // equatorial frame (or other inertial frames)
    // from Fundamentals of Astrodynamics (Bate, Mueller, White), 
    // p. 82, Dover Publications
    // this is a 313 Euler rotation sequence
    const clan = Math.cos(lan);
    const slan = Math.sin(lan);
    const cinc = Math.cos(inc);
    const sinc = Math.sin(inc);
    const caop = Math.cos(aop);
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
    this._dcm.set(r11, r12, r13, r21, r22, r23, r31, r32, r33);
    this._dcm4x4.identity();
    this._dcm4x4.setFromMatrix3(this._dcm);
    this._quat.setFromRotationMatrix(this._dcm4x4);
    this.needsRefresh = true;
  }

  setR(x, y, z, a){
    this._rVectorScale.setY(Math.sqrt(x*x + y*y + z*z)/Math.abs(a));
    this._r.set(x, y, z);
    this.needsRefresh = true;
  }

  setV(x, y, z){
    this._vVectorScale.setY(1.75*Math.sqrt(x*x + y*y + z*z));
    this._v.set(x, y, z);
    this.needsRefresh = true;
  }

  _constructVectors(){
    const length = 1;
    const shaftRadius = 0.007*length;
    const fractionForShaft = this._fractionForShaft;

    const shaftGeometry = new THREE.CylinderGeometry(shaftRadius, 
      shaftRadius, length*fractionForShaft, 32, 1, true);
    const arrowheadGeometry = new THREE.ConeGeometry(3*shaftRadius, 
      length*(1-fractionForShaft), 32, 1, true);
    const mats = new Array(6).fill(null);
    const colors = [this._orbitFixedVectorColor, this._inertialVectorColor,
      this._rColor, this._vColor, this._hColor, this._eColor];
    const opacities = [this._pqwFrameOpacity, this._xyzFrameOpacity,
      this._rOpacity, this._vOpacity, this._hOpacity,
      this._eOpacity];

    for (let i=0; i<6; i++){
      mats[i] = new THREE.MeshBasicMaterial({
        color: colors[i],
        transparent: true,
        opacity: opacities[i],
      });

      mats[i].blending = THREE.CustomBlending;
      mats[i].blendSrc = THREE.SrcAlphaFactor;
      mats[i].blendDst = THREE.OneMinusSrcAlphaFactor;
      mats[i].blendEquation = THREE.AddEquation;
    }

    this._pVectorShaftMesh = new THREE.Mesh(shaftGeometry, mats[0]);
    this._pVectorShaftMesh.matrixAutoUpdate = false;
    this._pVectorArrowheadMesh = new THREE.Mesh(arrowheadGeometry, mats[0]);
    this._pVectorArrowheadMesh.matrixAutoUpdate = false;

    this._qVectorShaftMesh = new THREE.Mesh(shaftGeometry, mats[0]);
    this._qVectorShaftMesh.matrixAutoUpdate = false;
    this._qVectorArrowheadMesh = new THREE.Mesh(arrowheadGeometry, mats[0]);
    this._qVectorArrowheadMesh.matrixAutoUpdate = false;

    this._wVectorShaftMesh = new THREE.Mesh(shaftGeometry, mats[0]);
    this._wVectorShaftMesh.matrixAutoUpdate = false;
    this._wVectorArrowheadMesh = new THREE.Mesh(arrowheadGeometry, mats[0]);
    this._wVectorArrowheadMesh.matrixAutoUpdate = false;

    this._xQuat.set(0, 0, oneOverSqrt2, oneOverSqrt2);
    this._yQuat.set(0, 0, 0, 1);
    this._zQuat.set(oneOverSqrt2, 0, 0, oneOverSqrt2);

    this._xVectorShaftMesh = new THREE.Mesh(shaftGeometry, mats[1]);
    this._xVectorShaftMesh.matrixAutoUpdate = false;
    this._xVectorArrowheadMesh = new THREE.Mesh(arrowheadGeometry, mats[1]);
    this._xVectorArrowheadMesh.matrixAutoUpdate = false;

    this._yVectorShaftMesh = new THREE.Mesh(shaftGeometry, mats[1]);
    this._yVectorShaftMesh.matrixAutoUpdate = false;
    this._yVectorArrowheadMesh = new THREE.Mesh(arrowheadGeometry, mats[1]);
    this._yVectorArrowheadMesh.matrixAutoUpdate = false;
    
    this._zVectorShaftMesh = new THREE.Mesh(shaftGeometry, mats[1]);
    this._zVectorShaftMesh.matrixAutoUpdate = false;
    this._zVectorArrowheadMesh = new THREE.Mesh(arrowheadGeometry, mats[1]);
    this._zVectorArrowheadMesh.matrixAutoUpdate = false;

    this._rVectorShaftMesh = new THREE.Mesh(shaftGeometry, mats[2]);
    this._rVectorShaftMesh.matrixAutoUpdate = false;
    this._rVectorArrowheadMesh = new THREE.Mesh(arrowheadGeometry, mats[2]);
    this._rVectorArrowheadMesh.matrixAutoUpdate = false;

    this._vVectorShaftMesh = new THREE.Mesh(shaftGeometry, mats[3]);
    this._vVectorShaftMesh.matrixAutoUpdate = false;
    this._vVectorArrowheadMesh = new THREE.Mesh(arrowheadGeometry, mats[3]);
    this._vVectorArrowheadMesh.matrixAutoUpdate = false;

    this._hVectorShaftMesh = new THREE.Mesh(shaftGeometry, mats[4]);
    this._hVectorShaftMesh.matrixAutoUpdate = false;
    this._hVectorArrowheadMesh = new THREE.Mesh(arrowheadGeometry, mats[4]);
    this._hVectorArrowheadMesh.matrixAutoUpdate = false;

    this._eVectorShaftMesh = new THREE.Mesh(shaftGeometry, mats[5]);
    this._eVectorShaftMesh.matrixAutoUpdate = false;
    this._eVectorArrowheadMesh = new THREE.Mesh(arrowheadGeometry, mats[5]);
    this._eVectorArrowheadMesh.matrixAutoUpdate = false;
  }

  setRVisible(visible){
    this._rVectorShaftMesh.material.visible = visible;
    this._rVectorArrowheadMesh.material.visible = visible;
    this._rVectorLabel.material.visible = visible;
    this._rVectorLabel.material[0].visible = visible;
    this._rVectorLabel.material[1].visible = visible;
  }

  setVVisible(visible){
    this._vVectorShaftMesh.material.visible = visible;
    this._vVectorArrowheadMesh.material.visible = visible;
    this._vVectorLabel.material.visible = visible;
    this._vVectorLabel.material[0].visible = visible;
    this._vVectorLabel.material[1].visible = visible;
  }

  _constructVectorLabels() {
    // IMPORTANT: The FontLoader.load function generates a Javascript promise
    // which results in asynchronous code execution.  The variable
    // constructionComplete is initialized to false but is set to true once
    // the asynchronous code is complete.  Until then, the refresh function
    // should not be allowed to execute.

    THREE.Cache.enabled = true;
    let font = undefined;
    // rotating frame, space frame, r, h, e
    let lettersArray = ['P', 'Q', 'W', 'X', 'Y', 'Z', 'r', 'v', 'h', 'e'];
    //fontName = helvetiker
    //fontWeight = normal bold
    const loader = new FontLoader();
    // loader.load('./fonts/' + fontName + '_' + fontWeight + '.typeface.json', (response) => {
    // let fontJSON = new URL('/static/fonts/helvetiker_regular_mod.typeface.json', import.meta.url);
    // console.log('fontJSON = ',fontJSON);
    // loader.load(fontJSON.pathname, (response) => {
    loader.load('USED TO BE ./fonts/helvetiker_regular.typeface.json BUT NOT REQURED ANYMORE', (response) => {
      font = response;
      const size = 0.125;
      const height = 0.04;
      const curveSegments = 4;
      const bevelEnabled = false;
  
      let materials1 = [
        new THREE.MeshBasicMaterial({color: this._orbitFixedVectorColor, transparent: true, opacity: this._pqwFrameOpacity}), // front
        new THREE.MeshBasicMaterial({color: this._orbitFixedVectorColor, transparent: true, opacity: this._pqwFrameOpacity}) // side
      ];

      let materials2 = [
        new THREE.MeshBasicMaterial({color: this._inertialVectorColor, transparent: true, opacity: this._xyzFrameOpacity}), // front
        new THREE.MeshBasicMaterial({color: this._inertialVectorColor, transparent: true, opacity: this._xyzFrameOpacity}) // side
      ];

      let materials3 = [
        new THREE.MeshBasicMaterial({color: this._rColor, transparent: true, opacity: this._rOpacity}), // front
        new THREE.MeshBasicMaterial({color: this._rColor, transparent: true, opacity: this._rOpacity}) // side
      ];

      let materials4 = [
        new THREE.MeshBasicMaterial({color: this._hColor, transparent: true, opacity: this._hOpacity}), // front
        new THREE.MeshBasicMaterial({color: this._hColor, transparent: true, opacity: this._hOpacity}) // side
      ];

      let materials5 = [
        new THREE.MeshBasicMaterial({color: this._eColor, transparent: true, opacity: this._eOpacity}), // front
        new THREE.MeshBasicMaterial({color: this._eColor, transparent: true, opacity: this._eOpacity}) // side
      ];

      for (let i=0; i<lettersArray.length; i++) {
        let textGeo = new TextGeometry(lettersArray[i], {
          font: font,
          size: size,
          height: height,
          curveSegments: curveSegments,
          bevelEnabled: bevelEnabled,
          depth: 0.04
        });

        switch (i){
          case 0:
            this._pVectorLabel = new THREE.Mesh(textGeo, materials1);
            this._pVectorLabel.matrixAutoUpdate = false;
            break;
          case 1:
            this._qVectorLabel = new THREE.Mesh(textGeo, materials1);
            this._qVectorLabel.matrixAutoUpdate = false;
            break;
          case 2:
            this._wVectorLabel = new THREE.Mesh(textGeo, materials1);
            this._wVectorLabel.matrixAutoUpdate = false;
            break;
          case 3:
            this._xVectorLabel = new THREE.Mesh(textGeo, materials2);
            this._xVectorLabel.matrixAutoUpdate = false;
            break;
          case 4:
            this._yVectorLabel = new THREE.Mesh(textGeo, materials2);
            this._yVectorLabel.matrixAutoUpdate = false;
            break;
          case 5:
            this._zVectorLabel  = new THREE.Mesh(textGeo, materials2);
            this._zVectorLabel.matrixAutoUpdate = false;
            break;
          case 6:
            this._rVectorLabel = new THREE.Mesh(textGeo, materials3);
            this._rVectorLabel.matrixAutoUpdate = false;
            break;
          case 7:
            this._vVectorLabel = new THREE.Mesh(textGeo, materials3);
            this._vVectorLabel.matrixAutoUpdate = false;
            break;
          case 8:
            this._hVectorLabel = new THREE.Mesh(textGeo, materials4);
            this._hVectorLabel.matrixAutoUpdate = false;
            break;
          case 9:
            this._eVectorLabel = new THREE.Mesh(textGeo, materials5);
            this._eVectorLabel.matrixAutoUpdate = false;
            break;
        }
      }

      this.constructionComplete = true;
    });
  }

  _addRemoveVectorsAndLabels(opt, show) {
    const scene = this._scene;
    this.needsRefresh = true;
    let add;
    let remove;

    switch (opt){
      case 'pqwFrame':
        add = show && !(this._showPQWFrame);
        remove = !show && this._showPQWFrame;
        this._showPQWFrame = show;

        if (add){
          scene.add(this._pVectorShaftMesh);
          scene.add(this._pVectorArrowheadMesh);
          scene.add(this._qVectorShaftMesh);
          scene.add(this._qVectorArrowheadMesh);
          scene.add(this._wVectorShaftMesh);
          scene.add(this._wVectorArrowheadMesh);
          scene.add(this._pVectorLabel);
          scene.add(this._qVectorLabel);
          scene.add(this._wVectorLabel);
        }

        if (remove){
          scene.remove(this._pVectorShaftMesh);
          scene.remove(this._pVectorArrowheadMesh);
          scene.remove(this._qVectorShaftMesh);
          scene.remove(this._qVectorArrowheadMesh);
          scene.remove(this._wVectorShaftMesh);
          scene.remove(this._wVectorArrowheadMesh);
          scene.remove(this._pVectorLabel);
          scene.remove(this._qVectorLabel);
          scene.remove(this._wVectorLabel);
        }
        break;

      case 'xyzFrame':
        add = show && !(this._showXYZFrame);
        remove = !show && this._showXYZFrame;
        this._showXYZFrame = show;

        if (add){
          scene.add(this._xVectorShaftMesh);
          scene.add(this._xVectorArrowheadMesh);
          scene.add(this._yVectorShaftMesh);
          scene.add(this._yVectorArrowheadMesh);
          scene.add(this._zVectorShaftMesh);
          scene.add(this._zVectorArrowheadMesh);
          scene.add(this._xVectorLabel);
          scene.add(this._yVectorLabel);
          scene.add(this._zVectorLabel);
        }

        if (remove){
          scene.remove(this._xVectorShaftMesh);
          scene.remove(this._xVectorArrowheadMesh);
          scene.remove(this._yVectorShaftMesh);
          scene.remove(this._yVectorArrowheadMesh);
          scene.remove(this._zVectorShaftMesh);
          scene.remove(this._zVectorArrowheadMesh);
          scene.remove(this._xVectorLabel);
          scene.remove(this._yVectorLabel);
          scene.remove(this._zVectorLabel);
        }
        break;

      case 'r':
        add = show && !(this._showR);
        remove = !show && this._showR;
        this._showR = show;

        if (add){
          scene.add(this._rVectorShaftMesh);
          scene.add(this._rVectorArrowheadMesh);
          scene.add(this._rVectorLabel);
        }

        if (remove){
          scene.remove(this._rVectorShaftMesh);
          scene.remove(this._rVectorArrowheadMesh);
          scene.remove(this._rVectorLabel);
        }
        break;

      case 'v':
        add = show && !(this._showV);
        remove = !show && this._showV;
        this._showV = show;

        if (add){
          scene.add(this._vVectorShaftMesh);
          scene.add(this._vVectorArrowheadMesh);
          scene.add(this._vVectorLabel);
        }

        if (remove){
          scene.remove(this._vVectorShaftMesh);
          scene.remove(this._vVectorArrowheadMesh);
          scene.remove(this._vVectorLabel);
        }
        break;

      case 'h':
        add = show && !(this._showH);
        remove = !show && this._showH;
        this._showH = show;

        if (add){
          scene.add(this._hVectorShaftMesh);
          scene.add(this._hVectorArrowheadMesh);
          scene.add(this._hVectorLabel);
        }

        if (remove){
          scene.remove(this._hVectorShaftMesh);
          scene.remove(this._hVectorArrowheadMesh);
          scene.remove(this._hVectorLabel);
        }
        break;

      case 'e':
        add = show && !(this._showE);
        remove = !show && this._showE;
        this._showE = show;

        if (add){
          scene.add(this._eVectorShaftMesh);
          scene.add(this._eVectorArrowheadMesh);
          scene.add(this._eVectorLabel);
        }

        if (remove){
          scene.remove(this._eVectorShaftMesh);
          scene.remove(this._eVectorArrowheadMesh);
          scene.remove(this._eVectorLabel);
        }
        break;
    }
  }

  showPQWFrame(value) {
    this._addRemoveVectorsAndLabels('pqwFrame',value);
  }

  showXYZFrame(value) {
    this._addRemoveVectorsAndLabels('xyzFrame',value);
  }

  showR(value) {
    this._addRemoveVectorsAndLabels('r',value);
  }

  showV(value) {
    this._addRemoveVectorsAndLabels('v',value);
  }

  showH(value) {
    this._addRemoveVectorsAndLabels('h',value);
  }

  showE(value) {
    this._addRemoveVectorsAndLabels('e',value);
  }

  setMuIndex(i){
    this._scene.remove(this._planetMeshArray[this._planetMeshArrayIndex]);
    this._planetMeshArrayIndex = i;
    this._scene.add(this._planetMeshArray[i]);
  }

  _constructPlanets(){
    const geometry = new THREE.SphereGeometry(0.976, 32, 16);
    let texture;
    let material;
    //creates spherical geometry with radius 0.976, 32 horizontal segments and 16 vertical segments
    // 0.976 is the ratio of the earth radius to the radius of
    // a circular low earh orbit at 160 km altitude.
    // for earth, that orbit is scale 1 for our program
    let sun = new URL('../../static/img/2k_sun.jpg', import.meta.url);
    let moon = new URL('../../static/img/2k_moon.jpg', import.meta.url);
    let mercury = new URL('../../static/img/2k_mercury.jpg', import.meta.url);
    let venus = new URL('../../static/img/2k_venus_atmosphere.jpg', import.meta.url);
    let earth = new URL('../../static/img/2k_earth_daymap.jpg', import.meta.url);
    let mars = new URL('../../static/img/2k_mars.jpg', import.meta.url);
    let jupiter = new URL('../../static/img/2k_jupiter.jpg', import.meta.url);
    let saturn = new URL('../../static/img/2k_saturn.jpg', import.meta.url);
    let uranus = new URL('../../static/img/2k_uranus.jpg', import.meta.url);
    let neptune = new URL('../../static/img/2k_neptune.jpg', import.meta.url);

    texture = new THREE.TextureLoader().load(sun.pathname);
    material = new THREE.MeshPhongMaterial({map: texture});
    this._planetMeshArray[0] = new THREE.Mesh(geometry, material);
    texture = new THREE.TextureLoader().load(moon.pathname);
    material = new THREE.MeshPhongMaterial({map: texture});
    this._planetMeshArray[1] = new THREE.Mesh(geometry, material);
    texture = new THREE.TextureLoader().load(mercury.pathname);
    material = new THREE.MeshPhongMaterial({map: texture});
    this._planetMeshArray[2] = new THREE.Mesh(geometry, material);
    texture = new THREE.TextureLoader().load(venus.pathname);
    material = new THREE.MeshPhongMaterial({map: texture});
    this._planetMeshArray[3] = new THREE.Mesh(geometry, material);
    texture = new THREE.TextureLoader().load(earth.pathname);
    material = new THREE.MeshPhongMaterial({map: texture});
    this._planetMeshArray[4] = new THREE.Mesh(geometry, material);
    texture = new THREE.TextureLoader().load(mars.pathname);
    material = new THREE.MeshPhongMaterial({map: texture});
    this._planetMeshArray[5] = new THREE.Mesh(geometry, material);
    texture = new THREE.TextureLoader().load(jupiter.pathname);
    material = new THREE.MeshPhongMaterial({map: texture});
    this._planetMeshArray[6] = new THREE.Mesh(geometry, material);
    texture = new THREE.TextureLoader().load(saturn.pathname);
    material = new THREE.MeshPhongMaterial({map: texture});
    this._planetMeshArray[7] = new THREE.Mesh(geometry, material);
    texture = new THREE.TextureLoader().load(uranus.pathname);
    material = new THREE.MeshPhongMaterial({map: texture});
    this._planetMeshArray[8] = new THREE.Mesh(geometry, material);
    texture = new THREE.TextureLoader().load(neptune.pathname);
    material = new THREE.MeshPhongMaterial({map: texture});
    this._planetMeshArray[9] = new THREE.Mesh(geometry, material);

    for (let i=0; i<10; i++){
      this._planetMeshArray[i].matrixAutoUpdate = false;
      this._planetMeshArray[i].material.opacity = 1;
      this._planetMeshArray[i].matrix.compose(this._origin, this._turn90Quat, this._planetScale);
    }

    this._planetMeshArrayIndex = 0;
    this._scene.add(this._planetMeshArray[this._planetMeshArrayIndex]);
    //https://www.solarsystemscope.com/textures/
  }
}

export default OrbitalMechThings;
