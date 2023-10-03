import * as THREE from '../../../../node_modules/three/build/three.module.js';
import SpecialEllipsoidGeometry from './SpecialEllipsoidGeometry.js';

/**
 PoinsotAndCones is a class that encapsulates the computation of 
 THREE.js objects representing the body cones, space cones, and Poinsot's 
 construction, including the inertia ellipsoid, the invariable plane, the 
 polhode, and the herpolhode for use with the SixDOFObject class.
**/

const twoPi = 2 * Math.PI;
const oneOverSqrt2 = Math.sqrt(0.5);
const poinsotScale = 10;

class PoinsotAndCones {
  constructor(scene) {
    this._quat = new THREE.Quaternion();
    this.simulationTime = 0;
    this._h = 0.0025;
    //_h is changed in the receiveNonEphemeralData function
    this._omega = new THREE.Vector3(0, 0, 0);
    this._H = new THREE.Vector3(0, 0, 0);
    this._inertiaMatrix = new THREE.Matrix3();
    this._torqueIsOn = false;
    this._spaceConeDisplacement = 0;
    this._bodyConeDisplacement = 0;
    this._origin = new THREE.Vector3(0,0,0);
    this._conesOrigin = new THREE.Vector3(0,0,0);
    this._poinsotOrigin = new THREE.Vector3(0,0,0);
    this._offsetConesOrigin = false;
    this._offsetPoinsotOrigin = false;
    this._flipQuat = new THREE.Quaternion();
    this._flipQuat.setFromAxisAngle(new THREE.Vector3(1,0,0),0);
    this._flip180quat = new THREE.Quaternion();
    this._flip180quat.setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI);
    this._turn90quat = new THREE.Quaternion(); 
    this._turn90quat.setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2);
    this._poinsotScale = new THREE.Vector3(poinsotScale,poinsotScale,poinsotScale);
    this._unitScale = new THREE.Vector3(1,1,1);
    this._sqrt2TOverH = 0;
    this.needsRefresh = true;
    this._coneSize = 5;
    // _coneSize can be changed with setConeSize
    this._xUnitVector = new THREE.Vector3(1, 0, 0);
    this._yUnitVector = new THREE.Vector3(0, 1, 0);
    this._zUnitVector = new THREE.Vector3(0, 0, 1);
    this._zeroVector = new THREE.Vector3(0, 0, 0);
    this._q0 = new THREE.Quaternion();
    this._q1 = new THREE.Quaternion();
    this._q2 = new THREE.Quaternion();
    this._v0 = new THREE.Vector3();
    this._v1 = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._bodyFrameXQuat = new THREE.Quaternion();
    this._bodyFrameYQuat = new THREE.Quaternion();
    this._bodyFrameZQuat = new THREE.Quaternion();
    this._bodyFrameXQuat.set(0, 0, oneOverSqrt2, oneOverSqrt2);
    this._bodyFrameYQuat.set(0, 0, 0, 1);
    this._bodyFrameZQuat.set(oneOverSqrt2, 0, 0, oneOverSqrt2);
    this._hQuat = new THREE.Quaternion();
    this._invariablePlaneDisplacement = 0;
    this._showCones = false;
    this._showPoinsot = false;
    this._spaceConeMesh = null;
    this._bodyConeMesh = null;
    this._isAxisymmetric = false;
    this._axisOfSymmetry = 0;//1=x, 2=y, 3=z
    this._bodyHalfConeAngle = 0;
    this._spaceHalfConeAngle = 0;
    this._conesOpacity = 0;
    this._poinsotOpacity = 0;
    this._hodeCreationElapsedTime = 0;//set to zero when changing mass props or rate
    this._oldHodeTime = 0;
    //computation periods are the amount of time given to compute the polhode and
    //herpolhode curves in seconds.  Their values are arbitrary.  For 
    //axisymmetric cases, their values are set to the precession period.
    //The polhode is a closed curve, but it is possible for it to be rendered as
    //an open curve.  Also, if the rotation rate is high, it may be over drawn,
    //and small computational errors can give the impression that it is not a
    //single closed curve.
    this._polhodeComputationPeriod = 25;
    this._herpolhodeComputationPeriod = 25;
    this._hodeUpdateCounter = 0;
    this._hodeSkip = 10;
    //_hodeSkip and _hodeUpdateCounter work together to help control the number
    //of points that are used to generate the polehode and herpolhode curves.  
    //Without them, a much larger amount of memory and computation would be needed.

    //NOTE: If the rotation rate is high, the polhode and herpolhode curves
    //      can be rendered not smoothe, when in fact they should be smoothe.  A
    //      solution might be to set _hodeSkip more smartly in the future.  Until 
    //      then, either be aware of this, or reduce the rotation rate.
    this._polhode = [];
    this._herpolhode = [];
    this._polhodeMesh = null;
    this._herpolhodeMesh = null;
    this._bodyConeColor = 0xffa500;//0xffd580;//light orange
    this._spaceConeColor = 0xff0000;//0xff5555;//light red
    this._ellipsoidColor = 0x0000ff;//0x5555ff;//light blue
    this._planeColor = 0x00ff00;//0x55ff55;//light green
    this._inertiaEllipsoidMesh = null;
    this._invariablePlaneMesh = null;
    this._scene = scene;
    //constructionComplete is an admittedly kludgy way of ensuring that some
    //code in this class does not execute until asynchronous code from other classes
    //(such as Vectors) has completed execution.
    this.constructionComplete = false;

    this.construct();
  }

  receiveEphemeralData(quat, simulationTime){
    this._quat = quat;
    this.simulationTime = simulationTime;
  }

  receiveNonEphemeralData(h, om, H, im, torqueOn, isAxisym, aos, origin, orient){
    this._h = h;
    this._omega = om;
    this._H = H;
    this._inertiaMatrix = im;
    this._torqueIsOn = torqueOn;
    this._isAxisymmetric = isAxisym;
    this._axisOfSymmetry = aos;
    this._origin = origin;
    this.setOrientation(orient);
  }

  /**
   refresh is called whenever the orientation of cones or Poinsot objects
   change relative to the inertial frame or when the camera changes its 
   position or lookat point.  This function does not generate the cones and 
   Poinsot objects (see _constructCones and _constructEllipsoidAndPlane).
  **/

  refresh(){
    if (!this.constructionComplete){
      return;
    }

    if (this.needsRefresh === false){
      return;
    }

    this.needsRefresh = false;

    if (!(this._torqueIsOn)){
      this._q0.multiplyQuaternions(this._flipQuat,this._quat);
      this._v0.copy(this._H);

      if (this._v0.lengthSq() === 0){
        this._v0.set(1,1,1);
      }
  
      this._v0.normalize();
      this._hQuat.setFromUnitVectors(this._yUnitVector, this._v0);
      this._q1.multiplyQuaternions(this._q0,this._hQuat);

      if (this._showCones){
        if (this._spaceConeMesh != null){
          this._q2.multiplyQuaternions(this._q1,this._flip180quat);
          this._v0.copy(this._H);
          this._v0.normalize();
          this._v0.multiplyScalar(this._spaceConeDisplacement);
          this._v0.applyQuaternion(this._q0);
          this._v0.add(this._conesOrigin);
          this._spaceConeMesh.matrix.compose(this._v0, this._q2, this._unitScale);
        }

        if (this._bodyConeMesh != null && this._axisOfSymmetry !== 0){
          if (this._axisOfSymmetry === 1){
            this._q1.multiplyQuaternions(this._q0,this._bodyFrameXQuat);
            this._q2.copy(this._q1);
            this._v0.set(1, 0, 0)
          }else if (this._axisOfSymmetry === 2){
            this._q1.multiplyQuaternions(this._q0,this._bodyFrameYQuat);
            this._q2.multiplyQuaternions(this._q1,this._flip180quat);
            this._v0.set(0, 1, 0)
          }else if (this._axisOfSymmetry === 3){
            this._q1.multiplyQuaternions(this._q0,this._bodyFrameZQuat);
            this._q2.multiplyQuaternions(this._q1,this._flip180quat);
            this._v0.set(0, 0, 1)
          }

          this._v0.multiplyScalar(this._bodyConeDisplacement);
          this._v0.applyQuaternion(this._q0);
          this._v0.add(this._conesOrigin);
          this._bodyConeMesh.matrix.compose(this._v0, this._q2, this._unitScale);
        }
      }

      if (this._showPoinsot){
        if (this._inertiaEllipsoidMesh != null){
          this._inertiaEllipsoidMesh.matrix.compose(this._poinsotOrigin, this._q0, this._poinsotScale);
        }
    
        if (this._polhodeMesh != null){
          this._polhodeMesh.matrix.compose(this._poinsotOrigin, this._q0, this._unitScale);
        }

        this._q1.multiplyQuaternions(this._q0,this._hQuat);
        this._v0.copy(this._H);
        this._v0.applyQuaternion(this._q0);
        this._v0.normalize();
        this._q2.multiplyQuaternions(this._q1,this._turn90quat);
        this._v0.multiplyScalar(this._invariablePlaneDisplacement);
        this._v0.add(this._poinsotOrigin);

        if (this._invariablePlaneMesh != null){
          this._invariablePlaneMesh.matrix.compose(this._v0, this._q2, this._poinsotScale);
        }

        if (this._herpolhodeMesh != null){
          this._q2.set(0, 0, 0, 1);
          this._herpolhodeMesh.matrix.compose(this._poinsotOrigin, this._q2, this._unitScale);
        }
      }
    }
  }

  construct(){
    this.needsRefresh = true;
    this._constructEllipsoidAndPlane();
    this._v1.copy(this._omega);
    this._v1.applyMatrix3(this._inertiaMatrix);
    const T0 = 0.5*this._v1.dot(this._omega);
    const hMag = this._H.length();
    this._sqrt2TOverH = Math.sqrt(2*T0)/hMag;
    this._invariablePlaneDisplacement = poinsotScale*this._sqrt2TOverH;
    this._constructCones();
    this.initializePolhodeAndHerpolhode();
  }

  showCones(show){
    if (this._showCones === show){
      return;
    }

    this._showCones = show;
    this.needsRefresh = true;

    if (this._bodyConeMesh == null || this._spaceConeMesh == null){
      return;
    }

    if (show){
      this._scene.add(this._bodyConeMesh);
      this._scene.add(this._spaceConeMesh);
      this._bodyConeMesh.visible = true;
      this._spaceConeMesh.visible = true;
    }else{
      this._scene.remove(this._bodyConeMesh);
      this._scene.remove(this._spaceConeMesh);
      this._bodyConeMesh.visible = false;
      this._spaceConeMesh.visible = false;
    }
  }

  showPoinsot(show){
    if (this._showPoinsot === show){
      return;
    }

    this._showPoinsot = show;

    if (this._inertiaEllipsoidMesh == null || this._invariablePlaneMesh == null){
      return;
    }

    this.needsRefresh = true;
    const scene = this._scene;
    this._hodeCreationElapsedTime = 0;

    if (show){
      scene.add(this._inertiaEllipsoidMesh);
      scene.add(this._invariablePlaneMesh);
      this._inertiaEllipsoidMesh.visible = true;
      this._invariablePlaneMesh.visible = true;
    }else{
      scene.remove(this._inertiaEllipsoidMesh);
      scene.remove(this._invariablePlaneMesh);
      this._inertiaEllipsoidMesh.visible = false;
      this._invariablePlaneMesh.visible = false;
      this.initializePolhodeAndHerpolhode();
    }
  }

  setOpacity(thing, opacity){  
    this.needsRefresh = true;
    
    switch (thing){
      case 'cones':
        this._conesOpacity = opacity;

        if (this._bodyConeMesh != null && this._spaceConeMesh != null){
          this._bodyConeMesh.material.opacity = opacity;
          this._spaceConeMesh.material.opacity = opacity;
        }
        break;
      case 'poinsot':
        this._poinsotOpacity = opacity;

        if (this._inertiaEllipsoidMesh != null){
          this._inertiaEllipsoidMesh.material.opacity = opacity;
          this._invariablePlaneMesh.material.opacity = opacity;
        }
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
        theColor = 0xffa500;//0xffd580;//light orange
        break;
    }

    return theColor;
  }

  setColor(thing, color){
    this.needsRefresh = true;
    const theColor = this._colorForName(color);
    
    switch (thing){
      case 'bodyCone':
        this._bodyConeColor = theColor;
          
        if (this._bodyConeMesh != null){
          this._bodyConeMesh.material.color.set(theColor);
        }
        break;
      case 'spaceCone':
        this._spaceConeColor = theColor;
          
        if (this._spaceConeMesh != null){
          this._spaceConeMesh.material.color.set(theColor);
        }
        break;
      case 'ellipsoid':
        this._ellipsoidColor = theColor;
          
        if (this._inertiaEllipsoidMesh != null){
          this._inertiaEllipsoidMesh.material.color.set(theColor);
        }
        break;
      case 'plane':
        this._planeColor = theColor;
          
        if (this._invariablePlaneMesh != null){
          this._invariablePlaneMesh.material.color.set(theColor);
        }
        break;
    }
  }

  setOffsets(conesOffset, poinsotOffset){
    this._offsetConesOrigin = conesOffset;
    this._offsetPoinsotOrigin = poinsotOffset;
  }

  setOrientation(xyz){
    const x = 6.5;
    const y = 6.5;
    const z = 6.5;

    switch (xyz){
      case 'X Up':
        this._flipQuat.setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI/2);
        this._origin.set(x, -y, -z);
        break;
      case 'Y Up':
        this._flipQuat.setFromAxisAngle(new THREE.Vector3(1,0,0),0);
        this._origin.set(-x, -y, -z);
        break;
      case 'Z Up':
        this._flipQuat.setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
        this._origin.set(-x, -y, z);
        break;
      case 'X Down':
        this._flipQuat.setFromAxisAngle(new THREE.Vector3(0,0,1),-Math.PI/2);
        this._origin.set(-x, y, -z);
        break;
      case 'Y Down':
        this._flipQuat.setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI);
        this._origin.set(-x, y, z);
        break;
      case 'Z Down':
        this._flipQuat.setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2);
        this._origin.set(-x, y, -z);
        break;
    }

    this._conesOrigin.copy(this._offsetConesOrigin ? this._origin : this._zeroVector);
    this._poinsotOrigin.copy(this._offsetPoinsotOrigin ? this._origin : this._zeroVector);
  }

  setOrigin(thing, offsetTheOrigin){
    this.needsRefresh = true;

    switch (thing){
      case 'cones':
        this._offsetConesOrigin = offsetTheOrigin;
        this._conesOrigin.copy(this._offsetConesOrigin ? this._origin : this._zeroVector)
        break;
      case 'poinsot':
        this._offsetPoinsotOrigin = offsetTheOrigin;
        this._poinsotOrigin.copy(this._offsetPoinsotOrigin ? this._origin : this._zeroVector);
        this.initializePolhodeAndHerpolhode();
        break;
    }
  }

  _constructCones(){
    if (!(this._isAxisymmetric)){
      if (this._bodyConeMesh != null){
        this._bodyConeMesh.visible = false;
      }
  
      if (this._spaceConeMesh != null){
        this._spaceConeMesh.visible = false;
      }

      this._bodyHalfConeAngle = 0;
      this._spaceHalfConeAngle = 0
      return;
    }

    const notRotating = this._omega.lengthSq() === 0;

    if (notRotating){
      if (this._bodyConeMesh != null){
        if (this._showCones){
          this._scene.remove(this._bodyConeMesh);
        }

        this._bodyConeMesh = null;
      }
  
      if (this._spaceConeMesh != null){
        // using != null instead of !== null catches "undefined" as well
        if (this._showCones){
          this._scene.remove(this._spaceConeMesh);
        }

        this._spaceConeMesh = null;
      }

      return;
    }

    this._v0.copy(this._omega);
    this._v0.normalize();
    this._v1.copy(this._H);
    this._v1.normalize();
    
    if (this._axisOfSymmetry === 1){
      this._v2.set(1,0,0);
    }else if (this._axisOfSymmetry === 2){
      this._v2.set(0,1,0);
    }else if (this._axisOfSymmetry === 3){
      this._v2.set(0,0,1);
    }else{
      this._v2.set(0,0,0);
    }
    
    const dot1 = this._v2.dot(this._v0);
    const dot2 = this._v0.dot(this._v1);
    const theta1 = Math.acos(dot1);
    const theta2 = Math.acos(dot2);

    const otherReasons = ((theta1 === this._bodyHalfConeAngle && 
      theta2 === this._spaceHalfConeAngle) || 
      dot1 === 0 || dot1 === 1 || dot2 === 0 || dot2 === 1);
    
    if (otherReasons){
      return;
    }

    this._bodyHalfConeAngle = theta1;
    this._spaceHalfConeAngle = theta2;
    this.needsRefresh = true;

    if (this._bodyConeMesh != null){
      if (this._showCones){
        this._scene.remove(this._bodyConeMesh);
      }

      this._bodyConeMesh = null;
    }

    if (this._spaceConeMesh != null){
      // using != null instead of !== null catches "undefined" as well
      if (this._showCones){
        this._scene.remove(this._spaceConeMesh);
      }

      this._spaceConeMesh = null;
    }

    const bodyConeBaseRadius = this._coneSize*Math.sin(theta1);
    const spaceConeBaseRadius = this._coneSize*Math.sin(theta2);
    this._bodyConeDisplacement = (dot1*this._coneSize)/2;
    this._spaceConeDisplacement = (dot2*this._coneSize)/2;

    const bodyConeMaterial = new THREE.MeshPhongMaterial({
      color: this._bodyConeColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: this._conesOpacity
    });

    bodyConeMaterial.blending = THREE.CustomBlending;
    bodyConeMaterial.blendSrc = THREE.SrcAlphaFactor;
    bodyConeMaterial.blendDst = THREE.OneMinusSrcAlphaFactor;
    bodyConeMaterial.blendEquation = THREE.AddEquation;

    const bodyConeGeometry = new THREE.ConeGeometry(bodyConeBaseRadius, dot1*this._coneSize,32,1,true);
    this._bodyConeMesh = new THREE.Mesh(bodyConeGeometry, bodyConeMaterial);
    this._bodyConeMesh.matrixAutoUpdate = false;
 
    if (this._showCones && this._bodyConeMesh != null){
      this._scene.add(this._bodyConeMesh);
      this._bodyConeMesh.visible = true;
    }

    const spaceConeMaterial = new THREE.MeshPhongMaterial({
      color: this._spaceConeColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: this._conesOpacity
    });

    spaceConeMaterial.blending = THREE.CustomBlending;
    spaceConeMaterial.blendSrc = THREE.SrcAlphaFactor;
    spaceConeMaterial.blendDst = THREE.OneMinusSrcAlphaFactor;
    spaceConeMaterial.blendEquation = THREE.AddEquation;

    const spaceConeGeometry = new THREE.ConeGeometry(spaceConeBaseRadius, dot2*this._coneSize,32,1,true);
    this._spaceConeMesh = new THREE.Mesh(spaceConeGeometry, spaceConeMaterial);
    this._spaceConeMesh.matrixAutoUpdate = false;

    if (this._showCones && this._spaceConeMesh != null){
      this._scene.add(this._spaceConeMesh);
      this._spaceConeMesh.visible = true;
    }
  }

  setConeSize(coneSize){
    this._coneSize = Number(coneSize);
    this._constructCones();
    this.refresh();
  }
  
  _constructEllipsoidAndPlane(){
    const notRotating = this._omega.lengthSq() === 0;

    if (notRotating){
      return;
    }

    if (this._inertiaEllipsoidMesh != null && this._invariablePlaneMesh != null){
      this._scene.remove(this._inertiaEllipsoidMesh);
      this._scene.remove(this._invariablePlaneMesh);
      this._inertiaEllipsoidMesh = null;
      this._invariablePlaneMesh = null;
      this.initializePolhodeAndHerpolhode();
    }

    if (!(this._showPoinsot)){
      return;
    }

    const ixx = this._inertiaMatrix.elements[0];
    const iyy = this._inertiaMatrix.elements[4];
    const izz = this._inertiaMatrix.elements[8];
    const a = Math.sqrt(1/ixx);
    const b = Math.sqrt(1/iyy);
    const c = Math.sqrt(1/izz);

    const inertiaEllipsoidGeometry = new SpecialEllipsoidGeometry(a, b, c);
    const inertiaEllipsoidMaterial = new THREE.MeshLambertMaterial({
      color: this._ellipsoidColor,
      transparent: true,
      opacity: this._poinsotOpacity
    });

    inertiaEllipsoidMaterial.blending = THREE.CustomBlending;
    inertiaEllipsoidMaterial.blendSrc = THREE.SrcAlphaFactor;
    inertiaEllipsoidMaterial.blendDst = THREE.OneMinusSrcAlphaFactor;
    inertiaEllipsoidMaterial.blendEquation = THREE.AddEquation;

    this._inertiaEllipsoidMesh = new THREE.Mesh(inertiaEllipsoidGeometry, inertiaEllipsoidMaterial);
    this._inertiaEllipsoidMesh.matrixAutoUpdate = false;
    this._inertiaEllipsoidMesh.position.set(0, 0, 0);
    this._inertiaEllipsoidMesh.matrix.compose(this._poinsotOrigin, this._quat, this._poinsotScale);

    const invariablePlaneGeometry = new THREE.CircleGeometry(1, 64);
    const invariablePlaneMaterial = new THREE.MeshBasicMaterial({
      color: this._planeColor,
      transparent: true,
      opacity: this._poinsotOpacity,
      side: THREE.DoubleSide
    });

    invariablePlaneMaterial.blending = THREE.CustomBlending;
    invariablePlaneMaterial.blendSrc = THREE.SrcAlphaFactor;
    invariablePlaneMaterial.blendDst = THREE.OneMinusSrcAlphaFactor;
    invariablePlaneMaterial.blendEquation = THREE.AddEquation;

    this._invariablePlaneMesh = new THREE.Mesh(invariablePlaneGeometry, invariablePlaneMaterial);
    this._invariablePlaneMesh.matrixAutoUpdate = false;
    this._invariablePlaneMesh.position.set(0, 0, 0);
    this._invariablePlaneMesh.matrix.compose(this._poinsotOrigin, this._quat, this._poinsotScale);

    if (this._showPoinsot){
      this._scene.add(this._inertiaEllipsoidMesh);
      this._scene.add(this._invariablePlaneMesh);
    }

    this.initializePolhodeAndHerpolhode();
  }

  initializePolhodeAndHerpolhode(){
    if (this._isAxisymmetric === true){
      const hMag = this._H.length();
      let phidot = 0;
      let psidot = 0;

      if (this._axisOfSymmetry === 1){
        psidot = hMag/this._inertiaMatrix.elements[4];
        phidot = psidot*Math.abs(this._inertiaMatrix.elements[0]-this._inertiaMatrix.elements[4])/this._inertiaMatrix.elements[0];
      }else if (this._axisOfSymmetry === 2){
        psidot = hMag/this._inertiaMatrix.elements[8];
        phidot = psidot*Math.abs(this._inertiaMatrix.elements[4]-this._inertiaMatrix.elements[8])/this._inertiaMatrix.elements[4];
      }else if (this._axisOfSymmetry === 3){
        psidot = hMag/this._inertiaMatrix.elements[0];
        phidot = psidot*Math.abs(this._inertiaMatrix.elements[8]-this._inertiaMatrix.elements[0])/this._inertiaMatrix.elements[8];
      }

      this._herpolhodeComputationPeriod = twoPi / psidot;
      this._polhodeComputationPeriod = twoPi / phidot + this._herpolhodeComputationPeriod;
      this._hodeSkip = Math.floor(this._polhodeComputationPeriod / this._h / 500);
    }else{
      this._polhodeComputationPeriod = 25;//better to create default value constant
      this._herpolhodeComputationPeriod = 25;
      this._hodeSkip = Math.floor(this._polhodeComputationPeriod / this._h / 500);
    }

    if (this._polhodeMesh != null){
      this._scene.remove(this._polhodeMesh);
      this._polhodeMesh = null;
    }

    if (this._herpolhodeMesh != null){
      this._scene.remove(this._herpolhodeMesh);
      this._herpolhodeMesh = null;
    }
    
    this._polhode.length = 0;
    this._herpolhode.length = 0;
    this._hodeUpdateCounter = 0;
    this._hodeCreationElapsedTime = this._h;
    this._oldHodeTime = this.simulationTime;
    this.refresh();
  }

  doPolhodeHerpolhodeComputations(){
    if (!(this._showPoinsot) || this._torqueIsOn){
      return;
    }

    if (this._hodeCreationElapsedTime === 0){
      this.initializePolhodeAndHerpolhode();
      return;
    }

    let shorterPeriod = this._polhodeComputationPeriod < this._herpolhodeComputationPeriod ? this._polhodeComputationPeriod : this._herpolhodeComputationPeriod;
    let longerPeriod = this._polhodeComputationPeriod >= this._herpolhodeComputationPeriod ? this._polhodeComputationPeriod : this._herpolhodeComputationPeriod;

    if (this._hodeCreationElapsedTime < longerPeriod){
      if (this._hodeUpdateCounter % this._hodeSkip === 0){
        let om = new THREE.Vector3();
        om.copy(this._omega);
        om.normalize();
        let h = new THREE.Vector3();
        h.copy(this._H);
        h.normalize();
        let dot = h.dot(om);

        if (dot !== 0){
          om.multiplyScalar(this._sqrt2TOverH/dot);
          om.multiplyScalar(10);
        }

        let om2 = new THREE.Vector3();
        om2.copy(om);
        this._q0.multiplyQuaternions(this._flipQuat,this._quat);
        om.applyQuaternion(this._q0);
      
        if (this._polhode.length < 200){
          // this safety check of the polhode array length was
          // added because the length was once made to be very large
          // for reasons that are not yet understood and whose conditions
          // have not been duplicated
          if (this._hodeCreationElapsedTime <= shorterPeriod){
            this._polhode.push(om2);
            this._herpolhode.push(om);
          }else{
            if (shorterPeriod === this._polhodeComputationPeriod){
              this._herpolhode.push(om);
            }else{
              this._polhode.push(om2);
            }
          }
        }
      }

      this._hodeUpdateCounter += 1;
      this._hodeCreationElapsedTime += this.simulationTime - this._oldHodeTime;
      this._oldHodeTime = this.simulationTime;
    }else{
      // construct the polhode and herpolhode
      if (this._herpolhodeMesh == null){
        const lineMaterial = new THREE.LineBasicMaterial({color: 0xffffff});
        let cp1 = new THREE.CurvePath();
        let cp2 = new THREE.CurvePath();

        for (let i=1; i<this._polhode.length; i++){
          cp1.add(new THREE.LineCurve3(this._polhode[i-1],this._polhode[i]));
        }

        for (let i=1; i<this._herpolhode.length; i++){
          cp2.add(new THREE.LineCurve3(this._herpolhode[i-1],this._herpolhode[i]));
        }
    
        let tubeGeometry1 = new THREE.TubeGeometry(
          cp1,
          512,// path segments
          0.02,// THICKNESS
          4, //Roundness of Tube
          false //closed
        );
    
        let tubeGeometry2 = new THREE.TubeGeometry(
          cp2,
          512,// path segments
          0.02,// THICKNESS
          4, //Roundness of Tube
          false //closed
        );
    
        this._polhodeMesh = new THREE.Line(tubeGeometry1, lineMaterial);
        this._herpolhodeMesh = new THREE.Line(tubeGeometry2, lineMaterial);
        this._polhodeMesh.matrixAutoUpdate = false;
        this._herpolhodeMesh.matrixAutoUpdate = false;
        this._scene.add(this._polhodeMesh);
        this._scene.add(this._herpolhodeMesh);
      }
    }
  }
}

export default PoinsotAndCones;
