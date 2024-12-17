let audioContext;
let analyser;
let microphone;
let dataArray;
let frequencyArray;
let animationFrameId;
let isMeasuring = false;

let highestDecibel = 0;
let highestFrequency = 0;
let lowestFrequency = Infinity;

async function startMeasurement() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;

    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    frequencyArray = new Float32Array(bufferLength);

    microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);

    document.getElementById("startButton").disabled = true;
    document.getElementById("stopButton").disabled = false;

    isMeasuring = true;
    measureSound();
  } catch (err) {
    document.getElementById("error").textContent = "Error accessing microphone. Please allow permission.";
  }
}

function stopMeasurement() {
  if (audioContext) {
    audioContext.close();
  }
  cancelAnimationFrame(animationFrameId);
  isMeasuring = false;

  document.getElementById("startButton").disabled = false;
  document.getElementById("stopButton").disabled = true;
}

function measureSound() {
  if (!isMeasuring) return;

  analyser.getByteFrequencyData(dataArray);
  analyser.getFloatFrequencyData(frequencyArray);

  const sum = dataArray.reduce((a, b) => a + b, 0);
  const averageAmplitude = sum / dataArray.length;
  const decibels = Math.round(20 * Math.log10(averageAmplitude || 1));

  if (decibels > highestDecibel) {
    highestDecibel = decibels;
  }

  let maxAmplitude = -Infinity;
  let dominantFrequency = 0;

  for (let i = 0; i < frequencyArray.length; i++) {
    if (frequencyArray[i] > maxAmplitude) {
      maxAmplitude = frequencyArray[i];
      dominantFrequency = i * (audioContext.sampleRate / 2) / frequencyArray.length;
    }
  }

  if (dominantFrequency > highestFrequency) {
    highestFrequency = dominantFrequency;
  }
  if (dominantFrequency < lowestFrequency && dominantFrequency > 0) {
    lowestFrequency = dominantFrequency;
  }

  updateUI(decibels, dominantFrequency);
  animationFrameId = requestAnimationFrame(measureSound);
}

function updateUI(decibels, dominantFrequency) {
  document.getElementById("decibelValue").textContent = decibels;
  document.getElementById("highestDecibel").textContent = highestDecibel;
  document.getElementById("currentFrequency").textContent = Math.round(dominantFrequency);
  document.getElementById("highestFrequency").textContent = Math.round(highestFrequency);
  document.getElementById("lowestFrequency").textContent = Math.round(lowestFrequency);

  updateScaleMarker(".intensity-scale", decibels / 100);
  updateScaleMarker(".frequency-scale", Math.log10(dominantFrequency + 1) / 4); // Normalize log scale
}

function updateScaleMarker(selector, position) {
  const scale = document.querySelector(selector);
  let marker = scale.querySelector(".color-marker");

  if (!marker) {
    marker = document.createElement("div");
    marker.classList.add("color-marker");
    scale.appendChild(marker);
  }

  position = Math.max(0, Math.min(position, 1)); // Clamp position to [0, 1]
  marker.style.left = `${position * 100}%`;
}
