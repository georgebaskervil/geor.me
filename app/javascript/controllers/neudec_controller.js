import { Controller } from "@hotwired/stimulus";
import FFT from "fft.js";
import Plotly from "plotly.js-dist";

// Helper function moved to outer scope.
function writeString(view, offset, string) {
  for (let index = 0; index < string.length; index++) {
    view.setUint8(offset + index, string.codePointAt(index));
  }
}

export default class extends Controller {
  static targets = [
    "encodeWav",
    "analysisXML",
    "analysisWav",
    "analysisStats",
    "analysisPlot",
    "decodeXML", // add data-target="neudec.decodeXML" to your Decode XML file input
  ];

  connect() {
    console.log("Neudec controller connected.");
  }

  // ----- ENCODE: WAV to FFT XML -----
  encode() {
    console.log("Encode method triggered.");
    const wavFile = this.encodeWavTarget.files[0];
    if (!wavFile) {
      console.error("No WAV file selected.");
      return;
    }
    this.readWavFile(wavFile)
      .then((audioDataObject) => {
        console.log(
          "WAV file read for encoding, sample rate:",
          audioDataObject.sampleRate,
        );
        const audioData = audioDataObject.data;
        const originalLength = audioData.length;
        const n = Math.pow(2, Math.floor(Math.log2(originalLength)));
        if (n < 2) {
          throw new Error("Insufficient samples for FFT.");
        }
        console.log(
          `Using FFT size of: ${n} (from original ${originalLength} samples)`,
        );
        const truncatedData = audioData.slice(0, n);

        const fft = new FFT(n);
        const input = new Float64Array(n * 2);
        for (let index = 0; index < n; index++) {
          input[2 * index] = truncatedData[index];
          input[2 * index + 1] = 0;
        }
        const output = new Float64Array(n * 2);
        fft.transform(output, input);

        const fftValues = [];
        for (let index = 0; index < n; index++) {
          fftValues.push({
            real: output[2 * index],
            imag: output[2 * index + 1],
          });
        }
        const dataMin = Math.min(...truncatedData);
        const dataMax = Math.max(...truncatedData);
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<fft_data>\n`;
        xml += `  <sample_rate>${audioDataObject.sampleRate}</sample_rate>\n`;
        xml += `  <dtype>Float64</dtype>\n`;
        xml += `  <length>${n}</length>\n`;
        xml += `  <data_min>${dataMin}</data_min>\n`;
        xml += `  <data_max>${dataMax}</data_max>\n`;
        xml += `  <fft_values>\n`;
        for (const value of fftValues) {
          xml += `    <value>\n`;
          xml += `      <real>${value.real.toFixed(32)}</real>\n`;
          xml += `      <imag>${value.imag.toFixed(32)}</imag>\n`;
          xml += `    </value>\n`;
        }
        xml += `  </fft_values>\n</fft_data>`;
        console.log("Encoding complete, XML generated.");

        // Create blob and update download link.
        const blob = new Blob([xml], { type: "text/xml" });
        const url = URL.createObjectURL(blob);
        const downloadContainer = document.querySelector(
          "#encode-download-container",
        );
        if (downloadContainer) {
          downloadContainer.innerHTML = `<a class="neudec-download-link" href="${url}" download="encoded.xml">Download Encoded XML</a>`;
        }
      })
      .catch((error) => {
        console.error("Error during encoding:", error);
      });
  }

  // ----- DECODE: FFT XML to WAV -----
  decode() {
    console.log("Decode method triggered.");
    const xmlFile = this.decodeXMLTarget.files[0];
    if (!xmlFile) {
      console.error("No XML file selected for decoding.");
      document.querySelector("#download-link-container").textContent =
        "Please select an XML file.";
      return;
    }
    this.readXMLFile(xmlFile)
      .then((xmlData) => {
        console.log("XML Data read for decoding.");
        // Reconstruct audio with inverse FFT.
        const reconstructed = this.inverseFFT(xmlData.fftValues);
        console.log(
          "Inverse FFT performed, sample count:",
          reconstructed.length,
        );
        // Generate a WAV file blob from the PCM samples.
        const wavBlob = this.arrayToWav(reconstructed, xmlData.sample_rate);
        const url = URL.createObjectURL(wavBlob);
        const downloadContainer = document.querySelector(
          "#download-link-container",
        );
        downloadContainer.innerHTML = `<a class="neudec-download-link" href="${url}" download="decoded.wav">Download Decoded WAV</a>`;
      })
      .catch((error) => {
        console.error("Error during decoding:", error);
        document.querySelector("#download-link-container").textContent =
          "Error during decoding: " + error;
      });
  }

  // ----- ANALYZE: Compare WAV vs. Reconstructed from XML -----
  analyze() {
    console.log("Analyze method triggered.");
    const xmlFile = this.analysisXMLTarget.files[0];
    const wavFile = this.analysisWavTarget.files[0];

    console.log("XML File:", xmlFile);
    console.log("WAV File:", wavFile);

    if (!xmlFile || !wavFile) {
      console.error("Missing files for analysis.");
      this.analysisStatsTarget.textContent =
        "Please select both XML and WAV files.";
      return;
    }
    Promise.all([this.readXMLFile(xmlFile), this.readWavFile(wavFile)])
      .then(([xmlData, wavData]) => {
        console.log("XML Data:", xmlData);
        // Use wavData.data since readWavFile returns an object with sampleRate and data.
        console.log("WAV Data length:", wavData.data.length);
        const reconstructed = this.inverseFFT(xmlData.fftValues);
        console.log("Reconstructed data length:", reconstructed.length);
        const length_ = Math.min(reconstructed.length, wavData.data.length);
        const data1 = wavData.data.slice(0, length_);
        const data2 = reconstructed.slice(0, length_);
        console.log(
          "Data1 length:",
          data1.length,
          "Data2 length:",
          data2.length,
        );

        // Compute absolute differences.
        const differences = data1.map((v, index) => Math.abs(v - data2[index]));
        const maxDiff = Math.max(...differences);
        const avgDiff =
          differences.reduce((a, b) => a + b, 0) / differences.length;
        const variance =
          differences.reduce(
            (accumulator, v) => accumulator + Math.pow(v - avgDiff, 2),
            0,
          ) / differences.length;
        const stdDiff = Math.sqrt(variance);

        let statsText = "Absolute difference statistics:\n";
        statsText += `Maximum difference: ${maxDiff.toFixed(4)}\n`;
        statsText += `Average difference: ${avgDiff.toFixed(4)}\n`;
        statsText += `Standard deviation of difference: ${stdDiff.toFixed(4)}\n\n`;
        statsText +=
          "First 100 samples comparison:\nIndex | Input | Output | Difference\n";
        const sampleCount = Math.min(100, length_);
        for (let index = 0; index < sampleCount; index++) {
          statsText += `${index} | ${data1[index].toFixed(2)} | ${data2[index].toFixed(2)} | ${differences[index].toFixed(2)}\n`;
        }
        this.analysisStatsTarget.textContent = statsText;

        // Plot using Plotly.js.
        const indices = Array.from(
          { length: sampleCount },
          (_, index) => index,
        );
        const trace1 = {
          x: indices,
          y: data1.slice(0, sampleCount),
          mode: "lines+markers",
          name: "Input",
        };
        const trace2 = {
          x: indices,
          y: data2.slice(0, sampleCount),
          mode: "lines+markers",
          name: "Output",
        };
        const layout = {
          title: "First 100 samples: Input vs Output",
          xaxis: { title: "Index" },
          yaxis: { title: "Amplitude" },
        };
        console.log("Plotting analysis data.");
        Plotly.newPlot(this.analysisPlotTarget, [trace1, trace2], layout);
      })
      .catch((error) => {
        console.error("Error during analysis:", error);
        this.analysisStatsTarget.textContent =
          "Error during analysis: " + error;
      });
  }

  // ----- FILE READING HELPERS -----
  readXMLFile(file) {
    console.log("readXMLFile called.", file);
    return file.text().then((textContent) => {
      try {
        const parser = new DOMParser();
        const xmlDocument = parser.parseFromString(
          textContent,
          "application/xml",
        );
        const sample_rate = Number.parseFloat(
          xmlDocument.querySelector("sample_rate")?.textContent || "0",
        );
        const dtype = xmlDocument.querySelector("dtype")?.textContent || "";
        const length = Number.parseInt(
          xmlDocument.querySelector("length")?.textContent || "0",
          10,
        );
        const data_min = Number.parseFloat(
          xmlDocument.querySelector("data_min")?.textContent || "0",
        );
        const data_max = Number.parseFloat(
          xmlDocument.querySelector("data_max")?.textContent || "0",
        );
        const fftValues = [];
        const valueNodes = xmlDocument.querySelectorAll("fft_values value");
        console.log("Found FFT value nodes:", valueNodes.length);
        for (const node of valueNodes) {
          const real = Number.parseFloat(
            node.querySelector("real")?.textContent || "0",
          );
          const imag = Number.parseFloat(
            node.querySelector("imag")?.textContent || "0",
          );
          fftValues.push({ real, imag });
        }
        return {
          sample_rate,
          dtype,
          length,
          data_min,
          data_max,
          fftValues,
        };
      } catch (error) {
        console.error("Error parsing XML:", error);
        throw error;
      }
    });
  }

  readWavFile(file) {
    console.log("readWavFile called.", file);
    return file.arrayBuffer().then((arrayBuffer) => {
      const audioContext = new (globalThis.AudioContext ||
        globalThis.webkitAudioContext)();
      return new Promise((resolve, reject) => {
        audioContext.decodeAudioData(
          arrayBuffer,
          (buffer) => {
            console.log("WAV decoded, duration:", buffer.duration);
            // Convert to mono by taking the first channel.
            const channelData = buffer.getChannelData(0);
            resolve({
              sampleRate: buffer.sampleRate,
              data: [...channelData],
            });
          },
          (errorEvent) => {
            console.error("Error decoding WAV:", errorEvent);
            reject(errorEvent);
          },
        );
      });
    });
  }

  // ----- FFT HELPERS -----
  inverseFFT(fftValues) {
    console.log("inverseFFT called with", fftValues.length, "values.");
    const n = fftValues.length;
    const fft = new FFT(n);
    const input = new Float64Array(n * 2);
    for (let index = 0; index < n; index++) {
      input[2 * index] = fftValues[index].real;
      input[2 * index + 1] = fftValues[index].imag;
    }
    const output = new Float64Array(n * 2);
    fft.inverseTransform(output, input);
    const reconstructed = [];
    for (let index = 0; index < n; index++) {
      reconstructed.push(output[2 * index] / n);
    }
    console.log("Inverse FFT completed.");
    return reconstructed;
  }

  // ----- WAV FILE CONSTRUCTION HELPER -----
  arrayToWav(samples, sampleRate) {
    console.log("Generating WAV file from samples.");
    // Create a minimal 16-bit PCM Wave file.
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // RIFF header.
    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, "WAVE");
    // fmt subchunk.
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    // data subchunk.
    writeString(view, 36, "data");
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (const sample of samples) {
      // Clamp to the range [-1, 1] and convert to 16-bit PCM.
      let s = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, s < 0 ? s * 0x80_00 : s * 0x7f_ff, true);
      offset += 2;
    }

    return new Blob([view], { type: "audio/wav" });
  }
}
