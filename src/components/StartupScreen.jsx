/* ------------------------------------------------------------------ */
/*  StartupScreen.jsx — wordmark, live skeleton, fist → open trigger   */
/* ------------------------------------------------------------------ */

import React, { useRef } from "react";
import SkeletonVideo from "./SkeletonVideo.jsx";
import { useFistTrigger } from "../hooks/useFistTrigger.js";
import { COLORS } from "../lib/constants.js";

export default function StartupScreen({ onEnter }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const { armed, cameraError, handVisible } = useFistTrigger(videoRef, canvasRef, onEnter);

  const status = cameraError
    ? null
    : !handVisible
      ? "show your hand to the camera"
      : armed
        ? "now open your palm"
        : "make a fist to begin";

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 36,
        background: COLORS.canvas,
      }}
    >
      <h1
        style={{
          fontStyle: "italic",
          fontWeight: 300,
          fontSize: "clamp(64px, 9vw, 124px)",
          letterSpacing: "-0.04em",
          color: COLORS.text,
          lineHeight: 1,
        }}
      >
        liminal
      </h1>

      {!cameraError && (
        <>
          <SkeletonVideo ref={videoRef} canvasRef={canvasRef} width={340} height={250} />
          <p
            style={{
              textTransform: "uppercase",
              fontWeight: 300,
              fontSize: 14,
              letterSpacing: "0.32em",
              color: armed ? COLORS.text : COLORS.muted,
              transition: "color 0.3s ease",
              minHeight: 18,
            }}
          >
            {status}
          </p>
        </>
      )}

      {cameraError && (
        <p
          style={{
            maxWidth: 360,
            textAlign: "center",
            color: COLORS.muted,
            fontSize: 17,
            fontStyle: "italic",
          }}
        >
          The camera isn't available — you can still enter and explore with
          your mouse and keyboard.
        </p>
      )}

      <button
        onClick={onEnter}
        style={{
          textTransform: "uppercase",
          fontWeight: 300,
          fontSize: 13,
          letterSpacing: "0.34em",
          color: COLORS.text,
          padding: "12px 34px",
          border: `1px solid ${cameraError ? COLORS.text : "rgba(26,26,26,0.25)"}`,
          borderRadius: 999,
          background: "transparent",
          transition: "border-color 0.3s ease, background 0.3s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.5)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        {cameraError ? "Enter" : "Enter without gestures"}
      </button>
    </div>
  );
}
