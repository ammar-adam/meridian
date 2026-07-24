import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand, stats } from "./brand";
import { fontMono, fontSans, fontSerif } from "./fonts";

function rise(frame: number, fps: number, delay = 0, dur = 18) {
  const t = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.8 },
  });
  return {
    opacity: interpolate(t, [0, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    transform: `translateY(${interpolate(t, [0, 1], [18, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
  };
}

function LogoMark({ size = 48 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.18),
        background: brand.accent,
        color: brand.accentOn,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: fontSans,
        fontWeight: 700,
        fontSize: Math.round(size * 0.4),
      }}
    >
      M
    </div>
  );
}

function Grain() {
  return (
    <AbsoluteFill
      style={{
        opacity: 0.035,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        pointerEvents: "none",
      }}
    />
  );
}

function SceneBrand({ frame, fps }: { frame: number; fps: number }) {
  const a = rise(frame, fps, 8);
  const b = rise(frame, fps, 22);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ ...a, display: "flex", alignItems: "center", gap: 20 }}>
        <LogoMark size={64} />
        <div
          style={{
            fontFamily: fontSerif,
            fontSize: 92,
            color: brand.text,
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          Meridian
        </div>
      </div>
      <div
        style={{
          ...b,
          marginTop: 28,
          fontFamily: fontSans,
          fontSize: 18,
          color: brand.muted,
          letterSpacing: "0.04em",
        }}
      >
        School ecosystems → fund mandates
      </div>
    </AbsoluteFill>
  );
}

function SceneHeadline({ frame, fps }: { frame: number; fps: number }) {
  const a = rise(frame, fps, 4);
  const b = rise(frame, fps, 16);
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 160px" }}>
      <div
        style={{
          ...a,
          fontFamily: fontSans,
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: brand.accent,
          marginBottom: 24,
        }}
      >
        The wedge
      </div>
      <div
        style={{
          ...b,
          fontFamily: fontSerif,
          fontSize: 64,
          color: brand.text,
          letterSpacing: "-0.02em",
          lineHeight: 1.15,
          maxWidth: 980,
        }}
      >
        Campus deal flow, with receipts.
      </div>
    </AbsoluteFill>
  );
}

const ROWS = [
  { name: "SCADABLE", founders: "Ali Rahbar", fit: 92, src: "Velocity" },
  { name: "Photon-IV", founders: "Sanal Sina Kamal", fit: 88, src: "Velocity" },
  { name: "Simantic", founders: "Hong · Shahriar", fit: 84, src: "Velocity" },
];

function SceneFlow({ frame, fps }: { frame: number; fps: number }) {
  const head = rise(frame, fps, 2);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          ...head,
          width: 1080,
          background: brand.surface,
          border: `1px solid ${brand.border}`,
          borderRadius: 12,
          boxShadow: "0 28px 56px rgba(15,23,42,0.12)",
          overflow: "hidden",
          display: "flex",
          minHeight: 520,
        }}
      >
        <div
          style={{
            width: 56,
            background: brand.sidebar,
            padding: 10,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {["F", "B", "L", "T"].map((l, i) => (
            <div
              key={l}
              style={{
                borderRadius: 6,
                padding: "10px 0",
                textAlign: "center",
                fontFamily: fontSans,
                fontSize: 11,
                fontWeight: 600,
                color: i === 0 ? "#fff" : "rgba(255,255,255,0.35)",
                background: i === 0 ? "rgba(255,255,255,0.1)" : "transparent",
              }}
            >
              {l}
            </div>
          ))}
        </div>
        <div style={{ flex: 1, padding: 28, background: brand.bg }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <div style={{ fontFamily: fontSans, fontWeight: 600, fontSize: 18, color: brand.text }}>
                Deal Flow
              </div>
              <div style={{ fontFamily: fontSans, fontSize: 13, color: brand.muted, marginTop: 4 }}>
                Panache Ventures · Canadian pre-seed
              </div>
            </div>
            <div
              style={{
                fontFamily: fontMono,
                fontSize: 12,
                color: brand.accent,
                background: brand.accentSoft,
                border: `1px solid ${brand.accentLine}`,
                borderRadius: 6,
                padding: "6px 12px",
                height: "fit-content",
              }}
            >
              Community
            </div>
          </div>
          {ROWS.map((row, i) => {
            const r = rise(frame, fps, 10 + i * 4);
            return (
              <div
                key={row.name}
                style={{
                  ...r,
                  background: brand.surface,
                  border: `1px solid ${brand.border}`,
                  borderRadius: 6,
                  padding: "14px 16px",
                  marginBottom: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: fontSans, fontWeight: 600, fontSize: 15, color: brand.text }}>
                      {row.name}
                    </span>
                    <span
                      style={{
                        fontFamily: fontSans,
                        fontSize: 11,
                        fontWeight: 600,
                        color: brand.accent,
                        background: brand.accentSoft,
                        border: `1px solid ${brand.accentLine}`,
                        borderRadius: 4,
                        padding: "2px 7px",
                      }}
                    >
                      {row.fit}
                    </span>
                  </div>
                  <div style={{ fontFamily: fontSans, fontSize: 12, color: brand.muted, marginTop: 4 }}>
                    Founders: {row.founders}
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: fontMono,
                    fontSize: 10,
                    color: brand.accent,
                    background: brand.accentSoft,
                    border: `1px solid ${brand.accentLine}`,
                    borderRadius: 4,
                    padding: "3px 8px",
                  }}
                >
                  {row.src}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function SceneProof({ frame, fps }: { frame: number; fps: number }) {
  const a = rise(frame, fps, 4);
  const b = rise(frame, fps, 14);
  const c = rise(frame, fps, 24);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 160px" }}>
      <div style={{ width: "100%", maxWidth: 920 }}>
        <div
          style={{
            ...a,
            fontFamily: fontSans,
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: brand.accent,
            marginBottom: 20,
          }}
        >
          Falsifiable
        </div>
        <div
          style={{
            ...b,
            fontFamily: fontSerif,
            fontSize: 52,
            color: brand.text,
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            marginBottom: 36,
          }}
        >
          Dated index checks. Provenance you can re-run.
        </div>
        <div style={{ ...c, display: "flex", gap: 16 }}>
          {[
            { label: "Company records", value: String(stats.companyRecords) },
            { label: "Verified misses", value: String(stats.verifiedMisses) },
            { label: "Index checks", value: String(stats.entitiesChecked) },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                background: brand.surface,
                border: `1px solid ${brand.border}`,
                borderRadius: 8,
                padding: "22px 24px",
              }}
            >
              <div style={{ fontFamily: fontSerif, fontSize: 40, color: brand.text, letterSpacing: "-0.02em" }}>
                {s.value}
              </div>
              <div
                style={{
                  fontFamily: fontSans,
                  fontSize: 13,
                  color: brand.muted,
                  marginTop: 8,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function SceneClose({ frame, fps }: { frame: number; fps: number }) {
  const a = rise(frame, fps, 4);
  const b = rise(frame, fps, 16);
  const c = rise(frame, fps, 28);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ ...a, display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <LogoMark size={44} />
        <div style={{ fontFamily: fontSerif, fontSize: 56, color: brand.text, letterSpacing: "-0.03em" }}>
          Meridian
        </div>
      </div>
      <div
        style={{
          ...b,
          fontFamily: fontSans,
          fontSize: 22,
          color: brand.muted,
          marginBottom: 36,
        }}
      >
        School ecosystems → fund mandates.
      </div>
      <div
        style={{
          ...c,
          fontFamily: fontSans,
          fontSize: 15,
          fontWeight: 600,
          color: brand.accentOn,
          background: brand.accent,
          borderRadius: 8,
          padding: "14px 28px",
        }}
      >
        Open Deal Flow
      </div>
    </AbsoluteFill>
  );
}

export const Teaser: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene windows (frames @ 30fps)
  // 0–90 brand · 90–210 headline · 210–480 flow · 480–720 proof · 720–900 close
  const scenes: { start: number; end: number; el: React.ReactNode }[] = [
    { start: 0, end: 90, el: <SceneBrand frame={frame - 0} fps={fps} /> },
    { start: 90, end: 210, el: <SceneHeadline frame={frame - 90} fps={fps} /> },
    { start: 210, end: 480, el: <SceneFlow frame={frame - 210} fps={fps} /> },
    { start: 480, end: 720, el: <SceneProof frame={frame - 480} fps={fps} /> },
    { start: 720, end: 900, el: <SceneClose frame={frame - 720} fps={fps} /> },
  ];

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, #e8eaef 0%, ${brand.bg} 42%, ${brand.bg} 100%)`,
      }}
    >
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse 80% 50% at 70% 0%, rgba(31, 77, 61, 0.07), transparent 55%)",
        }}
      />
      {scenes.map((s, i) => {
        const local = frame - s.start;
        const len = s.end - s.start;
        const opacity = interpolate(
          local,
          [0, 10, len - 12, len],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        if (frame < s.start - 2 || frame > s.end + 2) return null;
        return (
          <AbsoluteFill key={i} style={{ opacity }}>
            {s.el}
          </AbsoluteFill>
        );
      })}
      <Grain />
    </AbsoluteFill>
  );
};
