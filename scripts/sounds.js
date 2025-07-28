/**
 * Mapeamento de teclas para arquivos de som
 * Cada tecla corresponde a um arquivo de áudio específico
 */

export const soundMap = {
  // Primeira fileira (Q, W, E, R)
  keyq: "sounds/keyq.wav",
  keyw: "sounds/keyw.wav",
  keye: "sounds/keye.wav",
  keyr: "sounds/keyr.wav",

  // Segunda fileira (A, S, D, F)
  keya: "sounds/keya.wav",
  keys: "sounds/keys.wav",
  keyd: "sounds/keyd.wav",
  keyf: "sounds/keyf.wav",

  // Terceira fileira (T, Y, U, I)
  keyt: "sounds/keyt.wav",
  keyy: "sounds/keyy.wav",
  keyu: "sounds/keyu.wav",
  keyi: "sounds/brazilian-funk-detuned-snare.wav",

  // Quarta fileira (H, J, K, L)
  keyh: "sounds/brazilian-funk-kick-hard.wav",
  keyj: "sounds/brazilian-funk-detuned-snare.wav",
  keyk: "sounds/brazilian-funk-cowbell_C.wav",
  keyl: "sounds/jama-type-brazilian-funk-cowbell_146bpm_B_major.wav",
};

/**
 * Obtém o caminho do arquivo de som para uma tecla específica
 * @param {string} keyCode - Código da tecla (ex: "keyq")
 * @returns {string|null} - Caminho do arquivo ou null se não encontrado
 */
export function getSoundPath(keyCode) {
  return soundMap[keyCode] || null;
}

/**
 * Verifica se uma tecla possui som mapeado
 * @param {string} keyCode - Código da tecla
 * @returns {boolean} - True se a tecla possui som
 */
export function hasSound(keyCode) {
  return keyCode in soundMap;
}

/**
 * Obtém todas as teclas disponíveis
 * @returns {string[]} - Array com todos os códigos de tecla
 */
export function getAvailableKeys() {
  return Object.keys(soundMap);
}

/**
 * Obtém informações sobre o mapeamento de sons
 * @returns {Object} - Objeto com estatísticas do mapeamento
 */
export function getSoundMapInfo() {
  const keys = Object.keys(soundMap);
  return {
    totalKeys: keys.length,
    keys: keys,
    soundsDirectory: "sounds/",
    fileFormat: ".wav",
  };
}
