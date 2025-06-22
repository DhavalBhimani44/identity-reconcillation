import autocannon, { Result } from "autocannon";
import fs from "fs";
import path from "path";
import { createWriteStream } from "fs";

interface TestConfig {
  baseUrl: string;
  connections: number;
  duration: number;
  workers?: number;
  timeout?: number;
  pipelining?: number;
  dataFile: string;
}

// Default configuration
const DEFAULT_CONFIG: TestConfig = {
  baseUrl: "http://localhost:3000",
  connections: 100,
  duration: 30,
  dataFile: path.join(__dirname, "..", "data", "test-data.json"),
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
  `data-driven-load-test-${timestamp}.log`
);
const logStream = createWriteStream(logFile);

function log(message: string) {
  const formattedMessage = `[${new Date().toISOString()}] ${message}`;
  console.log(formattedMessage);
  logStream.write(formattedMessage + "\n");
}

// Load test data
let testData: any[] = [];
try {
  const dataContent = fs.readFileSync(path.resolve(config.dataFile), "utf8");
  testData = JSON.parse(dataContent);
  log(`Loaded ${testData.length} records from ${config.dataFile}`);
} catch (error) {
  log(`Failed to load test data from ${config.dataFile}: ${error}`);
  process.exit(1);
}

log(
  `Starting data-driven load test with ${config.connections} connections for ${config.duration}s`
);
log(`Target: ${config.baseUrl}/api/identify`);
log(`Using data from ${config.dataFile} (${testData.length} records)`);

// Create requests from test data (limit to first 100 records for memory efficiency)
const requests = testData.slice(0, 100).map((record) => ({
  method: "POST" as const,
  path: "/api/identify",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(record),
}));

// Run the load test
const instance = autocannon(
  {
    url: config.baseUrl,
    connections: config.connections,
    duration: config.duration,
    timeout: config.timeout || 10,
    pipelining: config.pipelining || 1,
    workers: config.workers || 1,
    setupClient: (client: any) => {
      // This is where we could set up client-specific behavior if needed
      return client;
    },
    requests: requests,
  },
  finishedBench
);

// Track progress
autocannon.track(instance, { renderProgressBar: true });

// Handle CTRL+C
process.once("SIGINT", () => {
  instance.stop();
  process.exit(0);
});

// Callback when test is finished
function finishedBench(err: Error | null, results: Result) {
  if (err) {
    log(`Error running load test: ${err.message}`);
    process.exit(1);
  }

  log("\n===== LOAD TEST RESULTS =====");
  log(`Requests: ${results.requests.total}`);
  log(`Throughput: ${Math.floor(results.requests.average)} req/sec`);
  log(`Latency (avg): ${results.latency.average.toFixed(2)}ms`);
  log(`Latency (min): ${results.latency.min.toFixed(2)}ms`);
  log(`Latency (max): ${results.latency.max.toFixed(2)}ms`);
  log(`Latency (p99): ${results.latency.p99.toFixed(2)}ms`);
  log(`Errors: ${results.errors}`);

  // Save detailed results to file
  const resultsFile = path.join(
    __dirname,
    "..",
    "results",
    `data-driven-load-test-results-${timestamp}.json`
  );
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  log(`\nDetailed results saved to ${resultsFile}`);
  log(`Log file: ${logFile}`);

  logStream.end();
}
