/* ------------------------------------------------------------------ */
/*  App.jsx — startup → gallery state machine                          */
/* ------------------------------------------------------------------ */

import React, { useState } from "react";
import StartupScreen from "./components/StartupScreen.jsx";
import Gallery from "./components/Gallery.jsx";

export default function App() {
  const [stage, setStage] = useState("startup"); // "startup" | "gallery"

  return stage === "startup" ? (
    <StartupScreen onEnter={() => setStage("gallery")} />
  ) : (
    <Gallery />
  );
}
