const infoButton = document.getElementById("info-btn");
const infoReturnButton = document.getElementById('info-return-btn');
const buttonElements = document.getElementById('btn-elements');
const infoElements = document.getElementById('info-elements');

buttonElements.style.display = 'grid';
infoElements.style.display = 'none';

const toggleShowInfo = function(){
  if (buttonElements.style.display === 'none'){
    buttonElements.style.display = 'grid';
    infoElements.style.display = 'none';
  }else{
    buttonElements.style.display = 'none';
    infoElements.style.display = 'grid';
  }
}

infoButton.addEventListener('click', () => {
  toggleShowInfo();
});

infoReturnButton.addEventListener('click', () => {
  toggleShowInfo();
});
