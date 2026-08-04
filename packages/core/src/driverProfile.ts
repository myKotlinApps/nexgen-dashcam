// Driver Identification — on-device, privacy-first face matching
//
// Goal: recognize which registered driver (e.g. "owner") is behind the
// wheel, entirely on-device — no image or embedding ever leaves the phone.
// Detection itself uses the platform's built-in, free/permissive-licensed
// face APIs (Android: Google ML Kit Face Detection, Apache-2.0; iOS:
// Vision's VNDetectFaceLandmarksRequest, part of the OS). Turning a
// detected face into a fixed-length embedding for *recognition* (not just
// detection) needs a small on-device model; the recommended one is
// `dlib_face_recognition_resnet_model_v1` (davisking/dlib, Boost Software
// License 1.0 — free for any use including commercial, must keep the
// license notice) converted to TFLite/CoreML, or Google's MobileFaceNet
// (also permissively licensed). This module only holds the
// license-agnostic embedding math; see native DriverIdentifier.kt/.swift
// for where to plug the converted model file in.

export interface DriverProfile {
  id: string;
  displayName: string;
  /** L2-normalized face embedding, stored only on-device (e.g. 128 or 192 dims) */
  faceEmbedding: number[];
  isOwner: boolean;
  createdAt: string;
  lastMatchedAt?: string;
}

export interface FaceMatchConfig {
  /** Cosine similarity above this counts as a match (0.6-0.7 typical for FaceNet-style embeddings) */
  matchThreshold: number;
  /** Require this many consecutive matching frames before confirming identity, avoids one-off false positives */
  minConsecutiveMatches: number;
}

export const DEFAULT_FACE_MATCH_CONFIG: FaceMatchConfig = {
  matchThreshold: 0.62,
  minConsecutiveMatches: 3,
};

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return -1;
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  if (normA === 0 || normB === 0) return -1;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface DriverMatchResult {
  profile: DriverProfile | null;
  similarity: number;
  isNewOrUnknown: boolean;
}

/** Finds the best-matching registered driver for a freshly computed embedding. */
export function matchDriver(
  embedding: number[],
  profiles: DriverProfile[],
  config: FaceMatchConfig = DEFAULT_FACE_MATCH_CONFIG
): DriverMatchResult {
  let best: DriverProfile | null = null;
  let bestScore = -1;

  for (const profile of profiles) {
    const score = cosineSimilarity(embedding, profile.faceEmbedding);
    if (score > bestScore) {
      bestScore = score;
      best = profile;
    }
  }

  if (best && bestScore >= config.matchThreshold) {
    return { profile: best, similarity: bestScore, isNewOrUnknown: false };
  }
  return { profile: null, similarity: bestScore, isNewOrUnknown: true };
}

/**
 * Debounces per-frame matches so identity is only "confirmed" after several
 * consecutive frames agree — mirrors LaneDepartureStateMachine's approach.
 */
export class DriverIdentityTracker {
  private lastProfileId: string | null = null;
  private consecutiveCount = 0;
  private confirmedProfileId: string | null = null;

  constructor(private config: FaceMatchConfig = DEFAULT_FACE_MATCH_CONFIG) {}

  update(result: DriverMatchResult): { confirmedProfileId: string | null; justConfirmed: boolean } {
    const candidateId = result.profile?.id ?? null;
    if (candidateId === this.lastProfileId) this.consecutiveCount++;
    else {
      this.lastProfileId = candidateId;
      this.consecutiveCount = 1;
    }

    let justConfirmed = false;
    if (
      candidateId !== null &&
      this.consecutiveCount >= this.config.minConsecutiveMatches &&
      this.confirmedProfileId !== candidateId
    ) {
      this.confirmedProfileId = candidateId;
      justConfirmed = true;
    } else if (candidateId === null && this.consecutiveCount >= this.config.minConsecutiveMatches) {
      this.confirmedProfileId = null;
    }

    return { confirmedProfileId: this.confirmedProfileId, justConfirmed };
  }
}
