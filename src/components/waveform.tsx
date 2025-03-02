import React, { useEffect } from 'react';

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

const WaveformViewer: React.FC = () => {
  useEffect(() => {
    let audioBuffer: AudioBuffer | null = null;

    const fileInput = document.getElementById(
      'fileInput',
    ) as HTMLInputElement | null;
    const drawButton = document.getElementById(
      'drawButton',
    ) as HTMLButtonElement | null;

    if (!fileInput || !drawButton) {
      return;
    }

    fileInput.addEventListener('change', function (event) {
      const target = event.target as HTMLInputElement;
      if (target && target.files && target.files.length > 0) {
        const file = target.files[0];
        const reader = new FileReader();
        reader.onload = function (e) {
          const audioContext = new (window.AudioContext ||
            window.webkitAudioContext)();
          if (e.target && e.target.result) {
            audioContext.decodeAudioData(
              e.target.result as ArrayBuffer,
              function (buffer) {
                audioBuffer = buffer;
                alert('Audio file loaded successfully.');
              },
              function () {
                alert('Error decoding audio data.');
              },
            );
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        alert('Please upload a .wav file.');
      }
    });

    drawButton.addEventListener('click', function () {
      const startTimeElement = document.getElementById(
        'startTime',
      ) as HTMLInputElement | null;
      const endTimeElement = document.getElementById(
        'endTime',
      ) as HTMLInputElement | null;

      if (!startTimeElement || !endTimeElement) {
        return;
      }

      const startTime = parseFloat(startTimeElement.value);
      const endTime = parseFloat(endTimeElement.value);

      if (audioBuffer) {
        drawWaveformSection(audioBuffer, startTime, endTime);
      } else {
        alert('Please load an audio file first.');
      }
    });

    function drawWaveformSection(
      buffer: AudioBuffer,
      startTime: number,
      endTime: number,
    ) {
      const canvas = document.getElementById(
        'canvas',
      ) as HTMLCanvasElement | null;
      if (!canvas) {
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }

      const width = canvas.width;
      const height = canvas.height;
      const sampleRate = buffer.sampleRate;
      const startSample = Math.floor(startTime * sampleRate);
      const endSample = Math.floor(endTime * sampleRate);
      const data = buffer.getChannelData(0).slice(startSample, endSample);

      ctx.clearRect(0, 0, width, height);
      ctx.beginPath();
      ctx.strokeStyle = '#D6D6D6';
      const step = Math.ceil(data.length / width);
      const amp = height / 2;

      for (let i = 0; i < width; i++) {
        const slice = data.slice(i * step, (i + 1) * step);
        const min = Math.min(...slice);
        const max = Math.max(...slice);
        ctx.moveTo(i, (1 + min) * amp);
        ctx.lineTo(i, (1 + max) * amp);
      }
      ctx.stroke();
    }
  }, []);

  return (
    <div>
      <div id="controls">
        <label htmlFor="fileInput">Upload .wav File:</label>
        <input type="file" id="fileInput" accept=".wav" />
        <label htmlFor="startTime">Start Time (s):</label>
        <input
          type="number"
          id="startTime"
          defaultValue="0"
          step="0.01"
          min="0"
        />
        <label htmlFor="endTime">End Time (s):</label>
        <input
          type="number"
          id="endTime"
          defaultValue="1"
          step="0.01"
          min="0"
        />
        <button id="drawButton">Draw Waveform Section</button>
      </div>
      <canvas id="canvas" width="3840" height="800"></canvas>
    </div>
  );
};

export default WaveformViewer;
