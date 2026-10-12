"""Supervise the independent Evidence API and the built Pages frontend locally.

Invoked by the shell/PowerShell wrappers via the backend's uv environment.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request

from dotenv import dotenv_values


def require_free(port: int) -> None:
    with socket.socket() as listener:
        try:
            listener.bind(("127.0.0.1", port))
        except OSError as exc:
            raise RuntimeError(f"Port {port} is in use; stop its existing service first.") from exc


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--backend", type=Path, required=True)
    parser.add_argument("--skip-setup", action="store_true")
    parser.add_argument("--tunnel", action="store_true", help="Temporary HTTPS demo; requires API key and cloudflared")
    args = parser.parse_args()
    backend = args.backend.resolve()
    frontend = Path(__file__).resolve().parents[1]
    if not (backend / "regulatory_mvp" / "api.py").is_file():
        raise RuntimeError("Evidence backend path is invalid.")
    backend_env_file = backend / ".env"
    if not backend_env_file.exists():
        shutil.copyfile(backend / ".env.example", backend_env_file)
        print("Created backend .env from .env.example; default provider remains Ollama.", flush=True)
    backend_values = {k: v for k, v in dotenv_values(backend_env_file).items() if v is not None}
    api_env = {**os.environ, **backend_values}
    api_port = int(api_env.get("REGULATORY_API_PORT", "8000"))
    front_port = int(api_env.get("REGWATCH_FRONTEND_PORT", "3000"))
    for port in (api_port, front_port):
        if not 1024 <= port <= 65535:
            raise RuntimeError("Local ports must be between 1024 and 65535.")
        require_free(port)
    if api_port == front_port:
        raise RuntimeError("API and frontend ports must differ.")
    if args.tunnel:
        api_env['REGULATORY_PUBLIC_API'] = 'true'
        if not api_env.get("REGULATORY_API_KEY", "").strip():
            raise RuntimeError("--tunnel requires REGULATORY_API_KEY in the backend .env.")
        if not shutil.which("cloudflared"):
            raise RuntimeError("Install cloudflared before using --tunnel.")
    node = shutil.which("node")
    npm = shutil.which("npm.cmd" if os.name == "nt" else "npm")
    if not node or not npm:
        raise RuntimeError("Install Node.js 22 LTS (or a compatible newer version) and npm first.")
    subprocess.run([node, "--version"], check=True)
    # Only the API URL is passed to the frontend build. Backend keys never enter Vite.
    build_env = os.environ.copy()
    frontend_values = {}
    for name in (".env", ".env.local", ".env.production", ".env.production.local"):
        if (frontend / name).exists():
            frontend_values.update(dotenv_values(frontend / name))
    build_env["VITE_RESEARCH_API_URL"] = (
        os.environ.get("VITE_RESEARCH_API_URL") or frontend_values.get("VITE_RESEARCH_API_URL")
        or f"http://127.0.0.1:{api_port}"
    )
    if not args.skip_setup:
        subprocess.run([npm, "ci", "--no-audit", "--no-fund"], cwd=frontend, env=build_env, check=True)
    elif not (frontend / "node_modules").is_dir():
        raise RuntimeError("Frontend dependencies missing; rerun without --skip-setup.")
    subprocess.run([npm, "run", "build", "--", "--outDir", ".local-dist"], cwd=frontend, env=build_env, check=True)
    processes: list[subprocess.Popen] = []
    log_path = backend / "outputs" / "regwatch-api.log"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("a", encoding="utf-8") as api_log:
        try:
            api = subprocess.Popen([sys.executable, "-m", "uvicorn", "regulatory_mvp.api:app", "--host", "127.0.0.1", "--port", str(api_port), "--no-proxy-headers"], cwd=backend, env=api_env, stdout=api_log, stderr=subprocess.STDOUT)
            processes.append(api)
            deadline = time.monotonic() + 30
            health_url = f"http://127.0.0.1:{api_port}/health"
            while True:
                if api.poll() is not None:
                    raise RuntimeError(f"Evidence API failed to start; read {log_path}")
                try:
                    with urllib.request.urlopen(health_url, timeout=1) as response:
                        if response.status == 200:
                            break
                except (urllib.error.URLError, TimeoutError):
                    pass
                if time.monotonic() >= deadline:
                    raise RuntimeError(f"Evidence API startup timed out; read {log_path}")
                time.sleep(0.25)
            vite = frontend / "node_modules" / "vite" / "bin" / "vite.js"
            processes.append(subprocess.Popen([node, str(vite), "preview", "--outDir", ".local-dist", "--host", "127.0.0.1", "--port", str(front_port), "--strictPort"], cwd=frontend, env=build_env))
            if args.tunnel:
                processes.append(subprocess.Popen(["cloudflared", "tunnel", "--url", f"http://127.0.0.1:{api_port}"]))
            print(f"\nRegWatch HK: http://127.0.0.1:{front_port}\nEvidence API: {health_url}\nAPI log: {log_path}\nCtrl+C stops the services launched here.\n", flush=True)
            while all(process.poll() is None for process in processes):
                time.sleep(0.5)
            raise RuntimeError("A local service stopped unexpectedly; inspect its output.")
        except KeyboardInterrupt:
            print("Stopping local services...", flush=True)
        finally:
            for process in reversed(processes):
                if process.poll() is None:
                    process.terminate()
            for process in reversed(processes):
                try:
                    process.wait(timeout=8)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError, subprocess.CalledProcessError) as exc:
        print(f"Startup failed: {exc}", file=sys.stderr)
        sys.exit(1)
