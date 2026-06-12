/* ------------------------------------------------------------------ */
/*  SkeletonVideo.jsx — mirrored webcam feed + skeleton canvas         */
/* ------------------------------------------------------------------ */

import React, { forwardRef } from "react";

const SkeletonVideo = forwardRef(function SkeletonVideo(
  { canvasRef, width = 320, height = 240, rounded = 18 },
  videoRef
) {
  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        borderRadius: rounded,
        overflow: "hidden",
        background: "#1a1a1a",
        boxShadow: "0 18px 48px rgba(120,90,40,0.22), 0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: "scaleX(-1)", // mirror — your hand moves like a mirror
          filter: "saturate(0.85) contrast(1.02)",
        }}
      />
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          transform: "scaleX(-1)", // mirror the skeleton to match the feed
          pointerEvents: "none",
        }}
      />
    </div>
  );
});

export default SkeletonVideo;
