/**
 * Derps Playdates — module barrel.
 *
 * Bounded modules inside the existing Derps deployment (§13.1): matching is
 * the one with a plausible independent scaling profile and the one to extract
 * first, which is why every consumer imports through this seam rather than
 * reaching into internals.
 */
export * from "./types";
export * from "./geo";
export * from "./quiz";
export * from "./scoring";
export * from "./filters";
export * from "./candidates";
export * from "./ranking";
export * from "./reasons";
export * from "./feed";
export * from "./venues";
export * from "./vibe-card";
export * from "./safety-text";
export * from "./calendar";
export * from "./analytics";
export * from "./trust";
