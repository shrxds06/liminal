import { useState, useEffect } from "react"

export default function HintBadge() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 5000)
    const hide = () => setVisible(false)
    window.addEventListener("mousedown", hide, { once: true })
    return () => {
      clearTimeout(t)
      window.removeEventListener("mousedown", hide)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(26,26,26,0.72)",
        color: "#F2EBE3",
        fontFamily: "system-ui, sans-serif",
        fontSize: 11,
        letterSpacing: "0.06em",
        padding: "8px 20px",
        borderRadius: 100,
        pointerEvents: "none",
        whiteSpace: "nowrap",
        transition: "opacity 0.4s",
      }}
    >
      two fingers to turn · open palm to spread &amp; pan · fist to re-form
    </div>
  )
}
