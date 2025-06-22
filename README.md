# Identity Reconciliation API

![Title-Image](assets/title-image.png)

This project implements the **Identity Reconciliation API challenge**.

It is designed to **identify and consolidate user identities** based on `email` and `phoneNumber`, handling multiple records and linking related contacts.

---

## 🚀 Features

- Identify contacts using email or phone number
- Link secondary contacts to primary contact
- Avoid duplicate data and enforce link precedence
- MongoDB + Mongoose backend
- Express.js REST API
- Load testing tools for performance analysis (10,000+ simulated requests)

---

## 🏗️ Project Structure

```
/src
  /config
    db.ts                  → MongoDB connector
  /controllers
    identityController.ts  → contains the identifyContact logic
  /middleware
    errorHandler.ts        → Handling errors
  /models
    contactModel.ts        → Mongoose schema and model
  /routes
    identityRoutes.ts      → Redirecting /identify
  index.ts                 → Express app setup

/load-testing
  /config                  → Load test configuration files
  /data                    → Test data files
  /results                 → Test results and reports
  /scripts                 → Load testing scripts
```

---

## ⚙️ Setup Instructions

### 1️⃣ Prerequisites

- Node.js (v16+)
- MongoDB (local or Atlas cluster)

---

### 2️⃣ Install Dependencies

```bash
npm install
```

---

### 3️⃣ Configure MongoDB

In your `.env` file, set:

```
MONGODB_URI = <your-mongo-uri>
PORT = 3000
```

Make sure MongoDB is running.

---

### 4️⃣ Start the Server

```bash
npm run dev
npm start
```

The server will run on:

```
http://localhost:3000
```

Or you can test the **deployed API** at:

```
https://identity-reconcillation-ww91.onrender.com
```

---

## 🛠️ MongoDB Notes

Ensure the `contacts` collection **does NOT** have any invalid or legacy indexes like `id_1`.

To check indexes:

```bash
mongo
use bitespeed
db.contacts.getIndexes()
```

To drop a problematic index:

```bash
db.contacts.dropIndex("id_1")
```

---

## 📩 API Endpoint

### **POST /identify**

Identify or create a contact.

**Request body:**

```json
{
  "email": "john@example.com",
  "phoneNumber": "1234567890"
}
```

✅ You can provide either **email**, **phoneNumber**, or **both**.

---

### **Response Structure**

```json
{
  "contact": {
    "primaryContactId": "ObjectId",
    "emails": ["john@example.com", "other@example.com"],
    "phoneNumbers": ["1234567890", "9876543210"],
    "secondaryContactIds": ["ObjectId1", "ObjectId2"]
  }
}
```

- **primaryContactId** → main identity
- **emails** → all associated emails (no duplicates)
- **phoneNumbers** → all associated numbers (no duplicates)
- **secondaryContactIds** → IDs of all linked secondary contacts

---

## 🧠 Logic Summary

1. **Check if email or phoneNumber exists** in any contact.
2. If no match → create a **new primary contact**.
3. If matches exist:

   - Link new info as **secondary** if needed.
   - Ensure **only one primary contact** (oldest).
   - Consolidate all related records.

---

## 🛡️ Error Handling

- 400 → If both `email` and `phoneNumber` are missing.
- 500 → For internal server errors.

---

## 🧪 Testing the API with Postman

1️⃣ Open Postman and create a **new request**.

2️⃣ Set method to **POST** and URL to:

```
https://identity-reconcillation-ww91.onrender.com/api/identify
```

3️⃣ Go to the **Body** tab → Select **raw** → Choose **JSON** format.

4️⃣ Enter a request body like:

```json
{
  "email": "test@example.com",
  "phoneNumber": "19192"
}
```

5️⃣ Click **Send**.

✅ You should see a JSON response with the contact details.

You can test various combinations (email only, phone only, both) to validate reconciliation logic.

---

## 🔥 Load Testing

This project includes load testing tools to simulate high traffic loads (10,000+ requests) to your API endpoints. These tools are built using [autocannon](https://github.com/mcollina/autocannon), a high-performance HTTP/1.1 benchmarking tool.

### Quick Start: Complete Test Workflow

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

### Available Load Testing Tools

#### 1. Basic Load Tester

```bash
# Run with default settings
npm run load-test

# Run with custom parameters
npx ts-node load-testing/scripts/load-tester.ts --url http://localhost:3000/api/identify --connections 200 --duration 60
```

#### 2. Advanced Load Tester

```bash
# Run with a custom configuration file
npx ts-node load-testing/scripts/advanced-load-tester.ts --config=load-testing/config/load-test-config.json
```

#### 3. Data-Driven Load Tester

```bash
# Generate test data first
npm run generate-data

# Run the data-driven load test
npm run data-driven-load-test
```

#### 4. Results Visualization

```bash
# Visualize results from a specific results file
npm run visualize load-testing/results/load-test-results-2023-06-15T12-34-56.json
```

### Load Testing Best Practices

1. **Start Small**: Begin with a small number of connections and gradually increase.
2. **Monitor Your Server**: Keep an eye on CPU, memory, and network usage during tests.
3. **Use Realistic Data**: The data-driven tester provides more realistic testing scenarios.
4. **Warm Up**: Run a short test to warm up your server before running the full test.

For detailed documentation on load testing, see [load-testing/README.md](load-testing/README.md).

---

## 🏗️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose
- **Types:** TypeScript
- **Load Testing:** Autocannon

---

## 🤝 Contributing

Pull requests are welcome!
Please open an issue first to discuss what you want to change.
