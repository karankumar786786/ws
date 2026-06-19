import { WebSocket } from "ws";
import { Redis } from "ioredis";

const BASE_URL = "http://localhost:3000";
const WS_URL = "ws://localhost:3000";

async function runVerification() {
  console.log("Starting verification...");

  // Generate a random email to avoid collision on multiple runs
  const email = `user-${Date.now()}@example.com`;

  // 1. Test registration
  console.log("\n1. Testing User Registration...");
  const registerResponse = await fetch(`${BASE_URL}/api/users/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test User",
      email,
      description: "A verification test user",
    }),
  });

  if (!registerResponse.ok) {
    throw new Error(`Registration failed: ${await registerResponse.text()}`);
  }

  const registerResult = (await registerResponse.json()) as { otpSent: boolean; tempToken: string };
  console.log("Registration API returned otpSent:", registerResult.otpSent);

  // 1.5. Fetch OTP from Redis and Verify
  console.log("\n1.5. Fetching OTP from Redis...");
  const redis = new Redis();
  const cached = await redis.get(`otp:${email}`);
  if (!cached) {
    throw new Error("OTP not found in Redis cache");
  }
  const { otp } = JSON.parse(cached);
  await redis.quit();
  console.log("Retrieved OTP:", otp);

  console.log("Verifying OTP...");
  const verifyResponse = await fetch(`${BASE_URL}/api/users/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      otp,
      tempToken: registerResult.tempToken,
    }),
  });

  if (!verifyResponse.ok) {
    throw new Error(`OTP Verification failed: ${await verifyResponse.text()}`);
  }

  const registerData = (await verifyResponse.json()) as { user: any; token: string };
  console.log("OTP Verification successful!");
  console.log("User ID:", registerData.user.id);
  console.log("JWT Token length:", registerData.token.length);

  // 2. Test login
  console.log("\n2. Testing User Login...");
  const loginResponse = await fetch(`${BASE_URL}/api/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!loginResponse.ok) {
    throw new Error(`Login failed: ${await loginResponse.text()}`);
  }

  const loginData = (await loginResponse.json()) as { user: any; token: string };
  console.log("Login successful!");
  console.log("Retrieved User name:", loginData.user.name);

  // 3. Test WebSocket connection & messaging
  console.log("\n3. Testing WebSocket Connection with Token...");
  const ws = new WebSocket(`${WS_URL}?token=${registerData.token}`);

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("WebSocket verification timed out"));
    }, 5000);

    ws.on("open", () => {
      console.log("WebSocket connection opened successfully.");
    });

    ws.on("message", (data) => {
      const parsed = JSON.parse(data.toString());
      console.log("Received WebSocket Event:", parsed);

      if (parsed.event === "welcome") {
        console.log("Welcome message verified. Sending a test message...");
        
        // Send a message to itself (private messaging verification)
        const chatPayload = {
          chatId: `chat-${Date.now()}`,
          from: registerData.user.id,
          to: registerData.user.id,
          message: "Hello self!",
          timestamp: new Date().toISOString(),
        };

        ws.send(JSON.stringify(chatPayload));
      } else if (parsed.event === "message") {
        console.log("Private message echoed successfully!");
        console.log("Message Content:", parsed.data.message);
        clearTimeout(timeout);
        ws.close();
        resolve();
      } else if (parsed.event === "error") {
        clearTimeout(timeout);
        ws.close();
        reject(new Error(`WebSocket error event: ${parsed.message}`));
      }
    });

    ws.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  console.log("\nVerification completed successfully with all checks passing!");
}

runVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
