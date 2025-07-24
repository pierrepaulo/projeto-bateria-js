//Visualização com Web Audio API
const canvas = document.getElementById("visualizer");
const ctx = canvas.getContext("2d");

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 256;

const dataArray = new Uint8Array(analyser.frequencyBinCount);
let isVisualizing = false;

//Bloquear sons ao digitar nome da composição
let isTypingName = false;
const saveNameInput = document.getElementById("saveName");

saveNameInput.addEventListener("focus", () => {
  isTypingName = true;
});

saveNameInput.addEventListener("blur", () => {
  isTypingName = false;
});

//Sons pelo teclado
document.body.addEventListener("keyup", (event) => {
  playSound(event.code.toLowerCase());
});

//Composição por texto
document.querySelector(".composer button").addEventListener("click", () => {
  let song = document.querySelector("#input").value;
  if (song !== "") {
    let songArray = song.split("");
    playComposition(songArray);
  }
});

//Tocar som
function playSound(sounds) {
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  if (isTypingName) return;

  const originalAudio = document.querySelector(`#s_${sounds}`);
  const keyElement = document.querySelector(`div[data-key='${sounds}']`);

  if (originalAudio) {
    const audioClone = originalAudio.cloneNode(); //clona o áudio
    const source = audioCtx.createMediaElementSource(audioClone);

    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    audioClone.currentTime = 0;
    audioClone.play();

    visualize(); //mostra as ondas
  }

  if (keyElement) {
    keyElement.classList.add("active");
    setTimeout(() => {
      keyElement.classList.remove("active");
    }, 300);
  }

  if (isRecording) {
    recordedSequence.push({
      key: sounds,
      time: Date.now() - recordStartTime,
    });
  }
}

//Tocar composição por texto
function playComposition(songArray) {
  let wait = 0;
  for (let songItem of songArray) {
    const key = `key${songItem.toLowerCase()}`;
    setTimeout(() => {
      playSound(key);
    }, wait);
    wait += 250;
  }
}

//Clique nas teclas
document.querySelectorAll(".key").forEach((element) => {
  element.addEventListener("click", () => {
    const key = element.getAttribute("data-key");
    playSound(key);
  });
});

//Gravação
let isRecording = false;
let recordStartTime = 0;
let recordedSequence = [];

const btnStart = document.getElementById("startRecord");
const btnStop = document.getElementById("stopRecord");
const btnPlay = document.getElementById("playRecord");

//Iniciar gravação
btnStart.addEventListener("click", () => {
  recordedSequence = [];
  isRecording = true;
  recordStartTime = Date.now();
  btnStart.disabled = true;
  btnStop.disabled = false;
  btnPlay.disabled = true;
  btnStart.classList.add("recording");
});

//Parar gravação
btnStop.addEventListener("click", () => {
  isRecording = false;
  btnStart.disabled = false;
  btnStop.disabled = true;
  btnPlay.disabled = recordedSequence.length === 0;
  btnStart.classList.remove("recording");
});

//Reproduzir gravação
btnPlay.addEventListener("click", () => {
  if (recordedSequence.length > 0) {
    btnPlay.classList.add("playing");
    btnStart.disabled = true;
    btnStop.disabled = true;
    btnPlay.disabled = true;

    const totalDuration = recordedSequence[recordedSequence.length - 1].time;

    for (let item of recordedSequence) {
      setTimeout(() => {
        playSound(item.key);
      }, item.time);
    }

    setTimeout(() => {
      btnPlay.classList.remove("playing");
      btnStart.disabled = false;
      btnStop.disabled = true;
      btnPlay.disabled = false;
    }, totalDuration + 300);
  }
});

//Salvar composição
document.getElementById("saveBtn").addEventListener("click", () => {
  const name = document.getElementById("saveName").value.trim();
  if (!name) {
    alert("Dê um nome para a composição.");
    return;
  }
  if (recordedSequence.length === 0) {
    alert("Não há composição gravada para salvar.");
    return;
  }

  localStorage.setItem(`comp_${name}`, JSON.stringify(recordedSequence));
  updateSavedList();
  alert(`Composição "${name}" salva com sucesso!`);
});

//Atualizar lista de composições salvas
function updateSavedList() {
  const list = document.getElementById("savedList");
  list.innerHTML = "<option disabled selected>Escolha uma composição</option>";

  for (let key in localStorage) {
    if (key.startsWith("comp_")) {
      const name = key.replace("comp_", "");
      const option = document.createElement("option");
      option.value = key;
      option.textContent = name;
      list.appendChild(option);
    }
  }
}

//Tocar composição salva
document.getElementById("loadPlay").addEventListener("click", () => {
  const key = document.getElementById("savedList").value;
  if (!key) {
    alert("Selecione uma composição.");
    return;
  }

  const sequence = JSON.parse(localStorage.getItem(key));
  if (sequence && sequence.length > 0) {
    btnPlay.classList.add("playing");
    btnStart.disabled = true;
    btnStop.disabled = true;
    btnPlay.disabled = true;

    const totalDuration = sequence[sequence.length - 1].time;

    for (let item of sequence) {
      setTimeout(() => {
        playSound(item.key);
      }, item.time);
    }

    setTimeout(() => {
      btnPlay.classList.remove("playing");
      btnStart.disabled = false;
      btnStop.disabled = true;
      btnPlay.disabled = false;
    }, totalDuration + 300);
  }
});

//Atualiza lista ao carregar
updateSavedList();

//Deletar composição salva
document.getElementById("deleteBtn").addEventListener("click", () => {
  const key = document.getElementById("savedList").value;
  if (!key) {
    alert("Selecione uma composição para deletar.");
    return;
  }

  const confirmDelete = confirm(
    "Tem certeza que deseja deletar essa composição?"
  );
  if (!confirmDelete) return;

  localStorage.removeItem(key);
  updateSavedList();
  alert("Composição deletada com sucesso!");
});

//Visualizador de áudio
function visualize() {
  if (isVisualizing) return;
  isVisualizing = true;

  function draw() {
    requestAnimationFrame(draw);

    analyser.getByteFrequencyData(dataArray);

    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / dataArray.length) * 2.5;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
      const barHeight = dataArray[i];
      const r = 250;
      const g = 250 - barHeight;
      const b = 50;

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);

      x += barWidth + 1;
    }
  }

  draw();
}
