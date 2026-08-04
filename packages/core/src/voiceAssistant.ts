// Voice Assistant — command grammar, alert message catalog, and
// connectivity-aware recognition-mode selection
//
// Design goals from the request: (1) give the driver hands-free control
// with a short, safety-appropriate command set instead of a full
// Alexa-style assistant; (2) use the best available *free* speech
// recognition automatically — online (Google's cloud recognizer on
// Android / Apple's server-based SFSpeechRecognizer on iOS, both free,
// no API key, no paid tier) when the phone has connectivity, since cloud
// recognition is meaningfully more accurate for Persian; and transparently
// fall back to on-device offline recognition when there's no connection,
// so the assistant still works in tunnels/parking garages/rural roads.
// (3) speak safety alerts (lane departure, parking impact, low storage,
// overheating, GPS loss) out loud via the OS's built-in, free,
// works-offline text-to-speech, so the driver never has to look at the
// screen to notice a warning.
//
// This module holds the platform-agnostic decision logic; actual
// microphone capture / SpeechRecognizer / SFSpeechRecognizer / TTS calls
// are native (see VoiceAssistant.kt / VoiceAssistant.swift).

export type VoiceCommand =
  | "start_recording"
  | "stop_recording"
  | "save_moment"
  | "check_status"
  | "unknown";

export interface VoiceCommandPhrase {
  command: VoiceCommand;
  phrasesFa: string[];
}

// Small, fixed grammar on purpose: short unambiguous Persian phrases are
// far more reliable to recognize (online or offline) than open-ended
// natural language, and a driving context calls for predictable commands
// over a chatty general assistant.
export const VOICE_COMMAND_PHRASES: VoiceCommandPhrase[] = [
  { command: "start_recording", phrasesFa: ["شروع ضبط", "ضبط رو شروع کن", "شروع کن"] },
  { command: "stop_recording", phrasesFa: ["توقف ضبط", "ضبط رو متوقف کن", "ضبط رو تموم کن"] },
  { command: "save_moment", phrasesFa: ["ذخیره این لحظه", "این لحظه رو ذخیره کن", "این صحنه رو نگه دار"] },
  { command: "check_status", phrasesFa: ["وضعیت چطوره", "چقدر فضا داریم", "وضعیت دوربین"] },
];

/** Normalizes Persian text for robust command matching: unifies common
 * OCR/ASR letter variants, strips diacritics/punctuation, collapses
 * whitespace. Mirrors the approach in plate.ts's PersianNormalizer but
 * for free-form spoken phrases rather than plate codes. */
export function normalizeSpeechFa(input: string): string {
  const confusionMap: Record<string, string> = {
    "ي": "ی",
    "ى": "ی",
    "ك": "ک",
    "ة": "ه",
    "أ": "ا",
    "إ": "ا",
    "آ": "ا",
  };
  let s = input.trim().toLowerCase();
  s = s.replace(/[\u064B-\u065F\u0670]/g, ""); // strip Arabic diacritics
  s = s.replace(/[.,!?؟،]/g, "");
  s = s
    .split("")
    .map((ch) => confusionMap[ch] ?? ch)
    .join("");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i]![0] = i;
  for (let j = 0; j <= b.length; j++) dp[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
    }
  }
  return dp[a.length]![b.length]!;
}

/**
 * Matches a raw ASR transcript against the fixed command grammar. Uses
 * normalized-substring matching first (handles "لطفا شروع ضبط کن" containing
 * the phrase), then falls back to fuzzy Levenshtein distance to tolerate
 * small ASR mistakes (especially likely from the offline recognizer).
 */
export function matchVoiceCommand(transcript: string, maxFuzzyDistance = 2): VoiceCommand {
  const normalizedTranscript = normalizeSpeechFa(transcript);
  if (!normalizedTranscript) return "unknown";

  for (const entry of VOICE_COMMAND_PHRASES) {
    for (const phrase of entry.phrasesFa) {
      const normalizedPhrase = normalizeSpeechFa(phrase);
      if (normalizedTranscript.includes(normalizedPhrase)) return entry.command;
    }
  }

  let best: { command: VoiceCommand; distance: number } | null = null;
  for (const entry of VOICE_COMMAND_PHRASES) {
    for (const phrase of entry.phrasesFa) {
      const distance = levenshtein(normalizedTranscript, normalizeSpeechFa(phrase));
      if (!best || distance < best.distance) best = { command: entry.command, distance };
    }
  }

  if (best && best.distance <= maxFuzzyDistance) return best.command;
  return "unknown";
}

// ---- Connectivity-aware recognition mode ----

export type SpeechRecognitionMode = "online" | "offline";

/**
 * Chooses which recognizer mode the native layer should use. Online is
 * preferred whenever there's connectivity: both platforms' online
 * recognizers are free (no API key/billing) and meaningfully higher
 * quality for Persian than the on-device models. Offline is the graceful
 * fallback so voice commands still work without a connection.
 */
export function chooseSpeechRecognitionMode(isOnline: boolean): SpeechRecognitionMode {
  return isOnline ? "online" : "offline";
}

// ---- Spoken alerts (text-to-speech warnings) ----

export type AlertKind =
  | "lane_departure"
  | "parking_impact"
  | "thermal_warning"
  | "low_storage"
  | "gps_lost"
  | "recording_started"
  | "recording_stopped";

export interface AlertMessage {
  kind: AlertKind;
  textFa: string;
  /** Higher priority alerts may interrupt a lower-priority one already being spoken. */
  priority: number;
  /** Minimum time between repeated announcements of the same kind. */
  cooldownMs: number;
}

export const ALERT_MESSAGES: Record<AlertKind, AlertMessage> = {
  lane_departure: {
    kind: "lane_departure",
    textFa: "توجه، از مسیر خود خارج شدید",
    priority: 8,
    cooldownMs: 8000,
  },
  parking_impact: {
    kind: "parking_impact",
    textFa: "ضربه‌ای به خودروی شما تشخیص داده شد",
    priority: 10,
    cooldownMs: 15000,
  },
  thermal_warning: {
    kind: "thermal_warning",
    textFa: "دمای گوشی بالاست، ضبط ممکن است قطع شود",
    priority: 6,
    cooldownMs: 60000,
  },
  low_storage: {
    kind: "low_storage",
    textFa: "فضای ذخیره‌سازی رو به اتمام است",
    priority: 5,
    cooldownMs: 120000,
  },
  gps_lost: {
    kind: "gps_lost",
    textFa: "سیگنال جی پی اس قطع شد",
    priority: 3,
    cooldownMs: 60000,
  },
  recording_started: {
    kind: "recording_started",
    textFa: "ضبط شروع شد",
    priority: 1,
    cooldownMs: 0,
  },
  recording_stopped: {
    kind: "recording_stopped",
    textFa: "ضبط متوقف شد",
    priority: 1,
    cooldownMs: 0,
  },
};

/**
 * Debounced announcer: decides whether an incoming alert should actually
 * be spoken right now, respecting each kind's own cooldown and letting a
 * higher-priority alert interrupt a lower-priority one currently speaking.
 * Mirrors the cooldown pattern already used by LaneDepartureStateMachine
 * and ParkingImpactDetector.
 */
export class AlertAnnouncer {
  private lastAnnouncedAtMs: Partial<Record<AlertKind, number>> = {};
  private currentlySpeaking: { kind: AlertKind; priority: number } | null = null;

  /** Call when a new alert condition fires. Returns the message to speak, or null to suppress it. */
  offer(kind: AlertKind, nowMs: number): AlertMessage | null {
    const message = ALERT_MESSAGES[kind];
    const last = this.lastAnnouncedAtMs[kind] ?? -Infinity;
    if (nowMs - last < message.cooldownMs) return null;

    if (this.currentlySpeaking && this.currentlySpeaking.priority > message.priority) {
      return null; // a more important alert is already being spoken
    }

    this.lastAnnouncedAtMs[kind] = nowMs;
    this.currentlySpeaking = { kind, priority: message.priority };
    return message;
  }

  /** Call from the native TTS "did finish speaking" callback. */
  onSpeechFinished(kind: AlertKind) {
    if (this.currentlySpeaking?.kind === kind) this.currentlySpeaking = null;
  }
}
