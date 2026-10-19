import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, MicOff, Upload, Play, Pause, Square, Volume2, VolumeX,
  Activity, Sliders, Cpu, Code, Download, RefreshCw, Radio,
  Waves, Zap, Sparkles, AlertTriangle, Check, Copy, HelpCircle,
  Disc, Layers, Settings2, Terminal
} from 'lucide-react';

// ==========================================
// 1. TypeScript 型別定義 (Types & Interfaces)
// ==========================================

export type MethodType = 'methodA' | 'methodB' | 'methodC';
export type InputSourceType = 'synth' | 'mic' | 'file';
export type CarrierWaveType = 'sine' | 'triangle' | 'square' | 'sawtooth';
export type ShaperPresetType = 'tanh' | 'hard' | 'fold' | 'asymmetric' | 'custom';
export type VocoderCarrierType = 'sawtooth' | 'square' | 'chord' | 'noise';

export interface MethodAParams {
  // Ring Modulator (AD633 / Diode Bridge)
  ringModFreq: number;        // 1 - 1000 Hz
  ringModWave: CarrierWaveType;
  ringModMix: number;         // 0 - 1
  // Nonlinear WaveShaper / Clipping (Diode / Op-Amp)
  shaperType: ShaperPresetType;
  drive: number;              // G: 0.5 - 20
  bias: number;               // b: -0.5 to 0.5 (Asymmetry)
  customFormula: string;      // JS expression using x, G, b
  shaperMix: number;          // 0 - 1
  // State-Variable Filter (TL074 Formant / Wah)
  filterType: BiquadFilterType;
  cutoff: number;             // 100 - 5000 Hz
  resonance: number;          // Q: 0.5 - 25
  lfoRate: number;            // Auto-wah speed: 0.1 - 15 Hz
  lfoDepth: number;           // Auto-wah depth: 0 - 2500 Hz
}

export interface MethodBParams {
  bandCount: number;          // 4, 8, 12, 16
  carrierType: VocoderCarrierType;
  carrierPitch: number;       // 50 - 400 Hz
  filterQ: number;            // 2 - 25
  formantShift: number;       // 0.5 - 2.0x
  envAttack: number;          // ms
  envRelease: number;         // ms
  sibilanceMix: number;       // High-pass consonant bleed 0 - 0.5
}

export interface MethodCParams {
  pitchSemitones: number;     // -12 to +12 semitones
  windowSizeMs: number;       // 20 - 100 ms grain/delay window
  bbdDelayMs: number;         // 1 - 80 ms base delay
  bbdLfoRate: number;         // 0.1 - 20 Hz Doppler clock LFO
  bbdLfoDepthMs: number;      // 0 - 15 ms
  bbdFeedback: number;        // 0 - 0.85
  bbdLowpassHz: number;       // 1000 - 14000 Hz (Bucket loss filter)
}

export interface SynthVocalParams {
  pitch: number;              // f0: 80 - 320 Hz
  vowel: 'A' | 'E' | 'I' | 'O' | 'U' | 'sweep';
  vibratoRate: number;        // 3 - 8 Hz
  vibratoDepth: number;       // 0 - 15 Hz
  autoTalk: boolean;          // Rhythmic syllable envelope
}

export interface PresetConfig {
  id: string;
  name: string;
  subtitle: string;
  method: MethodType;
  dryWet: number;
  methodA?: Partial<MethodAParams>;
  methodB?: Partial<MethodBParams>;
  methodC?: Partial<MethodCParams>;
}

// ==========================================
// 2. 預設參數與經典音色庫 (Presets)
// ==========================================

const DEFAULT_METHOD_A: MethodAParams = {
  ringModFreq: 65,
  ringModWave: 'sine',
  ringModMix: 0.85,
  shaperType: 'tanh',
  drive: 3.5,
  bias: 0.05,
  customFormula: 'Math.tanh(G * (x + b)) + 0.15 * Math.sin(4 * G * x)',
  shaperMix: 0.6,
  filterType: 'bandpass',
  cutoff: 1200,
  resonance: 4.5,
  lfoRate: 1.5,
  lfoDepth: 400,
};

const DEFAULT_METHOD_B: MethodBParams = {
  bandCount: 12,
  carrierType: 'sawtooth',
  carrierPitch: 110, // A2
  filterQ: 10,
  formantShift: 1.0,
  envAttack: 8,
  envRelease: 35,
  sibilanceMix: 0.15,
};

const DEFAULT_METHOD_C: MethodCParams = {
  pitchSemitones: -5,
  windowSizeMs: 45,
  bbdDelayMs: 12,
  bbdLfoRate: 2.5,
  bbdLfoDepthMs: 1.2,
  bbdFeedback: 0.25,
  bbdLowpassHz: 4500,
};

const PRESETS: PresetConfig[] = [
  {
    id: 'dalek',
    name: 'Dalek 科幻機甲 (AD633 環形調變)',
    subtitle: '30Hz 正弦載波相乘 + 二極體飽和削波',
    method: 'methodA',
    dryWet: 0.95,
    methodA: {
      ringModFreq: 35,
      ringModWave: 'sine',
      ringModMix: 0.95,
      shaperType: 'tanh',
      drive: 4.2,
      bias: 0.0,
      shaperMix: 0.7,
      filterType: 'lowpass',
      cutoff: 2400,
      resonance: 2.5,
      lfoRate: 0.5,
      lfoDepth: 0,
    }
  },
  {
    id: 'walkie',
    name: '軍用對講機破音 (非對稱削波 + 帶通)',
    subtitle: '高增益奇偶諧波失真 + 1.1kHz 窄頻帶通濾波',
    method: 'methodA',
    dryWet: 1.0,
    methodA: {
      ringModFreq: 10,
      ringModWave: 'sine',
      ringModMix: 0.0,
      shaperType: 'asymmetric',
      drive: 9.5,
      bias: 0.18,
      shaperMix: 0.95,
      filterType: 'bandpass',
      cutoff: 1150,
      resonance: 6.0,
      lfoRate: 1.0,
      lfoDepth: 0,
    }
  },
  {
    id: 'wavefold_alien',
    name: 'Buchla 波折外星人 (Wavefolder + Auto-Wah)',
    subtitle: '正弦波折函數 sin(G*x) + 狀態變數動態共振峰',
    method: 'methodA',
    dryWet: 0.9,
    methodA: {
      ringModFreq: 180,
      ringModWave: 'triangle',
      ringModMix: 0.5,
      shaperType: 'fold',
      drive: 5.5,
      bias: 0.08,
      shaperMix: 0.85,
      filterType: 'bandpass',
      cutoff: 950,
      resonance: 9.5,
      lfoRate: 3.2,
      lfoDepth: 1100,
    }
  },
  {
    id: 'daft_vocoder',
    name: 'Daft Punk 合成器人聲 (12段類比聲碼器)',
    subtitle: '鋸齒波和弦載波 + 12 階帶通包絡跟隨',
    method: 'methodB',
    dryWet: 1.0,
    methodB: {
      bandCount: 12,
      carrierType: 'chord',
      carrierPitch: 110,
      filterQ: 12,
      formantShift: 1.05,
      envAttack: 5,
      envRelease: 30,
      sibilanceMix: 0.18,
    }
  },
  {
    id: 'monster_pitch',
    name: '深淵巨獸低音 (BBD 降調 -7 半音)',
    subtitle: '雙延遲線都卜勒降頻 + BBD 低通暗化',
    method: 'methodC',
    dryWet: 0.9,
    methodC: {
      pitchSemitones: -7,
      windowSizeMs: 50,
      bbdDelayMs: 15,
      bbdLfoRate: 0.8,
      bbdLfoDepthMs: 0.5,
      bbdFeedback: 0.2,
      bbdLowpassHz: 3200,
    }
  },
  {
    id: 'chipmunk_pitch',
    name: '氦氣花栗鼠 / 女聲化 (+6 半音)',
    subtitle: '高頻率延遲掃描升調 + 明亮共振',
    method: 'methodC',
    dryWet: 0.95,
    methodC: {
      pitchSemitones: 6,
      windowSizeMs: 35,
      bbdDelayMs: 8,
      bbdLfoRate: 1.2,
      bbdLfoDepthMs: 0.2,
      bbdFeedback: 0.1,
      bbdLowpassHz: 9000,
    }
  },
  {
    id: 'bbd_chorus_alien',
    name: 'MN3007 太空顫音 (BBD 強烈都卜勒調變)',
    subtitle: '高速時脈 LFO 調變產生經典類比失諧感',
    method: 'methodC',
    dryWet: 0.85,
    methodC: {
      pitchSemitones: 0,
      windowSizeMs: 40,
      bbdDelayMs: 18,
      bbdLfoRate: 6.5,
      bbdLfoDepthMs: 4.5,
      bbdFeedback: 0.65,
      bbdLowpassHz: 4000,
    }
  }
];

// 母音共振峰頻率表 (F1, F2, F3 Hz)
const VOWEL_FORMANTS: Record<string, [number, number, number]> = {
  A: [730, 1090, 2440],
  E: [530, 1840, 2480],
  I: [270, 2290, 3010],
  O: [570, 840, 2410],
  U: [300, 870, 2240],
};

// ==========================================
// 3. 數學轉換函數計算器 (WaveShaper Curve Generator)
// ==========================================

export function evaluateTransferFunction(
  x: number,
  shaperType: ShaperPresetType,
  drive: number,
  bias: number,
  customFn?: (x: number, G: number, b: number) => number
): number {
  const xb = x + bias;
  let y = xb;

  switch (shaperType) {
    case 'tanh':
      // 矽二極體軟削波 (Soft Silicon Clipping)
      y = Math.tanh(drive * xb);
      break;
    case 'hard':
      // Op-Amp 飽和硬削波 (Hard Clipping)
      y = Math.max(-0.85, Math.min(0.85, drive * xb));
      break;
    case 'fold':
      // Buchla / Serge 波折器 (Wavefolder)
      y = Math.sin(drive * xb);
      break;
    case 'asymmetric':
      // 鍺二極體 / 真空管非對稱削波 (產生豐富偶次諧波)
      y = xb >= 0
        ? Math.tanh(drive * xb)
        : 0.55 * Math.tanh(1.8 * drive * xb);
      break;
    case 'custom':
      if (customFn) {
        try {
          const res = customFn(x, drive, bias);
          y = Number.isFinite(res) ? Math.max(-1.2, Math.min(1.2, res)) : 0;
        } catch {
          y = Math.tanh(drive * xb);
        }
      }
      break;
  }
  return Math.max(-1, Math.min(1, y));
}

export function buildWaveShaperCurve(
  shaperType: ShaperPresetType,
  drive: number,
  bias: number,
  customFormula: string,
  samples = 4096
): { curve: Float32Array; error: string | null } {
  const curve = new Float32Array(samples);
  let customFn: ((x: number, G: number, b: number) => number) | undefined;
  let error: string | null = null;

  if (shaperType === 'custom') {
    try {
      // 建立安全的數學函數評估器
      customFn = new Function('x', 'G', 'b', `return (${customFormula});`) as (
        x: number,
        G: number,
        b: number
      ) => number;
      // 測試執行一次確認語法無誤
      const testVal = customFn(0.5, drive, bias);
      if (typeof testVal !== 'number' || Number.isNaN(testVal)) {
        error = '公式回傳值必須為有效數字 (Number)';
      }
    } catch (err: any) {
      error = err?.message || '自訂數學公式語法錯誤';
    }
  }

  // 計算 DC offset 校正，避免強烈偏壓造成喇叭直流爆音
  const zeroOffset = evaluateTransferFunction(0, shaperType, drive, bias, customFn);

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / (samples - 1) - 1; // -1 to +1
    const rawY = evaluateTransferFunction(x, shaperType, drive, bias, customFn);
    curve[i] = Math.max(-1, Math.min(1, rawY - zeroOffset * 0.5));
  }

  return { curve, error };
}

// ==========================================
// 4. 主元件：AnalogVoiceChangerLab
// ==========================================

export default function App() {
  // --- 系統與音訊狀態 ---
  const [isAudioRunning, setIsAudioRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'lab' | 'github'>('lab');
  const [activeMethod, setActiveMethod] = useState<MethodType>('methodA');
  const [inputSource, setInputSource] = useState<InputSourceType>('synth');
  const [isMuted, setIsMuted] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.85);
  const [dryWetMix, setDryWetMix] = useState(0.9);
  const [echoCancel, setEchoCancel] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('點擊「啟動類比音訊引擎」開始即時聲音實驗');
  const [formulaError, setFormulaError] = useState<string | null>(null);

  // --- 錄音與音檔狀態 ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isFilePlaying, setIsFilePlaying] = useState(false);

  // --- 三種方法的參數狀態 ---
  const [methodA, setMethodA] = useState<MethodAParams>(DEFAULT_METHOD_A);
  const [methodB, setMethodB] = useState<MethodBParams>(DEFAULT_METHOD_B);
  const [methodC, setMethodC] = useState<MethodCParams>(DEFAULT_METHOD_C);
  const [synthParams, setSynthParams] = useState<SynthVocalParams>({
    pitch: 145,
    vowel: 'A',
    vibratoRate: 5.2,
    vibratoDepth: 4.5,
    autoTalk: true,
  });

  // --- Vocoder 即時頻帶能量條狀態 ---
  const [vocoderBandLevels, setVocoderBandLevels] = useState<number[]>(new Array(12).fill(0));
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  // --- Web Audio API Refs ---
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceGainRef = useRef<GainNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const wetGainRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // 輸入源 Refs
  const micStreamRef = useRef<MediaStream | null>(null);
  const micNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaElementNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const synthNodesRef = useRef<{
    oscs: OscillatorNode[];
    vibOsc: OscillatorNode;
    vibGain: GainNode;
    formants: BiquadFilterNode[];
    syllableGain: GainNode;
    output: GainNode;
    timerId?: number;
  } | null>(null);

  // Method A 節點 Refs
  const methodANodesRef = useRef<{
    input: GainNode;
    ringCarrierOsc: OscillatorNode;
    ringMultiplier: GainNode;
    ringCleanGain: GainNode;
    ringWetGain: GainNode;
    waveShaper: WaveShaperNode;
    shaperCleanGain: GainNode;
    shaperWetGain: GainNode;
    svfFilter: BiquadFilterNode;
    wahLfoOsc: OscillatorNode;
    wahLfoGain: GainNode;
    output: GainNode;
  } | null>(null);

  // Method B (Vocoder) 節點 Refs
  const methodBNodesRef = useRef<{
    input: GainNode;
    carrierOscs: OscillatorNode[];
    noiseNode: AudioBufferSourceNode | null;
    carrierGain: GainNode;
    analysisFilters: BiquadFilterNode[];
    analysers: AnalyserNode[];
    synthFilters: BiquadFilterNode[];
    bandGains: GainNode[];
    sibilanceFilter: BiquadFilterNode;
    sibilanceGain: GainNode;
    output: GainNode;
  } | null>(null);

  // Method C (BBD Pitch & Delay) 節點 Refs
  const methodCNodesRef = useRef<{
    input: GainNode;
    scriptProcessor: ScriptProcessorNode;
    bbdDelay: DelayNode;
    bbdLfoOsc: OscillatorNode;
    bbdLfoGain: GainNode;
    bbdFeedbackGain: GainNode;
    bbdLowpass: BiquadFilterNode;
    output: GainNode;
    // Pitch shift ring buffer state
    buffer: Float32Array;
    writeIndex: number;
    phase: number;
  } | null>(null);

  // 視覺化 Canvas Refs
  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const transferCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // 保存最新參數供 ScriptProcessor 與動畫讀取
  const methodCRef = useRef<MethodCParams>(methodC);
  useEffect(() => {
    methodCRef.current = methodC;
  }, [methodC]);

  const methodBRef = useRef<MethodBParams>(methodB);
  useEffect(() => {
    methodBRef.current = methodB;
  }, [methodB]);

  const activeMethodRef = useRef<MethodType>(activeMethod);
  useEffect(() => {
    activeMethodRef.current = activeMethod;
  }, [activeMethod]);

  // ==========================================
  // 5. 建立與連接 Web Audio API 類比訊號引擎
  // ==========================================

  // 建構合成人聲產生器 (Harmonic Glottal Pulse + Formant Filters)
  const setupSynthVocalGenerator = useCallback((ctx: AudioContext, dest: AudioNode) => {
    if (synthNodesRef.current) {
      synthNodesRef.current.oscs.forEach(o => { try { o.stop(); o.disconnect(); } catch {} });
      try { synthNodesRef.current.vibOsc.stop(); } catch {}
      if (synthNodesRef.current.timerId) window.clearInterval(synthNodesRef.current.timerId);
    }

    const output = ctx.createGain();
    output.gain.value = 0.7;

    const syllableGain = ctx.createGain();
    syllableGain.gain.value = 1.0;

    // 三個並聯的母音共振峰帶通濾波器 (F1, F2, F3)
    const fFreqs = VOWEL_FORMANTS[synthParams.vowel === 'sweep' ? 'A' : synthParams.vowel];
    const formants = fFreqs.map((freq, idx) => {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = freq;
      bp.Q.value = idx === 0 ? 6 : 9;
      return bp;
    });

    const formantMerger = ctx.createGain();
    formantMerger.gain.value = 1.6;
    formants.forEach(f => {
      syllableGain.connect(f);
      f.connect(formantMerger);
    });
    formantMerger.connect(output);

    // 顫音 LFO (Vibrato)
    const vibOsc = ctx.createOscillator();
    vibOsc.frequency.value = synthParams.vibratoRate;
    const vibGain = ctx.createGain();
    vibGain.gain.value = synthParams.vibratoDepth;
    vibOsc.connect(vibGain);
    vibOsc.start();

    // 聲帶基頻與前 4 階泛音
    const harmonicAmps = [1.0, 0.65, 0.4, 0.25, 0.15];
    const oscs: OscillatorNode[] = [];
    harmonicAmps.forEach((amp, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.value = synthParams.pitch * (i + 1);
      vibGain.connect(osc.frequency);

      const hGain = ctx.createGain();
      hGain.gain.value = amp * 0.22;
      osc.connect(hGain);
      hGain.connect(syllableGain);
      osc.start();
      oscs.push(osc);
    });

    // 模擬說話音節起伏與母音變化
    let step = 0;
    const vowelKeys: ('A' | 'E' | 'I' | 'O' | 'U')[] = ['A', 'E', 'I', 'O', 'U'];
    const timerId = window.setInterval(() => {
      if (!audioCtxRef.current || audioCtxRef.current.state !== 'running') return;
      const now = ctx.currentTime;
      step = (step + 1) % 8;

      if (synthNodesRef.current) {
        // 如果開啟自動音節說話感
        if (synthParams.autoTalk) {
          const targetAmp = step % 2 === 0 ? 0.95 : 0.35;
          syllableGain.gain.setTargetAtTime(targetAmp, now, 0.04);
        } else {
          syllableGain.gain.setTargetAtTime(0.9, now, 0.05);
        }

        // 如果選擇自動母音掃描
        if (synthParams.vowel === 'sweep') {
          const vKey = vowelKeys[step % vowelKeys.length];
          const targetF = VOWEL_FORMANTS[vKey];
          formants.forEach((f, idx) => {
            f.frequency.setTargetAtTime(targetF[idx], now, 0.08);
          });
        }
      }
    }, 260);

    synthNodesRef.current = {
      oscs,
      vibOsc,
      vibGain,
      formants,
      syllableGain,
      output,
      timerId,
    };

    if (inputSource === 'synth') {
      output.connect(dest);
    }
  }, [synthParams, inputSource]);

  // 建構方案 A：AD633 環形調變 + 二極體非線性波塑形 + TL074 狀態變數濾波器
  const buildMethodAGraph = useCallback((ctx: AudioContext) => {
    const input = ctx.createGain();
    const output = ctx.createGain();

    // 1. 環形調變級 (Four-Quadrant Multiplier: X * Y)
    const ringCleanGain = ctx.createGain();
    const ringWetGain = ctx.createGain();
    const ringMultiplier = ctx.createGain();
    ringMultiplier.gain.value = 0; // 由載波直接調變 gain 達成正負相乘

    const ringCarrierOsc = ctx.createOscillator();
    ringCarrierOsc.type = methodA.ringModWave;
    ringCarrierOsc.frequency.value = methodA.ringModFreq;
    ringCarrierOsc.connect(ringMultiplier.gain);
    ringCarrierOsc.start();

    input.connect(ringCleanGain);
    input.connect(ringMultiplier);
    ringMultiplier.connect(ringWetGain);

    const postRingSum = ctx.createGain();
    ringCleanGain.connect(postRingSum);
    ringWetGain.connect(postRingSum);

    // 2. 二極體非線性削波級 (WaveShaper $y = f(x)$)
    const waveShaper = ctx.createWaveShaper();
    waveShaper.oversample = '4x';
    const { curve } = buildWaveShaperCurve(
      methodA.shaperType,
      methodA.drive,
      methodA.bias,
      methodA.customFormula
    );
    waveShaper.curve = curve;

    const shaperCleanGain = ctx.createGain();
    const shaperWetGain = ctx.createGain();
    postRingSum.connect(shaperCleanGain);
    postRingSum.connect(waveShaper);
    waveShaper.connect(shaperWetGain);

    const postShaperSum = ctx.createGain();
    shaperCleanGain.connect(postShaperSum);
    shaperWetGain.connect(postShaperSum);

    // 3. 狀態變數共振峰濾波器 (TL074 SVF + Auto-Wah LFO)
    const svfFilter = ctx.createBiquadFilter();
    svfFilter.type = methodA.filterType;
    svfFilter.frequency.value = methodA.cutoff;
    svfFilter.Q.value = methodA.resonance;

    const wahLfoOsc = ctx.createOscillator();
    wahLfoOsc.type = 'sine';
    wahLfoOsc.frequency.value = methodA.lfoRate;
    const wahLfoGain = ctx.createGain();
    wahLfoGain.gain.value = methodA.lfoDepth;
    wahLfoOsc.connect(wahLfoGain);
    wahLfoGain.connect(svfFilter.frequency);
    wahLfoOsc.start();

    postShaperSum.connect(svfFilter);
    svfFilter.connect(output);

    methodANodesRef.current = {
      input,
      ringCarrierOsc,
      ringMultiplier,
      ringCleanGain,
      ringWetGain,
      waveShaper,
      shaperCleanGain,
      shaperWetGain,
      svfFilter,
      wahLfoOsc,
      wahLfoGain,
      output,
    };
  }, []);

  // 建構方案 B：多頻段類比通道聲碼器 (Multi-Band Channel Vocoder)
  const buildMethodBGraph = useCallback((ctx: AudioContext, numBands: number) => {
    if (methodBNodesRef.current) {
      methodBNodesRef.current.carrierOscs.forEach(o => { try { o.stop(); o.disconnect(); } catch {} });
      try { methodBNodesRef.current.noiseNode?.stop(); } catch {}
      try { methodBNodesRef.current.output.disconnect(); } catch {}
    }

    const input = ctx.createGain();
    const output = ctx.createGain();
    output.gain.value = 2.8; // 補償窄頻帶通濾波的能量損失

    // 建立載波合成器 (Carrier Synth)
    const carrierGain = ctx.createGain();
    carrierGain.gain.value = 0.5;
    const carrierOscs: OscillatorNode[] = [];

    const ratios = methodB.carrierType === 'chord' ? [1, 1.25, 1.5, 2.0] : [1, 2.0];
    ratios.forEach(r => {
      const osc = ctx.createOscillator();
      osc.type = methodB.carrierType === 'square' ? 'square' : 'sawtooth';
      osc.frequency.value = methodB.carrierPitch * r;
      const g = ctx.createGain();
      g.gain.value = methodB.carrierType === 'noise' ? 0 : 1 / ratios.length;
      osc.connect(g);
      g.connect(carrierGain);
      osc.start();
      carrierOscs.push(osc);
    });

    // 白噪音載波 (耳語聲碼器或混合子音)
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = noiseBuffer;
    noiseNode.loop = true;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = methodB.carrierType === 'noise' ? 0.8 : 0.08;
    noiseNode.connect(noiseGain);
    noiseGain.connect(carrierGain);
    noiseNode.start();

    // 對數分佈頻率計算 (120Hz ~ 4800Hz)
    const minF = 120;
    const maxF = 4800;
    const analysisFilters: BiquadFilterNode[] = [];
    const analysers: AnalyserNode[] = [];
    const synthFilters: BiquadFilterNode[] = [];
    const bandGains: GainNode[] = [];

    for (let i = 0; i < numBands; i++) {
      const t = i / Math.max(1, numBands - 1);
      const centerFreq = minF * Math.pow(maxF / minF, t);

      // 1. 分析端帶通濾波器 (Modulator Analysis Filter)
      const anaFilter = ctx.createBiquadFilter();
      anaFilter.type = 'bandpass';
      anaFilter.frequency.value = centerFreq;
      anaFilter.Q.value = methodB.filterQ;

      const ana = ctx.createAnalyser();
      ana.fftSize = 256;
      ana.smoothingTimeConstant = 0.5;

      input.connect(anaFilter);
      anaFilter.connect(ana);

      // 2. 合成端帶通濾波器 (Carrier Synthesis Filter + Formant Shift)
      const synFilter = ctx.createBiquadFilter();
      synFilter.type = 'bandpass';
      synFilter.frequency.value = Math.min(12000, centerFreq * methodB.formantShift);
      synFilter.Q.value = methodB.filterQ;

      // 3. 壓控放大器 VCA (LM13700 由包絡控制)
      const vcaGain = ctx.createGain();
      vcaGain.gain.value = 0;

      carrierGain.connect(synFilter);
      synFilter.connect(vcaGain);
      vcaGain.connect(output);

      analysisFilters.push(anaFilter);
      analysers.push(ana);
      synthFilters.push(synFilter);
      bandGains.push(vcaGain);
    }

    // 高頻子音穿透 (Sibilance High-Pass Bleed，確保唇齒音清晰)
    const sibilanceFilter = ctx.createBiquadFilter();
    sibilanceFilter.type = 'highpass';
    sibilanceFilter.frequency.value = 3800;
    const sibilanceGain = ctx.createGain();
    sibilanceGain.gain.value = methodB.sibilanceMix;
    input.connect(sibilanceFilter);
    sibilanceFilter.connect(sibilanceGain);
    sibilanceGain.connect(output);

    methodBNodesRef.current = {
      input,
      carrierOscs,
      noiseNode,
      carrierGain,
      analysisFilters,
      analysers,
      synthFilters,
      bandGains,
      sibilanceFilter,
      sibilanceGain,
      output,
    };
  }, [methodB.carrierPitch, methodB.carrierType, methodB.filterQ, methodB.formantShift, methodB.sibilanceMix]);

  // 建構方案 C：斗鏈式延遲與雙延遲線都卜勒移頻 (BBD Delay & Doppler Pitch Shifter)
  const buildMethodCGraph = useCallback((ctx: AudioContext) => {
    const input = ctx.createGain();
    const output = ctx.createGain();

    // 1. 雙延遲線都卜勒移頻器 (Dual-Tap Crossfading Pitch Shifter)
    const scriptProcessor = ctx.createScriptProcessor(1024, 1, 1);
    const ringBufferLength = ctx.sampleRate * 2; // 2 秒環形緩衝區
    const ringBuffer = new Float32Array(ringBufferLength);
    let writeIdx = 0;
    let phase = 0;

    scriptProcessor.onaudioprocess = (e) => {
      const inBuf = e.inputBuffer.getChannelData(0);
      const outBuf = e.outputBuffer.getChannelData(0);
      const params = methodCRef.current;

      const pitchRatio = Math.pow(2, params.pitchSemitones / 12);
      const windowSamples = Math.max(256, Math.floor((params.windowSizeMs / 1000) * ctx.sampleRate));
      // 都卜勒讀取速率差
      const phaseStep = (1 - pitchRatio) / windowSamples;

      for (let i = 0; i < inBuf.length; i++) {
        ringBuffer[writeIdx] = inBuf[i];

        phase += phaseStep;
        if (phase >= 1) phase -= 1;
        if (phase < 0) phase += 1;

        const phase2 = (phase + 0.5) % 1.0;

        // 兩個相差 180 度的移動讀取頭 (Dual Delay Taps)
        const delay1 = phase * windowSamples;
        const delay2 = phase2 * windowSamples;

        const readPos1 = (writeIdx - delay1 + ringBufferLength) % ringBufferLength;
        const readPos2 = (writeIdx - delay2 + ringBufferLength) % ringBufferLength;

        // 線性插值讀取
        const idx1 = Math.floor(readPos1);
        const frac1 = readPos1 - idx1;
        const sample1 = ringBuffer[idx1] * (1 - frac1) + ringBuffer[(idx1 + 1) % ringBufferLength] * frac1;

        const idx2 = Math.floor(readPos2);
        const frac2 = readPos2 - idx2;
        const sample2 = ringBuffer[idx2] * (1 - frac2) + ringBuffer[(idx2 + 1) % ringBufferLength] * frac2;

        // Hanning 窗函數平滑交叉淡化 (消除跳躍爆音)
        const gain1 = 0.5 * (1 - Math.cos(2 * Math.PI * phase));
        const gain2 = 0.5 * (1 - Math.cos(2 * Math.PI * phase2));

        outBuf[i] = sample1 * gain1 + sample2 * gain2;
        writeIdx = (writeIdx + 1) % ringBufferLength;
      }
    };

    // 2. MN3007 / PT2399 斗鏈式電容延遲線與時脈 LFO 調變
    const bbdDelay = ctx.createDelay(0.5);
    bbdDelay.delayTime.value = methodC.bbdDelayMs / 1000;

    const bbdLfoOsc = ctx.createOscillator();
    bbdLfoOsc.type = 'sine';
    bbdLfoOsc.frequency.value = methodC.bbdLfoRate;

    const bbdLfoGain = ctx.createGain();
    bbdLfoGain.gain.value = methodC.bbdLfoDepthMs / 1000;
    bbdLfoOsc.connect(bbdLfoGain);
    bbdLfoGain.connect(bbdDelay.delayTime);
    bbdLfoOsc.start();

    // BBD 階梯電容高頻損耗低通濾波器 + 回授迴路
    const bbdLowpass = ctx.createBiquadFilter();
    bbdLowpass.type = 'lowpass';
    bbdLowpass.frequency.value = methodC.bbdLowpassHz;

    const bbdFeedbackGain = ctx.createGain();
    bbdFeedbackGain.gain.value = methodC.bbdFeedback;

    input.connect(scriptProcessor);
    scriptProcessor.connect(bbdDelay);
    bbdDelay.connect(bbdLowpass);
    bbdLowpass.connect(bbdFeedbackGain);
    bbdFeedbackGain.connect(bbdDelay); // 回授迴路
    bbdLowpass.connect(output);

    methodCNodesRef.current = {
      input,
      scriptProcessor,
      bbdDelay,
      bbdLfoOsc,
      bbdLfoGain,
      bbdFeedbackGain,
      bbdLowpass,
      output,
      buffer: ringBuffer,
      writeIndex: writeIdx,
      phase,
    };
  }, []);

  // 啟動或重啟音訊引擎
  const startAudioEngine = async () => {
    try {
      let ctx = audioCtxRef.current;
      if (!ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        ctx = new AudioCtx();
        audioCtxRef.current = ctx;

        // 建立主幹節點
        const sourceGain = ctx.createGain();
        const dryGain = ctx.createGain();
        const wetGain = ctx.createGain();
        const masterGain = ctx.createGain();
        const inputAnalyser = ctx.createAnalyser();
        const outputAnalyser = ctx.createAnalyser();
        const streamDest = ctx.createMediaStreamDestination();

        inputAnalyser.fftSize = 2048;
        outputAnalyser.fftSize = 2048;

        sourceGainRef.current = sourceGain;
        dryGainRef.current = dryGain;
        wetGainRef.current = wetGain;
        masterGainRef.current = masterGain;
        inputAnalyserRef.current = inputAnalyser;
        outputAnalyserRef.current = outputAnalyser;
        mediaStreamDestRef.current = streamDest;

        // 建立三個方案的訊號圖
        buildMethodAGraph(ctx);
        buildMethodBGraph(ctx, methodB.bandCount);
        buildMethodCGraph(ctx);

        // 連接輸入監測與乾訊號路徑
        sourceGain.connect(inputAnalyser);
        sourceGain.connect(dryGain);
        dryGain.connect(masterGain);

        // 連接三個方案的輸入
        if (methodANodesRef.current) sourceGain.connect(methodANodesRef.current.input);
        if (methodBNodesRef.current) sourceGain.connect(methodBNodesRef.current.input);
        if (methodCNodesRef.current) sourceGain.connect(methodCNodesRef.current.input);

        // 預設連接當前選中的方案輸出到 WetGain
        const currentOut =
          activeMethod === 'methodA'
            ? methodANodesRef.current?.output
            : activeMethod === 'methodB'
            ? methodBNodesRef.current?.output
            : methodCNodesRef.current?.output;
        if (currentOut) currentOut.connect(wetGain);

        wetGain.connect(masterGain);
        masterGain.connect(outputAnalyser);
        outputAnalyser.connect(ctx.destination);
        outputAnalyser.connect(streamDest); // 供錄音下載使用

        // 建立內建合成人聲源
        setupSynthVocalGenerator(ctx, sourceGain);
      }

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      setIsAudioRunning(true);
      setStatusMessage('音訊引擎運作中 — 可即時切換三種硬體變聲架構並調整函數參數');
    } catch (err: any) {
      setStatusMessage(`啟動音訊失敗: ${err?.message || '請確認瀏覽器權限'}`);
    }
  };

  // 切換方案時的路由切換
  useEffect(() => {
    const ctx = audioCtxRef.current;
    const wetGain = wetGainRef.current;
    if (!ctx || !wetGain) return;

    try { methodANodesRef.current?.output.disconnect(); } catch {}
    try { methodBNodesRef.current?.output.disconnect(); } catch {}
    try { methodCNodesRef.current?.output.disconnect(); } catch {}

    if (activeMethod === 'methodA' && methodANodesRef.current) {
      methodANodesRef.current.output.connect(wetGain);
    } else if (activeMethod === 'methodB' && methodBNodesRef.current) {
      methodBNodesRef.current.output.connect(wetGain);
    } else if (activeMethod === 'methodC' && methodCNodesRef.current) {
      methodCNodesRef.current.output.connect(wetGain);
    }
  }, [activeMethod]);

  // 切換輸入源 (合成人聲 / 麥克風 / 音檔)
  const handleSwitchInputSource = async (newSource: InputSourceType) => {
    if (!isAudioRunning) {
      await startAudioEngine();
    }
    const ctx = audioCtxRef.current;
    const sourceGain = sourceGainRef.current;
    if (!ctx || !sourceGain) return;

    // 先斷開既有連接
    try { synthNodesRef.current?.output.disconnect(); } catch {}
    try { micNodeRef.current?.disconnect(); } catch {}
    try { mediaElementNodeRef.current?.disconnect(); } catch {}

    if (newSource === 'mic') {
      try {
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach(t => t.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: echoCancel,
            noiseSuppression: false,
            autoGainControl: false,
          }
        });
        micStreamRef.current = stream;
        const micNode = ctx.createMediaStreamSource(stream);
        micNode.connect(sourceGain);
        micNodeRef.current = micNode;
        setInputSource('mic');
        setStatusMessage('已切換至「麥克風即時收音」— 強烈建議配戴耳機以防正回授嘯叫！');
      } catch (err: any) {
        setStatusMessage(`無法存取麥克風: ${err?.message || '權限遭拒，已維持合成人聲輸入'}`);
        synthNodesRef.current?.output.connect(sourceGain);
        setInputSource('synth');
      }
    } else if (newSource === 'file') {
      if (audioElementRef.current) {
        if (!mediaElementNodeRef.current) {
          mediaElementNodeRef.current = ctx.createMediaElementSource(audioElementRef.current);
        }
        mediaElementNodeRef.current.connect(sourceGain);
      }
      setInputSource('file');
      setStatusMessage('已切換至「音訊檔案輸入」— 請上傳或播放音檔進行變聲測試');
    } else {
      synthNodesRef.current?.output.connect(sourceGain);
      setInputSource('synth');
      setStatusMessage('已切換至「內建合成人聲產生器」— 自動模擬聲帶泛音與母音共振');
    }
  };

  // ==========================================
  // 6. 即時同步參數至 Web Audio 節點
  // ==========================================

  // Master Volume & Dry/Wet
  useEffect(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    if (masterGainRef.current) {
      masterGainRef.current.gain.setTargetAtTime(isMuted ? 0 : masterVolume, now, 0.02);
    }
    if (dryGainRef.current && wetGainRef.current) {
      dryGainRef.current.gain.setTargetAtTime(1 - dryWetMix, now, 0.02);
      wetGainRef.current.gain.setTargetAtTime(dryWetMix, now, 0.02);
    }
  }, [masterVolume, dryWetMix, isMuted]);

  // 同步合成人聲參數
  useEffect(() => {
    const ctx = audioCtxRef.current;
    const synth = synthNodesRef.current;
    if (!ctx || !synth) return;
    const now = ctx.currentTime;

    synth.oscs.forEach((osc, i) => {
      osc.frequency.setTargetAtTime(synthParams.pitch * (i + 1), now, 0.03);
    });
    synth.vibOsc.frequency.setTargetAtTime(synthParams.vibratoRate, now, 0.03);
    synth.vibGain.gain.setTargetAtTime(synthParams.vibratoDepth, now, 0.03);

    if (synthParams.vowel !== 'sweep') {
      const fFreqs = VOWEL_FORMANTS[synthParams.vowel];
      synth.formants.forEach((f, idx) => {
        f.frequency.setTargetAtTime(fFreqs[idx], now, 0.04);
      });
    }
  }, [synthParams]);

  // 同步 Method A 參數
  useEffect(() => {
    const { curve, error } = buildWaveShaperCurve(
      methodA.shaperType,
      methodA.drive,
      methodA.bias,
      methodA.customFormula
    );
    setFormulaError(error);

    const ctx = audioCtxRef.current;
    const nodes = methodANodesRef.current;
    if (!ctx || !nodes) return;
    const now = ctx.currentTime;

    nodes.ringCarrierOsc.type = methodA.ringModWave;
    nodes.ringCarrierOsc.frequency.setTargetAtTime(methodA.ringModFreq, now, 0.02);
    nodes.ringCleanGain.gain.setTargetAtTime(1 - methodA.ringModMix, now, 0.02);
    nodes.ringWetGain.gain.setTargetAtTime(methodA.ringModMix, now, 0.02);

    nodes.waveShaper.curve = curve;
    nodes.shaperCleanGain.gain.setTargetAtTime(1 - methodA.shaperMix, now, 0.02);
    nodes.shaperWetGain.gain.setTargetAtTime(methodA.shaperMix, now, 0.02);

    nodes.svfFilter.type = methodA.filterType;
    nodes.svfFilter.frequency.setTargetAtTime(methodA.cutoff, now, 0.02);
    nodes.svfFilter.Q.setTargetAtTime(methodA.resonance, now, 0.02);
    nodes.wahLfoOsc.frequency.setTargetAtTime(methodA.lfoRate, now, 0.02);
    nodes.wahLfoGain.gain.setTargetAtTime(methodA.lfoDepth, now, 0.02);
  }, [methodA]);

  // 當 Vocoder 頻段數量或載波類型改變時重建 Method B
  useEffect(() => {
    const ctx = audioCtxRef.current;
    const sourceGain = sourceGainRef.current;
    const wetGain = wetGainRef.current;
    if (!ctx || !sourceGain || !wetGain) return;

    buildMethodBGraph(ctx, methodB.bandCount);
    if (methodBNodesRef.current) {
      sourceGain.connect(methodBNodesRef.current.input);
      if (activeMethod === 'methodB') {
        methodBNodesRef.current.output.connect(wetGain);
      }
    }
  }, [methodB.bandCount, methodB.carrierType, buildMethodBGraph, activeMethod]);

  // 同步 Method B 連續參數
  useEffect(() => {
    const ctx = audioCtxRef.current;
    const nodes = methodBNodesRef.current;
    if (!ctx || !nodes) return;
    const now = ctx.currentTime;

    const ratios = methodB.carrierType === 'chord' ? [1, 1.25, 1.5, 2.0] : [1, 2.0];
    nodes.carrierOscs.forEach((osc, idx) => {
      const r = ratios[idx] || 1;
      osc.frequency.setTargetAtTime(methodB.carrierPitch * r, now, 0.02);
    });

    const minF = 120;
    const maxF = 4800;
    const n = nodes.analysisFilters.length;
    for (let i = 0; i < n; i++) {
      const t = i / Math.max(1, n - 1);
      const centerFreq = minF * Math.pow(maxF / minF, t);
      nodes.analysisFilters[i].Q.setTargetAtTime(methodB.filterQ, now, 0.02);
      nodes.synthFilters[i].frequency.setTargetAtTime(
        Math.min(12000, centerFreq * methodB.formantShift),
        now,
        0.02
      );
      nodes.synthFilters[i].Q.setTargetAtTime(methodB.filterQ, now, 0.02);
    }

    nodes.sibilanceGain.gain.setTargetAtTime(methodB.sibilanceMix, now, 0.02);
  }, [methodB.carrierPitch, methodB.filterQ, methodB.formantShift, methodB.sibilanceMix, methodB.carrierType]);

  // 同步 Method C 參數
  useEffect(() => {
    const ctx = audioCtxRef.current;
    const nodes = methodCNodesRef.current;
    if (!ctx || !nodes) return;
    const now = ctx.currentTime;

    nodes.bbdDelay.delayTime.setTargetAtTime(methodC.bbdDelayMs / 1000, now, 0.03);
    nodes.bbdLfoOsc.frequency.setTargetAtTime(methodC.bbdLfoRate, now, 0.02);
    nodes.bbdLfoGain.gain.setTargetAtTime(methodC.bbdLfoDepthMs / 1000, now, 0.02);
    nodes.bbdFeedbackGain.gain.setTargetAtTime(methodC.bbdFeedback, now, 0.02);
    nodes.bbdLowpass.frequency.setTargetAtTime(methodC.bbdLowpassHz, now, 0.02);
  }, [methodC]);

  // ==========================================
  // 7. 即時視覺化繪圖迴圈 & Vocoder 包絡跟隨器更新
  // ==========================================

  // 繪製非線性轉換曲線 y = f(x)
  useEffect(() => {
    const canvas = transferCanvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx2d.clearRect(0, 0, w, h);

    // 繪製網格與座標軸
    ctx2d.strokeStyle = '#1e293b';
    ctx2d.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx2d.beginPath();
      ctx2d.moveTo((w * i) / 4, 0);
      ctx2d.lineTo((w * i) / 4, h);
      ctx2d.stroke();
      ctx2d.beginPath();
      ctx2d.moveTo(0, (h * i) / 4);
      ctx2d.lineTo(w, (h * i) / 4);
      ctx2d.stroke();
    }

    // 線性基準虛線 y = x
    ctx2d.strokeStyle = '#475569';
    ctx2d.setLineDash([4, 4]);
    ctx2d.beginPath();
    ctx2d.moveTo(0, h);
    ctx2d.lineTo(w, 0);
    ctx2d.stroke();
    ctx2d.setLineDash([]);

    // 繪製轉換函數曲線
    const { curve } = buildWaveShaperCurve(
      methodA.shaperType,
      methodA.drive,
      methodA.bias,
      methodA.customFormula,
      256
    );

    ctx2d.strokeStyle = '#38bdf8';
    ctx2d.lineWidth = 2.5;
    ctx2d.beginPath();
    for (let i = 0; i < curve.length; i++) {
      const px = (i / (curve.length - 1)) * w;
      const py = ((1 - curve[i]) * 0.5) * (h - 16) + 8;
      if (i === 0) ctx2d.moveTo(px, py);
      else ctx2d.lineTo(px, py);
    }
    ctx2d.stroke();
  }, [methodA.shaperType, methodA.drive, methodA.bias, methodA.customFormula]);

  // 主動畫迴圈：示波器、FFT 頻譜與 Vocoder 包絡跟隨計算
  useEffect(() => {
    const tempTimeBuf = new Float32Array(256);
    const inTimeData = new Uint8Array(2048);
    const outTimeData = new Uint8Array(2048);
    const outFreqData = new Uint8Array(1024);
    let frameCount = 0;

    const renderLoop = () => {
      animFrameRef.current = requestAnimationFrame(renderLoop);
      frameCount++;

      const audioCtx = audioCtxRef.current;

      // 1. 若處於運作狀態，更新 Vocoder 每個頻段的 Envelope Follower (RMS -> VCA Gain)
      if (audioCtx && audioCtx.state === 'running' && methodBNodesRef.current) {
        const bNodes = methodBNodesRef.current;
        const levels: number[] = [];
        const now = audioCtx.currentTime;
        const timeConst = (methodBRef.current.envAttack + methodBRef.current.envRelease) / 2000;

        for (let i = 0; i < bNodes.analysers.length; i++) {
          bNodes.analysers[i].getFloatTimeDomainData(tempTimeBuf);
          let sumSq = 0;
          for (let j = 0; j < tempTimeBuf.length; j++) {
            sumSq += tempTimeBuf[j] * tempTimeBuf[j];
          }
          const rms = Math.sqrt(sumSq / tempTimeBuf.length);
          const boosted = Math.min(1.0, rms * 8.5);
          levels.push(boosted);

          // 控制該頻段合成濾波器的 VCA Gain
          bNodes.bandGains[i].gain.setTargetAtTime(boosted, now, Math.max(0.005, timeConst));
        }

        if (frameCount % 3 === 0 && activeMethodRef.current === 'methodB') {
          setVocoderBandLevels(levels);
        }
      }

      // 2. 繪製雙軌時域示波器 (Input Dry vs Output Wet)
      const scopeCanvas = scopeCanvasRef.current;
      if (scopeCanvas) {
        const ctx = scopeCanvas.getContext('2d');
        if (ctx) {
          const w = scopeCanvas.width;
          const h = scopeCanvas.height;
          ctx.fillStyle = '#090d16';
          ctx.fillRect(0, 0, w, h);

          // 格線
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, h / 2);
          ctx.lineTo(w, h / 2);
          ctx.stroke();

          if (inputAnalyserRef.current && outputAnalyserRef.current && isAudioRunning) {
            inputAnalyserRef.current.getByteTimeDomainData(inTimeData);
            outputAnalyserRef.current.getByteTimeDomainData(outTimeData);

            // 尋找零交越點穩定觸發 (Zero-Crossing Trigger)
            let triggerIdx = 0;
            for (let i = 1; i < 512; i++) {
              if (outTimeData[i - 1] < 128 && outTimeData[i] >= 128) {
                triggerIdx = i;
                break;
              }
            }

            const samplesToDraw = 512;

            // 繪製原始輸入波形 (Dry - 虛線灰藍)
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let i = 0; i < samplesToDraw; i++) {
              const v = (inTimeData[triggerIdx + i] - 128) / 128;
              const x = (i / samplesToDraw) * w;
              const y = h / 2 - v * (h * 0.42);
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // 繪製變聲後輸出波形 (Wet - 霓虹琥珀/青色)
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            for (let i = 0; i < samplesToDraw; i++) {
              const v = (outTimeData[triggerIdx + i] - 128) / 128;
              const x = (i / samplesToDraw) * w;
              const y = h / 2 - v * (h * 0.42);
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          } else {
            // 未啟動時的靜態示意波
            ctx.strokeStyle = '#334155';
            ctx.beginPath();
            ctx.moveTo(0, h / 2);
            ctx.lineTo(w, h / 2);
            ctx.stroke();
          }
        }
      }

      // 3. 繪製頻域 FFT 頻譜分析儀
      const fftCanvas = fftCanvasRef.current;
      if (fftCanvas) {
        const ctx = fftCanvas.getContext('2d');
        if (ctx) {
          const w = fftCanvas.width;
          const h = fftCanvas.height;
          ctx.fillStyle = '#090d16';
          ctx.fillRect(0, 0, w, h);

          if (outputAnalyserRef.current && isAudioRunning) {
            outputAnalyserRef.current.getByteFrequencyData(outFreqData);
            const usefulBins = 260; // 聚焦在 0 ~ 5500Hz 人聲與諧波區間
            const barWidth = w / usefulBins;

            for (let i = 0; i < usefulBins; i++) {
              const val = outFreqData[i] / 255;
              const barH = val * (h - 18);
              const hue = 190 - val * 150; // 由青藍漸變至琥珀橘
              ctx.fillStyle = `hsla(${hue}, 90%, 55%, 0.85)`;
              ctx.fillRect(i * barWidth, h - barH, Math.max(1, barWidth - 1), barH);
            }
          }
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isAudioRunning]);

  // ==========================================
  // 8. 錄音與音檔上傳處理
  // ==========================================

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (uploadedFileUrl) URL.revokeObjectURL(uploadedFileUrl);
    const url = URL.createObjectURL(file);
    setUploadedFileUrl(url);
    setUploadedFileName(file.name);
    setIsFilePlaying(false);
    handleSwitchInputSource('file');
  };

  const toggleFilePlayback = async () => {
    if (!audioElementRef.current || !uploadedFileUrl) return;
    if (!isAudioRunning) await startAudioEngine();

    if (audioElementRef.current.paused) {
      await audioElementRef.current.play();
      setIsFilePlaying(true);
    } else {
      audioElementRef.current.pause();
      setIsFilePlaying(false);
    }
  };

  const toggleRecordingOutput = () => {
    if (!isAudioRunning || !mediaStreamDestRef.current) {
      setStatusMessage('請先啟動音訊引擎再開始錄製變聲輸出');
      return;
    }

    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      setStatusMessage('錄音完成！可點擊下方按鈕試聽或下載變聲檔案');
    } else {
      recordedChunksRef.current = [];
      const stream = mediaStreamDestRef.current.stream;
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        if (recordedUrl) URL.revokeObjectURL(recordedUrl);
        setRecordedUrl(URL.createObjectURL(blob));
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setStatusMessage('正在錄製變聲後輸出訊號...');
    }
  };

  // 套用預設音色
  const applyPreset = async (preset: PresetConfig) => {
    if (!isAudioRunning) await startAudioEngine();
    setActiveMethod(preset.method);
    setDryWetMix(preset.dryWet);
    if (preset.methodA) setMethodA(prev => ({ ...prev, ...preset.methodA }));
    if (preset.methodB) setMethodB(prev => ({ ...prev, ...preset.methodB }));
    if (preset.methodC) setMethodC(prev => ({ ...prev, ...preset.methodC }));
    setStatusMessage(`已載入預設音色：「${preset.name}」`);
  };

  // 複製 GitHub 程式碼
  const copyToClipboard = (key: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFile(key);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  // ==========================================
  // 9. GitHub 專案匯出原始碼模板 (TypeScript)
  // ==========================================

  const GITHUB_FILES: Record<string, { title: string; lang: string; code: string }> = {
    'src/audio/AnalogVoiceEngine.ts': {
      title: 'src/audio/AnalogVoiceEngine.ts (核心類比變聲訊號處理類別)',
      lang: 'typescript',
      code: `/**
 * AnalogVoiceEngine.ts
 * 實作三種經典類比變聲器物理模型的 Web Audio API TypeScript 核心引擎：
 * 1. Method A: AD633 四象限環形調變 + 二極體非線性削波函數 y=f(x,G,b) + TL074 狀態變數濾波器
 * 2. Method B: 多頻段類比通道聲碼器 (Filter Bank + RMS Envelope Follower + Carrier Synth)
 * 3. Method C: BBD 斗鏈式延遲線調變 + 雙延遲線都卜勒移頻器 (Doppler Pitch Shifter)
 */

export type ShaperMode = 'tanh' | 'hard' | 'fold' | 'asymmetric' | 'custom';

export class AnalogVoiceEngine {
  public ctx: AudioContext;
  public inputGain: GainNode;
  public dryGain: GainNode;
  public wetGain: GainNode;
  public masterGain: GainNode;

  // Method A Nodes
  private ringCarrier: OscillatorNode;
  private ringMultiplier: GainNode;
  private waveShaper: WaveShaperNode;
  public svfFilter: BiquadFilterNode;

  constructor() {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    this.inputGain = this.ctx.createGain();
    this.dryGain = this.ctx.createGain();
    this.wetGain = this.ctx.createGain();
    this.masterGain = this.ctx.createGain();

    // 1. Ring Modulator (Four-Quadrant Multiplier: V_in * V_carrier)
    this.ringMultiplier = this.ctx.createGain();
    this.ringMultiplier.gain.value = 0;
    this.ringCarrier = this.ctx.createOscillator();
    this.ringCarrier.frequency.value = 60;
    this.ringCarrier.connect(this.ringMultiplier.gain);
    this.ringCarrier.start();

    // 2. Nonlinear Diode / Wavefolder Stage
    this.waveShaper = this.ctx.createWaveShaper();
    this.waveShaper.oversample = '4x';
    this.updateTransferFunction('tanh', 3.5, 0.0);

    // 3. State-Variable Formant Filter
    this.svfFilter = this.ctx.createBiquadFilter();
    this.svfFilter.type = 'bandpass';
    this.svfFilter.frequency.value = 1200;
    this.svfFilter.Q.value = 4.0;

    // Signal Routing
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.masterGain);

    this.inputGain.connect(this.ringMultiplier);
    this.ringMultiplier.connect(this.waveShaper);
    this.waveShaper.connect(this.svfFilter);
    this.svfFilter.connect(this.wetGain);
    this.wetGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  /**
   * 自訂非線性轉換函數 y = f(x, G, b)
   */
  public updateTransferFunction(
    mode: ShaperMode,
    drive: number,
    bias = 0,
    customExpression = 'Math.tanh(G * (x + b))'
  ): void {
    const samples = 4096;
    const curve = new Float32Array(samples);
    let customFn: ((x: number, G: number, b: number) => number) | null = null;

    if (mode === 'custom') {
      customFn = new Function('x', 'G', 'b', \`return (\${customExpression});\`) as (x: number, G: number, b: number) => number;
    }

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / (samples - 1) - 1;
      const xb = x + bias;
      let y = xb;

      if (mode === 'tanh') y = Math.tanh(drive * xb);
      else if (mode === 'hard') y = Math.max(-0.85, Math.min(0.85, drive * xb));
      else if (mode === 'fold') y = Math.sin(drive * xb);
      else if (mode === 'asymmetric') y = xb >= 0 ? Math.tanh(drive * xb) : 0.5 * Math.tanh(2 * drive * xb);
      else if (mode === 'custom' && customFn) y = customFn(x, drive, bias);

      curve[i] = Math.max(-1, Math.min(1, y));
    }
    this.waveShaper.curve = curve;
  }

  public setRingModulator(freqHz: number, type: OscillatorType): void {
    this.ringCarrier.frequency.setTargetAtTime(freqHz, this.ctx.currentTime, 0.02);
    this.ringCarrier.type = type;
  }
}`
    },
    'package.json': {
      title: 'package.json (Vite + React + TypeScript 專案配置)',
      lang: 'json',
      code: `{
  "name": "analog-voice-changer-lab",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "lucide-react": "^0.454.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "~5.6.2",
    "vite": "^5.4.10"
  }
}`
    },
    'README.md': {
      title: 'README.md (GitHub 專案物理原理與架構說明文件)',
      lang: 'markdown',
      code: `# 🎛️ Analog Voice Changer & Signal Processing Lab (TypeScript)

基於物理訊號處理與類比電子電路模型打造的即時網頁變聲實驗室。使用 **TypeScript + React + Web Audio API** 實現三種經典類比變聲硬體架構。

## 🔬 支援的三大類比變聲物理架構

### 1. 方案 A：環形調變與非線性波塑形 (AD633 + Diode Clipper + TL074 SVF)
- **外差積化和差 (Heterodyning)**：$V_{out}(t) = \\cos(2\\pi f_m t) \\cdot \\cos(2\\pi f_c t)$，產生非整數倍旁波帶 $f_m \\pm f_c$，創造經典科幻機器人音色。
- **自訂非線性轉換函數 $y = f(x, G, b)$**：支援矽二極體軟削波 \`tanh(G*x)\`、Buchla 波折器 \`sin(G*x)\`、非對稱偶次諧波削波與自訂數學公式。
- **狀態變數濾波器 (State-Variable Filter)**：動態偏移人聲共振峰 (Formants)。

### 2. 方案 B：多頻段類比通道聲碼器 (Multi-Band Analog Channel Vocoder)
- 使用對數分佈的帶通濾波器組 (Bandpass Filter Bank) 拆解人聲頻譜包絡 (Spectral Envelope)，並透過包絡跟隨器 (Envelope Follower) 調變合成器載波的各頻段壓控放大器 (VCA)。

### 3. 方案 C：斗鏈式延遲與都卜勒移頻 (BBD Delay & Doppler Pitch Shifter)
- 模擬經典 **MN3007 / PT2399 / HT8950** 延遲線時脈調變，利用雙讀取頭與 Hanning Window 交叉淡化達成即時升降調 ($-12 \\sim +12$ 半音)。

## 🚀 快速啟動

\`\`\`bash
git clone https://github.com/your-username/analog-voice-changer-lab.git
cd analog-voice-changer-lab
npm install
npm run dev
\`\`\`
`
    }
  };

  // ==========================================
  // 10. UI 渲染
  // ==========================================

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500/30">
      {/* 隱藏的 Audio 標籤供上傳檔案播放 */}
      <audio
        ref={audioElementRef}
        src={uploadedFileUrl || undefined}
        loop
        onEnded={() => setIsFilePlaying(false)}
        className="hidden"
      />

      {/* 頂部導覽與主控台 Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Radio className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">
                  ANALOG VOICE LAB
                </h1>
                <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  TypeScript DSP Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                類比變聲器物理模擬與可編程函數實驗室 (AD633 / Vocoder / BBD Pitch)
              </p>
            </div>
          </div>

          {/* 頁籤切換與引擎總開關 */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveTab('lab')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  activeTab === 'lab'
                    ? 'bg-slate-800 text-amber-400 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                互動變聲實驗室
              </button>
              <button
                onClick={() => setActiveTab('github')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  activeTab === 'github'
                    ? 'bg-slate-800 text-sky-400 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                GitHub TypeScript 原始碼匯出
              </button>
            </div>

            <button
              onClick={startAudioEngine}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition shadow-lg ${
                isAudioRunning
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25 animate-pulse'
              }`}
            >
              <Zap className="w-4 h-4" />
              {isAudioRunning ? '類比引擎運作中 (ON)' : '啟動類比音訊引擎'}
            </button>
          </div>
        </div>

        {/* 狀態列 */}
        <div className="bg-slate-950/80 border-t border-slate-800/80 px-4 py-1.5">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <span
                className={`w-2 h-2 rounded-full ${
                  isAudioRunning ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'
                }`}
              />
              <span>{statusMessage}</span>
            </div>
            <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
              <span>SR: {audioCtxRef.current?.sampleRate || 48000} Hz</span>
              <span>
                架構:{' '}
                <strong className="text-amber-400">
                  {activeMethod === 'methodA'
                    ? '方案 A (AD633 環形調變 + 波塑形)'
                    : activeMethod === 'methodB'
                    ? '方案 B (多頻段聲碼器 Vocoder)'
                    : '方案 C (BBD 延遲與都卜勒移頻)'}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 主內容區 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'github' ? (
          /* ==========================================
             GitHub 專案原始碼匯出視圖
             ========================================== */
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-sky-400" />
                    GitHub TypeScript 專案架構與原始碼匯出
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    你可以直接複製下方的模組化 TypeScript 類別與專案設定檔，或直接將右側編輯器中的完整單檔元件放入你的 GitHub Repository (`src/App.tsx`)。
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-xs">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <div className="font-mono text-amber-400 font-bold mb-1">Step 1. 初始化專案</div>
                  <code className="text-slate-300 block bg-slate-900 p-2 rounded mt-2 font-mono">
                    npm create vite@latest my-voice-changer -- --template react-ts
                  </code>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <div className="font-mono text-sky-400 font-bold mb-1">Step 2. 安裝圖示與 Tailwind</div>
                  <code className="text-slate-300 block bg-slate-900 p-2 rounded mt-2 font-mono">
                    npm install lucide-react && npx tailwindcss init -p
                  </code>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <div className="font-mono text-emerald-400 font-bold mb-1">Step 3. 貼上程式碼並推上 GitHub</div>
                  <code className="text-slate-300 block bg-slate-900 p-2 rounded mt-2 font-mono">
                    git add . && git commit -m "Add analog DSP lab" && git push
                  </code>
                </div>
              </div>

              <div className="space-y-6">
                {Object.entries(GITHUB_FILES).map(([key, file]) => (
                  <div key={key} className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                    <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-sky-300">{file.title}</span>
                      <button
                        onClick={() => copyToClipboard(key, file.code)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition"
                      >
                        {copiedFile === key ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">已複製</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>複製檔案內容</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-96">
                      <code>{file.code}</code>
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ==========================================
             互動式類比變聲器實驗室視圖
             ========================================== */
          <div className="space-y-6">
            {/* 第一排：輸入源控制 + 示波器/頻譜儀 + 輸出與錄音控制 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* 左側：音訊輸入源選擇器 (4 Cols) */}
              <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <Mic className="w-4 h-4 text-amber-400" />
                      1. 訊號輸入源 (Input Stage)
                    </h2>
                    <span className="text-[11px] font-mono text-slate-400">Pre-Amp</span>
                  </div>

                  {/* 三種輸入切換按鈕 */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <button
                      onClick={() => handleSwitchInputSource('synth')}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        inputSource === 'synth'
                          ? 'bg-amber-500/15 border-amber-500/60 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Waves className="w-4 h-4 mb-1" />
                      <div className="text-xs font-bold">合成人聲</div>
                      <div className="text-[10px] opacity-75">免麥克風測試</div>
                    </button>

                    <button
                      onClick={() => handleSwitchInputSource('mic')}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        inputSource === 'mic'
                          ? 'bg-rose-500/15 border-rose-500/60 text-rose-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Mic className="w-4 h-4 mb-1" />
                      <div className="text-xs font-bold">麥克風收音</div>
                      <div className="text-[10px] opacity-75">即時對講變聲</div>
                    </button>

                    <button
                      onClick={() => handleSwitchInputSource('file')}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        inputSource === 'file'
                          ? 'bg-sky-500/15 border-sky-500/60 text-sky-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Upload className="w-4 h-4 mb-1" />
                      <div className="text-xs font-bold">上傳音檔</div>
                      <div className="text-[10px] opacity-75">WAV / MP3</div>
                    </button>
                  </div>

                  {/* 根據當前輸入源顯示專屬設定面板 */}
                  {inputSource === 'synth' && (
                    <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-3 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">聲帶基頻 $f_0$ (Vocal Pitch)</span>
                        <span className="font-mono text-amber-400">{synthParams.pitch} Hz</span>
                      </div>
                      <input
                        type="range"
                        min={80}
                        max={300}
                        value={synthParams.pitch}
                        onChange={(e) =>
                          setSynthParams(s => ({ ...s, pitch: Number(e.target.value) }))
                        }
                        className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <button
                          onClick={() => setSynthParams(s => ({ ...s, pitch: 110 }))}
                          className="hover:text-amber-400"
                        >
                          男低音 (110Hz)
                        </button>
                        <button
                          onClick={() => setSynthParams(s => ({ ...s, pitch: 145 }))}
                          className="hover:text-amber-400"
                        >
                          男中音 (145Hz)
                        </button>
                        <button
                          onClick={() => setSynthParams(s => ({ ...s, pitch: 220 }))}
                          className="hover:text-amber-400"
                        >
                          女聲 (220Hz)
                        </button>
                      </div>

                      <div className="pt-1 border-t border-slate-800 flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-400">母音共振腔:</span>
                        <div className="flex gap-1">
                          {(['A', 'E', 'I', 'O', 'U', 'sweep'] as const).map(v => (
                            <button
                              key={v}
                              onClick={() => setSynthParams(s => ({ ...s, vowel: v }))}
                              className={`px-2 py-0.5 rounded text-xs font-mono transition ${
                                synthParams.vowel === v
                                  ? 'bg-amber-500 text-slate-950 font-bold'
                                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                              }`}
                            >
                              {v === 'sweep' ? '自動母音' : `/${v}/`}
                            </button>
                          ))}
                        </div>
                      </div>

                      <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer pt-1">
                        <span>模擬說話音節斷句 (Syllable Pulse)</span>
                        <input
                          type="checkbox"
                          checked={synthParams.autoTalk}
                          onChange={(e) =>
                            setSynthParams(s => ({ ...s, autoTalk: e.target.checked }))
                          }
                          className="accent-amber-500 rounded"
                        />
                      </label>
                    </div>
                  )}

                  {inputSource === 'mic' && (
                    <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-3 space-y-2.5 text-xs">
                      <div className="flex items-start gap-2 text-rose-300">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                        <p className="leading-relaxed">
                          <strong>防正回授嘯叫提醒：</strong> 使用麥克風即時變聲時，請務必<strong>配戴耳機監聽</strong>，否則喇叭聲音進入麥克風會形成韋恩橋式自激振盪。
                        </p>
                      </div>
                      <label className="flex items-center justify-between text-slate-300 pt-1 border-t border-rose-500/20 cursor-pointer">
                        <span>瀏覽器回音消除 (Echo Cancellation)</span>
                        <input
                          type="checkbox"
                          checked={echoCancel}
                          onChange={(e) => setEchoCancel(e.target.checked)}
                          className="accent-rose-500"
                        />
                      </label>
                    </div>
                  )}

                  {inputSource === 'file' && (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-3 text-xs">
                      <label className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-dashed border-slate-700 cursor-pointer text-sky-300 transition">
                        <Upload className="w-4 h-4" />
                        <span className="truncate">
                          {uploadedFileName || '選擇本機人聲音檔 (.wav / .mp3)'}
                        </span>
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                      {uploadedFileUrl && (
                        <button
                          onClick={toggleFilePlayback}
                          className="w-full py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold flex items-center justify-center gap-1.5 transition"
                        >
                          {isFilePlaying ? (
                            <>
                              <Pause className="w-4 h-4" /> 暫停播放音檔
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" /> 循環播放並套用變聲
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 下方：總輸出與錄音控制 */}
                <div className="mt-4 pt-3 border-t border-slate-800 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">乾濕混合 (Dry/Wet)</span>
                        <span className="font-mono text-amber-400">{Math.round(dryWetMix * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={dryWetMix}
                        onChange={(e) => setDryWetMix(Number(e.target.value))}
                        className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">主輸出音量 (Master)</span>
                        <span className="font-mono text-emerald-400">{Math.round(masterVolume * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1.2}
                        step={0.01}
                        value={masterVolume}
                        onChange={(e) => setMasterVolume(Number(e.target.value))}
                        className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition ${
                        isMuted
                          ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      {isMuted ? '已靜音' : '監聽中'}
                    </button>

                    <button
                      onClick={toggleRecordingOutput}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                        isRecording
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      <Disc className="w-4 h-4" />
                      {isRecording ? '停止錄製輸出' : '錄製變聲結果'}
                    </button>

                    {recordedUrl && (
                      <a
                        href={recordedUrl}
                        download={`analog-voice-${activeMethod}.webm`}
                        className="px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-1 hover:bg-emerald-500/30 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        下載
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* 右側：雙軌示波器與即時 FFT 頻譜儀 (8 Cols) */}
              <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-400" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                      即時雙軌示波器 & 傅立葉頻譜分析儀 (Oscilloscope & FFT Analyzer)
                    </h2>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <span className="w-2.5 h-0.5 bg-slate-400 inline-block" /> 原始輸入波形 $V_{'{in}'}(t)$
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                      <span className="w-2.5 h-0.5 bg-amber-400 inline-block" /> 變聲輸出波形 $V_{'{out}'}(t)$
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                  {/* 時域示波器 Canvas */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex flex-col">
                    <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1.5">
                      <span>TIME DOMAIN (時域波形重疊比較)</span>
                      <span className="text-amber-400">Zero-Cross Trigger</span>
                    </div>
                    <canvas
                      ref={scopeCanvasRef}
                      width={460}
                      height={190}
                      className="w-full h-44 rounded bg-[#090d16]"
                    />
                  </div>

                  {/* 頻域 FFT Canvas */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex flex-col">
                    <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1.5">
                      <span>FREQUENCY SPECTRUM (0 Hz – 5.5 kHz 旁波帶與諧波分佈)</span>
                      <span className="text-sky-400">2048-pt FFT</span>
                    </div>
                    <canvas
                      ref={fftCanvasRef}
                      width={460}
                      height={190}
                      className="w-full h-44 rounded bg-[#090d16]"
                    />
                  </div>
                </div>

                {/* 快速音色預設庫 (Presets Bar) */}
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    經典硬體音色快速套用 (Hardware Presets)：
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESETS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => applyPreset(p)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-xs text-slate-200 transition flex items-center gap-1.5"
                        title={p.subtitle}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            p.method === 'methodA'
                              ? 'bg-amber-400'
                              : p.method === 'methodB'
                              ? 'bg-emerald-400'
                              : 'bg-sky-400'
                          }`}
                        />
                        <span>{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 第二排：三種硬體變聲方案切換器 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => setActiveMethod('methodA')}
                className={`p-4 rounded-2xl border text-left transition ${
                  activeMethod === 'methodA'
                    ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/5'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    Method A · 純類比非線性與外差
                  </span>
                  <Cpu className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="text-base font-bold text-white mt-1">
                  環形調變 + 自訂非線性函數 + 共振峰濾波
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  模擬 AD633 乘法器、二極體削波/波折函數 $y=f(x)$ 與 TL074 狀態變數濾波器
                </p>
              </button>

              <button
                onClick={() => setActiveMethod('methodB')}
                className={`p-4 rounded-2xl border text-left transition ${
                  activeMethod === 'methodB'
                    ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/5'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    Method B · 頻譜包絡移植
                  </span>
                  <Layers className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-base font-bold text-white mt-1">
                  多頻段類比通道聲碼器 (Channel Vocoder)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  多階帶通濾波器組拆解人聲母音包絡，即時調變合成器載波與 VCA 陣列
                </p>
              </button>

              <button
                onClick={() => setActiveMethod('methodC')}
                className={`p-4 rounded-2xl border text-left transition ${
                  activeMethod === 'methodC'
                    ? 'bg-sky-500/10 border-sky-500 shadow-lg shadow-sky-500/5'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                    Method C · 時域延遲調變
                  </span>
                  <Settings2 className="w-4 h-4 text-sky-400" />
                </div>
                <h3 className="text-base font-bold text-white mt-1">
                  BBD 斗鏈式延遲線 & 都卜勒升降調
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  模擬 MN3007 / PT2399 / HT8950 時脈調變，支援男女變聲升降調與太空合唱效果
                </p>
              </button>
            </div>

            {/* 第三排：當前選中方案的深度參數與數學函數調校面板 */}
            {activeMethod === 'methodA' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* 模組 A1: 環形調變器 (AD633) */}
                <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <span className="text-[11px] font-mono text-amber-400 uppercase">Stage 1 · Heterodyning</span>
                    <h3 className="text-base font-bold text-white">
                      AD633 環形調變器 (Ring Modulator)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      V_out(t) = V_in(t) × cos(2π·f_c·t) → f_m ± f_c
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-300">載波頻率 $f_c$ (Carrier Freq)</span>
                      <span className="font-mono text-amber-400 font-bold">{methodA.ringModFreq} Hz</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={800}
                      value={methodA.ringModFreq}
                      onChange={(e) =>
                        setMethodA(m => ({ ...m, ringModFreq: Number(e.target.value) }))
                      }
                      className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                      <button onClick={() => setMethodA(m => ({ ...m, ringModFreq: 30 }))} className="hover:text-amber-400">30Hz (Dalek)</button>
                      <button onClick={() => setMethodA(m => ({ ...m, ringModFreq: 85 }))} className="hover:text-amber-400">85Hz (重機甲)</button>
                      <button onClick={() => setMethodA(m => ({ ...m, ringModFreq: 240 }))} className="hover:text-amber-400">240Hz (外星金屬)</button>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-300 block mb-2">載波振盪波形 (Carrier Waveform)</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['sine', 'triangle', 'square', 'sawtooth'] as CarrierWaveType[]).map(w => (
                        <button
                          key={w}
                          onClick={() => setMethodA(m => ({ ...m, ringModWave: w }))}
                          className={`py-1.5 rounded-lg text-xs font-mono capitalize border transition ${
                            methodA.ringModWave === w
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-300">環形調變混合比 (Ring Mod Mix)</span>
                      <span className="font-mono text-amber-400">{Math.round(methodA.ringModMix * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={methodA.ringModMix}
                      onChange={(e) =>
                        setMethodA(m => ({ ...m, ringModMix: Number(e.target.value) }))
                      }
                      className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* 模組 A2: 可編程非線性轉換函數 y = f(x, G, b) */}
                <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="border-b border-slate-800 pb-3 flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-mono text-sky-400 uppercase">Stage 2 · Nonlinear Transfer Curve</span>
                      <h3 className="text-base font-bold text-white">
                        二極體非線性削波與自訂函數 $y = f(x)$
                      </h3>
                    </div>
                    <canvas
                      ref={transferCanvasRef}
                      width={88}
                      height={64}
                      className="rounded border border-slate-700 bg-slate-950 shrink-0"
                      title="即時非線性轉換曲線 y = f(x)"
                    />
                  </div>

                  {/* 預設函數模型選擇 */}
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {[
                      { id: 'tanh', label: '矽二極體 tanh(G·x)' },
                      { id: 'asymmetric', label: '非對稱鍺二極體 (偶次諧波)' },
                      { id: 'fold', label: 'Buchla 波折器 sin(G·x)' },
                      { id: 'hard', label: 'Op-Amp 硬飽和截波' },
                      { id: 'custom', label: '✨ 自訂數學公式 f(x,G,b)' },
                    ].map(item => (
                      <button
                        key={item.id}
                        onClick={() =>
                          setMethodA(m => ({ ...m, shaperType: item.id as ShaperPresetType }))
                        }
                        className={`px-2.5 py-1.5 rounded-lg border text-left truncate transition ${
                          item.id === 'custom' ? 'col-span-2' : ''
                        } ${
                          methodA.shaperType === item.id
                            ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-semibold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {/* 自訂數學公式輸入框 */}
                  {methodA.shaperType === 'custom' && (
                    <div className="bg-slate-950 border border-sky-500/40 rounded-xl p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-sky-300">y(x, G, b) =</span>
                        <span className="text-slate-400">變數: x (訊號), G (Drive), b (Bias)</span>
                      </div>
                      <input
                        type="text"
                        value={methodA.customFormula}
                        onChange={(e) =>
                          setMethodA(m => ({ ...m, customFormula: e.target.value }))
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-amber-300 focus:outline-none focus:border-sky-400"
                        placeholder="Math.tanh(G * (x + b))"
                      />
                      {formulaError && (
                        <p className="text-[11px] text-rose-400 font-mono">{formulaError}</p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">驅動增益 $G$ (Drive)</span>
                        <span className="font-mono text-sky-400">{methodA.drive.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min={0.5}
                        max={15}
                        step={0.1}
                        value={methodA.drive}
                        onChange={(e) =>
                          setMethodA(m => ({ ...m, drive: Number(e.target.value) }))
                        }
                        className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">直流偏壓 $b$ (Bias)</span>
                        <span className="font-mono text-sky-400">{methodA.bias.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={-0.45}
                        max={0.45}
                        step={0.01}
                        value={methodA.bias}
                        onChange={(e) =>
                          setMethodA(m => ({ ...m, bias: Number(e.target.value) }))
                        }
                        className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">非線性諧波失真混合比 (Shaper Mix)</span>
                      <span className="font-mono text-sky-400">{Math.round(methodA.shaperMix * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={methodA.shaperMix}
                      onChange={(e) =>
                        setMethodA(m => ({ ...m, shaperMix: Number(e.target.value) }))
                      }
                      className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* 模組 A3: TL074 狀態變數共振峰濾波器 */}
                <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <span className="text-[11px] font-mono text-emerald-400 uppercase">Stage 3 · Formant Filter</span>
                    <h3 className="text-base font-bold text-white">
                      TL074 狀態變數濾波器 (SVF & Wah)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      塑形口腔共振峰並透過 LFO 產生母音動態掃描
                    </p>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {(['bandpass', 'lowpass', 'highpass', 'peaking'] as BiquadFilterType[]).map(ft => (
                      <button
                        key={ft}
                        onClick={() => setMethodA(m => ({ ...m, filterType: ft }))}
                        className={`py-1.5 rounded-lg text-xs font-mono capitalize border transition ${
                          methodA.filterType === ft
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {ft.replace('pass', '')}
                      </button>
                    ))}
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">截止/中心頻率 $f_0$ (Cutoff)</span>
                      <span className="font-mono text-emerald-400">{methodA.cutoff} Hz</span>
                    </div>
                    <input
                      type="range"
                      min={150}
                      max={4500}
                      value={methodA.cutoff}
                      onChange={(e) =>
                        setMethodA(m => ({ ...m, cutoff: Number(e.target.value) }))
                      }
                      className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">品質因數 / 共振峰值 $Q$ (Resonance)</span>
                      <span className="font-mono text-emerald-400">{methodA.resonance.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={20}
                      step={0.1}
                      value={methodA.resonance}
                      onChange={(e) =>
                        setMethodA(m => ({ ...m, resonance: Number(e.target.value) }))
                      }
                      className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">Wah LFO 速率</span>
                        <span className="font-mono text-emerald-400">{methodA.lfoRate} Hz</span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={12}
                        step={0.1}
                        value={methodA.lfoRate}
                        onChange={(e) =>
                          setMethodA(m => ({ ...m, lfoRate: Number(e.target.value) }))
                        }
                        className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">Wah 掃描深度</span>
                        <span className="font-mono text-emerald-400">{methodA.lfoDepth} Hz</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={2000}
                        step={10}
                        value={methodA.lfoDepth}
                        onChange={(e) =>
                          setMethodA(m => ({ ...m, lfoDepth: Number(e.target.value) }))
                        }
                        className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeMethod === 'methodB' && (
              /* ==========================================
                 方案 B：類比多頻段聲碼器 (Analog Vocoder) 控制面板
                 ========================================== */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-[11px] font-mono text-emerald-400 uppercase">
                        Method B · Filter Bank & VCA Array
                      </span>
                      <h3 className="text-base font-bold text-white">
                        多頻段類比通道聲碼器參數 (Analog Channel Vocoder)
                      </h3>
                    </div>

                    {/* 頻段數量切換 */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400">通道數:</span>
                      {[4, 8, 12, 16].map(n => (
                        <button
                          key={n}
                          onClick={() => setMethodB(b => ({ ...b, bandCount: n }))}
                          className={`px-2.5 py-1 rounded text-xs font-mono transition ${
                            methodB.bandCount === n
                              ? 'bg-emerald-500 text-slate-950 font-bold'
                              : 'bg-slate-950 text-slate-400 border border-slate-800'
                          }`}
                        >
                          {n} Bands
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 載波合成器類型與音高 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-slate-300 block mb-2">
                        合成器載波音源 (Carrier Synth Type)
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: 'sawtooth', label: '豐富鋸齒波 (Saw)' },
                          { id: 'chord', label: '機械和弦 (Chord)' },
                          { id: 'square', label: '空心方波 (Pulse)' },
                          { id: 'noise', label: '幽靈耳語 (Noise)' },
                        ].map(c => (
                          <button
                            key={c.id}
                            onClick={() =>
                              setMethodB(b => ({ ...b, carrierType: c.id as VocoderCarrierType }))
                            }
                            className={`p-2 rounded-lg text-xs border text-left transition ${
                              methodB.carrierType === c.id
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                                : 'bg-slate-950 border-slate-800 text-slate-400'
                            }`}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300">載波基頻 (Carrier Pitch)</span>
                          <span className="font-mono text-emerald-400">{methodB.carrierPitch} Hz</span>
                        </div>
                        <input
                          type="range"
                          min={55}
                          max={330}
                          value={methodB.carrierPitch}
                          onChange={(e) =>
                            setMethodB(b => ({ ...b, carrierPitch: Number(e.target.value) }))
                          }
                          className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                          <button onClick={() => setMethodB(b => ({ ...b, carrierPitch: 65 }))} className="hover:text-emerald-400">C2 (65Hz)</button>
                          <button onClick={() => setMethodB(b => ({ ...b, carrierPitch: 110 }))} className="hover:text-emerald-400">A2 (110Hz)</button>
                          <button onClick={() => setMethodB(b => ({ ...b, carrierPitch: 165 }))} className="hover:text-emerald-400">E3 (165Hz)</button>
                          <button onClick={() => setMethodB(b => ({ ...b, carrierPitch: 220 }))} className="hover:text-emerald-400">A3 (220Hz)</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 共振峰偏移與濾波器銳利度 */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">共振峰偏移 (Formant Shift)</span>
                        <span className="font-mono text-emerald-400">{methodB.formantShift.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min={0.5}
                        max={2.0}
                        step={0.05}
                        value={methodB.formantShift}
                        onChange={(e) =>
                          setMethodB(b => ({ ...b, formantShift: Number(e.target.value) }))
                        }
                        className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">濾波器銳利度 $Q$</span>
                        <span className="font-mono text-emerald-400">{methodB.filterQ}</span>
                      </div>
                      <input
                        type="range"
                        min={3}
                        max={22}
                        value={methodB.filterQ}
                        onChange={(e) =>
                          setMethodB(b => ({ ...b, filterQ: Number(e.target.value) }))
                        }
                        className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">子音清晰度 (Sibilance)</span>
                        <span className="font-mono text-emerald-400">{Math.round(methodB.sibilanceMix * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={0.5}
                        step={0.02}
                        value={methodB.sibilanceMix}
                        onChange={(e) =>
                          setMethodB(b => ({ ...b, sibilanceMix: Number(e.target.value) }))
                        }
                        className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* 右側：即時各頻帶包絡能量表 (Envelope Follower Meters) */}
                <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-mono text-emerald-400 uppercase">
                      Real-Time Envelope Followers
                    </span>
                    <h3 className="text-base font-bold text-white">
                      各頻段包絡跟隨器 VCA 電壓表 ({methodB.bandCount} 階帶通濾波)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      顯示每個頻段偵測到的人聲母音能量，並即時控制合成器載波的 VCA 導通量
                    </p>
                  </div>

                  <div className="h-44 bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-end justify-between gap-1.5 my-3">
                    {Array.from({ length: methodB.bandCount }).map((_, idx) => {
                      const level = vocoderBandLevels[idx] || 0;
                      const minF = 120;
                      const maxF = 4800;
                      const freq = Math.round(
                        minF * Math.pow(maxF / minF, idx / Math.max(1, methodB.bandCount - 1))
                      );
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end">
                          <div className="w-full bg-slate-900 rounded-t h-full flex items-end overflow-hidden p-0.5">
                            <div
                              className="w-full bg-gradient-to-t from-emerald-600 via-emerald-400 to-amber-300 rounded-t transition-all duration-75"
                              style={{ height: `${Math.max(4, Math.min(100, level * 100))}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-mono text-slate-500 mt-1 rotate-0">
                            {freq >= 1000 ? `${(freq / 1000).toFixed(1)}k` : freq}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono flex justify-between">
                    <span>Low Formant (120 Hz)</span>
                    <span>High Formant (4.8 kHz)</span>
                  </div>
                </div>
              </div>
            )}

            {activeMethod === 'methodC' && (
              /* ==========================================
                 方案 C：斗鏈式延遲與都卜勒升降調 (BBD Pitch & Delay) 控制面板
                 ========================================== */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* 左側：雙延遲線都卜勒升降調 */}
                <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <span className="text-[11px] font-mono text-sky-400 uppercase">
                      Method C · Dual-Delay Doppler Pitch Shifter
                    </span>
                    <h3 className="text-base font-bold text-white">
                      都卜勒時域升降調模組 (HT8950 / 旋轉磁頭原理)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      利用隨時間增減的延遲線讀取速率差 $\Delta v$ 產生都卜勒頻率偏移 $f' = f \cdot 2^{'{n/12}'}$
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-300 font-medium">升降調半音數 (Pitch Shift Semitones)</span>
                      <span className="font-mono text-sky-400 font-bold text-sm">
                        {methodC.pitchSemitones > 0 ? `+${methodC.pitchSemitones}` : methodC.pitchSemitones} 半音 (
                        {(Math.pow(2, methodC.pitchSemitones / 12)).toFixed(2)}x 基頻)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      step={0.5}
                      value={methodC.pitchSemitones}
                      onChange={(e) =>
                        setMethodC(c => ({ ...c, pitchSemitones: Number(e.target.value) }))
                      }
                      className="w-full accent-sky-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <div className="flex flex-wrap justify-between gap-1 text-[11px] text-slate-400 mt-2">
                      <button
                        onClick={() => setMethodC(c => ({ ...c, pitchSemitones: -12 }))}
                        className="px-2 py-1 rounded bg-slate-950 border border-slate-800 hover:border-sky-500/50"
                      >
                        -12 (降八度惡魔)
                      </button>
                      <button
                        onClick={() => setMethodC(c => ({ ...c, pitchSemitones: -5 }))}
                        className="px-2 py-1 rounded bg-slate-950 border border-slate-800 hover:border-sky-500/50"
                      >
                        -5 (深沉男聲)
                      </button>
                      <button
                        onClick={() => setMethodC(c => ({ ...c, pitchSemitones: 0 }))}
                        className="px-2 py-1 rounded bg-slate-950 border border-slate-800 hover:border-sky-500/50"
                      >
                        0 (原調)
                      </button>
                      <button
                        onClick={() => setMethodC(c => ({ ...c, pitchSemitones: 4.5 }))}
                        className="px-2 py-1 rounded bg-slate-950 border border-slate-800 hover:border-sky-500/50"
                      >
                        +4.5 (男變女聲)
                      </button>
                      <button
                        onClick={() => setMethodC(c => ({ ...c, pitchSemitones: 9 }))}
                        className="px-2 py-1 rounded bg-slate-950 border border-slate-800 hover:border-sky-500/50"
                      >
                        +9 (花栗鼠)
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">延遲窗格大小 (Crossfade Window Size)</span>
                      <span className="font-mono text-sky-400">{methodC.windowSizeMs} ms</span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={95}
                      step={1}
                      value={methodC.windowSizeMs}
                      onChange={(e) =>
                        setMethodC(c => ({ ...c, windowSizeMs: Number(e.target.value) }))
                      }
                      className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* 右側：MN3007 / PT2399 斗鏈式電容延遲線時脈調變 */}
                <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <span className="text-[11px] font-mono text-amber-400 uppercase">
                      Bucket-Brigade Device (MN3007 / PT2399)
                    </span>
                    <h3 className="text-base font-bold text-white">
                      斗鏈式電容延遲線與時脈 LFO 調變
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      模擬類比電容串列傳遞延遲、時脈顫音 (Vibrato/Chorus) 與高頻電容損耗
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">基礎延遲 (BBD Delay)</span>
                        <span className="font-mono text-amber-400">{methodC.bbdDelayMs} ms</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={80}
                        value={methodC.bbdDelayMs}
                        onChange={(e) =>
                          setMethodC(c => ({ ...c, bbdDelayMs: Number(e.target.value) }))
                        }
                        className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">回授深度 (Feedback)</span>
                        <span className="font-mono text-amber-400">{Math.round(methodC.bbdFeedback * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={0.85}
                        step={0.01}
                        value={methodC.bbdFeedback}
                        onChange={(e) =>
                          setMethodC(c => ({ ...c, bbdFeedback: Number(e.target.value) }))
                        }
                        className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">時脈 LFO 頻率 (Rate)</span>
                        <span className="font-mono text-amber-400">{methodC.bbdLfoRate} Hz</span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={18}
                        step={0.1}
                        value={methodC.bbdLfoRate}
                        onChange={(e) =>
                          setMethodC(c => ({ ...c, bbdLfoRate: Number(e.target.value) }))
                        }
                        className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">時脈調變深度 (Depth)</span>
                        <span className="font-mono text-amber-400">{methodC.bbdLfoDepthMs.toFixed(1)} ms</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={12}
                        step={0.1}
                        value={methodC.bbdLfoDepthMs}
                        onChange={(e) =>
                          setMethodC(c => ({ ...c, bbdLfoDepthMs: Number(e.target.value) }))
                        }
                        className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">BBD 電容高頻衰減低通濾波 (Bucket Loss LPF)</span>
                      <span className="font-mono text-amber-400">{methodC.bbdLowpassHz} Hz</span>
                    </div>
                    <input
                      type="range"
                      min={1000}
                      max={12000}
                      step={100}
                      value={methodC.bbdLowpassHz}
                      onChange={(e) =>
                        setMethodC(c => ({ ...c, bbdLowpassHz: Number(e.target.value) }))
                      }
                      className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}