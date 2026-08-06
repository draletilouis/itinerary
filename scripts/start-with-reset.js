const { spawnSync, spawn } = require("child_process");
const { existsSync, writeFileSync } = require("fs");
const { join } = require("path");

const MARKER_PATH = join(process.cwd(), ".deployment-reset-done");
const RESET_CONFIRMATION = "RESET_HINENI_PRODUCTION_KEEP_USERS";
const isProduction = process.env.RAILWAY_ENVIRONMENT_NAME === "production";

function runCommand(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
}

function startApp() {
  const child = spawn("npm", ["start"], { stdio: "inherit" });

  ["SIGINT", "SIGTERM", "SIGHUP"].forEach((signal) => {
    process.on(signal, () => {
      if (!child.killed) {
        child.kill(signal);
      }
    });
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
    } else {
      process.exit(code ?? 0);
    }
  });

  child.on("error", (error) => {
    console.error("Failed to start application:", error);
    process.exit(1);
  });
}

function main() {
  if (isProduction && !existsSync(MARKER_PATH)) {
    if (process.env.CONFIRM_LIVE_RESET !== RESET_CONFIRMATION) {
      throw new Error(
        `Missing CONFIRM_LIVE_RESET=${RESET_CONFIRMATION} in production environment.`,
      );
    }

    console.log("Production deployment detected. Running database reset before start.");
    runCommand("npm", ["run", "db:deploy"]);
    runCommand("npm", ["run", "db:reset:live"]);
    writeFileSync(MARKER_PATH, `reset completed ${new Date().toISOString()}\n`);
  } else if (isProduction) {
    console.log("Production deployment reset already completed for this container. Skipping.");
  } else {
    console.log("Not production environment. Skipping automatic deployment reset.");
  }

  startApp();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
