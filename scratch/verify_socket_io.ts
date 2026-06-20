import { io } from "socket.io-client";
import { Redis } from "ioredis";

const BASE_URL = "http://localhost:3000";

async function runVerification() {
  console.log("Starting Socket.io verification...");

  // Generate a random email to avoid collision on multiple runs
  const email = `user-io-${Date.now()}@example.com`;

  // 1. Test registration
  console.log("\n1. Testing User Registration...");
  const registerResponse = await fetch(`${BASE_URL}/api/users/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test User IO",
      email,
      description: "A verification test user for socket.io",
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

  // 2. Test Socket.io connection & messaging
  console.log("\n2. Testing Socket.io Connection with Token...");
  const socket = io(BASE_URL, {
    auth: {
      token: registerData.token
    }
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error("Socket.io verification timed out"));
    }, 5000);

    socket.on("connect", () => {
      console.log("Socket.io connection opened successfully.");
    });

    socket.on("welcome", (msg) => {
      console.log("Welcome event received:", msg);
      
      // Send a test message to itself (private messaging verification)
      const chatPayload = {
        chatId: `chat-io-${Date.now()}`,
        from: registerData.user.id,
        to: registerData.user.id,
        message: "Hello self from Socket.io!",
        timestamp: new Date().toISOString(),
      };

      socket.emit("send_message", chatPayload);
    });

    socket.on("receive_message", (chatData) => {
      console.log("Received message event:", chatData);
      if (chatData.message === "Hello self from Socket.io!") {
        console.log("Private message echoed successfully!");
        clearTimeout(timeout);
        socket.disconnect();
        resolve();
      }
    });

    socket.on("connect_error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  console.log("\nSocket.io verification completed successfully with all checks passing!");
}

runVerification().catch((err) => {
  console.error("Socket.io verification failed:", err);
  process.exit(1);
});
