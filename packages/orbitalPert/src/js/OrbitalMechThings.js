import * as THREE from '../../../../node_modules/three/build/three.module.js';
import {FontLoader} from './FontLoader.js';
import {TextGeometry} from './TextGeometry.js';

/**
 The OrbitalMechThings class encapsulates the computation and rendering of
 central bodies (sun, moon, planets), trajectory curves, and vectors 
 associated with orbital mechanics.  The curves and vectors are the ellipse
 curve, the hyperbola curve, the perifocal frame vectors, the inertial frame
 vectors, the UVW frame vectors, and the r, v, h, and e vectors.  This class
 also handles the vector labels.

 An underscore at the beginning of a variable denotes that the varible is
 supposed to be private.  NOTE: Javascript currently does not implement classes
 the way C and other languages do, so "private" variables are actually public.

 Revision History
 Date    Name                  Description
 1/19/24 R. Eastman            v0.1 beta
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
    this._scaleInertialVectors = new THREE.Vector3();
    this._scaleInertialVectors.copy(this._unitScale);
    this._scaleOrbitFixedVectors = new THREE.Vector3();
    this._scaleOrbitFixedVectors.copy(this._unitScale);
    this._scaleOrbitingBodyVectors = new THREE.Vector3();
    this._scaleOrbitingBodyVectors.copy(this._unitScale);
    this._rVectorScale = new THREE.Vector3();
    this._rVectorScale.copy(this._scale);
    this._vVectorScale = new THREE.Vector3();
    this._vVectorScale.copy(this._scale);
    this._orbitCurveScale = new THREE.Vector3();
    this._orbitCurveScale.copy(this._unitScale);
    this._curveCenter = new THREE.Vector3(0,0,0);
    this._planetScale = new THREE.Vector3();
    this._planetScale.copy(this._unitScale);
    this._inertialVectorScale = 1;
    this._orbitFixedVectorScale = 1;
    this._orbitingBodyVectorScale = 1;
    this._displayOrbitsAsDifference = false;

    this._null = new THREE.Vector3(0,0,0);
    this._xunit = new THREE.Vector3(1,0,0);
    this._yunit = new THREE.Vector3(0,1,0);
    this._zunit = new THREE.Vector3(0,0,1);

    this._orbitEccentricity = 0;
    this._orbitSemiMajorAxis = 0;
    this._r = new THREE.Vector3();
    this._r.set(1,1,1);//arbitrary and will change later
    this._v = new THREE.Vector3();
    this._v.set(1,-1,1);//arbitrary and will change later
    this._h = new THREE.Vector3();
    this._h.copy(this._zunit);//perpendicular to orbit plane
    this._e = new THREE.Vector3();
    this._e.copy(this._xunit);//points toward periapsis
    this._dcm = new THREE.Matrix3();//direction cosine matrix
    this._dcm4x4 = new THREE.Matrix4();//needed for setting _quat from _dcm

    this._origin = new THREE.Vector3(0,0,0);
    this._flip180quat = new THREE.Quaternion();
    this._flip180quat.setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI);
    this._iVectorPos = new THREE.Vector3(0.5, 0, 0);
    this._jVectorPos = new THREE.Vector3(0, 0.5, 0);
    this._kVectorPos = new THREE.Vector3(0, 0, 0.5);
    this._q1 = new THREE.Quaternion();
    this._qn = new THREE.Quaternion();
    this._nullQuat = new THREE.Quaternion();
    this._nullQuat.setFromAxisAngle(this._xunit,0);
    this._planetQuat0 = new THREE.Quaternion();
    this._planetQuat0.setFromAxisAngle(this._xunit,Math.PI/2);
    this._planetQuat1 = new THREE.Quaternion();
    this._planetQuat1.setFromAxisAngle(this._zunit,0);
    this._planetQuat = new THREE.Quaternion();
    this._planetQuat.multiplyQuaternions(this._planetQuat1,this._planetQuat0);
    // _planetQuat0 is the 90 deg rotation that is required because of 
    // the way that the planet textures are provided.  _planetQuat1 is
    // our rotation about the planet's rotational axis which is assumed
    // to be the planet's ellipsoidal z-axis (no attempt is made to model
    // the actual turning axis since it is practically the same for our
    // purposes).  _planetQuat is the final quaternion used for rendering
    // and is just the multiplcation of the other two quaternions
    this._turn90Quat = new THREE.Quaternion();
    this._turn90Quat.setFromAxisAngle(this._zunit,Math.PI/2);
    this._v0 = new THREE.Vector3();
    this._v1 = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._v3 = new THREE.Vector3();

    this._circle = [];//radius 1
    this._hyperbola = [];//unit hyperbola
    this._ellipticalCurveMesh = null;
    this._hyperbolicCurveMesh = null;
    this._orbitPertDots = [];
    //array of circle geometries representing a perturbed orbit, 
    //which is better to use than the way the main orbit curve is 
    //because of memory issues and the fact that this perturbed 
    //curve must be re-computed and redrawn much more often
    this._orbitPertOrDelta = null;
    // array containing the difference between the perturbed orbit
    // and the nominal one
    this._isDelta = false;
    // boolean stating whether this._orbitPertOrDelta contains data
    // for the pertubed orbit or for the delta between the perturbed
    // and nominal orbits
    this._zoom = 1;
    // factor to zoom in on the orbit delta when this._isDelta is set true
    this._fractionForShaft = 0.925;
    // fraction of a vector's length that is the shaft

    this._pVectorShaftMesh = null;
    this._qVectorShaftMesh = null;
    this._wVectorShaftMesh = null;
    this._iVectorShaftMesh = null;
    this._jVectorShaftMesh = null;
    this._kVectorShaftMesh = null;
    this._UVectorShaftMesh = null;
    this._VVectorShaftMesh = null;
    this._WVectorShaftMesh = null;
    this._rVectorShaftMesh = null;
    this._vVectorShaftMesh = null;
    this._hVectorShaftMesh = null;
    this._eVectorShaftMesh = null;

    this._pVectorArrowheadMesh = null;
    this._qVectorArrowheadMesh = null;
    this._wVectorArrowheadMesh = null;
    this._iVectorArrowheadMesh = null;
    this._jVectorArrowheadMesh = null;
    this._kVectorArrowheadMesh = null;
    this._UVectorArrowheadMesh = null;
    this._VVectorArrowheadMesh = null;
    this._WVectorArrowheadMesh = null;
    this._rVectorArrowheadMesh = null;
    this._vVectorArrowheadMesh = null;
    this._hVectorArrowheadMesh = null;
    this._eVectorArrowheadMesh = null;
    
    this._planetMeshArray = new Array(11).fill(null);
    this._planetOpacity = 1;
    this._planetMeshArrayIndex = 0;
    this._orbitCurveOpacity = 1;

    this._xQuat = new THREE.Quaternion();
    this._yQuat = new THREE.Quaternion();
    this._zQuat = new THREE.Quaternion();
    this._rQuat = new THREE.Quaternion();
    this._vQuat = new THREE.Quaternion();
    this._hQuat = new THREE.Quaternion();
    this._hQuat.setFromAxisAngle(new THREE.Vector3(1,0,0),0);
    this._eQuat = new THREE.Quaternion();
    
    this._pVectorLabelMesh = null;
    this._qVectorLabelMesh = null;
    this._wVectorLabelMesh = null;
    this._iVectorLabelMesh = null;
    this._jVectorLabelMesh = null;
    this._kVectorLabelMesh = null;
    this._UVectorLabelMesh = null;
    this._VVectorLabelMesh = null;
    this._WVectorLabelMesh = null;
    this._rVectorLabelMesh = null;
    this._vVectorLabelMesh = null;
    this._hVectorLabelMesh = null;
    this._eVectorLabelMesh = null;
        
    this._vectorOpacity = 1;

    this._orbitFixedVectorColor = 0xffa500;//orange
    this._inertialVectorColor = 0x0000ff;//blue
    this._UVWVectorColor = 0xffff00;//yellow
    this._rVectorColor = 0xffff00;//yellow
    this._vVectorColor = 0x00ff00;//green

    this._constructOrbitCurves();
    this._constructVectors();
    this._constructVectorLabels();

    this._showPQWFrame = false;
    this._showIJKFrame = false;
    this._showUVWFrame = false;
    this._showR = false;
    this._showV = false;
    this._showH = false;
    this._showE = false;
    this._showWVectors = true;

    this._addRemoveVectorsAndLabels('ijkFrame',true);
    this._addRemoveVectorsAndLabels('h',true);
    this._addRemoveVectorsAndLabels('e',true);
    this._addRemoveVectorsAndLabels('pqwFrame',false);
    this._addRemoveVectorsAndLabels('r',true);
    this._addRemoveVectorsAndLabels('v',true);
    this._addRemoveVectorsAndLabels('uvwFrame',true);
    this._constructPlanets();

    this._numApoapsePasses = 0;//used in rotatePlanet2(), needed to 
    // prevent the planet's rotation from resetting backwards if the orbiting
    // body passes through apoapse
    this._previousTime = -1e10;//used in rotatePlanet2(), needed to 
    // prevent the planet's rotation from resetting backwards if the orbiting
    // body passes through apoapse, set here to a large negative number
    // that is assumed to be lower than any time that is passed
    // into that function
  }

  setDisplayOrbitsAsDifference(displayAsDifference){
    this._displayOrbitsAsDifference = displayAsDifference;
  }  

  drawOrbitCurveAndVectors(){    
    // this function draws (renders) the orbit curves and vectors.
    // THREE.js has what it calls "Groups", which would greatly
    // simplify the code in this function if learned.  That way,
    // the shafts and arrowheads of vectors could be treated as
    // a single object.  Why not do it?  Pure laziness
    this._qn.setFromRotationMatrix(this._camera.matrixWorld);

    if (this._showPQWFrame){
      this._q1.multiplyQuaternions(this._quat,this._xQuat);
      this._v0.copy(this._iVectorPos);
      this._v0.x *= this._fractionForShaft;
      this._v1.copy(this._v0);
      this._v0.x *= this._orbitFixedVectorScale;
      this._v0.applyQuaternion(this._quat);
      this._q1.multiplyQuaternions(this._q1,this._flip180quat);
      this._v1.add(this._iVectorPos);
      this._v1.x *= this._orbitFixedVectorScale;
      this._v1.applyQuaternion(this._quat);
      this._pVectorShaftMesh.matrix.compose(this._v0, this._q1, this._scaleOrbitFixedVectors);
      this._pVectorArrowheadMesh.matrix.compose(this._v1, this._q1, this._scaleOrbitFixedVectors);
      this._v1.multiplyScalar(1.1);
      this._pVectorLabelMesh.matrix.compose(this._v1, this._qn, this._scale);
      
      this._q1.multiplyQuaternions(this._quat,this._yQuat);
      this._v0.copy(this._jVectorPos);
      this._v0.y *= this._fractionForShaft;
      this._v1.copy(this._v0);
      this._v0.y *= this._orbitFixedVectorScale;
      this._v0.applyQuaternion(this._quat);
      this._v1.add(this._jVectorPos);
      this._v1.y *= this._orbitFixedVectorScale;
      this._v1.applyQuaternion(this._quat);
      this._qVectorShaftMesh.matrix.compose(this._v0, this._q1, this._scaleOrbitFixedVectors);
      this._qVectorArrowheadMesh.matrix.compose(this._v1, this._q1, this._scaleOrbitFixedVectors);
      this._v1.multiplyScalar(1.1);
      this._qVectorLabelMesh.matrix.compose(this._v1, this._qn, this._scale);

      if (this._showWVectors){
        // out of plane vector of PQW frame
        this._q1.multiplyQuaternions(this._quat,this._zQuat);
        this._v0.copy(this._kVectorPos);
        this._v0.z *= this._fractionForShaft;
        this._v1.copy(this._v0);
        this._v0.z *= this._orbitFixedVectorScale;
        this._v0.applyQuaternion(this._quat);
        this._v1.add(this._kVectorPos);
        this._v1.z *= this._orbitFixedVectorScale;
        this._v1.applyQuaternion(this._quat);
        this._wVectorShaftMesh.matrix.compose(this._v0, this._q1, this._scaleOrbitFixedVectors);
        this._wVectorArrowheadMesh.matrix.compose(this._v1, this._q1, this._scaleOrbitFixedVectors);
        this._v1.multiplyScalar(1.1);
        this._wVectorLabelMesh.matrix.compose(this._v1, this._qn, this._scale);
      }
    }

    if (this._orbitEccentricity < 1){
      this._ellipticalCurveMesh.matrix.compose(this._curveCenter, this._quat, this._orbitCurveScale);
    }else{
      this._hyperbolicCurveMesh.matrix.compose(this._curveCenter, this._quat, this._orbitCurveScale);
    }

    if (this._showIJKFrame){
      this._q1.copy(this._xQuat);
      this._v0.copy(this._iVectorPos);
      this._v0.x *= this._fractionForShaft;
      this._v1.copy(this._v0);
      this._v1.add(this._iVectorPos);
      this._v0.x *= this._inertialVectorScale;
      this._v1.x *= this._inertialVectorScale;
      this._q1.multiply(this._flip180quat);
      this._iVectorShaftMesh.matrix.compose(this._v0, this._q1, this._scaleInertialVectors);
      this._iVectorArrowheadMesh.matrix.compose(this._v1, this._q1, this._scaleInertialVectors);
      this._v1.multiplyScalar(1.1);
      this._iVectorLabelMesh.matrix.compose(this._v1, this._qn, this._scale);

      this._q1.copy(this._yQuat);
      this._v0.copy(this._jVectorPos);
      this._v0.y *= this._fractionForShaft;
      this._v1.copy(this._v0);
      this._v1.add(this._jVectorPos);
      this._v0.y *= this._inertialVectorScale;
      this._v1.y *= this._inertialVectorScale;
      this._jVectorShaftMesh.matrix.compose(this._v0, this._q1, this._scaleInertialVectors);
      this._jVectorArrowheadMesh.matrix.compose(this._v1, this._q1, this._scaleInertialVectors);
      this._v1.multiplyScalar(1.1);
      this._jVectorLabelMesh.matrix.compose(this._v1, this._qn, this._scale);

      this._q1.copy(this._zQuat);
      this._v0.copy(this._kVectorPos);
      this._v0.z *= this._fractionForShaft;
      this._v1.copy(this._v0);
      this._v1.add(this._kVectorPos);
      this._v0.z *= this._inertialVectorScale;
      this._v1.z *= this._inertialVectorScale;
      this._kVectorShaftMesh.matrix.compose(this._v0, this._q1, this._scaleInertialVectors);
      this._kVectorArrowheadMesh.matrix.compose(this._v1, this._q1, this._scaleInertialVectors);
      this._v1.multiplyScalar(1.1);
      this._kVectorLabelMesh.matrix.compose(this._v1, this._qn, this._scale);
    }

    if (this._showR || this._showV || this._showUVWFrame){
      this._v0.copy(this._r);
      this._v0.normalize();

      if (this._displayOrbitsAsDifference){
        this._v2.copy(this._null);
      }else{
        this._v2.copy(this._v0);
        this._v2.multiplyScalar(this._rVectorScale.y);
      }
      //_v2 is the tip of the r vector, which is the base of 
      // the velocity vector and is required for that and
      // the UVW frame

      this._rQuat.setFromUnitVectors(this._yunit, this._v0);

      if (this._showR){
        this._q1.multiplyQuaternions(this._quat,this._rQuat);
        this._v1.copy(this._v0);
        this._v0.multiplyScalar(this._rVectorScale.y*0.5*this._fractionForShaft);
        //_v0 is the location of the center of the shaft portion of the vector
        this._v1.multiplyScalar(this._rVectorScale.y*0.5);
        this._v1.add(this._v0);
        //_v1 is the location of the center of the arrowhead portion of the vector
        this._v0.applyQuaternion(this._quat);
        this._v1.applyQuaternion(this._quat);

        this._rVectorShaftMesh.matrix.compose(this._v0, this._q1, this._rVectorScale);
        this._rVectorArrowheadMesh.matrix.compose(this._v1, this._q1, this._rVectorScale);
        this._v1.multiplyScalar(1.1);
        this._rVectorLabelMesh.matrix.compose(this._v1, this._qn, this._scale);
      }
    }

    if (this._orbitPertOrDelta){
      const zoom = this._isDelta ? this._zoom : 1;

      for (let i=0; i<this._orbitPertDots.length; i++){
        this._v1.x = zoom*this._orbitPertOrDelta[i].rx/this._orbitSemiMajorAxis;
        this._v1.y = zoom*this._orbitPertOrDelta[i].ry/this._orbitSemiMajorAxis;
        this._v1.z = zoom*this._orbitPertOrDelta[i].rz/this._orbitSemiMajorAxis;
        this._v1.applyQuaternion(this._quat);
        this._orbitPertDots[i].matrix.compose(this._v1, this._qn, this._unitScale);
      }
    }

    if (this._showV){
      this._v0.copy(this._v);
      this._v0.normalize();
      this._v1.copy(this._v0);
      this._vQuat.setFromUnitVectors(this._yunit, this._v0);
      this._q1.multiplyQuaternions(this._quat,this._vQuat);
      this._v0.multiplyScalar(this._vVectorScale.y*0.5*this._fractionForShaft);
      this._v1.multiplyScalar(this._vVectorScale.y*0.5);
      this._v1.add(this._v0);
      this._v0.add(this._v2);
      this._v1.add(this._v2);
      this._v0.applyQuaternion(this._quat);
      this._v1.applyQuaternion(this._quat);

      this._vVectorShaftMesh.matrix.compose(this._v0, this._q1, this._vVectorScale);
      this._vVectorArrowheadMesh.matrix.compose(this._v1, this._q1, this._vVectorScale);
      this._v1.multiplyScalar(1.1);
      this._vVectorLabelMesh.matrix.compose(this._v1, this._qn, this._scale);
    }

    if (this._showH){
      this._v0.copy(this._h);
      this._v0.normalize();
      this._hQuat.setFromUnitVectors(this._yunit, this._v0);
      this._q1.multiplyQuaternions(this._quat,this._hQuat);
      this._v0.multiplyScalar(0.5*this._fractionForShaft*this._orbitFixedVectorScale);
      this._v1.copy(this._v0);
      this._v0.applyQuaternion(this._quat);
      this._v1.multiplyScalar(2);
      this._v1.applyQuaternion(this._quat);
      this._hVectorShaftMesh.matrix.compose(this._v0, this._q1, this._scaleOrbitFixedVectors);
      this._hVectorArrowheadMesh.matrix.compose(this._v1, this._q1, this._scaleOrbitFixedVectors);
      this._v1.multiplyScalar(1.1);
      this._hVectorLabelMesh.matrix.compose(this._v1, this._qn, this._scale);
    }

    if (this._showE){
      this._v0.copy(this._e);
      this._v0.normalize();
      this._eQuat.setFromUnitVectors(this._yunit, this._v0);
      this._q1.multiplyQuaternions(this._quat,this._eQuat);
      this._v0.multiplyScalar(0.5*this._fractionForShaft*this._orbitFixedVectorScale);
      this._v1.copy(this._v0);
      this._v0.applyQuaternion(this._quat);
      this._v1.multiplyScalar(2);
      this._v1.applyQuaternion(this._quat);
      this._eVectorShaftMesh.matrix.compose(this._v0, this._q1, this._scaleOrbitFixedVectors);
      this._eVectorArrowheadMesh.matrix.compose(this._v1, this._q1, this._scaleOrbitFixedVectors);
      this._v1.multiplyScalar(1.1);
      this._eVectorLabelMesh.matrix.compose(this._v1, this._qn, this._scale);
    }

    if (this._showUVWFrame){
      this._q1.multiplyQuaternions(this._quat,this._rQuat);
      this._v0.copy(this._r);
      this._v0.normalize();
      this._v1.copy(this._v0);
      this._v0.multiplyScalar(this._scaleOrbitingBodyVectors.y*0.5*this._fractionForShaft);
      //_v0 is the location of the center of the shaft portion of the vector
      this._v1.multiplyScalar(this._scaleOrbitingBodyVectors.y*0.5);
      this._v1.add(this._v2);
      this._v1.add(this._v0);
      this._v0.add(this._v2);
      //_v1 is the location of the center of the arrowhead portion of the vector
      this._v0.applyQuaternion(this._quat);
      this._v1.applyQuaternion(this._quat);

      this._UVectorShaftMesh.matrix.compose(this._v0, this._q1, this._scaleOrbitingBodyVectors);
      this._UVectorArrowheadMesh.matrix.compose(this._v1, this._q1, this._scaleOrbitingBodyVectors);
      this._v1.multiplyScalar(1.1);
      this._UVectorLabelMesh.matrix.compose(this._v1, this._qn, this._scale);

      if (this._showWVectors){
        // out of plane vector of the UVW frame
        this._v0.copy(this._h);
        this._v0.normalize();
        this._hQuat.setFromUnitVectors(this._yunit, this._v0);
        this._q1.multiplyQuaternions(this._quat,this._hQuat);

        this._v1.copy(this._v0);
        this._v0.multiplyScalar(this._scaleOrbitingBodyVectors.y*0.5*this._fractionForShaft);
        this._v1.multiplyScalar(this._scaleOrbitingBodyVectors.y*0.5);
        this._v1.add(this._v2);
        this._v1.add(this._v0);
        this._v0.add(this._v2);
        this._v0.applyQuaternion(this._quat);
        this._v1.applyQuaternion(this._quat);

        this._WVectorShaftMesh.matrix.compose(this._v0, this._q1, this._scaleOrbitingBodyVectors);
        this._WVectorArrowheadMesh.matrix.compose(this._v1, this._q1, this._scaleOrbitingBodyVectors);
        this._v1.multiplyScalar(1.1);
        this._WVectorLabelMesh.matrix.compose(this._v1, this._qn, this._scale);
      }

      this._q1.multiplyQuaternions(this._rQuat,this._turn90Quat);
      this._q1.multiplyQuaternions(this._quat,this._q1);
      this._v0.copy(this._r);
      this._v0.normalize();
      this._v1.copy(this._h);
      this._v1.normalize();
      this._v3.crossVectors(this._v1,this._v0);
      this._v0.copy(this._v3);
      this._v1.copy(this._v3);
      this._v0.multiplyScalar(this._scaleOrbitingBodyVectors.y*0.5*this._fractionForShaft);
      this._v1.multiplyScalar(this._scaleOrbitingBodyVectors.y*0.5);
      this._v1.add(this._v2);
      this._v1.add(this._v0);
      this._v0.add(this._v2);
      this._v0.applyQuaternion(this._quat);
      this._v1.applyQuaternion(this._quat);

      this._VVectorShaftMesh.matrix.compose(this._v0, this._q1, this._scaleOrbitingBodyVectors);
      this._VVectorArrowheadMesh.matrix.compose(this._v1, this._q1, this._scaleOrbitingBodyVectors);
      this._v1.multiplyScalar(1.1);
      this._VVectorLabelMesh.matrix.compose(this._v1, this._qn, this._scale);
    }
  }

  setZoom(zoom){
    this._zoom = zoom;
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
      case 'inertialVectors':
        this._inertialVectorColor = theColor;

        this._iVectorShaftMesh.material.color.set(theColor);
        this._jVectorShaftMesh.material.color.set(theColor);
        this._kVectorShaftMesh.material.color.set(theColor);
        this._iVectorArrowheadMesh.material.color.set(theColor);
        this._jVectorArrowheadMesh.material.color.set(theColor);
        this._kVectorArrowheadMesh.material.color.set(theColor);
        this._iVectorLabelMesh.material[0].color.set(theColor);
        this._iVectorLabelMesh.material[1].color.set(theColor);
        this._jVectorLabelMesh.material[0].color.set(theColor);
        this._jVectorLabelMesh.material[1].color.set(theColor);
        this._kVectorLabelMesh.material[0].color.set(theColor);
        this._kVectorLabelMesh.material[1].color.set(theColor);
        break;

      case 'orbitFixedVectors':
        this._orbitFixedVectorColor = theColor;

        this._hVectorShaftMesh.material.color.set(theColor);
        this._hVectorArrowheadMesh.material.color.set(theColor);
        this._hVectorLabelMesh.material[0].color.set(theColor);
        this._hVectorLabelMesh.material[1].color.set(theColor);

        this._eVectorShaftMesh.material.color.set(theColor);
        this._eVectorArrowheadMesh.material.color.set(theColor);
        this._eVectorLabelMesh.material[0].color.set(theColor);
        this._eVectorLabelMesh.material[1].color.set(theColor);

        this._pVectorShaftMesh.material.color.set(theColor);
        this._qVectorShaftMesh.material.color.set(theColor);
        this._wVectorShaftMesh.material.color.set(theColor);
        this._pVectorArrowheadMesh.material.color.set(theColor);
        this._qVectorArrowheadMesh.material.color.set(theColor);
        this._wVectorArrowheadMesh.material.color.set(theColor);
        this._pVectorLabelMesh.material[0].color.set(theColor);
        this._pVectorLabelMesh.material[1].color.set(theColor);
        this._qVectorLabelMesh.material[0].color.set(theColor);
        this._qVectorLabelMesh.material[1].color.set(theColor);
        this._wVectorLabelMesh.material[0].color.set(theColor);
        this._wVectorLabelMesh.material[1].color.set(theColor);
        break;

      case 'uvwVectors':
        this._UVWVectorColor = theColor;

        this._UVectorShaftMesh.material.color.set(theColor);
        this._VVectorShaftMesh.material.color.set(theColor);
        this._WVectorShaftMesh.material.color.set(theColor);
        this._UVectorArrowheadMesh.material.color.set(theColor);
        this._VVectorArrowheadMesh.material.color.set(theColor);
        this._WVectorArrowheadMesh.material.color.set(theColor);
        this._UVectorLabelMesh.material[0].color.set(theColor);
        this._UVectorLabelMesh.material[1].color.set(theColor);
        this._VVectorLabelMesh.material[0].color.set(theColor);
        this._VVectorLabelMesh.material[1].color.set(theColor);
        this._WVectorLabelMesh.material[0].color.set(theColor);
        this._WVectorLabelMesh.material[1].color.set(theColor);
        break;

      case 'rVector':
        this._rVectorColor = theColor;

        this._rVectorShaftMesh.material.color.set(theColor);
        this._rVectorArrowheadMesh.material.color.set(theColor);
        this._rVectorLabelMesh.material[0].color.set(theColor);
        this._rVectorLabelMesh.material[1].color.set(theColor);
        break;

      case 'vVector':
        this._vVectorColor = theColor;

        this._vVectorShaftMesh.material.color.set(theColor);
        this._vVectorArrowheadMesh.material.color.set(theColor);
        this._vVectorLabelMesh.material[0].color.set(theColor);
        this._vVectorLabelMesh.material[1].color.set(theColor);
    }
  }

  setInertialVectorScale(value){
    this._inertialVectorScale = 1 + (value - 50)/100;
    this._scaleInertialVectors.y = this._inertialVectorScale;
  }

  setOrbitFixedVectorScale(value){
    this._orbitFixedVectorScale = 1 + (value - 50)/100;
    this._scaleOrbitFixedVectors.y = this._orbitFixedVectorScale;
  }
  
  setOrbitingBodyVectorScale(value){
    this._orbitingBodyVectorScale = 1 + (value - 50)/100;
    this._scaleOrbitingBodyVectors.y = this._orbitingBodyVectorScale;
    this.setV(this._v.x, this._v.y, this._v.z);
  }

  _constructOrbitCurves(){
    let curvePoint;
    let r;
    const sqrt2 = Math.SQRT2; 
    const cPlusA = Math.SQRT2 + 1;//distance from the origin to a focus
    // for a unit hyperbola

    for (let i=0; i<360; i+=2){
      curvePoint = new THREE.Vector3(Math.cos(i*piOver180),Math.sin(i*piOver180),0);
      this._circle.push(curvePoint);      
    }
  
    for (let i=-130; i<130; i+=2){
      // go from -130 degrees to 130 degrees, 135 is infinity for unit hyperbolas
      r = 1/(1 + sqrt2*Math.cos(i*piOver180));

      // e and c equal sqrt(2), a, b, and P equal 1 for a unit hyperbola
      curvePoint = new THREE.Vector3(r*Math.cos(i*piOver180)-cPlusA,r*Math.sin(i*piOver180),0);
      this._hyperbola.push(curvePoint);      
    }
  
    if (this._ellipticalCurveMesh == null && this._hyperbolicCurveMesh == null){
      const lineMaterial1 = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: this._orbitCurveOpacity}
      );
      let cp1 = new THREE.CurvePath();
  
      for (let i=1; i<this._circle.length; i++){
        cp1.add(new THREE.LineCurve3(this._circle[i-1],this._circle[i]));
      }
  
      let tubeGeometry1 = new THREE.TubeGeometry(
        cp1,
        512,// path segments
        0.002,// THICKNESS
        4, //Roundness of Tube
        true //closed curve
      );
  
      this._ellipticalCurveMesh = new THREE.Line(tubeGeometry1, lineMaterial1);
      this._ellipticalCurveMesh.matrixAutoUpdate = false;

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
        false //closed curve
      );
  
      this._hyperbolicCurveMesh = new THREE.Line(tubeGeometry2, lineMaterial2);
      this._hyperbolicCurveMesh.matrixAutoUpdate = false;
      this._scene.add(this._ellipticalCurveMesh);
      this._scene.add(this._hyperbolicCurveMesh);

      // construct THREE.js stuff for the perturbed orbit
      const rad = 0.01;
      const seg = 16;
      let geometry = new THREE.CircleGeometry(rad, seg);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        // color: this._inertialVectorColor,
        transparent: true,
        opacity: this._vectorOpacity});
      let circle;
      
      for (let i=0; i<181; i++){
        circle = new THREE.Mesh(geometry, material);
        circle.matrixAutoUpdate = false;
        this._scene.add(circle);
        this._orbitPertDots.push(circle);
      }
    }
  }

  setOrbitPertOrDelta(orbitPertOrDelta, isDelta){
    this._orbitPertOrDelta = orbitPertOrDelta;
    this._isDelta = isDelta;
  }

  resetPlanetRotationParameters(){
    this._numApoapsePasses = 0;
    this._previousTime = -1e10;
  }

  // use this function to rotate the planet when moving sliders
  rotatePlanet1(tSeconds, rotationPeriodSeconds){
    if (this._planetOpacity < 0.1){
      return;
    }

    this._planetQuat1.setFromAxisAngle(this._zunit,2*Math.PI*tSeconds/rotationPeriodSeconds);
    this._planetQuat.multiplyQuaternions(this._planetQuat1,this._planetQuat0);
    this._planetMeshArray[this._planetMeshArrayIndex].matrix.compose(this._origin, this._planetQuat, this._planetScale);
  }

  // use this function to rotate the planet during animations
  rotatePlanet2(tSeconds, rotationPeriodSeconds, orbitalPeriodSeconds){
    if (this._planetOpacity < 0.1){
      return;
    }
    
    if (tSeconds < this._previousTime){
      this._numApoapsePasses += 1;
    }

    this._previousTime = tSeconds;
    this._planetQuat1.setFromAxisAngle(this._zunit,
      2*Math.PI*(this._numApoapsePasses*orbitalPeriodSeconds/rotationPeriodSeconds + tSeconds/rotationPeriodSeconds));
    this._planetQuat.multiplyQuaternions(this._planetQuat1,this._planetQuat0);
    this._planetMeshArray[this._planetMeshArrayIndex].matrix.compose(this._origin, this._planetQuat, this._planetScale);
  }

  shapeOrbitCurve(a, e){
    this._orbitEccentricity = e;
    this._orbitSemiMajorAxis = a;
    
    // the scale and center of the curve are not affected by 'a'
    // since we scale the planet size and not the curve.

    this._orbitCurveScale.x = 1;
    this._orbitCurveScale.y = Math.sqrt(1 - e*e);
    this._curveCenter.set(-e,0,0);
    this._ellipticalCurveMesh.material.visible = true;
    this._hyperbolicCurveMesh.material.visible = false;
    this._curveCenter.applyQuaternion(this._quat);
    this._planetScale.set(1/a, 1/a, 1/a);

    if (this._planetOpacity >= 0.1){
      this._planetMeshArray[this._planetMeshArrayIndex].matrix.compose(this._origin, this._planetQuat, this._planetScale);
      this.resetPlanetRotationParameters();
    }

    this.needsRefresh = true;
  }

  setQuatFromDCMElements(r11, r12, r13, r21, r22, r23, r31, r32, r33){
    this._dcm.set(r11, r12, r13, r21, r22, r23, r31, r32, r33);
    this._dcm4x4.identity();
    this._dcm4x4.setFromMatrix3(this._dcm);
    this._quat.setFromRotationMatrix(this._dcm4x4);
    this.needsRefresh = true;
  }

  setR(x, y, z, a){
    this.needsRefresh = true;
    this._rVectorScale.setY(Math.sqrt(x*x + y*y + z*z)/Math.abs(a));
    this._r.set(x, y, z);
  }

  setV(x, y, z){
    this.needsRefresh = true;
    this._vVectorScale.setY(1.75*Math.sqrt(x*x + y*y + z*z)*this._orbitingBodyVectorScale);
    this._v.set(x, y, z);
  }

  _constructVectors(){
    const length = 1;
    const shaftRadius = 0.006*length;
    const fractionForShaft = this._fractionForShaft;

    const shaftGeometry = new THREE.CylinderGeometry(shaftRadius, 
      shaftRadius, length*fractionForShaft, 32, 1, true);
    const arrowheadGeometry = new THREE.ConeGeometry(3*shaftRadius, 
      length*(1-fractionForShaft), 32, 1, true);
    const mats = new Array(7).fill(null);

    // the last 2 colors are for the W vectors of PQW and UVW
    const colors = [this._inertialVectorColor, this._orbitFixedVectorColor,
      this._UVWVectorColor, this._rVectorColor, this._vVectorColor,
      this._orbitFixedVectorColor, this._UVWVectorColor];

    for (let i=0; i<mats.length; i++){
      mats[i] = new THREE.MeshBasicMaterial({
        color: colors[i],
        transparent: true,
        opacity: this._vectorOpacity,
      });

      mats[i].blending = THREE.CustomBlending;
      mats[i].blendSrc = THREE.SrcAlphaFactor;
      mats[i].blendDst = THREE.OneMinusSrcAlphaFactor;
      mats[i].blendEquation = THREE.AddEquation;
    }

    this._xQuat.set(0, 0, oneOverSqrt2, oneOverSqrt2);
    this._yQuat.set(0, 0, 0, 1);
    this._zQuat.set(oneOverSqrt2, 0, 0, oneOverSqrt2);

    // inertial vectors
    this._iVectorShaftMesh = new THREE.Mesh(shaftGeometry, mats[0]);
    this._iVectorShaftMesh.matrixAutoUpdate = false;
    this._iVectorArrowheadMesh = new THREE.Mesh(arrowheadGeometry, mats[0]);
    this._iVectorArrowheadMesh.matrixAutoUpdate = false;

    this._jVectorShaftMesh = new THREE.Mesh(shaftGeometry, mats[0]);
    this._jVectorShaftMesh.matrixAutoUpdate = false;
    this._jVectorArrowheadMesh = new THREE.Mesh(arrowheadGeometry, mats[0]);
    this._jVectorArrowheadMesh.matrixAutoUpdate = false;
    
    this._kVectorShaftMesh = new THREE.Mesh(shaftGeometry, mats[0]);
    this._kVectorShaftMesh.matrixAutoUpdate = false;
    this._kVectorArrowheadMesh = new THREE.Mesh(arrowheadGeometry, mats[0]);
    this._kVectorArrowheadMesh.matrixAutoUpdate = false;

    // orbit-fixed vectors
    // specific angular momentum
    this._hVectorShaftMesh = new THREE.Mesh(shaftGeometry, mats[1]);
    this._hVectorShaftMesh.matrixAutoUpdate = false;
    this._hVectorArrowheadMesh = new THREE.Mesh(arrowheadGeometry, mats[1]);
    this._hVectorArrowheadMesh.matrixAutoUpdate = false;

    // eccentricity vector
    this._eVectorShaftMesh = new THREE.Mesh(shaftGeometry, mats[1]);
    this._eVectorShaftMesh.matrixAutoUpdate = false;
    this._eVectorArrowheadMesh = new THREE.Mesh(arrowheadGeometry, mats[1]);
    this._eVectorArrowheadMesh.matrixAutoUpdate = false;

    // perifocal frame
    this._pVectorShaftMesh = new THREE.Mesh(shaftGeometry, mats[1]);
    this._pVectorShaftMesh.matrixAutoUpdate = false;
    this._pVectorArrowheadMesh = new THREE.Mesh(arrowheadGeometry, mats[1]);
    this._pVectorArrowheadMesh.matrixAutoUpdate = false;

    this._qVectorShaftMesh = new THREE.Mesh(shaftGeometry, mats[1]);
    this._qVectorShaftMesh.matrixAutoUpdate = false;
    this._qVectorArrowheadMesh = new THREE.Mesh(arrowheadGeometry, mats[1]);
    this._qVectorArrowheadMesh.matrixAutoUpdate = false;

    // requires a different material from P and Q if we want to allow
    // the W vector to be transparent
    this._wVectorShaftMesh = new THREE.Mesh(shaftGeometry, mats[5]);
    this._wVectorShaftMesh.matrixAutoUpdate = false;
    this._wVectorArrowheadMesh = new THREE.Mesh(arrowheadGeometry, mats[5]);
    this._wVectorArrowheadMesh.matrixAutoUpdate = false;

    // orbiting body vectors
    // radial vector to orbiting body
    this._rVectorShaftMesh = new THREE.Mesh(shaftGeometry, mats[3]);
    this._rVectorShaftMesh.matrixAutoUpdate = false;
    this._rVectorArrowheadMesh = new THREE.Mesh(arrowheadGeometry, mats[3]);
    this._rVectorArrowheadMesh.matrixAutoUpdate = false;

    // velocity vector of orbiting body
    this._vVectorShaftMesh = new THREE.Mesh(shaftGeometry, mats[4]);
    this._vVectorShaftMesh.matrixAutoUpdate = false;
    this._vVectorArrowheadMesh = new THREE.Mesh(arrowheadGeometry, mats[4]);
    this._vVectorArrowheadMesh.matrixAutoUpdate = false;

    // UVW frame
    this._UVectorShaftMesh = new THREE.Mesh(shaftGeometry, mats[2]);
    this._UVectorShaftMesh.matrixAutoUpdate = false;
    this._UVectorArrowheadMesh = new THREE.Mesh(arrowheadGeometry, mats[2]);
    this._UVectorArrowheadMesh.matrixAutoUpdate = false;

    this._VVectorShaftMesh = new THREE.Mesh(shaftGeometry, mats[2]);
    this._VVectorShaftMesh.matrixAutoUpdate = false;
    this._VVectorArrowheadMesh = new THREE.Mesh(arrowheadGeometry, mats[2]);
    this._VVectorArrowheadMesh.matrixAutoUpdate = false;
    
    // requires a different material from U and V if we want to allow
    // the W vector to be transparent
    this._WVectorShaftMesh = new THREE.Mesh(shaftGeometry, mats[6]);
    this._WVectorShaftMesh.matrixAutoUpdate = false;
    this._WVectorArrowheadMesh = new THREE.Mesh(arrowheadGeometry, mats[6]);
    this._WVectorArrowheadMesh.matrixAutoUpdate = false;
  }

  // required to prevent the rendering of the radius vector
  // for hyperbolic orbits when the true anomaly is such that
  // the vector points in the wrong direction
  setRVisible(visible){
    this._rVectorShaftMesh.material.visible = visible;
    this._rVectorArrowheadMesh.material.visible = visible;
    this._rVectorLabelMesh.material.visible = visible;
    this._rVectorLabelMesh.material[0].visible = visible;
    this._rVectorLabelMesh.material[1].visible = visible;
  }

  // similar comment to setRVisible
  setVVisible(visible){
    this._vVectorShaftMesh.material.visible = visible;
    this._vVectorArrowheadMesh.material.visible = visible;
    this._vVectorLabelMesh.material.visible = visible;
    this._vVectorLabelMesh.material[0].visible = visible;
    this._vVectorLabelMesh.material[1].visible = visible;
  }

  _constructVectorLabels() {
    // IMPORTANT: The FontLoader.load function generates a Javascript promise
    // which results in asynchronous code execution.  The variable
    // constructionComplete is initialized to false but is set to true once
    // the asynchronous code is complete.  Until then, do not allow 
    // most other things to execute.

    THREE.Cache.enabled = true;
    let font = undefined;
    // rotating frame, space frame, r, h, e
    let lettersArray = ['i', 'j', 'k', 'h', 'e', 'P', 'Q', 'W', 'r', 'v', 'U', 'V', 'W'];
    // fontName = helvetiker
    // fontWeight = normal bold
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
  
      let material1 = [
        new THREE.MeshBasicMaterial({color: this._inertialVectorColor, transparent: true, opacity: this._vectorOpacity}), // front
        new THREE.MeshBasicMaterial({color: this._inertialVectorColor, transparent: true, opacity: this._vectorOpacity}) // side
      ];

      let material2 = [
        new THREE.MeshBasicMaterial({color: this._orbitFixedVectorColor, transparent: true, opacity: this._vectorOpacity}), // front
        new THREE.MeshBasicMaterial({color: this._orbitFixedVectorColor, transparent: true, opacity: this._vectorOpacity}) // side
      ];

      let material3 = [
        new THREE.MeshBasicMaterial({color: this._UVWVectorColor, transparent: true, opacity: this._vectorOpacity}), // front
        new THREE.MeshBasicMaterial({color: this._UVWVectorColor, transparent: true, opacity: this._vectorOpacity}) // side
      ];

      let material4 = [
        new THREE.MeshBasicMaterial({color: this._rVectorColor, transparent: true, opacity: this._vectorOpacity}), // front
        new THREE.MeshBasicMaterial({color: this._rVectorColor, transparent: true, opacity: this._vectorOpacity}) // side
      ];

      let material5 = [
        new THREE.MeshBasicMaterial({color: this._vVectorColor, transparent: true, opacity: this._vectorOpacity}), // front
        new THREE.MeshBasicMaterial({color: this._vVectorColor, transparent: true, opacity: this._vectorOpacity}) // side
      ];

      // material4 and material5 are for the W vectors of PQW and UVW
      // which must be distinguished from the others to allow the
      // user to choose whether or not to display them
      let material6 = [
        new THREE.MeshBasicMaterial({color: this._orbitFixedVectorColor, transparent: true, opacity: this._vectorOpacity}), // front
        new THREE.MeshBasicMaterial({color: this._orbitFixedVectorColor, transparent: true, opacity: this._vectorOpacity}) // side
      ];

      let material7 = [
        new THREE.MeshBasicMaterial({color: this._UVWVectorColor, transparent: true, opacity: this._vectorOpacity}), // front
        new THREE.MeshBasicMaterial({color: this._UVWVectorColor, transparent: true, opacity: this._vectorOpacity}) // side
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
            this._iVectorLabelMesh = new THREE.Mesh(textGeo, material1);
            this._iVectorLabelMesh.matrixAutoUpdate = false;
            break;
          case 1:
            this._jVectorLabelMesh = new THREE.Mesh(textGeo, material1);
            this._jVectorLabelMesh.matrixAutoUpdate = false;
            break;
          case 2:
            this._kVectorLabelMesh  = new THREE.Mesh(textGeo, material1);
            this._kVectorLabelMesh.matrixAutoUpdate = false;
            break;
          case 3:
            this._hVectorLabelMesh = new THREE.Mesh(textGeo, material2);
            this._hVectorLabelMesh.matrixAutoUpdate = false;
            break;
          case 4:
            this._eVectorLabelMesh = new THREE.Mesh(textGeo, material2);
            this._eVectorLabelMesh.matrixAutoUpdate = false;
            break;
          case 5:
            this._pVectorLabelMesh = new THREE.Mesh(textGeo, material2);
            this._pVectorLabelMesh.matrixAutoUpdate = false;
            break;
          case 6:
            this._qVectorLabelMesh = new THREE.Mesh(textGeo, material2);
            this._qVectorLabelMesh.matrixAutoUpdate = false;
            break;
          case 7:
            this._wVectorLabelMesh = new THREE.Mesh(textGeo, material6);
            this._wVectorLabelMesh.matrixAutoUpdate = false;
            break;
          case 8:
            this._rVectorLabelMesh = new THREE.Mesh(textGeo, material4);
            this._rVectorLabelMesh.matrixAutoUpdate = false;
            break;
          case 9:
            this._vVectorLabelMesh = new THREE.Mesh(textGeo, material5);
            this._vVectorLabelMesh.matrixAutoUpdate = false;
            break;
          case 10:
            this._UVectorLabelMesh = new THREE.Mesh(textGeo, material3);
            this._UVectorLabelMesh.matrixAutoUpdate = false;
            break;
          case 11:
            this._VVectorLabelMesh = new THREE.Mesh(textGeo, material3);
            this._VVectorLabelMesh.matrixAutoUpdate = false;
            break;
          case 12:
            this._WVectorLabelMesh  = new THREE.Mesh(textGeo, material7);
            this._WVectorLabelMesh.matrixAutoUpdate = false;
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
      case 'ijkFrame':
        add = show && !(this._showIJKFrame);
        remove = !show && this._showIJKFrame;
        this._showIJKFrame = show;

        if (add){
          scene.add(this._iVectorShaftMesh);
          scene.add(this._iVectorArrowheadMesh);
          scene.add(this._jVectorShaftMesh);
          scene.add(this._jVectorArrowheadMesh);
          scene.add(this._kVectorShaftMesh);
          scene.add(this._kVectorArrowheadMesh);
          scene.add(this._iVectorLabelMesh);
          scene.add(this._jVectorLabelMesh);
          scene.add(this._kVectorLabelMesh);
        }

        if (remove){
          scene.remove(this._iVectorShaftMesh);
          scene.remove(this._iVectorArrowheadMesh);
          scene.remove(this._jVectorShaftMesh);
          scene.remove(this._jVectorArrowheadMesh);
          scene.remove(this._kVectorShaftMesh);
          scene.remove(this._kVectorArrowheadMesh);
          scene.remove(this._iVectorLabelMesh);
          scene.remove(this._jVectorLabelMesh);
          scene.remove(this._kVectorLabelMesh);
        }
        break;

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
          scene.add(this._pVectorLabelMesh);
          scene.add(this._qVectorLabelMesh);
          scene.add(this._wVectorLabelMesh);
        }

        if (remove){
          scene.remove(this._pVectorShaftMesh);
          scene.remove(this._pVectorArrowheadMesh);
          scene.remove(this._qVectorShaftMesh);
          scene.remove(this._qVectorArrowheadMesh);
          scene.remove(this._wVectorShaftMesh);
          scene.remove(this._wVectorArrowheadMesh);
          scene.remove(this._pVectorLabelMesh);
          scene.remove(this._qVectorLabelMesh);
          scene.remove(this._wVectorLabelMesh);
        }
        break;

      case 'uvwFrame':
        add = show && !(this._showUVWFrame);
        remove = !show && this._showUVWFrame;
        this._showUVWFrame = show;
  
        if (add){
          scene.add(this._UVectorShaftMesh);
          scene.add(this._UVectorArrowheadMesh);
          scene.add(this._VVectorShaftMesh);
          scene.add(this._VVectorArrowheadMesh);
          scene.add(this._WVectorShaftMesh);
          scene.add(this._WVectorArrowheadMesh);
          scene.add(this._UVectorLabelMesh);
          scene.add(this._VVectorLabelMesh);
          scene.add(this._WVectorLabelMesh);
        }
  
        if (remove){
          scene.remove(this._UVectorShaftMesh);
          scene.remove(this._UVectorArrowheadMesh);
          scene.remove(this._VVectorShaftMesh);
          scene.remove(this._VVectorArrowheadMesh);
          scene.remove(this._WVectorShaftMesh);
          scene.remove(this._WVectorArrowheadMesh);
          scene.remove(this._UVectorLabelMesh);
          scene.remove(this._VVectorLabelMesh);
          scene.remove(this._WVectorLabelMesh);
        }
        break;

      case 'r':
        add = show && !(this._showR);
        remove = !show && this._showR;
        this._showR = show;

        if (add){
          scene.add(this._rVectorShaftMesh);
          scene.add(this._rVectorArrowheadMesh);
          scene.add(this._rVectorLabelMesh);
        }

        if (remove){
          scene.remove(this._rVectorShaftMesh);
          scene.remove(this._rVectorArrowheadMesh);
          scene.remove(this._rVectorLabelMesh);
        }
        break;

      case 'v':
        add = show && !(this._showV);
        remove = !show && this._showV;
        this._showV = show;

        if (add){
          scene.add(this._vVectorShaftMesh);
          scene.add(this._vVectorArrowheadMesh);
          scene.add(this._vVectorLabelMesh);
        }

        if (remove){
          scene.remove(this._vVectorShaftMesh);
          scene.remove(this._vVectorArrowheadMesh);
          scene.remove(this._vVectorLabelMesh);
        }
        break;

      case 'h':
        add = show && !(this._showH);
        remove = !show && this._showH;
        this._showH = show;

        if (add){
          scene.add(this._hVectorShaftMesh);
          scene.add(this._hVectorArrowheadMesh);
          scene.add(this._hVectorLabelMesh);
        }

        if (remove){
          scene.remove(this._hVectorShaftMesh);
          scene.remove(this._hVectorArrowheadMesh);
          scene.remove(this._hVectorLabelMesh);
        }
        break;

      case 'e':
        add = show && !(this._showE);
        remove = !show && this._showE;
        this._showE = show;

        if (add){
          scene.add(this._eVectorShaftMesh);
          scene.add(this._eVectorArrowheadMesh);
          scene.add(this._eVectorLabelMesh);
        }

        if (remove){
          scene.remove(this._eVectorShaftMesh);
          scene.remove(this._eVectorArrowheadMesh);
          scene.remove(this._eVectorLabelMesh);
        }
        break;
    }
  }

  showIJKFrame(value) {
    this._addRemoveVectorsAndLabels('ijkFrame',value);
  }
  
  showPQWFrame(value) {
    this._addRemoveVectorsAndLabels('pqwFrame',value);
  }

  showUVWFrame(value) {
    this._addRemoveVectorsAndLabels('uvwFrame',value);
  }
  
  showWVectors(value){
    this._showWVectors = value;

    // PQW out of plane vector
    this._wVectorShaftMesh.material.opacity = value;
    this._wVectorArrowheadMesh.material.opacity = value;
    this._wVectorLabelMesh.material[0].opacity = value;
    this._wVectorLabelMesh.material[1].opacity = value;

    // UVW out of plane vector
    this._WVectorShaftMesh.material.opacity = value;
    this._WVectorArrowheadMesh.material.opacity = value;
    this._WVectorLabelMesh.material.opacity = value;
    this._WVectorLabelMesh.material[0].opacity = value;
    this._WVectorLabelMesh.material[1].opacity = value;

    // move stuff far away
    this._v3.set(1000,1000,1000);
    this._wVectorShaftMesh.matrix.compose(this._v3, this._nullQuat, this._unitScale);
    this._wVectorArrowheadMesh.matrix.compose(this._v3, this._nullQuat, this._unitScale);
    this._wVectorLabelMesh.matrix.compose(this._v3, this._nullQuat, this._unitScale);
    this._WVectorShaftMesh.matrix.compose(this._v3, this._nullQuat, this._unitScale);
    this._WVectorArrowheadMesh.matrix.compose(this._v3, this._nullQuat, this._unitScale);
    this._WVectorLabelMesh.matrix.compose(this._v3, this._nullQuat, this._unitScale);
  };

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

  setPlanet(i){
    this._planetMeshArray[this._planetMeshArrayIndex].matrix.compose(this._origin, this._planetQuat0, this._planetScale);
    this._scene.remove(this._planetMeshArray[this._planetMeshArrayIndex]);
    this._planetMeshArrayIndex = i;
    this._scene.add(this._planetMeshArray[i]);
  }

  _constructPlanets(){
    const geometry = new THREE.SphereGeometry(1, 32, 16);
    let texture;
    let material;
    // creates spherical geometry with radius 1, 32 horizontal segments and 16 vertical segments
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
    // sun twice, once for CDU = sun radius, once for CDU = 1 AU,
    // although for the second one the sun is actually too small to see,
    // we render it anyway
    this._planetMeshArray[1] = this._planetMeshArray[0];
    texture = new THREE.TextureLoader().load(mercury.pathname);
    material = new THREE.MeshPhongMaterial({map: texture});
    this._planetMeshArray[2] = new THREE.Mesh(geometry, material);
    texture = new THREE.TextureLoader().load(venus.pathname);
    material = new THREE.MeshPhongMaterial({map: texture});
    this._planetMeshArray[3] = new THREE.Mesh(geometry, material);
    texture = new THREE.TextureLoader().load(earth.pathname);
    material = new THREE.MeshPhongMaterial({map: texture});
    this._planetMeshArray[4] = new THREE.Mesh(geometry, material);
    texture = new THREE.TextureLoader().load(moon.pathname);
    material = new THREE.MeshPhongMaterial({map: texture});
    this._planetMeshArray[5] = new THREE.Mesh(geometry, material);
    texture = new THREE.TextureLoader().load(mars.pathname);
    material = new THREE.MeshPhongMaterial({map: texture});
    this._planetMeshArray[6] = new THREE.Mesh(geometry, material);
    texture = new THREE.TextureLoader().load(jupiter.pathname);
    material = new THREE.MeshPhongMaterial({map: texture});
    this._planetMeshArray[7] = new THREE.Mesh(geometry, material);
    texture = new THREE.TextureLoader().load(saturn.pathname);
    material = new THREE.MeshPhongMaterial({map: texture});
    this._planetMeshArray[8] = new THREE.Mesh(geometry, material);
    texture = new THREE.TextureLoader().load(uranus.pathname);
    material = new THREE.MeshPhongMaterial({map: texture});
    this._planetMeshArray[9] = new THREE.Mesh(geometry, material);
    texture = new THREE.TextureLoader().load(neptune.pathname);
    material = new THREE.MeshPhongMaterial({map: texture});
    this._planetMeshArray[10] = new THREE.Mesh(geometry, material);

    for (let i=0; i<this._planetMeshArray.length; i++){
      this._planetMeshArray[i].matrixAutoUpdate = false;
      this._planetMeshArray[i].material.opacity = this._planetOpacity;
      this._planetMeshArray[i].material.transparent = true;
      this._planetMeshArray[i].matrix.compose(this._origin, this._planetQuat0, this._planetScale);
    }
    
    this._planetMeshArrayIndex = 0;
    this._scene.add(this._planetMeshArray[this._planetMeshArrayIndex]);
    // https://www.solarsystemscope.com/textures/
    // nothing against Pluto, but the web site didn't have the texture!
  }

  setPlanetOpacity(opacity){  
    this.needsRefresh = true;
    this._planetOpacity = opacity;
    this._v3.set(1000,1000,1000);
  
    // do all of the planets even if they are not being used
    for (let i=0; i<this._planetMeshArray.length; i++){
      this._planetMeshArray[i].material.opacity = opacity;

      if (opacity <= 0.1){
        // move the planet far away so that it does not cover up the vectors
        // which it shouldn't anyway, but there may be a bug in the THREE.js code
        this._planetMeshArray[i].matrix.compose(this._v3, this._nullQuat, this._unitScale);
      }else{
        this._planetMeshArray[this._planetMeshArrayIndex].matrix.compose(this._origin, this._planetQuat, this._planetScale);
      }
    }
  }

  setOrbitCurveOpacity(opacity){
    this.needsRefresh = true;
    this._orbitCurveOpacity = opacity;// need to do this before creating the mesh
    this._ellipticalCurveMesh.material.opacity = opacity;
  }
}

export default OrbitalMechThings;
