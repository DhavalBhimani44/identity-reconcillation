# API Load Testing Tools

This project includes several load testing tools designed to simulate high traffic loads (10,000+ requests) to your API endpoints. These tools are built using [autocannon](https://github.com/mcollina/autocannon), a high-performance HTTP/1.1 benchmarking tool.

## Directory Structure

```
load-testing/
├── config/                 # Configuration files
│   ├── load-test-config.json
│   └── data-driven-test-config.json
├── data/                   # Test data files
│   ├── test-data.json
│   ├── sample-test-data.json
│   └── sample-payload.json
├── results/                # Test results and reports
│   └── ...
├── scripts/                # Load testing scripts
│   ├── load-tester.ts
│   ├── advanced-load-tester.ts
│   ├── data-driven-load-tester.ts
│   ├── generate-test-data.ts
│   ├── visualize-results.ts
│   └── run-load-test.ts
└── README.md               # This file
```

## Installation

Before using the load testing tools, install the required dependencies:

```bash
npm install
```

## Quick Start: Complete Test Workflow

For a guided experience that combines data generation, load testing, and results visualization:

```bash
npm run test-workflow
```

This interactive script will:

1. Guide you through selecting the test type
2. Configure test parameters
3. Generate test data if needed
4. Run the selected load test
5. Automatically visualize the results

You can also run it with command-line arguments:

```bash
npx ts-node load-testing/scripts/run-load-test.ts --testType advanced --connections 500 --duration 60 --configFile load-testing/config/load-test-config.json
```

## Available Load Testing Tools

### 1. Basic Load Tester

A simple load testing tool with command-line arguments.

```bash
# Run with default settings
npm run load-test

# Run with custom parameters
npx ts-node load-testing/scripts/load-tester.ts --url http://localhost:3000/api/identify --connections 200 --duration 60
```

### 2. Advanced Load Tester

A more advanced load testing tool that supports multiple scenarios and detailed reporting.

```bash
# Run with default settings
npm run advanced-load-test

# Run with a custom configuration file
npx ts-node load-testing/scripts/advanced-load-tester.ts --config=load-testing/config/load-test-config.json
```

### 3. Data-Driven Load Tester

A load testing tool that uses generated test data to create more realistic test scenarios.

```bash
# Generate test data first
npm run generate-data

# Run the data-driven load test
npm run data-driven-load-test

# Run with a custom configuration
npx ts-node load-testing/scripts/data-driven-load-tester.ts --config=load-testing/config/data-driven-test-config.json
```

### 4. Results Visualization

A tool to visualize load test results in an interactive HTML report with charts.

```bash
# Visualize results from a specific results file
npm run visualize load-testing/results/load-test-results-2023-06-15T12-34-56.json

# Or directly with ts-node
npx ts-node load-testing/scripts/visualize-results.ts load-testing/results/load-test-results-2023-06-15T12-34-56.json
```

This will generate an HTML report with charts and detailed statistics that you can open in any web browser.

## Configuration Files

### Basic Load Tester Options

Command line options for the basic load tester:

- `--url`: Target URL (default: http://localhost:3000/api/identify)
- `--method`: HTTP method (default: POST)
- `--connections`: Number of concurrent connections (default: 100)
- `--duration`: Test duration in seconds (default: 30)
- `--pipelining`: Number of pipelined requests (default: 1)
- `--timeout`: Request timeout in seconds (default: 10)
- `--amount`: Total number of requests to send (default: 10000)
- `--body`: Request body or @file.json to load from file

### Advanced Load Test Configuration

Example configuration file (`load-testing/config/load-test-config.json`):

```json
{
  "baseUrl": "http://localhost:3000",
  "connections": 500,
  "duration": 60,
  "workers": 4,
  "timeout": 10,
  "pipelining": 1,
  "scenarios": [
    {
      "name": "Identify API - Standard Request",
      "url": "/api/identify",
      "method": "POST",
      "headers": {
        "Content-Type": "application/json"
      },
      "body": {
        "email": "test@example.com",
        "phoneNumber": "1234567890"
      },
      "weight": 70
    },
    {
      "name": "Identify API - Email Only",
      "url": "/api/identify",
      "method": "POST",
      "headers": {
        "Content-Type": "application/json"
      },
      "body": {
        "email": "email.only@example.com"
      },
      "weight": 15
    },
    {
      "name": "Identify API - Phone Only",
      "url": "/api/identify",
      "method": "POST",
      "headers": {
        "Content-Type": "application/json"
      },
      "body": {
        "phoneNumber": "9876543210"
      },
      "weight": 15
    }
  ]
}
```

### Data-Driven Load Test Configuration

Example configuration file (`load-testing/config/data-driven-test-config.json`):

```json
{
  "baseUrl": "http://localhost:3000",
  "connections": 500,
  "duration": 60,
  "workers": 4,
  "timeout": 10,
  "pipelining": 1,
  "dataFile": "load-testing/data/test-data.json"
}
```

### Workflow Script Options

Command line options for the workflow script:

- `--testType`: Type of test to run (basic, advanced, or data-driven)
- `--generateData`: Whether to generate test data (true or false)
- `--visualizeResults`: Whether to visualize results (true or false)
- `--configFile`: Path to a configuration file
- `--connections`: Number of concurrent connections
- `--duration`: Test duration in seconds
- `--url`: Target URL

## Generating Test Data

You can generate random test data for more realistic load testing:

```bash
npm run generate-data
```

This will create:

- `load-testing/data/test-data.json`: 10,000 random test records
- `load-testing/data/sample-test-data.json`: 100 sample records
- `load-testing/config/data-driven-test-config.json`: A configuration file for the data-driven load tester

## Understanding Test Results

After running a load test, you'll get a summary of the results including:

- Total requests completed
- Average throughput (requests per second)
- Latency statistics (average, min, max, p99)
- Error count

Detailed results are saved to JSON files in the `load-testing/results` directory for further analysis.

### Visualizing Results

The visualization tool generates interactive HTML reports with:

1. **Summary Statistics**: Key metrics at a glance
2. **Latency Charts**: Average, min, max, and p99 latency
3. **Throughput Charts**: Requests per second
4. **Error Charts**: Error counts by scenario
5. **Raw Data**: Full JSON data for detailed analysis

To visualize results:

```bash
npm run visualize load-testing/results/load-test-results-2023-06-15T12-34-56.json
```

Then open the generated HTML file in a web browser.

## Best Practices

1. **Start Small**: Begin with a small number of connections and gradually increase.
2. **Monitor Your Server**: Keep an eye on CPU, memory, and network usage during tests.
3. **Use Realistic Data**: The data-driven tester provides more realistic testing scenarios.
4. **Warm Up**: Run a short test to warm up your server before running the full test.
5. **Test in Isolation**: Ensure no other significant workloads are running on your test server.
6. **Analyze Results**: Use the visualization tool to identify bottlenecks and issues.
7. **Iterate**: Make changes to your API and re-test to see improvements.

## Troubleshooting

- If you encounter connection errors, check if your server is running and accessible.
- If you see high error rates, your server might be getting overwhelmed. Try reducing the connection count.
- For "ECONNRESET" errors, your server might be closing connections prematurely. Check server logs for details.
- If the visualization tool fails, ensure your results file is properly formatted JSON.
