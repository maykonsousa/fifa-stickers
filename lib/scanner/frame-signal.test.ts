import { describe, it, expect } from "vitest";
import { nextFrameSignal, initialFrameState, type FrameThresholds } from "./frame-signal";

const T: FrameThresholds = { diff: 6, content: 100, rearmDiff: 14, stableSamples: 3 };

describe("nextFrameSignal — searching", () => {
  it("dispara após N amostras estáveis e com conteúdo", () => {
    let state = initialFrameState();
    const stable = { diffFromPrev: 2, content: 5000, diffFromLastRead: null };
    let d = nextFrameSignal(state, stable, T); // 1ª estável
    expect(d.kind).toBe("wait");
    d = nextFrameSignal(d.state, stable, T); // 2ª
    expect(d.kind).toBe("wait");
    d = nextFrameSignal(d.state, stable, T); // 3ª → fire
    expect(d.kind).toBe("fire");
    expect(d.state.phase).toBe("rearm");
  });

  it("não dispara se estável mas sem conteúdo (mesa vazia)", () => {
    let state = initialFrameState();
    const empty = { diffFromPrev: 1, content: 10, diffFromLastRead: null };
    for (let i = 0; i < 5; i++) {
      const d = nextFrameSignal(state, empty, T);
      expect(d.kind).toBe("wait");
      state = d.state;
    }
  });

  it("zera a contagem quando o frame se mexe (instável)", () => {
    let state = initialFrameState();
    const stable = { diffFromPrev: 2, content: 5000, diffFromLastRead: null };
    const moving = { diffFromPrev: 40, content: 5000, diffFromLastRead: null };
    let d = nextFrameSignal(state, stable, T); // count 1
    d = nextFrameSignal(d.state, moving, T); // reseta
    expect(d.state.stableCount).toBe(0);
    d = nextFrameSignal(d.state, stable, T); // count 1 de novo
    d = nextFrameSignal(d.state, stable, T); // 2
    d = nextFrameSignal(d.state, stable, T); // 3 → fire
    expect(d.kind).toBe("fire");
  });
});

describe("nextFrameSignal — rearm", () => {
  it("fica em rearm enquanto o frame não mudar do último lido", () => {
    const state = { phase: "rearm" as const, stableCount: 0 };
    const same = { diffFromPrev: 1, content: 5000, diffFromLastRead: 3 };
    const d = nextFrameSignal(state, same, T);
    expect(d.kind).toBe("wait");
    expect(d.state.phase).toBe("rearm");
  });

  it("volta a searching quando o frame muda bastante (trocou a figurinha)", () => {
    const state = { phase: "rearm" as const, stableCount: 0 };
    const changed = { diffFromPrev: 30, content: 5000, diffFromLastRead: 50 };
    const d = nextFrameSignal(state, changed, T);
    expect(d.kind).toBe("wait");
    expect(d.state.phase).toBe("searching");
    expect(d.state.stableCount).toBe(0);
  });

  it("a igualdade exata com rearmDiff já conta como mudou", () => {
    const state = { phase: "rearm" as const, stableCount: 0 };
    const exact = { diffFromPrev: 30, content: 5000, diffFromLastRead: T.rearmDiff };
    const d = nextFrameSignal(state, exact, T);
    expect(d.state.phase).toBe("searching");
  });

  it("sem assinatura do último lido (null) fica preso em rearm — nunca dispara às cegas", () => {
    const state = { phase: "rearm" as const, stableCount: 0 };
    const noSig = { diffFromPrev: 99, content: 5000, diffFromLastRead: null };
    const d = nextFrameSignal(state, noSig, T);
    expect(d.kind).toBe("wait");
    expect(d.state.phase).toBe("rearm");
  });
});
