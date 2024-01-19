import * as THREE from '../../../../node_modules/three/build/three.module.js';
import {FontLoader} from './FontLoader.js';
import {TextGeometry} from './TextGeometry.js';

/**
 Vectors is a class that encapsulates the computation and drawing of vectors
 associated with the SixDOFObject class.  These vectors are the 3 body
 frame vectors, the 3 space frame vectors, the angular velocity and momentum
 vectors, and the torque vector.  This class also handles the labels for the 
 vectors.
**/

const oneOverSqrt2 = Math.sqrt(0.5);

class Vectors {
  constructor(scene, camera) {
    this._quat = new THREE.Quaternion();
    this._camera = camera;
    this._scene = scene;
    this.needsRefresh = true;
    this._scale = new THREE.Vector3();
    this._unitScale = new THREE.Vector3();
    this._unitScale.set(1, 1, 1);
    
    this._omega = new THREE.Vector3(0,0,0);
    this._H = new THREE.Vector3(0,0,0);
    this._torque = new THREE.Vector3(0,0,0);

    this._origin = new THREE.Vector3(0,0,0);
    this._bodyFrameOrigin = new THREE.Vector3(0,0,0);
    this._spaceFrameOrigin = new THREE.Vector3(0,0,0);
    this._omegaOrigin = new THREE.Vector3(0,0,0);
    this._hOrigin = new THREE.Vector3(0,0,0);
    this._torqueOrigin = new THREE.Vector3(0,0,0);

    this._offsetBodyFrameOrigin = false;
    this._offsetSpaceFrameOrigin = false;
    this._offsetOmegaOrigin = false;
    this._offsetHOrigin = false;
    this._offsetTorqueOrigin = false;

    this._flipQuat = new THREE.Quaternion();
    this._flipQuat.setFromAxisAngle(new THREE.Vector3(1,0,0),0);
    this._flip180quat = new THREE.Quaternion();
    this._flip180quat.setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI);
    this._vectorSize = 5;
    this._yUnitVector = new THREE.Vector3(0, 1, 0);
    this._xVectorPos = new THREE.Vector3(this._vectorSize/2, 0, 0);
    this._yVectorPos = new THREE.Vector3(0, this._vectorSize/2, 0);
    this._zVectorPos = new THREE.Vector3(0, 0, this._vectorSize/2);
    this._zeroVector = new THREE.Vector3();
    this._q0 = new THREE.Quaternion();
    this._q1 = new THREE.Quaternion();
    this._qn = new THREE.Quaternion();
    this._v0 = new THREE.Vector3();
    this._v1 = new THREE.Vector3();

    this._xBodyVectorShaftMesh = null;
    this._yBodyVectorShaftMesh = null;
    this._zBodyVectorShaftMesh = null;
    this._xSpaceVectorShaftMesh = null;
    this._ySpaceVectorShaftMesh = null;
    this._zSpaceVectorShaftMesh = null;
    this._omegaVectorShaftMesh = null;
    this._hVectorShaftMesh = null;
    this._torqueVectorShaftMesh = null;

    this._xBodyVectorArrowheadMesh = null;
    this._yBodyVectorArrowheadMesh = null;
    this._zBodyVectorArrowheadMesh = null;
    this._xSpaceVectorArrowheadMesh = null;
    this._ySpaceVectorArrowheadMesh = null;
    this._zSpaceVectorArrowheadMesh = null;
    this._omegaVectorArrowheadMesh = null;
    this._hVectorArrowheadMesh = null;
    this._torqueVectorArrowheadMesh = null;
    
    this._bodyFrameXQuat = new THREE.Quaternion();
    this._bodyFrameYQuat = new THREE.Quaternion();
    this._bodyFrameZQuat = new THREE.Quaternion();
    this._omegaQuat = new THREE.Quaternion();
    this._hQuat = new THREE.Quaternion();
    this._torqueQuat = new THREE.Quaternion();
    
    this._xBodyLabel = null;
    this._yBodyLabel = null;
    this._zBodyLabel = null;
    this._xSpaceLabel = null;
    this._ySpaceLabel = null;
    this._zSpaceLabel = null;
    this._omegaLabel = null;
    this._hLabel = null;
    this._torqueLabel = null;

    this._showBodyFrame = false;
    this._showXBodyAxis = false;
    this._showYBodyAxis = false;
    this._showZBodyAxis = false;
    this._showSpaceFrame = false;
    this._showOmega = false;
    this._showH = false;
    this._showTorque = false;
    
    this._bodyFrameOpacity = 0;
    this._spaceFrameOpacity = 0;
    this._omegaOpacity = 0;
    this._hOpacity = 0;
    this._torqueOpacity = 0;

    this._bodyFrameColor = 0xffff00;//0xffff55;//light yellow
    this._spaceFrameColor = 0x0000ff;//0x5555ff;//light blue
    this._omegaColor = 0x00ff00;//0x55ff55;//light green
    this._hColor = 0x800080;//0xcbc3e3;//light purple, 0x800080;//purple
    this._torqueColor = 0xff0000;//0xff5555;//light red

    this._constructBodyFrame();
    this._constructSpaceFrame();
    this._constructLabels('helvetiker', 'regular');
    this._constructOmegaVector();
    this._constructHVector();
    this._constructTorqueVector();
    this._addVectorsAndLabelsToScene();
  }

  receiveVectorData(omega, H, quat, torque){
    this._omega = omega;
    this._H = H;
    this._quat = quat;
    this._torque = torque;
  }

  drawVector(i){
    let shaftMesh;
    let arrowheadMesh;
    let label;

    this._q0.multiplyQuaternions(this._flipQuat,this._quat);

    switch(i){
      case 1:
        shaftMesh = this._xBodyVectorShaftMesh;
        arrowheadMesh = this._xBodyVectorArrowheadMesh;
        label = this._xBodyLabel;
        this._q1.multiplyQuaternions(this._q0,this._bodyFrameXQuat);
        this._v0.copy(this._xVectorPos);
        break;
      case 2:
        shaftMesh = this._yBodyVectorShaftMesh;
        arrowheadMesh = this._yBodyVectorArrowheadMesh;
        label = this._yBodyLabel;
        this._q1.multiplyQuaternions(this._q0,this._bodyFrameYQuat);
        this._v0.copy(this._yVectorPos);
        break;
      case 3:
        shaftMesh = this._zBodyVectorShaftMesh;
        arrowheadMesh = this._zBodyVectorArrowheadMesh;
        label = this._zBodyLabel;
        this._q1.multiplyQuaternions(this._q0,this._bodyFrameZQuat);
        this._v0.copy(this._zVectorPos);
        break;
      case 4:
        shaftMesh = this._xSpaceVectorShaftMesh;
        arrowheadMesh = this._xSpaceVectorArrowheadMesh;
        label = this._xSpaceLabel;
        this._q1.multiplyQuaternions(this._flipQuat,this._bodyFrameXQuat);
        this._v0.copy(this._xVectorPos);
        break;
      case 5:
        shaftMesh = this._ySpaceVectorShaftMesh;
        arrowheadMesh = this._ySpaceVectorArrowheadMesh;
        label = this._ySpaceLabel;
        this._q1.multiplyQuaternions(this._flipQuat,this._bodyFrameYQuat);
        this._v0.copy(this._yVectorPos);
        break;
      case 6:
        shaftMesh = this._zSpaceVectorShaftMesh;
        arrowheadMesh = this._zSpaceVectorArrowheadMesh;
        label = this._zSpaceLabel;
        this._q1.multiplyQuaternions(this._flipQuat,this._bodyFrameZQuat);
        this._v0.copy(this._zVectorPos);
        break;
      case 7:
        shaftMesh = this._omegaVectorShaftMesh;
        arrowheadMesh = this._omegaVectorArrowheadMesh;
        label = this._omegaLabel;
        this._v0.copy(this._omega);
        shaftMesh.visible = true;
        arrowheadMesh.visible = true;
        label.visible = true;
        
        if (this._v0.lengthSq() === 0){
          shaftMesh.visible = false;
          arrowheadMesh.visible = false;
          label.visible = false;
        }
    
        this._v0.normalize();
        this._omegaQuat.setFromUnitVectors(this._yUnitVector, this._v0);
        this._q1.multiplyQuaternions(this._q0,this._omegaQuat);
        this._v0.multiplyScalar(this._vectorSize/2);
        this._v1.copy(this._v0);
        this._v0.applyQuaternion(this._q0);
        this._v0.add(this._omegaOrigin);
        this._v1.multiplyScalar(2);
        this._v1.applyQuaternion(this._q0);
        this._v1.add(this._omegaOrigin);
        break;
      case 8:
        shaftMesh = this._hVectorShaftMesh;
        arrowheadMesh = this._hVectorArrowheadMesh;
        label = this._hLabel;
        this._v0.copy(this._H);
        shaftMesh.visible = true;
        arrowheadMesh.visible = true;
        label.visible = true;
        
        if (this._v0.lengthSq() === 0){
          shaftMesh.visible = false;
          arrowheadMesh.visible = false;
          label.visible = false;
        }
    
        this._v0.normalize();
        this._hQuat.setFromUnitVectors(this._yUnitVector, this._v0);
        this._q1.multiplyQuaternions(this._q0,this._hQuat);
        this._v0.multiplyScalar(this._vectorSize/2);
        this._v1.copy(this._v0);
        this._v0.applyQuaternion(this._q0);
        this._v0.add(this._hOrigin);
        this._v1.multiplyScalar(2);
        this._v1.applyQuaternion(this._q0);
        this._v1.add(this._hOrigin);
        break;
      case 9:
        shaftMesh = this._torqueVectorShaftMesh;
        arrowheadMesh = this._torqueVectorArrowheadMesh;
        label = this._torqueLabel;

        shaftMesh.visible = true;
        arrowheadMesh.visible = true;
        label.visible = true;

        if (this._torqueOption === 1 || this._torque.lengthSq() === 0){
          shaftMesh.visible = false;
          arrowheadMesh.visible = false;
          label.visible = false;
          break;
        }
        
        this._v0.copy(this._torque);
        shaftMesh.visible = true;
        arrowheadMesh.visible = true;
        label.visible = true;
        this._v0.normalize();
        this._torqueQuat.setFromUnitVectors(this._yUnitVector, this._v0);
        this._q1.multiplyQuaternions(this._q0,this._torqueQuat);
        this._v0.multiplyScalar(this._vectorSize/2);
        this._v1.copy(this._v0);
        this._v0.applyQuaternion(this._q0);
        this._v0.add(this._torqueOrigin);
        this._v1.multiplyScalar(2);
        this._v1.applyQuaternion(this._q0);
        this._v1.add(this._torqueOrigin);
        break;
    }

    if (i >= 1 && i <= 3){
      this._v1.copy(this._v0);
      this._v0.applyQuaternion(this._q0);
      this._v0.add(this._bodyFrameOrigin);

      if (i===1){
        this._q1.multiplyQuaternions(this._q1,this._flip180quat);
      }

      this._v1.multiplyScalar(2);
      this._v1.applyQuaternion(this._q0);
      this._v1.add(this._bodyFrameOrigin);
    }

    if (i >= 4 && i <= 6){
      this._v1.copy(this._v0);
      this._v0.applyQuaternion(this._flipQuat);
      this._v0.add(this._spaceFrameOrigin);

      if (i === 4){
        this._q1.multiply(this._flip180quat);
      }

      this._v1.multiplyScalar(2);
      this._v1.applyQuaternion(this._flipQuat);
      this._v1.add(this._spaceFrameOrigin);
    }

    shaftMesh.matrix.compose(this._v0, this._q1, this._unitScale);
    arrowheadMesh.matrix.compose(this._v1, this._q1, this._unitScale);
    label.matrix.compose(this._v1, this._qn, this._unitScale);
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
    this._q0.multiplyQuaternions(this._flipQuat,this._quat);

    if (this._showXBodyAxis){
      this.drawVector(1);
      this._xBodyVectorShaftMesh.visible = true;
      this._xBodyVectorArrowheadMesh.visible = true;
      this._xBodyLabel.visible = true;
    }else{
      this._xBodyVectorShaftMesh.visible = false;
      this._xBodyVectorArrowheadMesh.visible = false;
      this._xBodyLabel.visible = false;
    }

    if (this._showYBodyAxis){
      this.drawVector(2);
      this._yBodyVectorShaftMesh.visible = true;
      this._yBodyVectorArrowheadMesh.visible = true;
      this._yBodyLabel.visible = true;
    }else{
      this._yBodyVectorShaftMesh.visible = false;
      this._yBodyVectorArrowheadMesh.visible = false;
      this._yBodyLabel.visible = false;
    }

    if (this._showZBodyAxis){
      this.drawVector(3);
      this._zBodyVectorShaftMesh.visible = true;
      this._zBodyVectorArrowheadMesh.visible = true;
      this._zBodyLabel.visible = true;
    }else{
      this._zBodyVectorShaftMesh.visible = false;
      this._zBodyVectorArrowheadMesh.visible = false;
      this._zBodyLabel.visible = false;
    }

    this.drawVector(4);
    this.drawVector(5);
    this.drawVector(6);
    this.drawVector(7);
    this.drawVector(8);
    this.drawVector(9);
  }

  setOpacity(thing, opacity){  
    this.needsRefresh = true;
    
    switch (thing){
      case 'bodyFrame':
        this._bodyFrameOpacity = opacity;
        this._xBodyVectorShaftMesh.material.opacity = opacity;
        this._xBodyVectorArrowheadMesh.material.opacity = opacity;
        this._yBodyVectorShaftMesh.material.opacity = opacity;
        this._yBodyVectorArrowheadMesh.material.opacity = opacity;
        this._zBodyVectorShaftMesh.material.opacity = opacity;
        this._zBodyVectorArrowheadMesh.material.opacity = opacity;
        this._xBodyLabel.material[0].opacity = opacity;
        this._xBodyLabel.material[1].opacity = opacity;
        this._yBodyLabel.material[0].opacity = opacity;
        this._yBodyLabel.material[1].opacity = opacity;
        this._zBodyLabel.material[0].opacity = opacity;
        this._zBodyLabel.material[1].opacity = opacity;
        break;
      case 'spaceFrame':
        this._spaceFrameOpacity = opacity;
        this._xSpaceVectorShaftMesh.material.opacity = opacity;
        this._xSpaceVectorArrowheadMesh.material.opacity = opacity;
        this._ySpaceVectorShaftMesh.material.opacity = opacity;
        this._ySpaceVectorArrowheadMesh.material.opacity = opacity;
        this._zSpaceVectorShaftMesh.material.opacity = opacity;
        this._zSpaceVectorArrowheadMesh.material.opacity = opacity;
        this._xSpaceLabel.material[0].opacity = opacity;
        this._xSpaceLabel.material[1].opacity = opacity;
        this._ySpaceLabel.material[0].opacity = opacity;
        this._ySpaceLabel.material[1].opacity = opacity;
        this._zSpaceLabel.material[0].opacity = opacity;
        this._zSpaceLabel.material[1].opacity = opacity;
        break;
      case 'omega':
        this._omegaOpacity = opacity;
        this._omegaVectorShaftMesh.material.opacity = opacity;
        this._omegaVectorArrowheadMesh.material.opacity = opacity;
        this._omegaLabel.material[0].opacity = opacity;
        this._omegaLabel.material[1].opacity = opacity;
        break;
      case 'h':
        this._hOpacity = opacity;
        this._hVectorShaftMesh.material.opacity = opacity;
        this._hVectorArrowheadMesh.material.opacity = opacity;
        this._hLabel.material[0].opacity = opacity;
        this._hLabel.material[1].opacity = opacity;
        break;
      case 'torque':
        this._torqueOpacity = opacity;
        this._torqueVectorShaftMesh.material.opacity = opacity;
        this._torqueVectorArrowheadMesh.material.opacity = opacity;
        this._torqueLabel.material[0].opacity = opacity;
        this._torqueLabel.material[1].opacity = opacity;
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
      case 'bodyFrame':
        this._bodyFrameColor = theColor;
        this._xBodyVectorShaftMesh.material.color.set(theColor);
        this._yBodyVectorShaftMesh.material.color.set(theColor);
        this._zBodyVectorShaftMesh.material.color.set(theColor);
        this._xBodyVectorArrowheadMesh.material.color.set(theColor);
        this._yBodyVectorArrowheadMesh.material.color.set(theColor);
        this._zBodyVectorArrowheadMesh.material.color.set(theColor);
        this._xBodyLabel.material[0].color.set(theColor);
        this._xBodyLabel.material[1].color.set(theColor);
        this._yBodyLabel.material[0].color.set(theColor);
        this._yBodyLabel.material[1].color.set(theColor);
        this._zBodyLabel.material[0].color.set(theColor);
        this._zBodyLabel.material[1].color.set(theColor);
        break;
      case 'spaceFrame':
        this._spaceFrameColor = theColor;
        this._xSpaceVectorShaftMesh.material.color.set(theColor);
        this._ySpaceVectorShaftMesh.material.color.set(theColor);
        this._zSpaceVectorShaftMesh.material.color.set(theColor);
        this._xSpaceVectorArrowheadMesh.material.color.set(theColor);
        this._ySpaceVectorArrowheadMesh.material.color.set(theColor);
        this._zSpaceVectorArrowheadMesh.material.color.set(theColor);
        this._xSpaceLabel.material[0].color.set(theColor);
        this._xSpaceLabel.material[1].color.set(theColor);
        this._ySpaceLabel.material[0].color.set(theColor);
        this._ySpaceLabel.material[1].color.set(theColor);
        this._zSpaceLabel.material[0].color.set(theColor);
        this._zSpaceLabel.material[1].color.set(theColor);
        break;
      case 'omega':
        this._omegaColor = theColor;
        this._omegaVectorShaftMesh.material.color.set(theColor);
        this._omegaVectorArrowheadMesh.material.color.set(theColor);
        this._omegaLabel.material[0].color.set(theColor);
        this._omegaLabel.material[1].color.set(theColor);
        break;
      case 'h':
        this._hColor = theColor;
        this._hVectorShaftMesh.material.color.set(theColor);
        this._hVectorArrowheadMesh.material.color.set(theColor);
        this._hLabel.material[0].color.set(theColor);
        this._hLabel.material[1].color.set(theColor);
        break;
      case 'torque':
        this._torqueColor = theColor;
        this._torqueVectorShaftMesh.material.color.set(theColor);
        this._torqueVectorArrowheadMesh.material.color.set(theColor);
        this._torqueLabel.material[0].color.set(theColor);
        this._torqueLabel.material[1].color.set(theColor);
        break;
    }
  }

  _constructVector(){
    const length = this._vectorSize;
    const shaftRadius = this._vectorSize*0.007;

    const shaftGeometry = new THREE.CylinderGeometry(shaftRadius, shaftRadius,  length, 32, 1, true);
    const arrowheadGeometry = new THREE.ConeGeometry(2*shaftRadius, 0.07*length,32, 1, true);

    return [shaftGeometry, arrowheadGeometry];
  }

  _constructBodyFrame(){
    const mat1 = new THREE.MeshBasicMaterial({
      color: this._bodyFrameColor,
      transparent: true,
      opacity: this._bodyFrameOpacity,
    });
    
    const mat2 = new THREE.MeshBasicMaterial({
      color: this._bodyFrameColor,
      transparent: true,
      opacity: this._bodyFrameOpacity,
    });

    const mat3 = new THREE.MeshBasicMaterial({
      color: this._bodyFrameColor,
      transparent: true,
      opacity: this._bodyFrameOpacity,
    });

    let [shaftGeo, arrowheadGeo] = this._constructVector();

    this._xBodyVectorShaftMesh = new THREE.Mesh(shaftGeo, mat1);
    this._xBodyVectorShaftMesh.matrixAutoUpdate = false;
    this._xBodyVectorArrowheadMesh = new THREE.Mesh(arrowheadGeo, mat1);
    this._xBodyVectorArrowheadMesh.matrixAutoUpdate = false;
    this._yBodyVectorShaftMesh = new THREE.Mesh(shaftGeo, mat2);
    this._yBodyVectorShaftMesh.matrixAutoUpdate = false;
    this._yBodyVectorArrowheadMesh = new THREE.Mesh(arrowheadGeo, mat2);
    this._yBodyVectorArrowheadMesh.matrixAutoUpdate = false;
    this._zBodyVectorShaftMesh = new THREE.Mesh(shaftGeo, mat3);
    this._zBodyVectorShaftMesh.matrixAutoUpdate = false;
    this._zBodyVectorArrowheadMesh = new THREE.Mesh(arrowheadGeo, mat3);
    this._zBodyVectorArrowheadMesh.matrixAutoUpdate = false;
    this._bodyFrameXQuat.set(0, 0, oneOverSqrt2, oneOverSqrt2);
    this._bodyFrameYQuat.set(0, 0, 0, 1);
    this._bodyFrameZQuat.set(oneOverSqrt2, 0, 0, oneOverSqrt2);
  }

  _constructSpaceFrame(){
    const mat1 = new THREE.MeshBasicMaterial({
      color: this._spaceFrameColor,
      transparent: true,
      opacity: this._spaceFrameOpacity,
    });

    const mat2 = new THREE.MeshBasicMaterial({
      color: this._spaceFrameColor,
      transparent: true,
      opacity: this._spaceFrameOpacity,
    });
    
    const mat3 = new THREE.MeshBasicMaterial({
      color: this._spaceFrameColor,
      transparent: true,
      opacity: this._spaceFrameOpacity,
    });

    let [shaftGeo, arrowheadGeo] = this._constructVector();

    this._xSpaceVectorShaftMesh = new THREE.Mesh(shaftGeo, mat1);
    this._xSpaceVectorShaftMesh.matrixAutoUpdate = false;
    this._xSpaceVectorArrowheadMesh = new THREE.Mesh(arrowheadGeo, mat1);
    this._xSpaceVectorArrowheadMesh.matrixAutoUpdate = false;

    this._ySpaceVectorShaftMesh = new THREE.Mesh(shaftGeo, mat2);
    this._ySpaceVectorShaftMesh.matrixAutoUpdate = false;
    this._ySpaceVectorArrowheadMesh = new THREE.Mesh(arrowheadGeo, mat2);
    this._ySpaceVectorArrowheadMesh.matrixAutoUpdate = false;
    
    this._zSpaceVectorShaftMesh = new THREE.Mesh(shaftGeo, mat3);
    this._zSpaceVectorShaftMesh.matrixAutoUpdate = false;
    this._zSpaceVectorArrowheadMesh = new THREE.Mesh(arrowheadGeo, mat3);
    this._zSpaceVectorArrowheadMesh.matrixAutoUpdate = false;
  }

  _constructOmegaVector(){
    const mat = new THREE.MeshBasicMaterial({
      color: this._omegaColor,
      transparent: true,
      opacity: this._omegaOpacity,
    });

    let [shaftGeo, arrowheadGeo] = this._constructVector();

    this._omegaVectorShaftMesh = new THREE.Mesh(shaftGeo, mat);
    this._omegaVectorShaftMesh.matrixAutoUpdate = false;
    this._omegaVectorArrowheadMesh = new THREE.Mesh(arrowheadGeo, mat);
    this._omegaVectorArrowheadMesh.matrixAutoUpdate = false;
  }

  _constructHVector(){
    const mat = new THREE.MeshBasicMaterial({
      color: this._hColor,
      transparent: true,
      opacity: this._hOpacity,
    });

    let [shaftGeo, arrowheadGeo] = this._constructVector();

    this._hVectorShaftMesh = new THREE.Mesh(shaftGeo, mat);
    this._hVectorShaftMesh.matrixAutoUpdate = false;
    this._hVectorArrowheadMesh = new THREE.Mesh(arrowheadGeo, mat);
    this._hVectorArrowheadMesh.matrixAutoUpdate = false;
  }

  _constructTorqueVector(){
    const mat = new THREE.MeshBasicMaterial({
      color: this._torqueColor,
      transparent: true,
      opacity: this._torqueOpacity,
    });

    let [shaftGeo, arrowheadGeo] = this._constructVector();

    this._torqueVectorShaftMesh = new THREE.Mesh(shaftGeo, mat);
    this._torqueVectorShaftMesh.matrixAutoUpdate = false;
    this._torqueVectorArrowheadMesh = new THREE.Mesh(arrowheadGeo, mat);
    this._torqueVectorArrowheadMesh.matrixAutoUpdate = false;
  }

  _constructLabels(fontName, fontWeight) {
    // IMPORTANT: The FontLoader.load function generates a Javascript promise
    // which results in asynchronous code execution.  The variable
    // constructionComplete is initialized to false but is set to true once
    // the asynchronous code is complete.  Until then, the refresh function
    // should not be allowed to execute.

    THREE.Cache.enabled = true;
    let font = undefined;
    // body frame, space frame, omega, H, torque
    let lettersArray = ['X', 'Y', 'Z', 'X', 'Y', 'Z', 'ω', 'H', 'τ'];
    //fontName = helvetiker
    //fontWeight = normal bold
    const loader = new FontLoader();
    // loader.load('./fonts/' + fontName + '_' + fontWeight + '.typeface.json', (response) => {
    // let fontJSON = new URL('/static/fonts/helvetiker_regular_mod.typeface.json', import.meta.url);
    // console.log('fontJSON = ',fontJSON);
    // loader.load(fontJSON.pathname, (response) => {
    loader.load('USED TO BE ./fonts/helvetiker_regular.typeface.json BUT NOT REQURED ANYMORE', (response) => {
      font = response;
      const size = 0.5;
      const height = 0.1;
      const curveSegments = 4;
      const bevelEnabled = false;
  
      let materials1 = [
        new THREE.MeshLambertMaterial({color: this._bodyFrameColor, transparent: true, opacity: this._bodyFrameOpacity}), // front
        new THREE.MeshLambertMaterial({color: this._bodyFrameColor, transparent: true, opacity: this._bodyFrameOpacity}) // side
      ];

      let materials2 = [
        new THREE.MeshLambertMaterial({color: this._spaceFrameColor, transparent: true, opacity: this._spaceFrameOpacity}), // front
        new THREE.MeshLambertMaterial({color: this._spaceFrameColor, transparent: true, opacity: this._spaceFrameOpacity}) // side
      ];

      let materials3 = [
        new THREE.MeshLambertMaterial({color: this._omegaColor, transparent: true, opacity: this._omegaOpacity}), // front
        new THREE.MeshLambertMaterial({color: this._omegaColor, transparent: true, opacity: this._omegaOpacity}) // side
      ];

      let materials4 = [
        new THREE.MeshLambertMaterial({color: this._hColor, transparent: true, opacity: this._hOpacity}), // front
        new THREE.MeshLambertMaterial({color: this._hColor, transparent: true, opacity: this._hOpacity}) // side
      ];

      let materials5 = [
        new THREE.MeshLambertMaterial({color: this._torqueColor, transparent: true, opacity: this._torqueOpacity}), // front
        new THREE.MeshLambertMaterial({color: this._torqueColor, transparent: true, opacity: this._torqueOpacity}) // side
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
            this._xBodyLabel = new THREE.Mesh(textGeo, materials1);
            this._xBodyLabel.matrixAutoUpdate = false;
            break;
          case 1:
            this._yBodyLabel = new THREE.Mesh(textGeo, materials1);
            this._yBodyLabel.matrixAutoUpdate = false;
            break;
          case 2:
            this._zBodyLabel = new THREE.Mesh(textGeo, materials1);
            this._zBodyLabel.matrixAutoUpdate = false;
            break;
          case 3:
            this._xSpaceLabel = new THREE.Mesh(textGeo, materials2);
            this._xSpaceLabel.matrixAutoUpdate = false;
            break;
          case 4:
            this._ySpaceLabel = new THREE.Mesh(textGeo, materials2);
            this._ySpaceLabel.matrixAutoUpdate = false;
            break;
          case 5:
            this._zSpaceLabel  = new THREE.Mesh(textGeo, materials2);
            this._zSpaceLabel.matrixAutoUpdate = false;
            break;
          case 6:
            this._omegaLabel = new THREE.Mesh(textGeo, materials3);
            this._omegaLabel.matrixAutoUpdate = false;
            break;
          case 7:
            this._hLabel = new THREE.Mesh(textGeo, materials4);
            this._hLabel.matrixAutoUpdate = false;
            break;
          case 8:
            this._torqueLabel = new THREE.Mesh(textGeo, materials5);
            this._torqueLabel.matrixAutoUpdate = false;
            break;
        }
      }

      this.constructionComplete = true;
    });
  }

  _addVectorsAndLabelsToScene() {
    const scene = this._scene;

    if (this._showBodyFrame){
      scene.add(this._xBodyVectorShaftMesh);
      scene.add(this._xBodyVectorArrowheadMesh);
      scene.add(this._yBodyVectorShaftMesh);
      scene.add(this._yBodyVectorArrowheadMesh);
      scene.add(this._zBodyVectorShaftMesh);
      scene.add(this._zBodyVectorArrowheadMesh);
      scene.add(this._xBodyLabel);
      scene.add(this._yBodyLabel);
      scene.add(this._zBodyLabel);
    }

    if (this._showSpaceFrame){
      scene.add(this._xSpaceVectorShaftMesh);
      scene.add(this._xSpaceVectorArrowheadMesh);
      scene.add(this._ySpaceVectorShaftMesh);
      scene.add(this._ySpaceVectorArrowheadMesh);
      scene.add(this._zSpaceVectorShaftMesh);
      scene.add(this._zSpaceVectorArrowheadMesh);
      scene.add(this._xSpaceLabel);
      scene.add(this._ySpaceLabel);
      scene.add(this._zSpaceLabel);
    }

    if (this._showOmega){
      scene.add(this._omegaVectorShaftMesh);
      scene.add(this._omegaVectorArrowheadMesh);
      scene.add(this._omegaLabel);
    }

    if (this._showH){
      scene.add(this._hVectorShaftMesh);
      scene.add(this._hVectorArrowheadMesh);
      scene.add(this._hLabel);
    }

    if (this._showTorque){
      scene.add(this._torqueVectorShaftMesh);
      scene.add(this._torqueVectorArrowheadMesh);
      scene.add(this._torqueLabel);
    }
  }

  setVectorSize(vectorSize){
    this._vectorSize = Number(vectorSize);
    this._xVectorPos = new THREE.Vector3(this._vectorSize/2, 0, 0);
    this._yVectorPos = new THREE.Vector3(0, this._vectorSize/2, 0);
    this._zVectorPos = new THREE.Vector3(0, 0, this._vectorSize/2);
    const scene = this._scene;
    
    if (this._showBodyFrame){
      scene.remove(this._xBodyVectorShaftMesh);
      scene.remove(this._xBodyVectorArrowheadMesh);
      scene.remove(this._yBodyVectorShaftMesh);
      scene.remove(this._yBodyVectorArrowheadMesh);
      scene.remove(this._zBodyVectorShaftMesh);
      scene.remove(this._zBodyVectorArrowheadMesh);
    }

    if (this._showSpaceFrame){
      scene.remove(this._xSpaceVectorShaftMesh);
      scene.remove(this._xSpaceVectorArrowheadMesh);
      scene.remove(this._ySpaceVectorShaftMesh);
      scene.remove(this._ySpaceVectorArrowheadMesh);
      scene.remove(this._zSpaceVectorShaftMesh);
      scene.remove(this._zSpaceVectorArrowheadMesh);
    }

    if (this._showOmega){
      scene.remove(this._omegaVectorShaftMesh);
      scene.remove(this._omegaVectorArrowheadMesh);
    }

    if (this._showH){
      scene.remove(this._hVectorShaftMesh);
      scene.remove(this._hVectorArrowheadMesh);
    }

    if (this._showTorque){
      scene.remove(this._torqueVectorShaftMesh);
      scene.remove(this._torqueVectorArrowheadMesh);
    }

    this._constructBodyFrame();
    this._constructSpaceFrame();
    this._constructOmegaVector();
    this._constructHVector();
    this._constructTorqueVector();

    if (this._showBodyFrame){
      scene.add(this._xBodyVectorShaftMesh);
      scene.add(this._xBodyVectorArrowheadMesh);
      scene.add(this._yBodyVectorShaftMesh);
      scene.add(this._yBodyVectorArrowheadMesh);
      scene.add(this._zBodyVectorShaftMesh);
      scene.add(this._zBodyVectorArrowheadMesh);
    }

    if (this._showSpaceFrame){
      scene.add(this._xSpaceVectorShaftMesh);
      scene.add(this._xSpaceVectorArrowheadMesh);
      scene.add(this._ySpaceVectorShaftMesh);
      scene.add(this._ySpaceVectorArrowheadMesh);
      scene.add(this._zSpaceVectorShaftMesh);
      scene.add(this._zSpaceVectorArrowheadMesh);
    }

    if (this._showOmega){
      scene.add(this._omegaVectorShaftMesh);
      scene.add(this._omegaVectorArrowheadMesh);
    }

    if (this._showH){
      scene.add(this._hVectorShaftMesh);
      scene.add(this._hVectorArrowheadMesh);
    }

    if (this._showTorque){
      scene.add(this._torqueVectorShaftMesh);
      scene.add(this._torqueVectorArrowheadMesh);
    }

    this.needsRefresh;
    this.refresh();
  }

  set omega(value) {
    this._omega = value;
  }

  showBodyFrame(show){
    if (this._showBodyFrame === show){
      return;
    }

    this.needsRefresh = true;
    const scene = this._scene;
    this._showBodyFrame = show;
    
    if (show){
      scene.add(this._xBodyVectorShaftMesh);
      scene.add(this._xBodyVectorArrowheadMesh);
      scene.add(this._yBodyVectorShaftMesh);
      scene.add(this._yBodyVectorArrowheadMesh);
      scene.add(this._zBodyVectorShaftMesh);
      scene.add(this._zBodyVectorArrowheadMesh);
      scene.add(this._xBodyLabel);
      scene.add(this._yBodyLabel);
      scene.add(this._zBodyLabel);
    }else{
      scene.remove(this._xBodyVectorShaftMesh);
      scene.remove(this._xBodyVectorArrowheadMesh);
      scene.remove(this._yBodyVectorShaftMesh);
      scene.remove(this._yBodyVectorArrowheadMesh);
      scene.remove(this._zBodyVectorShaftMesh);
      scene.remove(this._zBodyVectorArrowheadMesh);
      scene.remove(this._xBodyLabel);
      scene.remove(this._yBodyLabel);
      scene.remove(this._zBodyLabel);
    }
  }

  showSpaceFrame(show){
    if (this._showSpaceFrame === show){
      return;
    }

    this.needsRefresh = true;
    const scene = this._scene;
    this._showSpaceFrame = show;

    if (show){
      scene.add(this._xSpaceVectorShaftMesh);
      scene.add(this._xSpaceVectorArrowheadMesh);
      scene.add(this._ySpaceVectorShaftMesh);
      scene.add(this._ySpaceVectorArrowheadMesh);
      scene.add(this._zSpaceVectorShaftMesh);
      scene.add(this._zSpaceVectorArrowheadMesh);
      scene.add(this._xSpaceLabel);
      scene.add(this._ySpaceLabel);
      scene.add(this._zSpaceLabel);
    }else{
      scene.remove(this._xSpaceVectorShaftMesh);
      scene.remove(this._xSpaceVectorArrowheadMesh);
      scene.remove(this._ySpaceVectorShaftMesh);
      scene.remove(this._ySpaceVectorArrowheadMesh);
      scene.remove(this._zSpaceVectorShaftMesh);
      scene.remove(this._zSpaceVectorArrowheadMesh);
      scene.remove(this._xSpaceLabel);
      scene.remove(this._ySpaceLabel);
      scene.remove(this._zSpaceLabel);
    }
  }

  showOmega(show){
    if (this._showOmega === show){
      return;
    }

    this.needsRefresh = true;
    const scene = this._scene;
    this._showOmega = show;
    
    if (show){
      scene.add(this._omegaVectorShaftMesh);
      scene.add(this._omegaVectorArrowheadMesh);
      scene.add(this._omegaLabel);
    }else{
      scene.remove(this._omegaVectorShaftMesh);
      scene.remove(this._omegaVectorArrowheadMesh);
      scene.remove(this._omegaLabel);
    }
  }

  showAngularMomentum(show){
    if (this._showH === show){
      return;
    }

    this.needsRefresh = true;
    const scene = this._scene;
    this._showH = show;
    
    if (show){
      scene.add(this._hVectorShaftMesh);
      scene.add(this._hVectorArrowheadMesh);
      scene.add(this._hLabel);
    }else{
      scene.remove(this._hVectorShaftMesh);
      scene.remove(this._hVectorArrowheadMesh);
      scene.remove(this._hLabel);
    }    
  }

  showTorque(show){
    if (this._showTorque === show){
      return;
    }

    this.needsRefresh = true;
    const scene = this._scene;
    this._showTorque = show;
    
    if (show){
      scene.add(this._torqueVectorShaftMesh);
      scene.add(this._torqueVectorArrowheadMesh);
      scene.add(this._torqueLabel);
    }else{
      scene.remove(this._torqueVectorShaftMesh);
      scene.remove(this._torqueVectorArrowheadMesh);
      scene.remove(this._torqueLabel);
    }    
  }

  setOffsets(bodyFrameOffset, spaceFrameOffset,
    omegaOffset, hOffset, torqueOffset){
    this._offsetBodyFrameOrigin = bodyFrameOffset;
    this._offsetSpaceFrameOrigin = spaceFrameOffset;
    this._offsetOmegaOrigin = omegaOffset;
    this._offsetHOrigin = hOffset;
    this._offsetTorqueOrigin = torqueOffset;
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

    this._bodyFrameOrigin.copy(this._offsetBodyFrameOrigin ? this._origin : this._zeroVector);
    this._spaceFrameOrigin.copy(this._offsetSpaceFrameOrigin ? this._origin : this._zeroVector);
    this._omegaOrigin.copy(this._offsetOmegaOrigin ? this._origin : this._zeroVector);
    this._hOrigin.copy(this._offsetHOrigin ? this._origin : this._zeroVector);
    this._torqueOrigin.copy(this._offsetTorqueOrigin ? this._origin : this._zeroVector);
  }

  setOrigin(thing, offsetTheOrigin){
    this.needsRefresh = true;

    switch (thing){
      case 'bodyFrame':
        this._offsetBodyFrameOrigin = offsetTheOrigin;
        this._bodyFrameOrigin.copy(this._offsetBodyFrameOrigin ? this._origin : this._zeroVector);
        break;
      case 'spaceFrame':
        this._offsetSpaceFrameOrigin = offsetTheOrigin;
        this._spaceFrameOrigin.copy(this._offsetSpaceFrameOrigin ? this._origin : this._zeroVector);
        break;
      case 'omega':
        this._offsetOmegaOrigin = offsetTheOrigin;
        this._omegaOrigin.copy(this._offsetOmegaOrigin ? this._origin : this._zeroVector);
        break;
      case 'h':
        this._offsetHOrigin = offsetTheOrigin;
        this._hOrigin.copy(this._offsetHOrigin ? this._origin : this._zeroVector);
        break;
      case 'torque':
        this._offsetTorqueOrigin = offsetTheOrigin;
        this._torqueOrigin.copy(this._offsetTorqueOrigin ? this._origin : this._zeroVector);
        break;
    }
  }

  showBodyAxis(showX, showY, showZ){
    this._showXBodyAxis = showX;
    this._showYBodyAxis = showY;
    this._showZBodyAxis = showZ;
    const opacity = this._bodyFrameOpacity;
    this._xBodyVectorShaftMesh.material.opacity = 0;
    this._xBodyVectorArrowheadMesh.material.opacity = 0;
    this._xBodyLabel.material[0].opacity = 0;
    this._xBodyLabel.material[1].opacity = 0;
    this._yBodyVectorShaftMesh.material.opacity = 0;
    this._yBodyVectorArrowheadMesh.material.opacity = 0;
    this._yBodyLabel.material[0].opacity = 0;
    this._yBodyLabel.material[1].opacity = 0;
    this._zBodyVectorShaftMesh.material.opacity = 0;
    this._zBodyVectorArrowheadMesh.material.opacity = 0;
    this._zBodyLabel.material[0].opacity = 0;
    this._zBodyLabel.material[1].opacity = 0;

    if (showX){
        this._xBodyVectorShaftMesh.material.opacity = opacity;
        this._xBodyVectorArrowheadMesh.material.opacity = opacity;
        this._xBodyLabel.material[0].opacity = opacity;
        this._xBodyLabel.material[1].opacity = opacity;
    }

    if (showY){
        this._yBodyVectorShaftMesh.material.opacity = opacity;
        this._yBodyVectorArrowheadMesh.material.opacity = opacity;
        this._yBodyLabel.material[0].opacity = opacity;
        this._yBodyLabel.material[1].opacity = opacity;
      }
      
    if (showZ){
      this._zBodyVectorShaftMesh.material.opacity = opacity;
      this._zBodyVectorArrowheadMesh.material.opacity = opacity;
      this._zBodyLabel.material[0].opacity = opacity;
      this._zBodyLabel.material[1].opacity = opacity;
    }

    this.refresh();// necessary?
  }
}

export default Vectors;
