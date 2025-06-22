import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import readline from "readline";

// Create a readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Available test types
const TEST_TYPES = {
  BASIC: "basic",
  ADVANCED: "advanced",
  DATA_DRIVEN: "data-driven",
};

// Default configuration
const DEFAULT_CONFIG = {
  testType: TEST_TYPES.BASIC,
  generateData: false,
  visualizeResults: true,
  configFile: "",
  connections: 100,
  duration: 30,
  url: "http://localhost:3000/api/identify",
};

// Parse command line arguments
const args = process.argv.slice(2);
const config = { ...DEFAULT_CONFIG };

for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace("--", "");
  const value = args[i + 1];

  if (key === "testType") {
    if (Object.values(TEST_TYPES).includes(value)) {
      config.testType = value;
    } else {
      console.error(
        `Invalid test type: ${value}. Using default: ${config.testType}`
      );
    }
  } else if (key === "generateData") {
    config.generateData = value === "true";
  } else if (key === "visualizeResults") {
    config.visualizeResults = value === "true";
  } else if (key === "configFile") {
    config.configFile = value;
  } else if (key === "connections") {
    config.connections = parseInt(value, 10);
  } else if (key === "duration") {
    config.duration = parseInt(value, 10);
  } else if (key === "url") {
    config.url = value;
  }
}

// Function to execute a command and return a promise
function executeCommand(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`\nExecuting: ${command} ${args.join(" ")}`);

    const process = spawn(command, args, { shell: true });
    let output = "";

    process.stdout.on("data", (data) => {
      const dataStr = data.toString();
      output += dataStr;
      console.log(dataStr);
    });

    process.stderr.on("data", (data) => {
      console.error(data.toString());
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}

// Function to find the most recent file matching a pattern
function findMostRecentFile(pattern: RegExp | string): string | null {
  const resultsDir = path.join(__dirname, "..", "results");

  if (!fs.existsSync(resultsDir)) {
    return null;
  }

  const files = fs
    .readdirSync(resultsDir)
    .filter((file) => {
      if (pattern instanceof RegExp) {
        return pattern.test(file);
      }
      return file.includes(pattern);
    })
    .map((file) => ({
      file,
      mtime: fs.statSync(path.join(resultsDir, file)).mtime,
    }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  return files.length > 0 ? path.join(resultsDir, files[0].file) : null;
}

// Main function to run the load test workflow
async function runLoadTest() {
  try {
    console.log("=== Load Test Workflow ===");
    console.log(`Test Type: ${config.testType}`);

    // Step 1: Generate test data if needed
    if (config.generateData || config.testType === TEST_TYPES.DATA_DRIVEN) {
      console.log("\n=== Generating Test Data ===");
      await executeCommand("npx", [
        "ts-node",
        "./load-testing/scripts/generate-test-data.ts",
      ]);
    }

    // Step 2: Run the appropriate load test
    console.log("\n=== Running Load Test ===");

    let testCommand: string[];
    let resultsPattern: RegExp;

    switch (config.testType) {
      case TEST_TYPES.ADVANCED:
        testCommand = [
          "ts-node",
          "./load-testing/scripts/advanced-load-tester.ts",
        ];
        if (config.configFile) {
          testCommand.push(`--config=${config.configFile}`);
        }
        resultsPattern = /load-test-results-.*\.json/;
        break;

      case TEST_TYPES.DATA_DRIVEN:
        testCommand = [
          "ts-node",
          "./load-testing/scripts/data-driven-load-tester.ts",
        ];
        if (config.configFile) {
          testCommand.push(`--config=${config.configFile}`);
        }
        resultsPattern = /data-driven-load-test-results-.*\.json/;
        break;

      case TEST_TYPES.BASIC:
      default:
        testCommand = [
          "ts-node",
          "./load-testing/scripts/load-tester.ts",
          "--url",
          config.url,
          "--connections",
          config.connections.toString(),
          "--duration",
          config.duration.toString(),
        ];
        resultsPattern = /load-test-results-.*\.json/;
        break;
    }

    await executeCommand("npx", testCommand);

    // Step 3: Visualize the results if requested
    if (config.visualizeResults) {
      console.log("\n=== Visualizing Results ===");

      // Find the most recent results file
      const resultsFile = findMostRecentFile(resultsPattern);

      if (resultsFile) {
        console.log(`Found results file: ${resultsFile}`);
        await executeCommand("npx", [
          "ts-node",
          "./load-testing/scripts/visualize-results.ts",
          resultsFile,
        ]);
      } else {
        console.error("No results file found. Skipping visualization.");
      }
    }

    console.log("\n=== Load Test Workflow Completed ===");
  } catch (error) {
    console.error("Error in load test workflow:", error);
  } finally {
    rl.close();
  }
}

// Display a menu to select options if no arguments were provided
if (args.length === 0) {
  console.log("Welcome to the Load Test Workflow");

  rl.question(
    "\nSelect test type:\n1. Basic\n2. Advanced\n3. Data-Driven\n> ",
    (answer) => {
      switch (answer.trim()) {
        case "2":
          config.testType = TEST_TYPES.ADVANCED;
          break;
        case "3":
          config.testType = TEST_TYPES.DATA_DRIVEN;
          config.generateData = true;
          break;
        default:
          config.testType = TEST_TYPES.BASIC;
          break;
      }

      rl.question(
        `\nNumber of connections (default: ${config.connections}): `,
        (connections) => {
          if (connections.trim()) {
            config.connections = parseInt(connections.trim(), 10);
          }

          rl.question(
            `\nTest duration in seconds (default: ${config.duration}): `,
            (duration) => {
              if (duration.trim()) {
                config.duration = parseInt(duration.trim(), 10);
              }

              rl.question(`\nTarget URL (default: ${config.url}): `, (url) => {
                if (url.trim()) {
                  config.url = url.trim();
                }

                rl.question(
                  "\nVisualize results? (y/n, default: y): ",
                  (visualize) => {
                    config.visualizeResults =
                      visualize.trim().toLowerCase() !== "n";

                    console.log("\nConfiguration:");
                    console.log(JSON.stringify(config, null, 2));

                    rl.question("\nStart load test? (y/n): ", (start) => {
                      if (start.trim().toLowerCase() === "y") {
                        runLoadTest();
                      } else {
                        console.log("Load test cancelled.");
                        rl.close();
                      }
                    });
                  }
                );
              });
            }
          );
        }
      );
    }
  );
} else {
  // Run with provided arguments
  runLoadTest();
}
