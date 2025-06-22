import autocannon, { Result } from "autocannon";
import fs from "fs";
import path from "path";
import { createWriteStream } from "fs";
import { format } from "util";

interface TestScenario {
  name: string;
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: string | object;
  weight?: number; // Percentage of total requests (0-100)
}

interface TestConfig {
  baseUrl: string;
  connections: number;
  duration: number;
  scenarios: TestScenario[];
  workers?: number;
  timeout?: number;
  pipelining?: number;
}

// Default configuration
const DEFAULT_CONFIG: TestConfig = {
  baseUrl: "http://localhost:3000",
  connections: 100,
  duration: 30,
  scenarios: [
    {
      name: "Identify API",
      url: "/api/identify",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        email: "test@example.com",
        phoneNumber: "1234567890",
      },
      weight: 100,
    },
  ],
};

// Load configuration from file if provided
let config = DEFAULT_CONFIG;
const configArg = process.argv.find((arg) => arg.startsWith("--config="));
if (configArg) {
  const configPath = configArg.split("=")[1];
  try {
    const configFile = fs.readFileSync(path.resolve(configPath), "utf8");
    config = JSON.parse(configFile);
    console.log(`Loaded configuration from ${configPath}`);
  } catch (error) {
    console.error(`Failed to load configuration from ${configPath}:`, error);
    process.exit(1);
  }
}

// Setup logging
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const logFile = path.join(
  __dirname,
  "..",
  "results",
  `load-test-${timestamp}.log`
);
const logStream = createWriteStream(logFile);

function log(message: string) {
  const formattedMessage = `[${new Date().toISOString()}] ${message}`;
  console.log(formattedMessage);
  logStream.write(formattedMessage + "\n");
}

// Prepare scenarios
const scenarios = config.scenarios.map((scenario) => {
  // Convert object body to string if needed
  if (typeof scenario.body === "object") {
    scenario.body = JSON.stringify(scenario.body);
  }

  return {
    title: scenario.name,
    url: `${config.baseUrl}${scenario.url}`,
    method: scenario.method,
    headers: scenario.headers || {},
    body: scenario.body as string,
    weight: scenario.weight || 100,
  };
});

log(
  `Starting load test with ${config.connections} connections for ${config.duration}s`
);
scenarios.forEach((s) => {
  log(`Scenario: ${s.title} (${s.weight}% of traffic)`);
  log(`  ${s.method} ${s.url}`);
  if (s.body) {
    log(`  Body: ${s.body}`);
  }
});

// Run tests for each scenario
const results: Record<string, Result> = {};
let completedScenarios = 0;

async function runScenario(scenario: any): Promise<void> {
  return new Promise((resolve, reject) => {
    log(`Starting scenario: ${scenario.title}`);

    const instance = autocannon(
      {
        url: scenario.url,
        method: scenario.method,
        headers: scenario.headers,
        body: scenario.body,
        connections: Math.ceil(config.connections * (scenario.weight / 100)),
        duration: config.duration,
        timeout: config.timeout || 10,
        pipelining: config.pipelining || 1,
        workers: config.workers || 1,
      },
      (err, result) => {
        if (err) {
          log(`Error in scenario ${scenario.title}: ${err.message}`);
          reject(err);
          return;
        }

        results[scenario.title] = result;
        log(`Completed scenario: ${scenario.title}`);
        resolve();
      }
    );

    // Track progress
    autocannon.track(instance, { renderProgressBar: true });

    // Handle CTRL+C
    process.once("SIGINT", () => {
      instance.stop();
      process.exit(0);
    });
  });
}

// Run scenarios in sequence
async function runAllScenarios() {
  for (const scenario of scenarios) {
    await runScenario(scenario);
    completedScenarios++;
  }

  generateReport();
}

// Generate final report
function generateReport() {
  log("\n===== LOAD TEST RESULTS =====");

  let totalRequests = 0;
  let totalErrors = 0;
  let totalLatency = 0;
  let totalThroughput = 0;

  Object.entries(results).forEach(([name, result]) => {
    log(`\nScenario: ${name}`);
    log(`  Requests: ${result.requests.total}`);
    log(`  Throughput: ${Math.floor(result.requests.average)} req/sec`);
    log(`  Latency (avg): ${result.latency.average.toFixed(2)}ms`);
    log(`  Latency (min): ${result.latency.min.toFixed(2)}ms`);
    log(`  Latency (max): ${result.latency.max.toFixed(2)}ms`);
    log(`  Latency (p99): ${result.latency.p99.toFixed(2)}ms`);
    log(`  Errors: ${result.errors}`);

    totalRequests += result.requests.total;
    totalErrors += result.errors;
    totalLatency += result.latency.average;
    totalThroughput += result.requests.average;
  });

  const scenarioCount = Object.keys(results).length;
  log("\n===== SUMMARY =====");
  log(`Total Scenarios: ${scenarioCount}`);
  log(`Total Requests: ${totalRequests}`);
  log(
    `Average Throughput: ${Math.floor(totalThroughput / scenarioCount)} req/sec`
  );
  log(`Average Latency: ${(totalLatency / scenarioCount).toFixed(2)}ms`);
  log(`Total Errors: ${totalErrors}`);

  // Save detailed results to file
  const resultsFile = path.join(
    __dirname,
    "..",
    "results",
    `load-test-results-${timestamp}.json`
  );
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  log(`\nDetailed results saved to ${resultsFile}`);
  log(`Log file: ${logFile}`);

  logStream.end();
}

// Start the test
runAllScenarios().catch((err) => {
  log(`Fatal error: ${err.message}`);
  process.exit(1);
});
