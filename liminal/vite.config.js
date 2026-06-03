import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// MediaPipe's hands/camera_utils packages are CommonJS-ish and assign globals,
// so we pre-bundle them with esbuild to avoid interop surprises in dev.
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ["@mediapipe/hands", "@mediapipe/camera_utils"],
  },
  server: {
    port: 5173,
    host: true,
  },
})
