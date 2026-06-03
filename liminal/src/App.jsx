import { useState, useCallback } from "react"
import { makeCylinder } from "./lib/constants.js"
import StartupScreen from "./components/StartupScreen.jsx"
import Gallery from "./components/Gallery.jsx"

export default function App() {
  const [screen, setScreen] = useState("startup")
  // Generate the cylinder memory set once so positions stay stable.
  const [seedItems] = useState(() => makeCylinder())

  const open = useCallback(() => setScreen("gallery"), [])

  return screen === "startup" ? (
    <StartupScreen onOpen={open} />
  ) : (
    <Gallery seedItems={seedItems} />
  )
}
