import { describe, it, expect } from "vitest";
import { scanFlowReducer, initialScanPhase, type ScanPhase } from "./scan-flow";
import type { ScannedSticker } from "./lookup-sticker-by-code";

const STICKER: ScannedSticker = {
  id: 1,
  code: "MEX1",
  title: "México",
  image_url: null,
  owned_count: 0,
  wishlisted: false,
};

describe("scanFlowReducer", () => {
  it("começa procurando", () => {
    expect(initialScanPhase).toEqual({ kind: "searching" });
  });

  it("searching + resolved → confirming com sticker e modo", () => {
    const next = scanFlowReducer(initialScanPhase, {
      type: "resolved",
      sticker: STICKER,
      mode: "lancamento",
    });
    expect(next).toEqual({ kind: "confirming", sticker: STICKER, mode: "lancamento" });
  });

  it("confirming + confirm → searching", () => {
    const phase: ScanPhase = { kind: "confirming", sticker: STICKER, mode: "troca" };
    expect(scanFlowReducer(phase, { type: "confirm" })).toEqual({ kind: "searching" });
  });

  it("confirming + reject → searching", () => {
    const phase: ScanPhase = { kind: "confirming", sticker: STICKER, mode: "troca" };
    expect(scanFlowReducer(phase, { type: "reject" })).toEqual({ kind: "searching" });
  });

  it("confirming + openManual → manual", () => {
    const phase: ScanPhase = { kind: "confirming", sticker: STICKER, mode: "baixa" };
    expect(scanFlowReducer(phase, { type: "openManual" })).toEqual({ kind: "manual" });
  });

  it("searching + openManual → manual", () => {
    expect(scanFlowReducer(initialScanPhase, { type: "openManual" })).toEqual({ kind: "manual" });
  });

  it("manual + manualResolved → confirming", () => {
    const phase: ScanPhase = { kind: "manual" };
    const next = scanFlowReducer(phase, {
      type: "manualResolved",
      sticker: STICKER,
      mode: "baixa",
    });
    expect(next).toEqual({ kind: "confirming", sticker: STICKER, mode: "baixa" });
  });

  it("manual + closeManual → searching", () => {
    expect(scanFlowReducer({ kind: "manual" }, { type: "closeManual" })).toEqual({
      kind: "searching",
    });
  });

  it("ignora resolved fora de searching (não atropela uma confirmação aberta)", () => {
    const phase: ScanPhase = { kind: "confirming", sticker: STICKER, mode: "lancamento" };
    expect(scanFlowReducer(phase, { type: "resolved", sticker: STICKER, mode: "troca" })).toBe(
      phase,
    );
  });

  it("ignora confirm quando não está confirmando", () => {
    expect(scanFlowReducer(initialScanPhase, { type: "confirm" })).toBe(initialScanPhase);
  });

  it("ignora reject quando não está confirmando", () => {
    expect(scanFlowReducer(initialScanPhase, { type: "reject" })).toBe(initialScanPhase);
  });

  it("ignora manualResolved fora do manual (ex.: usuário cancelou durante o lookup)", () => {
    expect(
      scanFlowReducer(initialScanPhase, { type: "manualResolved", sticker: STICKER, mode: "troca" }),
    ).toBe(initialScanPhase);
  });
});
