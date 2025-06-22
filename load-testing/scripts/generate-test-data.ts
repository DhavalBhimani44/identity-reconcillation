import fs from "fs";
import path from "path";

// Configuration
const NUM_RECORDS = 10000;
const OUTPUT_DIR = path.join(__dirname, "..", "data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "test-data.json");
const SAMPLE_FILE = path.join(OUTPUT_DIR, "sample-test-data.json");
const CONFIG_FILE = path.join(
  __dirname,
  "..",
  "config",
  "data-driven-test-config.json"
);

// Ensure directories exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Email domains for random generation
const EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "example.com",
  "company.com",
  "test.org",
];

// Random data generation functions
function generateRandomString(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateRandomEmail(): string {
  const username = generateRandomString(Math.floor(Math.random() * 10) + 5);
  const domain =
    EMAIL_DOMAINS[Math.floor(Math.random() * EMAIL_DOMAINS.length)];
  return `${username}@${domain}`;
}

function generateRandomPhoneNumber(): string {
  // Format: 10 digits
  let phone = "";
  for (let i = 0; i < 10; i++) {
    phone += Math.floor(Math.random() * 10).toString();
  }
  return phone;
}

// Generate test data with different combinations
function generateTestData(count: number): any[] {
  const data: any[] = [];

  for (let i = 0; i < count; i++) {
    // Determine what type of record to create
    const recordType = Math.floor(Math.random() * 3);

    let record: any = {};

    switch (recordType) {
      case 0: // Email and phone
        record = {
          email: generateRandomEmail(),
          phoneNumber: generateRandomPhoneNumber(),
        };
        break;
      case 1: // Email only
        record = {
          email: generateRandomEmail(),
        };
        break;
      case 2: // Phone only
        record = {
          phoneNumber: generateRandomPhoneNumber(),
        };
        break;
    }

    data.push(record);
  }

  return data;
}

// Generate and save the data
console.log(`Generating ${NUM_RECORDS} test records...`);
const testData = generateTestData(NUM_RECORDS);
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(testData, null, 2));
console.log(`Test data saved to ${OUTPUT_FILE}`);

// Also create a smaller sample file
const SAMPLE_SIZE = 100;
const sampleData = testData.slice(0, SAMPLE_SIZE);
fs.writeFileSync(SAMPLE_FILE, JSON.stringify(sampleData, null, 2));
console.log(`Sample data (${SAMPLE_SIZE} records) saved to ${SAMPLE_FILE}`);

// Create a test configuration that uses the generated data
const testConfig = {
  baseUrl: "http://localhost:3000",
  connections: 500,
  duration: 60,
  workers: 4,
  timeout: 10,
  pipelining: 1,
  dataFile: OUTPUT_FILE,
};

// Ensure config directory exists
const configDir = path.dirname(CONFIG_FILE);
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

fs.writeFileSync(CONFIG_FILE, JSON.stringify(testConfig, null, 2));
console.log(`Test configuration saved to ${CONFIG_FILE}`);
