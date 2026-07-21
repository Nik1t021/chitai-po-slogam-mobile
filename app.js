const pictureElement=document.querySelector("#picture");
const syllablesElement=document.querySelector("#syllables");
const wordLabelElement=document.querySelector("#wordLabel");
const wordListElement=document.querySelector("#wordList");
const wordListPanel=document.querySelector(".word-list-panel");
const currentNumberElement=document.querySelector("#currentNumber");
const totalNumberElement=document.querySelector("#totalNumber");
const messageElement=document.querySelector("#message");
const soundButton=document.querySelector("#soundButton");
const settingsButton=document.querySelector("#settingsButton");
const previousButton=document.querySelector("#previousButton");
const nextButton=document.querySelector("#nextButton");
const playWordButton=document.querySelector("#playWordButton");
const praiseButton=document.querySelector("#praiseButton");
const fallbackAudio=document.querySelector("#audioPlayer");

let currentWordIndex=0;
let expectedSyllableIndex=0;
let isPlayingSequence=false;
let soundEnabled=true;
let sequenceId=0;

const AudioContextClass=window.AudioContext||window.webkitAudioContext;
let audioContext=null;
let activeSourceNode=null;
let activeFallbackAudio=false;
const audioBufferCache=new Map();

const WORD_ICONS=[
  "🍌","🦛","🐿️","💧","🐦‍⬛","🐰","📘","🐐","🐄","🐱",
  "🐈","🦊","🌙","🍓","👩","🚗","🥣","🧸","🥛","🐭",
  "🦶","👨","🌈","🌹","✋","🐟","🐶","🦉","🦆","🐢"
];

function loadCompletedWords(){
  try{return JSON.parse(localStorage.getItem("readBySyllablesCompleted")||"[]")}catch{return []}
}
const completedWords=new Set(loadCompletedWords());
function saveCompletedWords(){
  try{localStorage.setItem("readBySyllablesCompleted",JSON.stringify([...completedWords]))}catch{}
}
function pulsePraise(){
  praiseButton.classList.remove("show");
  void praiseButton.offsetWidth;
  praiseButton.classList.add("show");
}
function currentWord(){return WORDS[currentWordIndex]}

function renderWordList(){
  wordListElement.replaceChildren();
  WORDS.forEach((item,index)=>{
    const row=document.createElement("button");
    row.type="button";
    row.className="word-row";
    row.setAttribute("aria-label",`Открыть слово ${item.word}`);
    if(index===currentWordIndex)row.classList.add("active");

    const mobileContent=document.createElement("span");
    mobileContent.className="mobile-row-content";

    const mobileNumber=document.createElement("span");
    mobileNumber.className="mobile-word-number";
    mobileNumber.textContent=String(index+1);

    const mobileIcon=document.createElement("span");
    mobileIcon.className="mobile-word-icon";
    mobileIcon.textContent=WORD_ICONS[index]||"⭐";

    const mobileName=document.createElement("span");
    mobileName.className="mobile-word-name";
    mobileName.textContent=item.word;

    const mobileStar=document.createElement("span");
    mobileStar.className="mobile-word-star";
    mobileStar.textContent=completedWords.has(index)?"★":"☆";

    mobileContent.append(mobileNumber,mobileIcon,mobileName,mobileStar);
    row.append(mobileContent);

    if(completedWords.has(index)){
      const star=document.createElement("span");
      star.className="completed-star";
      star.textContent="★";
      star.setAttribute("aria-hidden","true");
      row.append(star);
    }
    row.addEventListener("click",async()=>{
      await ensureAudioReady();
      navigateTo(index);
    });
    wordListElement.append(row);
  });

  if(window.matchMedia("(max-width: 820px)").matches){
    const activeRow=wordListElement.querySelector(".word-row.active");
    requestAnimationFrame(()=>activeRow?.scrollIntoView({block:"nearest",inline:"center",behavior:"smooth"}));
  }
}
function renderLabel(word){
  wordLabelElement.replaceChildren();
  [...word].forEach(letter=>{
    const span=document.createElement("span");
    span.className="word-letter";
    span.textContent=letter;
    wordLabelElement.append(span);
  });
}
function renderWord(){
  const item=currentWord();
  expectedSyllableIndex=0;
  isPlayingSequence=false;
  currentNumberElement.textContent=String(currentWordIndex+1);
  totalNumberElement.textContent=String(WORDS.length);
  messageElement.textContent="";
  praiseButton.classList.remove("show");

  pictureElement.replaceChildren();
  const image=document.createElement("img");
  image.src=item.image;
  image.alt=item.word;
  image.decoding="async";
  image.addEventListener("error",()=>{pictureElement.textContent=item.word.toUpperCase()},{once:true});
  pictureElement.append(image);

  renderLabel(item.word);
  syllablesElement.replaceChildren();
  item.syllables.forEach((syllable,index)=>{
    const button=document.createElement("button");
    button.type="button";
    button.className="syllable-button";
    button.textContent=syllable.text;
    button.addEventListener("click",()=>handleSyllable(index));
    syllablesElement.append(button);
  });
  renderWordList();
  preloadCurrentAudio(item);
}

async function ensureAudioReady(){
  if(!soundEnabled)return;
  if(AudioContextClass){
    if(!audioContext)audioContext=new AudioContextClass();
    if(audioContext.state!=="running"){
      try{await audioContext.resume()}catch{}
    }
  }
}

async function getAudioBuffer(source){
  if(audioBufferCache.has(source))return audioBufferCache.get(source);
  const promise=(async()=>{
    const response=await fetch(source,{cache:"force-cache"});
    if(!response.ok)throw new Error(`Не удалось загрузить звук: ${source}`);
    const bytes=await response.arrayBuffer();
    return await audioContext.decodeAudioData(bytes.slice(0));
  })();
  audioBufferCache.set(source,promise);
  try{return await promise}catch(error){audioBufferCache.delete(source);throw error}
}

function preloadCurrentAudio(item){
  if(!AudioContextClass)return;
  const sources=[...item.syllables.map(s=>s.audio),item.wordAudio].filter(Boolean);
  sources.forEach(source=>{
    fetch(source,{cache:"force-cache"}).catch(()=>{});
  });
}

async function handleSyllable(index){
  const unlockPromise=ensureAudioReady();
  if(isPlayingSequence||index!==expectedSyllableIndex)return;
  isPlayingSequence=true;
  await unlockPromise;

  const token=sequenceId;
  const item=currentWord();
  const button=syllablesElement.children[index];
  button.classList.add("done");
  button.disabled=true;

  await playAudio(item.syllables[index].audio,token);
  if(token!==sequenceId)return;
  expectedSyllableIndex+=1;
  if(expectedSyllableIndex===item.syllables.length)await finishWord(token);
  else isPlayingSequence=false;
}

async function finishWord(token){
  [...syllablesElement.children].forEach(button=>button.disabled=true);
  await playAudio(currentWord().wordAudio,token);
  if(token!==sequenceId)return;

  completedWords.add(currentWordIndex);
  saveCompletedWords();
  renderWordList();
  pulsePraise();

  await playRandomPraise(token);
  if(token!==sequenceId)return;
  await delay(650);
  if(token===sequenceId)navigateTo(currentWordIndex+1);
}

async function playRandomPraise(token){
  if(!Array.isArray(PRAISE_AUDIO)||!PRAISE_AUDIO.length)return;
  const source=PRAISE_AUDIO[Math.floor(Math.random()*PRAISE_AUDIO.length)];
  await playAudio(source,token);
}

async function playAudio(source,token=sequenceId){
  if(!soundEnabled||!source||token!==sequenceId)return;
  await ensureAudioReady();
  if(token!==sequenceId||!soundEnabled)return;

  if(audioContext&&audioContext.state==="running"){
    try{
      const buffer=await getAudioBuffer(source);
      if(token!==sequenceId||!soundEnabled)return;
      stopAudio();
      await new Promise(resolve=>{
        const node=audioContext.createBufferSource();
        activeSourceNode=node;
        node.buffer=buffer;
        node.connect(audioContext.destination);
        let settled=false;
        const complete=()=>{
          if(settled)return;
          settled=true;
          clearTimeout(timeout);
          if(activeSourceNode===node)activeSourceNode=null;
          resolve();
        };
        const timeout=setTimeout(complete,20000);
        node.onended=complete;
        node.start(0);
      });
      return;
    }catch(error){
      console.warn("Web Audio недоступен для файла, используется запасной плеер",error);
    }
  }

  await playWithFallbackAudio(source,token);
}

function playWithFallbackAudio(source,token){
  return new Promise(resolve=>{
    if(token!==sequenceId||!soundEnabled){resolve();return}
    stopAudio();
    activeFallbackAudio=true;
    fallbackAudio.src=source;
    fallbackAudio.currentTime=0;
    fallbackAudio.load();
    let settled=false;
    const complete=()=>{
      if(settled)return;
      settled=true;
      clearTimeout(timeout);
      fallbackAudio.removeEventListener("ended",complete);
      fallbackAudio.removeEventListener("error",complete);
      activeFallbackAudio=false;
      resolve();
    };
    const timeout=setTimeout(complete,20000);
    fallbackAudio.addEventListener("ended",complete,{once:true});
    fallbackAudio.addEventListener("error",complete,{once:true});
    fallbackAudio.play().catch(complete);
  });
}

function stopAudio(){
  if(activeSourceNode){
    try{activeSourceNode.onended=null;activeSourceNode.stop(0)}catch{}
    try{activeSourceNode.disconnect()}catch{}
    activeSourceNode=null;
  }
  if(activeFallbackAudio||!fallbackAudio.paused){
    fallbackAudio.pause();
    fallbackAudio.removeAttribute("src");
    fallbackAudio.load();
    activeFallbackAudio=false;
  }
}
function cancelSequence(){sequenceId+=1;isPlayingSequence=false;stopAudio()}
function navigateTo(index){
  cancelSequence();
  currentWordIndex=(index+WORDS.length)%WORDS.length;
  renderWord();
}
function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms))}

async function playPraiseOnDemand(){
  await ensureAudioReady();
  cancelSequence();
  const token=sequenceId;
  isPlayingSequence=true;
  pulsePraise();
  await playRandomPraise(token);
  if(token===sequenceId)isPlayingSequence=false;
}

praiseButton.addEventListener("click",playPraiseOnDemand);
soundButton.addEventListener("click",async()=>{
  if(!soundEnabled){soundEnabled=true;await ensureAudioReady()}
  else{soundEnabled=false;cancelSequence()}
  soundButton.setAttribute("aria-label",soundEnabled?"Выключить звук":"Включить звук");
});
settingsButton.addEventListener("click",()=>{messageElement.textContent="Настройки пока не используются"});
previousButton.addEventListener("click",async()=>{await ensureAudioReady();navigateTo(currentWordIndex-1)});
nextButton.addEventListener("click",async()=>{await ensureAudioReady();navigateTo(currentWordIndex+1)});
playWordButton.addEventListener("click",async()=>{
  const unlockPromise=ensureAudioReady();
  if(isPlayingSequence)return;
  isPlayingSequence=true;
  await unlockPromise;
  const token=sequenceId;
  await playAudio(currentWord().wordAudio,token);
  if(token===sequenceId)isPlayingSequence=false;
});

document.addEventListener("visibilitychange",()=>{
  if(document.hidden)cancelSequence();
});

if("serviceWorker" in navigator){
  window.addEventListener("load",async()=>{
    try{
      const registration=await navigator.serviceWorker.register("./service-worker.js",{updateViaCache:"none"});
      await registration.update();
    }catch(error){
      console.warn("Service Worker не зарегистрирован",error);
    }
  });

  navigator.serviceWorker.addEventListener("controllerchange",()=>{
    if(sessionStorage.getItem("rbs-sw-reloaded")==="1")return;
    sessionStorage.setItem("rbs-sw-reloaded","1");
    window.location.reload();
  });
}

renderWord();
