/**
 * Bateria Online - Sistema de Bateria Virtual
 * Permite tocar sons, gravar composições e visualizar áudio
 */

import { soundMap } from "./sounds.js";

// ===== CONSTANTES E CONFIGURAÇÕES =====
const CONFIG = {
  COMPOSITION_DELAY: 250, // ms entre cada nota na composição
  KEY_ACTIVE_DURATION: 300, // ms que a tecla fica ativa
  PLAYBACK_END_DELAY: 300, // ms de delay apos o fim da reprodução
  STORAGE_PREFIX: "comp_", // prefixo para localStorage
  KEY_MAPPING_STORAGE: "key_mapping", // chave para mapeamento customizado
};

// ===== ESTADO DA APLICAÇÃO =====
const AppState = {
  activeTimeouts: [],
  isRecording: false,
  isTypingName: false,
  isVisualizing: false,
  recordStartTime: 0,
  recordedSequence: [],
  customKeyMapping: {}, // mapeamento customizado de teclas
  isWaitingForKey: false, // indica se está aguardando uma tecla para mapeamento
  currentMappingPad: null, // pad atual sendo mapeado
};

// ===== ELEMENTOS DO DOM =====
const DOMElements = {
  // Canvas e contexto de áudio
  canvas: document.getElementById("visualizer"),

  // Inputs
  compositionInput: document.getElementById("input-composition"),
  saveNameInput: document.getElementById("save-name-input"),
  savedListSelect: document.getElementById("saved-list-select"),

  // Botões
  playCompositionBtn: document.getElementById("play-composition-btn"),
  startRecordBtn: document.getElementById("start-record-btn"),
  stopRecordBtn: document.getElementById("stop-record-btn"),
  playRecordBtn: document.getElementById("play-record-btn"),
  saveBtn: document.getElementById("save-btn"),
  loadPlayBtn: document.getElementById("load-play-btn"),
  deleteBtn: document.getElementById("delete-btn"),

  // Teclas
  keys: document.querySelectorAll(".key"),

  // Customização de Mapeamento
  keyMappingControls: document.getElementById("key-mapping-controls"),
  saveKeyMappingBtn: document.getElementById("save-key-mapping-btn"),
  resetKeyMappingBtn: document.getElementById("reset-key-mapping-btn"),
};

// ===== CONFIGURAÇÃO DE ÁUDIO =====
const AudioManager = {
  context: null,
  analyser: null,
  dataArray: null,

  init() {
    try {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 256;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    } catch (error) {
      console.error("Erro ao inicializar contexto de áudio:", error);
    }
  },

  async resumeContext() {
    if (this.context && this.context.state === "suspended") {
      try {
        await this.context.resume();
      } catch (error) {
        console.error("Erro ao retomar contexto de áudio:", error);
      }
    }
  },
};

// ===== UTILITÁRIOS =====
const Utils = {
  /**
   * Limpa todos os timeouts ativos
   */
  clearActiveTimeouts() {
    AppState.activeTimeouts.forEach((id) => clearTimeout(id));
    AppState.activeTimeouts = [];
  },

  /**
   * Controla o estado dos botões durante reprodução
   * @param {boolean} isPlaying - Se está tocando
   */
  togglePlaybackButtons(isPlaying) {
    DOMElements.startRecordBtn.disabled = isPlaying;
    DOMElements.stopRecordBtn.disabled = !isPlaying;
    DOMElements.playRecordBtn.disabled = isPlaying;
  },

  /**
   * Mostra mensagem de erro de forma amigável
   * @param {string} message - Mensagem de erro
   */
  showError(message) {
    alert(message);
  },

  /**
   * Mostra mensagem de sucesso
   * @param {string} message - Mensagem de sucesso
   */
  showSuccess(message) {
    alert(message);
  },

  /**
   * Valida se uma string não está vazia
   * @param {string} str - String para validar
   * @returns {boolean}
   */
  isValidString(str) {
    return str && str.trim().length > 0;
  },

  /**
   * Converte código de tecla para letra legível
   * @param {string} keyCode - Código da tecla (ex: "keyq")
   * @returns {string} - Letra maiúscula (ex: "Q")
   */
  keyCodeToLetter(keyCode) {
    return keyCode.replace("key", "").toUpperCase();
  },

  /**
   * Converte letra para código de tecla
   * @param {string} letter - Letra (ex: "Q")
   * @returns {string} - Código da tecla (ex: "keyq")
   */
  letterToKeyCode(letter) {
    return `key${letter.toLowerCase()}`;
  },
};

// ===== GERENCIADOR DE MAPEAMENTO DE TECLAS =====
const KeyMappingManager = {
  /**
   * Inicializa o sistema de mapeamento de teclas
   */
  init() {
    this.loadCustomMapping();
    this.createMappingInterface();
    this.setupMappingEvents();
  },

  /**
   * Carrega mapeamento customizado do localStorage
   */
  loadCustomMapping() {
    try {
      const saved = localStorage.getItem(CONFIG.KEY_MAPPING_STORAGE);
      if (saved) {
        AppState.customKeyMapping = JSON.parse(saved);
      } else {
        // Usa mapeamento padrão se não houver customização
        this.resetToDefaultMapping();
      }
    } catch (error) {
      console.error("Erro ao carregar mapeamento:", error);
      this.resetToDefaultMapping();
    }
  },

  /**
   * Salva mapeamento customizado no localStorage
   */
  saveCustomMapping() {
    try {
      localStorage.setItem(
        CONFIG.KEY_MAPPING_STORAGE,
        JSON.stringify(AppState.customKeyMapping)
      );
      Utils.showSuccess("Mapeamento de teclas salvo com sucesso!");
      this.updatePadLabels();
    } catch (error) {
      console.error("Erro ao salvar mapeamento:", error);
      Utils.showError("Erro ao salvar mapeamento de teclas.");
    }
  },

  /**
   * Reseta para o mapeamento padrão
   */
  resetToDefaultMapping() {
    AppState.customKeyMapping = {
      keyq: "keyq",
      keyw: "keyw",
      keye: "keye",
      keyr: "keyr",
      keya: "keya",
      keys: "keys",
      keyd: "keyd",
      keyf: "keyf",
      keyt: "keyt",
      keyy: "keyy",
      keyu: "keyu",
      keyi: "keyi",
      keyh: "keyh",
      keyj: "keyj",
      keyk: "keyk",
      keyl: "keyl",
    };
  },

  /**
   * Cria a interface de mapeamento de teclas
   */
  createMappingInterface() {
    if (!DOMElements.keyMappingControls) return;

    DOMElements.keyMappingControls.innerHTML = "";

    // Nomes dos instrumentos para cada pad
    const instrumentNames = {
      keyq: "1",
      keyw: "2",
      keye: "3",
      keyr: "4",
      keya: "5",
      keys: "6",
      keyd: "7",
      keyf: "8",
      keyt: "9",
      keyy: "10",
      keyu: "11",
      keyi: "12",
      keyh: "13",
      keyj: "14",
      keyk: "15",
      keyl: "16",
    };

    Object.keys(soundMap).forEach((padKey) => {
      const mappingItem = document.createElement("div");
      mappingItem.className = "key-mapping-item";

      const label = document.createElement("label");
      label.textContent = instrumentNames[padKey] || padKey.toUpperCase();

      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 1;
      input.value = Utils.keyCodeToLetter(
        AppState.customKeyMapping[padKey] || padKey
      );
      input.dataset.padKey = padKey;
      input.addEventListener("focus", () =>
        this.startKeyCapture(padKey, input)
      );
      input.addEventListener("blur", () => this.stopKeyCapture());
      input.addEventListener("keydown", (e) =>
        this.handleKeyCapture(e, padKey, input)
      );

      mappingItem.appendChild(label);
      mappingItem.appendChild(input);
      DOMElements.keyMappingControls.appendChild(mappingItem);
    });
  },

  /**
   * Configura eventos para os botões de mapeamento
   */
  setupMappingEvents() {
    if (DOMElements.saveKeyMappingBtn) {
      DOMElements.saveKeyMappingBtn.addEventListener("click", () => {
        this.saveCustomMapping();
      });
    }

    if (DOMElements.resetKeyMappingBtn) {
      DOMElements.resetKeyMappingBtn.addEventListener("click", () => {
        if (
          confirm("Tem certeza que deseja resetar o mapeamento para o padrão?")
        ) {
          this.resetToDefaultMapping();
          this.createMappingInterface();
          this.updatePadLabels();
          Utils.showSuccess("Mapeamento resetado para o padrão!");
        }
      });
    }
  },

  /**
   * Inicia captura de tecla para um pad específico
   */
  startKeyCapture(padKey, input) {
    AppState.isWaitingForKey = true;
    AppState.currentMappingPad = padKey;
    input.placeholder = "Pressione uma tecla...";
    input.style.backgroundColor = "var(--color-primary)";
    input.style.color = "var(--color-primary-dark)";
  },

  stopKeyCapture() {
    AppState.isWaitingForKey = false;
    AppState.currentMappingPad = null;

    // Restaura estilo dos inputs
    const inputs = DOMElements.keyMappingControls.querySelectorAll("input");
    inputs.forEach((input) => {
      input.placeholder = "";
      input.style.backgroundColor = "";
      input.style.color = "";
    });
  },

  handleKeyCapture(event, padKey, input) {
    if (!AppState.isWaitingForKey) return;

    event.preventDefault();

    const key = event.key.toLowerCase();
    if (key.length === 1 && key.match(/[a-z]/)) {
      const newKeyCode = Utils.letterToKeyCode(key);

      const existingPad = Object.keys(AppState.customKeyMapping).find(
        (pad) => AppState.customKeyMapping[pad] === newKeyCode && pad !== padKey
      );

      if (existingPad) {
        Utils.showError(
          `A tecla ${key.toUpperCase()} já está sendo usada por outro pad!`
        );
        return;
      }

      AppState.customKeyMapping[padKey] = newKeyCode;
      input.value = key.toUpperCase();
      this.stopKeyCapture();
    }
  },

  updatePadLabels() {
    DOMElements.keys.forEach((keyElement) => {
      const padKey = keyElement.getAttribute("data-key");
      const mappedKey = AppState.customKeyMapping[padKey];
      if (mappedKey) {
        keyElement.textContent = Utils.keyCodeToLetter(mappedKey);
      }
    });
  },

  getPadForKey(keyCode) {
    return Object.keys(AppState.customKeyMapping).find(
      (padKey) => AppState.customKeyMapping[padKey] === keyCode
    );
  },
};

// ===== GERENCIADOR DE SONS =====
const SoundManager = {
  /**
   * Toca um som baseado na tecla pressionada
   * @param {string} keyCode - Código da tecla
   */
  async playSound(keyCode) {
    if (AppState.isTypingName || AppState.isWaitingForKey) return;

    // Usa mapeamento customizado para encontrar o pad correto
    const padKey = KeyMappingManager.getPadForKey(keyCode) || keyCode;

    await AudioManager.resumeContext();

    const audioSrc = soundMap[padKey];
    if (!audioSrc) return;

    try {
      const audio = new Audio(audioSrc);

      if (AudioManager.context && AudioManager.analyser) {
        const source = AudioManager.context.createMediaElementSource(audio);
        source.connect(AudioManager.analyser);
        AudioManager.analyser.connect(AudioManager.context.destination);
      }

      await audio.play();
      Visualizer.start();
    } catch (error) {
      console.error("Erro ao reproduzir som:", error);
    }

    this.activateKey(padKey);
    this.recordKeyPress(padKey);
  },

  /**
   * Ativa visualmente uma tecla
   * @param {string} keyCode - Código da tecla
   */
  activateKey(keyCode) {
    const keyElement = document.querySelector(`[data-key='${keyCode}']`);
    if (!keyElement) return;

    keyElement.classList.add("active");
    setTimeout(() => {
      keyElement.classList.remove("active");
    }, CONFIG.KEY_ACTIVE_DURATION);
  },

  /**
   * Registra o pressionamento de tecla durante gravação
   * @param {string} keyCode - Código da tecla
   */
  recordKeyPress(keyCode) {
    if (AppState.isRecording) {
      AppState.recordedSequence.push({
        key: keyCode,
        time: Date.now() - AppState.recordStartTime,
      });
    }
  },
};

// ===== GERENCIADOR DE COMPOSIÇÕES =====
const CompositionManager = {
  /**
   * Toca uma composição baseada em texto
   * @param {string} composition - String da composição
   */
  playTextComposition(composition) {
    if (!Utils.isValidString(composition)) return;

    Utils.clearActiveTimeouts();

    const songArray = composition.split("");
    let delay = 0;

    songArray.forEach((char) => {
      const keyCode = `key${char.toLowerCase()}`;
      const timeoutId = setTimeout(() => {
        SoundManager.playSound(keyCode);
      }, delay);

      AppState.activeTimeouts.push(timeoutId);
      delay += CONFIG.COMPOSITION_DELAY;
    });

    Utils.togglePlaybackButtons(true);

    // Finaliza a reprodução
    const totalDuration =
      songArray.length * CONFIG.COMPOSITION_DELAY + CONFIG.PLAYBACK_END_DELAY;
    setTimeout(() => {
      DOMElements.playRecordBtn.classList.remove("playing");
      Utils.togglePlaybackButtons(false);
    }, totalDuration);
  },

  /**
   * Toca uma sequência gravada
   * @param {Array} sequence - Array de objetos {key, time}
   */
  playRecordedSequence(sequence) {
    if (!sequence || sequence.length === 0) return;

    Utils.clearActiveTimeouts();
    DOMElements.playRecordBtn.classList.add("playing");
    Utils.togglePlaybackButtons(true);

    const totalDuration = sequence[sequence.length - 1].time;

    sequence.forEach((item) => {
      const timeoutId = setTimeout(() => {
        SoundManager.playSound(item.key);
      }, item.time);
      AppState.activeTimeouts.push(timeoutId);
    });

    setTimeout(() => {
      DOMElements.playRecordBtn.classList.remove("playing");
      Utils.togglePlaybackButtons(false);
    }, totalDuration + CONFIG.PLAYBACK_END_DELAY);
  },
};

// ===== GERENCIADOR DE GRAVAÇÃO =====
const RecordingManager = {
  /**
   * Inicia a gravação
   */
  startRecording() {
    AppState.recordedSequence = [];
    AppState.isRecording = true;
    AppState.recordStartTime = Date.now();

    DOMElements.startRecordBtn.classList.add("recording");
    DOMElements.startRecordBtn.innerHTML = "<span>🔴</span>Parar Gravação";
  },

  /**
   * Para a gravação
   */
  stopRecording() {
    AppState.isRecording = false;
    DOMElements.playRecordBtn.disabled = AppState.recordedSequence.length === 0;
    DOMElements.startRecordBtn.classList.remove("recording");
    DOMElements.startRecordBtn.innerHTML = "<span>🔴</span>Gravar";
  },

  /**
   * Alterna entre iniciar e parar gravação
   */
  toggleRecording() {
    if (AppState.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  },
};

// ===== GERENCIADOR DE ARMAZENAMENTO =====
const StorageManager = {
  /**
   * Salva uma composição no localStorage
   * @param {string} name - Nome da composição
   * @param {Array} sequence - Sequência a ser salva
   */
  saveComposition(name, sequence) {
    if (!Utils.isValidString(name)) {
      Utils.showError("Dê um nome para a composição.");
      return false;
    }

    if (!sequence || sequence.length === 0) {
      Utils.showError("Não há composição gravada para salvar.");
      return false;
    }

    try {
      const key = `${CONFIG.STORAGE_PREFIX}${name}`;
      localStorage.setItem(key, JSON.stringify(sequence));
      this.updateSavedList();
      Utils.showSuccess(`Composição "${name}" salva com sucesso!`);
      DOMElements.saveNameInput.value = "";
      return true;
    } catch (error) {
      console.error("Erro ao salvar composição:", error);
      Utils.showError(
        "Erro ao salvar composição. Verifique o espaço disponível."
      );
      return false;
    }
  },

  /**
   * Carrega uma composição do localStorage
   * @param {string} key - Chave da composição
   * @returns {Array|null} - Sequência carregada ou null
   */
  loadComposition(key) {
    if (!key) {
      Utils.showError("Selecione uma composição.");
      return null;
    }

    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Erro ao carregar composição:", error);
      Utils.showError("Erro ao carregar composição.");
      return null;
    }
  },

  /**
   * Remove uma composição do localStorage
   * @param {string} key - Chave da composição
   */
  deleteComposition(key) {
    if (!key) {
      Utils.showError("Selecione uma composição para deletar.");
      return false;
    }

    const confirmDelete = confirm(
      "Tem certeza que deseja deletar essa composição?"
    );
    if (!confirmDelete) return false;

    try {
      localStorage.removeItem(key);
      this.updateSavedList();
      Utils.showSuccess("Composição deletada com sucesso!");
      return true;
    } catch (error) {
      console.error("Erro ao deletar composição:", error);
      Utils.showError("Erro ao deletar composição.");
      return false;
    }
  },

  /**
   * Atualiza a lista de composições salvas
   */
  updateSavedList() {
    const list = DOMElements.savedListSelect;
    list.innerHTML =
      "<option disabled selected>Escolha uma composição</option>";

    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(CONFIG.STORAGE_PREFIX)) {
          const name = key.replace(CONFIG.STORAGE_PREFIX, "");
          const option = document.createElement("option");
          option.value = key;
          option.textContent = name;
          list.appendChild(option);
        }
      });
    } catch (error) {
      console.error("Erro ao atualizar lista:", error);
    }
  },
};

// ===== VISUALIZADOR DE ÁUDIO =====
const Visualizer = {
  /**
   * Inicia a visualização de áudio
   */
  start() {
    if (AppState.isVisualizing || !AudioManager.analyser) return;

    AppState.isVisualizing = true;
    this.draw();
  },

  /**
   * Desenha a visualização
   */
  draw() {
    if (!AudioManager.analyser || !DOMElements.canvas) return;

    const ctx = DOMElements.canvas.getContext("2d");

    const animate = () => {
      requestAnimationFrame(animate);

      AudioManager.analyser.getByteFrequencyData(AudioManager.dataArray);

      // Limpa o canvas
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, DOMElements.canvas.width, DOMElements.canvas.height);

      // Desenha as barras
      const barWidth =
        (DOMElements.canvas.width / AudioManager.dataArray.length) * 2.5;
      let x = 0;

      for (let i = 0; i < AudioManager.dataArray.length; i++) {
        const barHeight = AudioManager.dataArray[i];
        const red = 250;
        const green = 250 - barHeight;
        const blue = 50;

        ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        ctx.fillRect(
          x,
          DOMElements.canvas.height - barHeight / 2,
          barWidth,
          barHeight / 2
        );

        x += barWidth + 1;
      }
    };

    animate();
  },
};

// ===== EVENT LISTENERS =====
const EventManager = {
  /**
   * Inicializa todos os event listeners
   */
  init() {
    this.setupKeyboardEvents();
    this.setupButtonEvents();
    this.setupInputEvents();
  },

  /**
   * Configura eventos de teclado
   */
  setupKeyboardEvents() {
    document.body.addEventListener("keyup", (event) => {
      const keyCode = event.code.toLowerCase();
      SoundManager.playSound(keyCode);
    });

    // Eventos de clique nas teclas
    DOMElements.keys.forEach((element) => {
      element.addEventListener("click", () => {
        const keyCode = element.getAttribute("data-key");
        SoundManager.playSound(keyCode);
      });
    });
  },

  /**
   * Configura eventos dos botões
   */
  setupButtonEvents() {
    // Tocar composição
    DOMElements.playCompositionBtn.addEventListener("click", () => {
      const composition = DOMElements.compositionInput.value;
      CompositionManager.playTextComposition(composition);
    });

    // Controles de gravação
    DOMElements.startRecordBtn.addEventListener("click", () => {
      RecordingManager.toggleRecording();
    });

    DOMElements.stopRecordBtn.addEventListener("click", () => {
      Utils.clearActiveTimeouts();
      DOMElements.playRecordBtn.classList.remove("playing");
      Utils.togglePlaybackButtons(false);
    });

    DOMElements.playRecordBtn.addEventListener("click", () => {
      CompositionManager.playRecordedSequence(AppState.recordedSequence);
    });

    // Salvar e carregar
    DOMElements.saveBtn.addEventListener("click", () => {
      const name = DOMElements.saveNameInput.value.trim();
      StorageManager.saveComposition(name, AppState.recordedSequence);
    });

    DOMElements.loadPlayBtn.addEventListener("click", () => {
      const key = DOMElements.savedListSelect.value;
      const sequence = StorageManager.loadComposition(key);
      if (sequence) {
        CompositionManager.playRecordedSequence(sequence);
      }
    });

    DOMElements.deleteBtn.addEventListener("click", () => {
      const key = DOMElements.savedListSelect.value;
      StorageManager.deleteComposition(key);
    });
  },

  /**
   * Configura eventos dos inputs
   */
  setupInputEvents() {
    // Bloquear sons ao digitar nome da composição
    DOMElements.saveNameInput.addEventListener("focus", () => {
      AppState.isTypingName = true;
    });

    DOMElements.saveNameInput.addEventListener("blur", () => {
      AppState.isTypingName = false;
    });

    // Enter para tocar composição
    DOMElements.compositionInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        const composition = DOMElements.compositionInput.value;
        CompositionManager.playTextComposition(composition);
      }
    });
  },
};

// ===== INICIALIZAÇÃO =====
const App = {
  /**
   * Inicializa a aplicação
   */
  init() {
    try {
      AudioManager.init();
      EventManager.init();
      StorageManager.updateSavedList();
      KeyMappingManager.init();

      console.log("Bateria Online inicializada com sucesso!");
    } catch (error) {
      console.error("Erro ao inicializar aplicação:", error);
      Utils.showError("Erro ao inicializar a aplicação. Recarregue a página.");
    }
  },
};

// Inicializa quando o DOM estiver carregado
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", App.init);
} else {
  App.init();
}

// Exporta para uso em outros módulos se necessário
export {
  SoundManager,
  CompositionManager,
  StorageManager,
  Visualizer,
  KeyMappingManager,
};
