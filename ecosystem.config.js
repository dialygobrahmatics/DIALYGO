// pm2 process definitions. Use ./start.sh rather than calling pm2 directly: it checks the
// databases first.
const path = require("path");

const BACKEND_PORT = process.env.BACKEND_PORT || "8000";
const FRONTEND_PORT = process.env.FRONTEND_PORT || "3000";
const backendDir = path.join(__dirname, "backend");

module.exports = {
  apps: [
    {
      name: "dialygo-backend",
      cwd: backendDir,
      script: path.join(backendDir, ".venv/bin/python3"),
      args: `-m uvicorn server:app --host 127.0.0.1 --port ${BACKEND_PORT}`,
      interpreter: "none",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      // The process environment wins over backend/.env, so CORS follows the frontend port.
      env: { CORS_ORIGINS: `http://localhost:${FRONTEND_PORT},http://127.0.0.1:${FRONTEND_PORT}` },
      // No --reload / watch: uploads write into backend/storage and would restart the API mid-request.
      // Use `./start.sh restart` after backend code changes.
    },
    {
      name: "dialygo-frontend",
      cwd: path.join(__dirname, "frontend"),
      script: "npm",
      args: "start",
      interpreter: "none",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "20s",
      env: {
        PORT: FRONTEND_PORT,
        BROWSER: "none",
        REACT_APP_BACKEND_URL: `http://localhost:${BACKEND_PORT}`,
      },
    },
  ],
};
