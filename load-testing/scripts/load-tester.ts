import autocannon from "autocannon";
import fs from "fs";
import path from "path";

// Configuration options
const DEFAULT_CONFIG = {
  url: "http://localhost:3000/api/identify",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: "test@example.com",
    phoneNumber: "1234567890",
  }),
  connections: 100, // Number of concurrent connections
  duration: 30, // Duration in seconds
  pipelining: 1, // Number of pipelined requests
  timeout: 10, // Timeout in seconds
  amount: 10000, // Total number of requests to send
};

// Parse command line arguments
const args = process.argv.slice(2);
const config: any = { ...DEFAULT_CONFIG };

for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace("--", "");
  const value = args[i + 1];

  if (key === "body" && value.startsWith("@")) {
    // Load body from file
    const filePath = value.substring(1);
    config.body = fs.readFileSync(path.resolve(filePath), "utf8");
  } else if (
    key === "connections" ||
    key === "duration" ||
    key === "pipelining" ||
    key === "amount"
  ) {
    config[key] = parseInt(value, 10);
  } else {
    config[key] = value;
  }
}

console.log(
  `Starting load test with ${config.connections} connections for ${config.duration}s`
);
console.log(`Target: ${config.method} ${config.url}`);
console.log(`Request body: ${config.body}`);

// Run the load test
const instance = autocannon(config, finishedBench);

// Track progress
autocannon.track(instance, { renderProgressBar: true });

// Handle CTRL+C
process.once("SIGINT", () => {
  instance.stop();
});

// Callback when test is finished
function finishedBench(err: Error | null, results: autocannon.Result) {
  if (err) {
    console.error("Error running load test:", err);
    process.exit(1);
  }

  console.log("Load test completed!");
  console.log("Summary:");
  console.log(`  Requests: ${results.requests.total}`);
  console.log(`  Throughput: ${Math.floor(results.requests.average)} req/sec`);
  console.log(`  Latency (avg): ${results.latency.average.toFixed(2)}ms`);
  console.log(`  Latency (max): ${results.latency.max.toFixed(2)}ms`);
  console.log(`  Errors: ${results.errors}`);

  // Save detailed results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const resultsFile = path.join(
    __dirname,
    "..",
    "results",
    `load-test-results-${timestamp}.json`
  );
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`\nDetailed results saved to ${resultsFile}`);
}
