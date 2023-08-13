import * as THREE from '../../node_modules/three/build/three.module.js';

const piOver180 = Math.PI / 180;

class Torquer {
  constructor() {
    this._omega = new THREE.Vector3(0, 0, 0);
    this._quat = new THREE.Quaternion();
    this._dcm = new THREE.Matrix4();
    // the reason that _dcm (direction cosine matrix) is a Matrix4 and
    // not a Matrix3 is because the THREE function makeRotationFromQuaternion
    // exists only for Matrix4. We are sometimes forced to convert that to a
    // 3x3 matrix using the THREE function setFromMatrix4.
    this._h = 0.0025;
    this._torque = new THREE.Vector3(0, 0, 0);
    this._torqueOption = 1;
    // 1 = no torque
    // 2 = space frame torque
    // 3 = body frame torque
    // 4 = acs stabilization
    // 5 = gravity gradient torque
    // 6 = torque on a top
    //_constantTorque is set by the user either through the setConstantTorque or
    //the setTorque function.  It is required for torque options 2 and 3 which
    //both maintain the torque at a specified value in the frame of choice
    this._constantTorque = new THREE.Vector3(0, 0, 0);
    this._axesOrientation = 'Y Up';
    this._mass = 1;
    this._inertiaMatrix = new THREE.Matrix3();
    this._T = 0;
    this._3muOverR3 = 1;
    this._totalGGEnergy0 = 0;
    this._ggCorrection = 1;
    this._topRDistance = 1;
    this._topGravity = 1;

    this._nullVector = new THREE.Vector3(0, 0, 0);
    this._xUnitVector = new THREE.Vector3(1, 0, 0);
    this._yUnitVector = new THREE.Vector3(0, 1, 0);
    this._zUnitVector = new THREE.Vector3(0, 0, 1);
    this._q0 = new THREE.Quaternion();
    this._v0 = new THREE.Vector3();
    this._v1 = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._mat0 = new THREE.Matrix3();
    this._mat1 = new THREE.Matrix3();
    this._acsDeadzoneOmega = 0;
    this._acsTorque = 0;
  }

  sendTorqueData(){
    return [this._torque, this._torqueOption, this._omega, this._quat, this._dcm, this._h, this._T];
  }

  receiveTorqueData(torque, torqueOption, omega, quat, dcm, h, T){
    this._torque = torque;
    this._torqueOption = torqueOption;
    this._omega = omega;
    this._quat = quat;
    this._dcm = dcm;
    this._h = h;
    this._T = T;
  }

  reset(){
    this._dcm.makeRotationFromQuaternion(this._quat);
    this._v0.copy(this._omega);
    this._v0.applyMatrix3(this._inertiaMatrix);
    this._T = 0.5*this._v0.dot(this._omega);
    this._totalGGEnergy0 = this._T + this.computeGravityGradientPotential();
    this._ggCorrection = 1;
  }

  setTorqueOption(value){
    this._torqueOption = value;
  }

  setConstantTorque(tauX, tauY, tauZ){
    this._constantTorque.set(tauX, tauY, tauZ);
  }

  setAxesOrientation(xyz){
    this._axesOrientation = xyz;
  }

  setInertiaMatrix(ixx, iyy, izz, ixz = 0){
    this._inertiaMatrix.set(ixx, 0, -ixz, 0, iyy, 0, -ixz, 0, izz);
    this.reset();
  }

  setMass(value){
    this._mass = Number(value);
  }

  set3MuOverR3(value){
    this._3muOverR3 = Number(value);
    this.reset();
  }

  setTopRDistance(value){
    this._topRDistance = Number(value);
  }

  setTopGravity(value){
    this._topGravity = Number(value);
  }

  setTorque(torqueOption, torqueMagnitude, x, y, z){
    if (torqueOption === 2 || torqueOption === 3){ // body or space frame torque
      const xyz = new THREE.Vector3(x, y, z);
      xyz.normalize();
      xyz.multiplyScalar(torqueMagnitude);
      this._torque.copy(xyz);
      this._constantTorque.copy(this._torque);
    }
    
    this._torqueOption = torqueOption;
    this.doTorque();
  }

  nullTorque(){
    this._torque.copy(this._nullVector);
  }

  doTorque(){
    switch (this._torqueOption){
      case 1:
        // 1 = no torque
        this._torque.copy(this._nullVector);
        break;
      case 2:
        // 2 = space frame torque
        // _constantTorque is expressed in the space frame when using this option
        // so we need to rotate it into the body frame
        this._torque.copy(this._constantTorque);
        this._q0.copy(this._quat);
        this._q0.invert(); // _quat is body to space so need to invert it
        this._torque.applyQuaternion(this._q0);
        break;
      case 3:
        // 3 = body frame torque
        this._torque.copy(this._constantTorque);
        break;
      case 4:
        // 4 = acs stabilization
        // an ACS (attitude control system) is imagined to exist on
        // the object.  The ACS consists of thrusters that impart
        // a force couple about each of the body axes.  If the
        // magnitude of the component of omega in one direction (P, Q,
        // or R) is larger than the "dead zone" value, then a torque is
        // applied to reduce the magnitude of that component.  The final
        // orientation is of no concern.  A real controller would have
        // to compute omega based on Euler angle rates or quaternion rates,
        // or it might not compute omega at all.  It would also employ a
        // much more sophisticated algorithm that could steer the vehicle
        // to a desired attitude
        const acsdz = this._acsDeadzoneOmega;
        const torqueMag = this._acsTorque;
        this._torque.x = 0;
        this._torque.y = 0;
        this._torque.z = 0;

        if (this._omega.x > acsdz){
          this._torque.x = -torqueMag;
        }else if (this._omega.x < -acsdz){
          this._torque.x = torqueMag;
        }

        if (this._omega.y > acsdz){
          this._torque.y = -torqueMag;
        }else if (this._omega.y < -acsdz){
          this._torque.y = torqueMag;
        }

        if (this._omega.z > acsdz){
          this._torque.z = -torqueMag;
        }else if (this._omega.z < -acsdz){
          this._torque.z = torqueMag;
        }
        break;
      case 5:
        //https://www.planetary.org/space-images/simulated-new-horizons-spacecraft
        // if using the new horizons art, give credit to the people on this link above
        // 5 = gravity gradient torque

        // the gravity gradient torque equals
        // (3mu/R^3)e1 cross Ig dot e1, where e1 is a unit vector from
        // the planet to the cm of the object, Ig is the inertia dyadic
        // of the object, mu is the gravity constant, and R is the distance
        // to the center of the planet ("Spacecraft Dynamics", T. Kane et al,
        // 1983 McGraw Hill, p. 235).  The dot product of a dyadic with a
        // vector is another vector.
        
        // *** This program does NOT model orbital motion!  It is assumed   ***
        // *** that the object remains at the same static position above    ***
        // *** the planet by whatever means.  Centrifugal acceleration and  ***
        // *** change in the inertial direction of gravity are not modeled. ***

        // mu (GM) for earth is 3.986004418E+14 m^3/s^2 according to Wikipedia.
        // R for a body in low earth orbit is about 6500000 meters.
        // mu / R^3 then equals about 1.451422E-06.  This program sets the
        // variable _3muOverR3 equal to whatever the user wants.  The purpose
        // of this program is to give the user an intuitive feel for rotating
        // rigid bodies and the torques on them, so we set this value much larger
        // in order to see the gravity gradient effect.

        // The planet is assumed to be in the "down" direction for whatever
        // inertial axis orientation the user chooses.  e1 is a unit vector.
        // If Z points down, then e1 points in the -Z direction, for example.  
        // Products of inertia are zero for this program which simplifies the
        // gravity gradient torque to be this:

        // gravity gradient torque = [e1.y * e1.z * (izz - iyy)
        //                            e1.z * e1.x * (ixx - izz)             
        //                            e1.x * e1.y * (iyy - ixx)]

        // We want e in body coordinates, so we just use the direction
        // cosine matrix elements.
        let e1x, e1y, e1z;

        switch (this._axesOrientation){
          case 'X Up':
          case 'X Down':
            e1x = this._dcm.elements[0];
            e1y = this._dcm.elements[4];
            e1z = this._dcm.elements[8];
            break;
          case 'Y Up':
          case 'Y Down':
            e1x = this._dcm.elements[1];
            e1y = this._dcm.elements[5];
            e1z = this._dcm.elements[9];
            break;
          case 'Z Up':
          case 'Z Down':
            e1x = this._dcm.elements[2];
            e1y = this._dcm.elements[6];
            e1z = this._dcm.elements[10];
            break;
        }

        const elements = this._inertiaMatrix.elements;
        // _intertiaMatrix is a 4x4 matrix for reasons explained elsewhere
        const ixx = elements[0];
        const iyy = elements[4];
        const izz = elements[8];

        // torque due to gravity gradient
        this._torque.x = this._3muOverR3*e1y*e1z*(izz - iyy);
        this._torque.y = this._3muOverR3*e1z*e1x*(ixx - izz);
        this._torque.z = this._3muOverR3*e1x*e1y*(iyy - ixx);

        // adjust the angular velocity such that the total energy remains
        // constant.  This reduces the possiblility that energy can increase
        // or decrease due to numerical errors.  _totalGGEnergy0 is set
        // in the reset() function.
        const totalGGEnergy = this._T + this.computeGravityGradientPotential();
        let correction = this._totalGGEnergy0/totalGGEnergy;
        
        // the correction has a possibility of into entering an
        // unstable situation and this logic below prevents that
        if (!(correction > 1 && this._ggCorrection < 1)){
          this._ggCorrection = correction;
          this._omega.x *= correction;
          this._omega.y *= correction;
          this._omega.z *= correction;
        }
        break;
      case 6:
        // 6 = torque on a top
        
        // this option computes the torque that would occur if a
        // force were applied along the x body vector a distance of
        // "_topRDistance" from the center of mass with the force direction
        // in the "up" direction for whatever the user chooses.  For a real
        // spinning top, this would be where the point of the top is.
        // This program does not currently display a table top nor does
        // it force the 3D model to look like a top.  In fact, the object
        // does not even have to spin!
        // To use this option effectively, set the omega vector to point
        // along or nearly along the X body direction.  Set the orientation
        // however you like.  The torque vector should remain in a plane
        // perpendicular to the "up" and "down" directions.  The angular momentum
        // vector should chase the torque vector around the object.
        this._torque.copy(this._xUnitVector);
        this._torque.multiplyScalar(this._topRDistance);
        // _torque is set here to the r in rXf, the cross product happens later

        switch (this._axesOrientation){
          case 'X Up':
            this._v1.copy(this._xUnitVector);
            break;
          case 'X Down':
            this._v1.copy(this._xUnitVector);
            this._v1.multiplyScalar(-1);
            break;
          case 'Y Up':
            this._v1.copy(this._yUnitVector);
            break;
          case 'Y Down':
            this._v1.copy(this._yUnitVector);
            this._v1.multiplyScalar(-1);
            break;
          case 'Z Up':
            this._v1.copy(this._zUnitVector);
            break;
          case 'Z Down':
            this._v1.copy(this._zUnitVector);
            this._v1.multiplyScalar(-1);
            break;
        }

        this._v1.multiplyScalar(this._topGravity);
        this._v1.multiplyScalar(this._mass);
        this._q0.copy(this._quat);
        this._q0.invert(); // _quat is body to space, but want space to body
        this._v1.applyQuaternion(this._q0);// bring _v1 into body frame
          // _v1 is now the f in rXf
        this._torque.cross(this._v1);// torque is rXf
        break;
    }
  }

  computeGravityGradientPotential(){
    // See "Spacecraft Dynamics", T. Kane et al, 1983 McGraw Hill, p. 134.
    // They define V as mu * m / R * (1 + sum) + C,
    // where sum is (tr(I) - 3*I11) / (2mR^2) plus higher order terms and
    // C is an arbitrary constant.  I11 is the moment of inertia about
    // a vector from the planet to the body.  For them it was the X moment
    // of inertia, but we choose X, Y or Z.  V is basically the potential
    // energy stored in the body due to the fact that it is not rotated into
    // the lowest energy state for the gravity gradient.
    // We simplify the equation to just V = _3muOverR3 / 6 * (tr(I) - 3*I11)

    const trace =  this._inertiaMatrix.elements[0]
           + this._inertiaMatrix.elements[4] + this._inertiaMatrix.elements[8];
    this._mat0.setFromMatrix4(this._dcm); // dcm is the direction cosine matrix
    this._mat1.copy(this._mat0);
    this._mat1.transpose();
    this._mat0.multiply(this._inertiaMatrix);
    this._mat0.multiply(this._mat1);
    // _mat0 is now an inertia matrix expressed in a basis with the
    // first vector in the up/down direction
    let i11;

    switch (this._axesOrientation){
      case 'X Up':
      case 'X Down':
         i11 = this._mat0.elements[0]
        break;
      case 'Y Up':
      case 'Y Down':
         i11 = this._mat0.elements[4]
        break;
      case 'Z Up':
      case 'Z Down':
         i11 = this._mat0.elements[8]
        break;
    }

    return -(this._3muOverR3/6*(trace - 3*i11));
  }

  setACSDeadzoneOmega(dzo){
    this._acsDeadzoneOmega = Number(dzo);
  }

  setACSTorque(torqueMag){
    this._acsTorque = Number(torqueMag);
  }
}

export default Torquer;
