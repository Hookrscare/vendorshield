import { describe, it, expect } from "vitest";
import {
  BridgeDeckMultiChannelGprArrayCorrelator,
  MultiChannelDeckScan
} from "./bridge-deck-multi-channel-gpr-array-correlator";

describe("SNAP-82: BridgeDeckMultiChannelGprArrayCorrelator", () => {
  it("evaluates healthy bridge deck with sound cover and no delaminations", () => {
    const scan: MultiChannelDeckScan = {
      bridgeDeckId: "DECK-I95-SPAN-04",
      spanNumber: 4,
      nominalDesignCoverMm: 60.0,
      channelTargets: [
        {
          channelIndex: 0,
          offsetMm: 150,
          apexTwoWayTravelTimeNs: 1.2, // d = 102.5 * 1.2 / 2 = 61.5mm
          reflectionPolarity: "POSITIVE",
          amplitudeDb: -4.5
        },
        {
          channelIndex: 1,
          offsetMm: 300,
          apexTwoWayTravelTimeNs: 1.18, // d = 60.4mm
          reflectionPolarity: "POSITIVE",
          amplitudeDb: -4.8
        }
      ]
    };

    const res = BridgeDeckMultiChannelGprArrayCorrelator.correlateArrayScan(scan);
    expect(res.bridgeDeckId).toBe("DECK-I95-SPAN-04");
    expect(res.fhwaDeteriorationCategory).toBe("CATEGORY_1_SOUND");
    expect(res.shallowCoverRebarCount).toBe(0);
    expect(res.delaminationVoidCount).toBe(0);
    expect(res.inspectionVerificationSha256).toHaveLength(64);
  });

  it("identifies severe delamination and shallow rebar cover risk", () => {
    const scan: MultiChannelDeckScan = {
      bridgeDeckId: "DECK-PENNDOT-BRIDGE-12",
      spanNumber: 1,
      nominalDesignCoverMm: 60.0,
      channelTargets: [
        {
          channelIndex: 0,
          offsetMm: 100,
          apexTwoWayTravelTimeNs: 0.6, // shallow cover: 30.7mm vs 60mm nominal
          reflectionPolarity: "NEGATIVE_REVERSED", // phase reversal = air void / delam
          amplitudeDb: -22.0
        },
        {
          channelIndex: 1,
          offsetMm: 250,
          apexTwoWayTravelTimeNs: 0.7,
          reflectionPolarity: "NEGATIVE_REVERSED",
          amplitudeDb: -18.5
        }
      ]
    };

    const res = BridgeDeckMultiChannelGprArrayCorrelator.correlateArrayScan(scan);
    expect(res.fhwaDeteriorationCategory).toBe("CATEGORY_3_SEVERE_DELAMINATION");
    expect(res.shallowCoverRebarCount).toBe(2);
    expect(res.delaminationVoidCount).toBe(2);
  });

  it("validates input boundaries", () => {
    expect(() =>
      BridgeDeckMultiChannelGprArrayCorrelator.correlateArrayScan({
        bridgeDeckId: "",
        spanNumber: 1,
        nominalDesignCoverMm: 50,
        channelTargets: []
      })
    ).toThrow("bridgeDeckId cannot be empty.");
  });
});
