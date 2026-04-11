// web/lib/home/globalDropEngine.ts

import { HomeCandidate, HomeExperience } from "./types";
import { applyScore } from "./scoreCandidate";
import { assignRails } from "./assignRails";

/**
 * Global Drop Engine
 *
 * Purpose:
 * - accept raw normalized candidates
 * - score them consistently
 * - hand them to rail assignment
 *
 * Important:
 * - This file should stay orchestration-only.
 * - It should not contain fetching logic.
 * - It should not become the dumping ground for homepage business rules.
 * - Final rail taxonomy still belongs in assignRails.ts.
 */
export function buildHomeExperience(
  candidates: HomeCandidate[]
): HomeExperience {
  const safeCandidates = candidates.filter(Boolean);

  const scored = safeCandidates.map((candidate) => applyScore(candidate));

  return assignRails(scored);
}