/**
The purpose of Aerovisualizer is to assist in the teaching and 
reinforcement of concepts in aerospace engineering by presenting 
them in interesting and engaging ways.  3D animations are displayed 
to complement the dry equations found in textbooks and online, and 
controls are also provided to manipulate the displays.

This file contains the code for the main entry point for the different 
aerospace apps.

 Revision History
 Date    Name                  Description
 10/7/24 R. Eastman            v0.2.3 beta
*/

const infoButton = document.getElementById("info-btn");
const infoReturnButton = document.getElementById('info-return-btn');
const buttonElements = document.getElementById('btn-elements');
const infoElements = document.getElementById('info-elements');

buttonElements.style.display = 'flex';
infoElements.style.display = 'none';

const toggleShowInfo = function(){
  if (buttonElements.style.display === 'none'){
    buttonElements.style.display = 'flex';
    infoElements.style.display = 'none';
  }else{
    buttonElements.style.display = 'none';
    infoElements.style.display = 'flex';
  }
}

infoButton.addEventListener('click', () => {
  toggleShowInfo();
});

infoReturnButton.addEventListener('click', () => {
  toggleShowInfo();
});