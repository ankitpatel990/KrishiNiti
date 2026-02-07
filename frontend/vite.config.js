import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname), "");

  const apiTarget = env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@components": path.resolve(__dirname, "./src/components"),
        "@services": path.resolve(__dirname, "./src/services"),
        "@hooks": path.resolve(__dirname, "./src/hooks"),
        "@utils": path.resolve(__dirname, "./src/utils"),
        "@context": path.resolve(__dirname, "./src/context"),
        "@pages": path.resolve(__dirname, "./src/pages"),
        "@assets": path.resolve(__dirname, "./src/assets"),
        "@styles": path.resolve(__dirname, "./src/styles"),
        "@locales": path.resolve(__dirname, "./src/locales"),
        "@i18n": path.resolve(__dirname, "./src/i18n"),
      },
    },

    server: {
      port: 3000,
      open: true,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },

    build: {
      outDir: "dist",
      sourcemap: false,
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "react-router-dom"],
            tensorflow: ["@tensorflow/tfjs"],
            ui: ["framer-motion", "react-hot-toast"],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },

    preview: {
      port: 4173,
    },

    optimizeDeps: {
      include: ["react", "react-dom", "react-router-dom", "axios"],
    },

    test: {
      globals: true,
      environment: "node",
      setupFiles: ["./tests/setup.js"],
      include: ["tests/**/*.test.{js,jsx}"],
      css: false,
      pool: "threads",
    },
  };
});
