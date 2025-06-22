import fs from "fs";
import path from "path";

// Check if a results file was provided
if (process.argv.length < 3) {
  console.error("Please provide a results file path");
  console.error("Usage: npx ts-node visualize-results.ts <results-file.json>");
  process.exit(1);
}

const resultsFile = process.argv[2];

// Read the results file
try {
  const resultsData = fs.readFileSync(path.resolve(resultsFile), "utf8");
  const results = JSON.parse(resultsData);

  // Generate an HTML report
  const htmlReport = generateHtmlReport(results, resultsFile);

  // Save the HTML report
  const reportFile = path.join(
    __dirname,
    "..",
    "results",
    `${path.basename(resultsFile, ".json")}-report.html`
  );
  fs.writeFileSync(reportFile, htmlReport);

  console.log(`Report generated: ${reportFile}`);
  console.log(
    `Open this file in a web browser to view the visualized results.`
  );
} catch (error) {
  console.error(`Error processing results file: ${error}`);
  process.exit(1);
}

// Function to generate an HTML report with charts
function generateHtmlReport(results: any, filename: string): string {
  // Determine if we have multiple scenarios
  const hasMultipleScenarios = typeof results === "object" && !results.requests;
  const scenarios = hasMultipleScenarios ? Object.keys(results) : ["Default"];

  // Prepare data for charts
  let latencyData: any = [];
  let throughputData: any = [];
  let errorsData: any = [];

  if (hasMultipleScenarios) {
    // Multiple scenarios
    scenarios.forEach((scenario) => {
      const data = results[scenario];
      latencyData.push({
        name: scenario,
        avg: data.latency.average,
        min: data.latency.min,
        max: data.latency.max,
        p99: data.latency.p99,
      });

      throughputData.push({
        name: scenario,
        value: data.requests.average,
      });

      errorsData.push({
        name: scenario,
        value: data.errors,
      });
    });
  } else {
    // Single scenario
    latencyData.push({
      name: "Default",
      avg: results.latency.average,
      min: results.latency.min,
      max: results.latency.max,
      p99: results.latency.p99,
    });

    throughputData.push({
      name: "Default",
      value: results.requests.average,
    });

    errorsData.push({
      name: "Default",
      value: results.errors,
    });
  }

  // Calculate summary statistics
  const summary = calculateSummary(results, hasMultipleScenarios);

  // Generate HTML with embedded charts
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Load Test Results - ${path.basename(filename, ".json")}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background-color: white;
      padding: 20px;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    h1, h2 {
      color: #333;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 30px;
    }
    .summary-card {
      background-color: #f9f9f9;
      border-radius: 5px;
      padding: 15px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .summary-card h3 {
      margin-top: 0;
      font-size: 16px;
      color: #666;
    }
    .summary-card p {
      margin-bottom: 0;
      font-size: 24px;
      font-weight: bold;
      color: #333;
    }
    .chart-container {
      margin-bottom: 30px;
      height: 400px;
    }
    .raw-data {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 5px;
      overflow: auto;
      max-height: 300px;
    }
    pre {
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Load Test Results</h1>
    <p>Report generated on ${new Date().toLocaleString()} for ${path.basename(
    filename
  )}</p>
    
    <h2>Summary</h2>
    <div class="summary">
      <div class="summary-card">
        <h3>Total Requests</h3>
        <p>${summary.totalRequests.toLocaleString()}</p>
      </div>
      <div class="summary-card">
        <h3>Average Throughput</h3>
        <p>${summary.avgThroughput.toFixed(2)} req/sec</p>
      </div>
      <div class="summary-card">
        <h3>Average Latency</h3>
        <p>${summary.avgLatency.toFixed(2)} ms</p>
      </div>
      <div class="summary-card">
        <h3>Max Latency</h3>
        <p>${summary.maxLatency.toFixed(2)} ms</p>
      </div>
      <div class="summary-card">
        <h3>Total Errors</h3>
        <p>${summary.totalErrors}</p>
      </div>
      <div class="summary-card">
        <h3>Error Rate</h3>
        <p>${summary.errorRate.toFixed(2)}%</p>
      </div>
    </div>
    
    <h2>Latency</h2>
    <div class="chart-container">
      <canvas id="latencyChart"></canvas>
    </div>
    
    <h2>Throughput</h2>
    <div class="chart-container">
      <canvas id="throughputChart"></canvas>
    </div>
    
    <h2>Errors</h2>
    <div class="chart-container">
      <canvas id="errorsChart"></canvas>
    </div>
    
    <h2>Raw Data</h2>
    <div class="raw-data">
      <pre>${JSON.stringify(results, null, 2)}</pre>
    </div>
  </div>
  
  <script>
    // Latency Chart
    const latencyCtx = document.getElementById('latencyChart').getContext('2d');
    new Chart(latencyCtx, {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(latencyData.map((d: any) => d.name))},
        datasets: [
          {
            label: 'Average Latency (ms)',
            data: ${JSON.stringify(latencyData.map((d: any) => d.avg))},
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          },
          {
            label: 'Min Latency (ms)',
            data: ${JSON.stringify(latencyData.map((d: any) => d.min))},
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          },
          {
            label: 'Max Latency (ms)',
            data: ${JSON.stringify(latencyData.map((d: any) => d.max))},
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
          },
          {
            label: 'p99 Latency (ms)',
            data: ${JSON.stringify(latencyData.map((d: any) => d.p99))},
            backgroundColor: 'rgba(255, 159, 64, 0.5)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Milliseconds'
            }
          }
        }
      }
    });
    
    // Throughput Chart
    const throughputCtx = document.getElementById('throughputChart').getContext('2d');
    new Chart(throughputCtx, {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(throughputData.map((d: any) => d.name))},
        datasets: [{
          label: 'Requests per Second',
          data: ${JSON.stringify(throughputData.map((d: any) => d.value))},
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Requests/sec'
            }
          }
        }
      }
    });
    
    // Errors Chart
    const errorsCtx = document.getElementById('errorsChart').getContext('2d');
    new Chart(errorsCtx, {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(errorsData.map((d: any) => d.name))},
        datasets: [{
          label: 'Errors',
          data: ${JSON.stringify(errorsData.map((d: any) => d.value))},
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Count'
            }
          }
        }
      }
    });
  </script>
</body>
</html>
  `;
}

// Calculate summary statistics
function calculateSummary(results: any, hasMultipleScenarios: boolean) {
  let totalRequests = 0;
  let totalErrors = 0;
  let totalLatency = 0;
  let totalThroughput = 0;
  let maxLatency = 0;
  let scenarioCount = 0;

  if (hasMultipleScenarios) {
    // Multiple scenarios
    Object.values(results).forEach((data: any) => {
      totalRequests += data.requests.total;
      totalErrors += data.errors;
      totalLatency += data.latency.average;
      totalThroughput += data.requests.average;
      maxLatency = Math.max(maxLatency, data.latency.max);
      scenarioCount++;
    });
  } else {
    // Single scenario
    totalRequests = results.requests.total;
    totalErrors = results.errors;
    totalLatency = results.latency.average;
    totalThroughput = results.requests.average;
    maxLatency = results.latency.max;
    scenarioCount = 1;
  }

  const avgLatency = totalLatency / scenarioCount;
  const avgThroughput = totalThroughput / scenarioCount;
  const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

  return {
    totalRequests,
    totalErrors,
    avgLatency,
    maxLatency,
    avgThroughput,
    errorRate,
  };
}
