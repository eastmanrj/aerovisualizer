import * as THREE from '../../../../node_modules/three/build/three.module.js';
import Torquer from './Torquer.js';

/**
 SixDOFObject is a class that encapsulates the computation of the 
 rotational dynamics of a brick-shaped THREE.js object representing
 a rigid body.  Although the term six DOF stands for 6 degrees of
 freedom, only the 3 rotational degrees of freedom are currently 
 handled.
**/

const piOver180 = Math.PI / 180;

// Vehicle Mass Properties (metric) - mass Ixx Iyy Izz Ixz
const vehicleMassProperties =
//Cessna 172
[[1043.3,1285.3,1824.9,2666.9,0],
//New Horizons Probe
[401,161.38,402.12,316,0]
];

class SixDOFObject {
  constructor(mass, length, width, height, scene, camera, blockImageOption, massPropOption) {
    this._h = 0.0025;// simulation time step. Based on an analysis, _h could
    // be set to as low as 0.0000372 for the Apple M1 chip with the number of 
    // ticks within a 60 fps screen refresh equal to about 448.  _maxTicksPerFrame
    // should be set to well below that.  set _h to well above its limit.
    // _h times _maxTicksPerFrame should be be greater than 0.016667
    this._maxTicksPerFrame = 10;
    this.simulationTime = 0;
    this.realTime = 0;
    this._torquer = new Torquer();
    this._torque = new THREE.Vector3(0, 0, 0);
    this._omega = new THREE.Vector3(0, 0, 0);
    this._omegadot = new THREE.Vector3(0, 0, 0);
    this._quat = new THREE.Quaternion();
    this._quatdot = new THREE.Vector4(0, 0, 0, 0);
    this._dcm = new THREE.Matrix4();
    // the reason that _dcm (direction cosine matrix) is a Matrix4 and
    // not a Matrix3 is because the THREE function makeRotationFromQuaternion
    // exists only for Matrix4. Convert it to a 3x3 matrix using the THREE 
    // function setFromMatrix4 if desired.
    this._torqueOption = 1;
    // 1 = no torque
    // 2 = space frame torque
    // 3 = body frame torque
    // 4 = acs stabilization
    // 5 = gravity gradient torque
    // 6 = torque on a top
    this._H = new THREE.Vector3(0, 0, 0);
    this._Hinertial = new THREE.Vector3(0, 0, 0);
    // _H is the angular momentum vector expressed in body coordinates.
    // _Hinertial is _H expressed in inertial (space) coordinates
    this._euler = new THREE.Euler();
    this._eulerOrder = 'ZYX';
    this._eulerOrderTriplet = {XYZ:[0,1,2],YXZ:[1,0,2],ZXY:[2,0,1],ZYX:[2,1,0],YZX:[1,2,0],XZY:[0,2,1]};
    // 0 = X, 1 = Y, 2 = Z
    // THREE.js uses intrinsic Tait-Bryan angles only, not proper Euler angles
    // nor extrinsic angles
    this._k1 = new THREE.Vector3();// used in runge kutta integration
    this._k2 = new THREE.Vector3();
    this._k3 = new THREE.Vector3();
    this._k4 = new THREE.Vector3();
    this._inertiaMatrix = new THREE.Matrix3();//the products of inertia are
    //currently kept set to zero for simplicity.  The off-diagonal elements of
    //this matrix should be zero.  The tickDynamic function does not require
    //this assumption but still computes omega using the products of inertia
    //in order to facilitate a future possible transition to using them.
    this._scale = new THREE.Vector3();
    this._unitScale = new THREE.Vector3(1,1,1);
    this._T = 0;//current rotational kinetic energy
    this._T0 = 0;//rotational kinetic energy that is established in the setOmega
    // function and which should remain constant during torque-free motion
    this.needsRefresh = true;
    this._showObject = true;
    this._blockMesh = null;
    this._origin = new THREE.Vector3(0,0,0);
    this._itemOrigin = new THREE.Vector3(0,0,0);
    this._offsetItemOrigin = false;
    this._axesOrientation = 'Y Up';
    this._flipQuat = new THREE.Quaternion();
    this._flipQuat.setFromAxisAngle(new THREE.Vector3(1,0,0),0);
    this._flip180quat = new THREE.Quaternion();
    this._flip180quat.setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI);
    this._turn90quat = new THREE.Quaternion(); 
    this._turn90quat.setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2);
    this._xUnitVector = new THREE.Vector3(1, 0, 0);
    this._yUnitVector = new THREE.Vector3(0, 1, 0);
    this._zUnitVector = new THREE.Vector3(0, 0, 1);
    //mat0, mat1, q0, q1, q2, q3, v0, v1, and v2 are temporary objects
    //that can be used as needed.  Avoid creating objects with "new"
    //as much as possible. Use the .copy method for THREE.js objects
    //to avoid creating new ones and causing memory issues
    this._mat0 = new THREE.Matrix3();
    this._mat1 = new THREE.Matrix3();
    this._q0 = new THREE.Quaternion();
    this._q1 = new THREE.Quaternion();
    this._q2 = new THREE.Quaternion();
    this._v0 = new THREE.Vector3();
    this._v1 = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._qn = new THREE.Quaternion();//used for vector labels to keep them
    //oriented toward the camera
    this._zeroVector = new THREE.Vector3();
    this._isAxisymmetric = false;
    this._axisOfSymmetry = 0;//1=x, 2=y, 3=z
    this._itemOpacity = 0;
    this.constructionComplete = false;
    //constructionComplete is an admittedly kludgy way of ensuring that the
    //code in here does not execute until asynchronous code from the Vectors 
    //class has completed execution
    this._camera = camera;
    this._scene = scene;

    if (massPropOption === 'select-an-object'){
      this.setDimensionsAndInertiaProperties(mass, length, width, height);;
    }else{
      this.setPresetMassProperties(massPropOption);
    }

    this.constructBlock(blockImageOption);
    this._determineIfAxisymmetric();
    this.reset();
  }

  sendVectorData(){
    return [this._omega, this._H, this._quat, this._torque];
  }

  sendPaCEphemeralData(){
    return [this._quat, this.simulationTime];
  }

  sendPaCNonEphemeralData(){
    return [this._h, this._omega, this._H, this._inertiaMatrix, 
      (this._torqueOption != 1), this._isAxisymmetric, this._axisOfSymmetry,
      this._origin, this._axesOrientation];
  }

  sendTorqueData(){
    return [this._torque.x,this._torque.y,this._torque.z,
    this._torqueOption,
    this._omega.x,this._omega.y,this._omega.z,
    this._quat._w,this._quat._x,this._quat._y,this._quat._z,
    this._dcm.elements[0],this._dcm.elements[1],this._dcm.elements[2],
    this._dcm.elements[4],this._dcm.elements[5],this._dcm.elements[6],
    this._dcm.elements[8],this._dcm.elements[9],this._dcm.elements[10],
    this._T]; 
  }

  receiveTorqueData(tx,ty,tz,omx,omy,omz){
    this._torque.x = tx;
    this._torque.y = ty;
    this._torque.z = tz;
    this._omega.x = omx;
    this._omega.y = omy;
    this._omega.z = omz;
  }

  reset(){
    this._dcm.makeRotationFromQuaternion(this._quat);
    this._H.copy(this._omega);
    this._H.applyMatrix3(this._inertiaMatrix);
    this._Hinertial.copy(this._H);
    this._Hinertial.applyQuaternion(this._quat);
    this._v0.copy(this._omega);
    this._v0.applyMatrix3(this._inertiaMatrix);
    this._T = 0.5*this._v0.dot(this._omega);
    this._torquer.receiveTorqueData(...this.sendTorqueData());
    this._torquer.refreshGG();
  }

  nullTorque(){
    this._torquer.nullTorque();
  }

  setTorque(torqueOption, torqueMagnitude, x, y, z){
    this._torquer.nullTorque();

    if (torqueOption === 2 || torqueOption === 3){ // body or space frame torque
      const xyz = new THREE.Vector3(x, y, z);
      xyz.normalize();
      xyz.multiplyScalar(torqueMagnitude);
      this._torque.copy(xyz);
      this._torquer.setConstantTorque(this._torque.x, this._torque.y, this._torque.z);
    }
    
    this._torqueOption = torqueOption;
    this.reset();
    this._torquer.doTorque();
    this.receiveTorqueData(...this._torquer.sendTorqueData());
    this.needsRefresh = true;
  }

  setPresetMassProperties(option){
    let i = 0;

    switch (option){
      case 'cessna-172':
        this._scale.set(9*0.5, 7*0.5, 4*0.5);
        i = 0;
        break;
      case 'new-horizons':
        this._scale.set(9*0.5, 4*0.5, 6*0.5);
        i = 1;
        break;
    }

    const [mass, ixx, iyy, izz, ixz] = vehicleMassProperties[i];
    this._mass = mass;
    this._inertiaMatrix.set(ixx, 0, -ixz, 0, iyy, 0, -ixz, 0, izz);
    // the moments of inertia are required for the gravity gradient option
    this._torquer.setMass(mass);// required for the spinning top torque (mg)
    this._torquer.setInertiaMatrix(ixx, iyy, izz, ixz);
    this._determineIfAxisymmetric();//it isn't now but call this to set variables
    this.needsRefresh = true;
  }

  /**
   The tick function advances the quaternion _quat through a small delta  
   time (_h) based on the rate of change of the quaternion,
   which is computed from _omega (p, q, and r).  This quaternion represents 
   the rotation of the object's body frame with respect to the inertial (space) 
   frame.  The tick function also computes _dcm, _H, and _Hinertial.  For 
   dynamic motion, tick is called by tickDynamic, whose main job is to 
   compute _omega.
   **/
  tick() {
    let h = this._h;
    let p = this._omega.x;
    let q = this._omega.y;
    let r = this._omega.z;
    let qwdot0 = this._quatdot.w;
    let qxdot0 = this._quatdot.x;
    let qydot0 = this._quatdot.y;
    let qzdot0 = this._quatdot.z;
    let qw = this._quat.w;
    let qx = this._quat.x;
    let qy = this._quat.y;
    let qz = this._quat.z;

    this._quatdot.w = (-p*qx - q*qy - r*qz)/2;
    this._quatdot.x =  (p*qw + r*qy - q*qz)/2;
    this._quatdot.y =  (q*qw - r*qx + p*qz)/2;
    this._quatdot.z =  (r*qw + q*qx - p*qy)/2;
    
    if (h !== 0){
      //trapezoidal integration
      qw += (qwdot0 + this._quatdot.w)*h/2;
      qx += (qxdot0 + this._quatdot.x)*h/2;
      qy += (qydot0 + this._quatdot.y)*h/2;
      qz += (qzdot0 + this._quatdot.z)*h/2;
      //set the quaternion and normalize it, make the dcm
      this._quat.set(qx, qy, qz, qw);
      this._quat.normalize();
      this._dcm.makeRotationFromQuaternion(this._quat);
    }

    //set the angular momentum using omega and the inertia matrix
    this._H.copy(this._omega);
    this._H.applyMatrix3(this._inertiaMatrix);
    this._Hinertial.copy(this._H);
    this._Hinertial.applyQuaternion(this._quat);
    this.needsRefresh = true;
  }

  /**
   The tickDynamic function is called each time through the
   integration loop.  It calls the _torquer.doTorque function to 
   torque the object (or not).  It then computes _omega using 4th 
   order Runge Kutta and then calls the tick function to advance the 
   quaternion representing the orientation.  It then computes the 
   rotational kinetic energy and makes a small adjustment to _omega 
   during torque-free motion to ensure that numerical errors do not 
   propagate and cause the angular momentum vector to drift.

   Although the products of inertia are included in the computation
   of _omega, this function has not been tested with non-zero products
   of inertia.
   **/
  tickDynamic(){
    let h = this._h;
    let pdot, qdot, rdot;
    const elements = this._inertiaMatrix.elements;
    const ixx = elements[0];
    const iyy = elements[4];
    const izz = elements[8];
    const ixy = -(elements[1]);
    const ixz = -(elements[2]);
    const iyz = -(elements[5]);
    let k1 = this._k1;
    let k2 = this._k2;
    let k3 = this._k3;
    let k4 = this._k4;

    this._torquer.receiveTorqueData(...this.sendTorqueData());
    this._torquer.doTorque();
    this.receiveTorqueData(...this._torquer.sendTorqueData());
    this._v0.copy(this._torque);

    //pass 1
    let p = this._omega.x;
    let q = this._omega.y;
    let r = this._omega.z;
    let pdot0 = this._omegadot.x;
    let qdot0 = this._omegadot.y;
    let rdot0 = this._omegadot.z;

    //no check is made if ixx, iyy, or izz is zero because this would
    //add an unnecessary burden on this function which is called each time
    //of the integration loop
    pdot = -((ixy*(qdot0 - p*r) + ixz*(rdot0 + p*q) + (izz - iyy)*q*r + iyz*(q*q - r*r) - this._v0.x))/ixx;
    qdot = -((iyz*(rdot0 - q*p) + ixy*(pdot0 + q*r) + (ixx - izz)*r*p + ixz*(r*r - p*p) - this._v0.y))/iyy;
    rdot = -((ixz*(pdot0 - r*q) + iyz*(qdot0 + r*p) + (iyy - ixx)*p*q + ixy*(p*p - q*q) - this._v0.z))/izz;
    k1.x = pdot*h;
    k1.y = qdot*h;
    k1.z = rdot*h;

    //pass 2
    p += k1.x/2;
    q += k1.y/2;
    r += k1.z/2;
    pdot0 = pdot;
    qdot0 = qdot;
    rdot0 = rdot;
    pdot = -((ixy*(qdot0 - p*r) + ixz*(rdot0 + p*q) + (izz - iyy)*q*r + iyz*(q*q - r*r) - this._v0.x))/ixx;
    qdot = -((iyz*(rdot0 - q*p) + ixy*(pdot0 + q*r) + (ixx - izz)*r*p + ixz*(r*r - p*p) - this._v0.y))/iyy;
    rdot = -((ixz*(pdot0 - r*q) + iyz*(qdot0 + r*p) + (iyy - ixx)*p*q + ixy*(p*p - q*q) - this._v0.z))/izz;
    k2.x = pdot*h;
    k2.y = qdot*h;
    k2.z = rdot*h;

    //pass 3
    p += k2.x/2;
    q += k2.y/2;
    r += k2.z/2;
    pdot0 = pdot;
    qdot0 = qdot;
    rdot0 = rdot;
    pdot = -((ixy*(qdot0 - p*r) + ixz*(rdot0 + p*q) + (izz - iyy)*q*r + iyz*(q*q - r*r) - this._v0.x))/ixx;
    qdot = -((iyz*(rdot0 - q*p) + ixy*(pdot0 + q*r) + (ixx - izz)*r*p + ixz*(r*r - p*p) - this._v0.y))/iyy;
    rdot = -((ixz*(pdot0 - r*q) + iyz*(qdot0 + r*p) + (iyy - ixx)*p*q + ixy*(p*p - q*q) - this._v0.z))/izz;
    k3.x = pdot*h;
    k3.y = qdot*h;
    k3.z = rdot*h;

    //pass 4
    p += k3.x;
    q += k3.y;
    r += k3.z;
    pdot0 = pdot;
    qdot0 = qdot;
    rdot0 = rdot;
    pdot = -((ixy*(qdot0 - p*r) + ixz*(rdot0 + p*q) + (izz - iyy)*q*r + iyz*(q*q - r*r) - this._v0.x))/ixx;
    qdot = -((iyz*(rdot0 - q*p) + ixy*(pdot0 + q*r) + (ixx - izz)*r*p + ixz*(r*r - p*p) - this._v0.y))/iyy;
    rdot = -((ixz*(pdot0 - r*q) + iyz*(qdot0 + r*p) + (iyy - ixx)*p*q + ixy*(p*p - q*q) - this._v0.z))/izz;
    k4.x = pdot*h;
    k4.y = qdot*h;
    k4.z = rdot*h;

    //save omegadot for the next integration step
    this._omegadot.x = pdot;
    this._omegadot.y = qdot;
    this._omegadot.z = rdot;

    //total
    this._omega.x += (k1.x + 2*k2.x + 2*k3.x + k4.x)/6;
    this._omega.y += (k1.y + 2*k2.y + 2*k3.y + k4.y)/6;
    this._omega.z += (k1.z + 2*k2.z + 2*k3.z + k4.z)/6;

    this.tick();

    // compute the rotational kinetic energy (_T)
    this._v0.copy(this._omega);
    this._v0.applyMatrix3(this._inertiaMatrix);
    this._T = 0.5*this._v0.dot(this._omega);

    // The code below helps to prevent the angular momentum (H) from
    // drifting during torque-free motion by multiplying _omega by the 
    // ratio of the original kinetic energy to the current kinetic energy.
    if (this._torqueOption === 1){
      if (this._T0 === 0){
        return;
      }

      let b = this._T/this._T0;

      if (this._axisOfSymmetry === 1){
        this._omega.y /= b;
        this._omega.z /= b;
      }else if (this._axisOfSymmetry === 2){
        this._omega.x /= b;
        this._omega.z /= b;
      }else if (this._axisOfSymmetry === 3){
        this._omega.x /= b;
        this._omega.y /= b;
      }else{
        this._omega.x /= b;
        this._omega.y /= b;
        this._omega.z /= b;
      }
    }
  }

  /**
   The simulate function is called each time through the rendering loop.
   The dt variable is the real amount of time that has passed between 
   screen refreshes for the 3D animation.  The simulation delta time _h
   is capable of being much smaller than dt.  A "safety counter" and 
   maxTicks are added to ensure that it does not enter into an infinite 
   loop for whatever reason.  The interesting stuff happens in the
   tickDynamic function.
  **/
  simulate(dt){
    let safetyCounter = 0;
    const maxTicks = this._maxTicksPerFrame;
    this.realTime += dt;
    
    while (this.simulationTime < this.realTime && safetyCounter < maxTicks){
      this.tickDynamic();
      this.simulationTime += this._h;
      safetyCounter++;
    }
  }

  /**
   The refresh function should be called whenever the orientation of the 
   block changes relative to the inertial frame or when the camera changes 
   its position or lookat point.  This function does not generate the block 
   object (see constructBlock).
  **/
  refresh(){
    if (!this.constructionComplete){
      return;
    }
    
    if (this.needsRefresh === false){
      return;
    }

    this.needsRefresh = false;
    this._qn.setFromRotationMatrix(this._camera.matrixWorld);
    this._q0.multiplyQuaternions(this._flipQuat,this._quat);
    this._blockMesh.matrix.compose(this._itemOrigin, this._q0, this._scale);
  }

  setDimensionsAndInertiaProperties(mass, length, width, height){
    this.needsRefresh = true;

    // allow one dimension to be zero but not two or more
    const p1 = length === 0;
    const p2 = width === 0;
    const p3 = height === 0;
    
    if ((p1 && p2) || (p1 && p3) || (p2 && p3)){
      return;
    }
    this._mass = mass;
    const ixx = (width*width + height*height)*mass/12;
    const iyy = (length*length + height*height)*mass/12;
    const izz = (length*length + width*width)*mass/12;
    this._inertiaMatrix.set(ixx, 0, 0, 0, iyy, 0, 0, 0, izz);
    this._torquer.setMass(mass);
    this._torquer.setInertiaMatrix(ixx, iyy, izz);
    this._determineIfAxisymmetric();
    // if a dimension is zero, display it as thin but not precisely zero
    const len = length === 0 ? 0.02 : length;
    const wid = width === 0 ? 0.02 : width;
    const ht = height === 0 ? 0.02 : height;
    this._scale.set(len*0.5, wid*0.5, ht*0.5);
  }

  /**
   The setOmega function sets _omega using the provided magnitude
   and components of a vector in the desired direction.  The
   components do not have to be normalized to 1.  Alternatively,
   this function can be used to set the angular momentum (H).
  **/
  setOmega(omegaOrH, omegaMagnitude, x, y, z){
    this.needsRefresh = true;
    const xyz = new THREE.Vector3(x, y, z);
    xyz.normalize();

    if (omegaOrH === 'H'){
      // the inverse of inertia matrix is computed here.  It is assumed that
      // the products of inertia are zero
      let Iinv = new THREE.Matrix3();
      Iinv.elements[0] = 1/(this._inertiaMatrix.elements[0]);
      Iinv.elements[4] = 1/(this._inertiaMatrix.elements[4]);
      Iinv.elements[8] = 1/(this._inertiaMatrix.elements[8]);
      xyz.applyMatrix3(Iinv);
      xyz.normalize();
    }

    xyz.multiplyScalar(omegaMagnitude);
    this._omega = xyz;
    this._H.copy(xyz);
    this._H.applyMatrix3(this._inertiaMatrix);
    this._v1.copy(this._omega);
    this._v1.applyMatrix3(this._inertiaMatrix);
    this._T0 = 0.5*this._v1.dot(this._omega);
    this._T1 = this._T0;
    this._determineIfAxisymmetric();

    this._dcm.makeRotationFromQuaternion(this._quat);
    this._Hinertial.copy(this._H);
    this._Hinertial.applyQuaternion(this._quat);
    this._torquer.receiveTorqueData(...this.sendTorqueData());
    this._torquer.refreshGG();
  }

  _determineIfAxisymmetric(){
    const ixx = this._inertiaMatrix.elements[0];
    const iyy = this._inertiaMatrix.elements[4];
    const izz = this._inertiaMatrix.elements[8];
    const xy = ixx === iyy;
    const yz = iyy === izz;
    const xz = ixx === izz;

    if ((xy && yz && xz) || !(xy || yz || xz)){
      this._isAxisymmetric = false;
      this._axisOfSymmetry = 0;//none
      return;
    }

    this._isAxisymmetric = true;

    if (yz){
      this._axisOfSymmetry = 1;//x
    }else if (xz){
      this._axisOfSymmetry = 2;//y
    }else{
      this._axisOfSymmetry = 3;//z
    }
  }

  setOpacity(thing, opacity){  
    if (thing === 'object'){
      this.needsRefresh = true;
      this._itemOpacity = opacity;
      this._blockMesh.material.opacity = opacity;
    }
  }

  constructBlock(blockImageOption) {
    if (this._blockMesh != null){
      this._scene.remove(this._blockMesh);
      this._blockMesh = null;
    }

    const vertices = [
      // Front 1 +Z
      { pos: [-1, -1, 1], norm: [0, 0, 1], uv: [0, 0] }, // 0
      { pos: [1, -1, 1], norm: [0, 0, 1], uv: [0.5, 0] }, // 1
      { pos: [-1, 1, 1], norm: [0, 0, 1], uv: [0, 0.3333333] }, // 2
      { pos: [1, 1, 1], norm: [0, 0, 1], uv: [0.5, 0.3333333] }, // 3
      // Back 6 -Z
      { pos: [1, -1, -1], norm: [0, 0, -1], uv: [0.5, 0.6666666] }, // 8
      { pos: [-1, -1, -1], norm: [0, 0, -1], uv: [0, 0.6666666] }, // 9
      { pos: [1, 1, -1], norm: [0, 0, -1], uv: [0.5, 0.3333333] }, // 10
      { pos: [-1, 1, -1], norm: [0, 0, -1], uv: [0, 0.3333333] }, // 11
      // Left 5 -X
      { pos: [-1, -1, -1], norm: [-1, 0, 0], uv: [0.5, 1] }, // 12
      { pos: [-1, -1, 1], norm: [-1, 0, 0], uv: [0.5, 0.6666666] }, // 13
      { pos: [-1, 1, -1], norm: [-1, 0, 0], uv: [0, 1] }, // 14
      { pos: [-1, 1, 1], norm: [-1, 0, 0], uv: [0, 0.6666666] }, // 15
      // Right 2 +X
      { pos: [1, -1, 1], norm: [1, 0, 0], uv: [0.5, 0] }, // 4
      { pos: [1, -1, -1], norm: [1, 0, 0], uv: [0.5, 0.3333333] }, // 5
      { pos: [1, 1, 1], norm: [1, 0, 0], uv: [1, 0] }, // 6
      { pos: [1, 1, -1], norm: [1, 0, 0], uv: [1, 0.3333333] }, // 7
      // Top 3 +Y
      { pos: [1, 1, -1], norm: [0, 1, 0], uv: [0.5, 0.3333333] }, // 16
      { pos: [-1, 1, -1], norm: [0, 1, 0], uv: [1, 0.3333333] }, // 17
      { pos: [1, 1, 1], norm: [0, 1, 0], uv: [0.5, 0.6666666] }, // 18
      { pos: [-1, 1, 1], norm: [0, 1, 0], uv: [1, 0.6666666] }, // 19
      // Bottom 4 -Y
      { pos: [1, -1, 1], norm: [0, -1, 0], uv: [1, 0.6666666] }, // 20
      { pos: [-1, -1, 1], norm: [0, -1, 0], uv: [0.5, 0.6666666] }, // 21
      { pos: [1, -1, -1], norm: [0, -1, 0], uv: [1, 1] }, // 22
      { pos: [-1, -1, -1], norm: [0, -1, 0], uv: [0.5, 1] }, // 23
    ];
    const numVertices = vertices.length;
    const positionNumComponents = 3;
    const normalNumComponents = 3;
    const uvNumComponents = 2;
    const positions = new Float32Array(numVertices * positionNumComponents);
    const normals = new Float32Array(numVertices * normalNumComponents);
    const uvs = new Float32Array(numVertices * uvNumComponents);
    let posNdx = 0;
    let nrmNdx = 0;
    let uvNdx = 0;

    for (const vertex of vertices) {
      positions.set(vertex.pos, posNdx);
      normals.set(vertex.norm, nrmNdx);
      uvs.set(vertex.uv, uvNdx);
      posNdx += positionNumComponents;
      nrmNdx += normalNumComponents;
      uvNdx += uvNumComponents;
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, positionNumComponents)
    );

    geometry.setAttribute(
      'normal',
      new THREE.BufferAttribute(normals, normalNumComponents)
    );

    geometry.setAttribute(
      'uv',
      new THREE.BufferAttribute(uvs, uvNumComponents)
    );

    geometry.setIndex([
      0,1,2,2,1,3, // front
      4,5,6,6,5,7, // right
      8,9,10,10,9,11, // back
      12,13,14,14,13,15, // left
      16,17,18,18,17,19, // top
      20,21,22,22,21,23, // bottom
    ]);

    const tl = new THREE.TextureLoader();

    let texture;

    switch (blockImageOption){
      case 'axis-labels':
        let blockFaces = new URL('../../static/img/blockFaces.jpg', import.meta.url);
        // texture = tl.load('./img/blockFaces.jpg');
        texture = tl.load(blockFaces.pathname);
        break;
      case 'cessna-172':
        // cessna 172 images purchased from hum2d.com and the
        // bottom view was not offered
        let cessna172 = new URL('../../static/img/cessna172.jpg', import.meta.url);
        // texture = tl.load('./img/cessna172.jpg');
        texture = tl.load(cessna172.pathname);
        break;
      case 'new-horizons':
        // free images for the New Horizons spacecraft were obtained from
        // https://www.planetary.org/space-images/simulated-new-horizons-spacecraft
        let newHorizons = new URL('../../static/img/newHorizons.jpg', import.meta.url);
        // texture = tl.load('./img/newHorizons.jpg');
        texture = tl.load(newHorizons.pathname);
        break;
    }

    const material = new THREE.MeshPhongMaterial({
      map: texture,
      specular: 0xffffff,
      shininess: 250,
      side: THREE.FrontSide,
      transparent: true,
      opacity: this._itemOpacity,
    });
    
    this._blockMesh = new THREE.Mesh(geometry, material);
    this._blockMesh.castShadow = false;
    this._blockMesh.matrixAutoUpdate = false;

    if (this._showObject){
      this._scene.add(this._blockMesh);
    }

    this.needsRefresh = true;
  }

  setPos(x, y, z) {
    this._itemOrigin.set(x, y, z);
    this._blockMesh.position.set(x, y, z);
  }

  _setQuaternionFromEulerAngles(){
    this._quat.setFromEuler(this._euler);
    this._torquer.receiveTorqueData(...this.sendTorqueData());
    this._torquer.refreshGG();
  }

  setEulerAngles(angle1, angle2, angle3){
    // angles are entered in degrees.
    // Set them to between -180 and 180 for angles 1 and 3
    this.needsRefresh = true;
    angle1 = angle1 > 180 ? angle1 - 180 : angle1;
    angle3 = angle3 > 180 ? angle3 - 180 : angle3;
    const eo = this._eulerOrderTriplet[this._eulerOrder];
    const angles = [piOver180*angle1, piOver180*angle2, piOver180*angle3];
    this._euler.set(angles[eo[0]],angles[eo[1]],angles[eo[2]], this._eulerOrder);
    this._setQuaternionFromEulerAngles();
  }

  setEulerOrder(order){
    this._eulerOrder = order;
    this._setQuaternionFromEulerAngles();//probably not necessary
  }

  setEulerAnglesFromQuaternion(qw, qx, qy, qz){
    this.needsRefresh = true;
    this._q0.set(qx, qy, qz, qw);
    this._q0.normalize();
    this._euler.setFromQuaternion(this._q0, this._eulerOrder);
    this._quat.copy(this._q0);
  }

  getAngularMomentumMagnitude(){
    return this._H.length();
  }

  set mass(value) {
    this._mass = value;
  }

  get omega() {
    return this._omega;
  }

  set omega(value) {
    this._omega = value;
  }

  get blockMesh() {
    return this._blockMesh;
  }

  setACSDeadzoneOmega(value){
    this._torquer.setACSDeadzoneOmega(value);
  }

  setACSTorque(value){
    this._torquer.setACSTorque(value);
  }

  set3MuOverR3(value){
    this._torquer.set3MuOverR3(value);
  }

  setTopRDistance(value){
    this._torquer.setTopRDistance(value);
  }

  setTopGravity(value){
    this._torquer.setTopGravity(value);
  }

  getEulerAngles(){
    this._euler.setFromQuaternion(this._quat, this._eulerOrder);
    const eo = this._eulerOrderTriplet[this._eulerOrder];
    const angles = [(this._euler.x)/piOver180, (this._euler.y)/piOver180, (this._euler.z)/piOver180];

    return [angles[eo[0]],angles[eo[1]],angles[eo[2]]];
  }

  getQuaternionElements(){
    return [this._quat.w, this._quat.x, this._quat.y, this._quat.z];
  }

  syncDCMtoQuat(){
    this._dcm.makeRotationFromQuaternion(this._quat);
  }

  getOmegaMagnitude(){
    return this._omega.length()/piOver180;
  }

  getOmega(){
    const om = [(this._omega.x)/piOver180, (this._omega.y)/piOver180, (this._omega.z)/piOver180];
    return [om[0], om[1], om[2]];
  }

  getMomentsOfInertia(){
    const elements = this._inertiaMatrix.elements;
    const ixx = elements[0];
    const iyy = elements[4];
    const izz = elements[8];

    return [ixx, iyy, izz];
  }

  getKineticEnergy(){
    return this._T;
  }

  showObject(show){
    if (this._showObject === show){
      return;
    }

    this.needsRefresh = true;
    this._showObject = show;

    if (show){
      this._scene.add(this._blockMesh);
    }else{
      this._scene.remove(this._blockMesh);
    }
  }

  setOffset(itemOffset){
    this._offsetItemOrigin = itemOffset;
  }

  setOrientation(xyz){
    this._axesOrientation = xyz;
    this._torquer.setAxesOrientation(xyz);
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

    this._itemOrigin.copy(this._offsetItemOrigin ? this._origin : this._zeroVector);
  }

  setOrigin(thing, offsetTheOrigin){
    this.needsRefresh = true;

    if (thing === 'object'){
      this._offsetItemOrigin = offsetTheOrigin;
      this._itemOrigin.copy(this._offsetItemOrigin ? this._origin : this._zeroVector);
    }
  }
}

export default SixDOFObject;
