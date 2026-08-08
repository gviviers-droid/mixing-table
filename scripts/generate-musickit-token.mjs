// Generates a MusicKit developer token (a JWT signed with your Apple Music
// private key). Requires an Apple Developer Program membership with a
// MusicKit identifier and a private key (.p8) - see README.md for how to
// obtain those from https://developer.apple.com/account/resources.
//
// Usage:
//   APPLE_TEAM_ID=... APPLE_KEY_ID=... APPLE_PRIVATE_KEY_PATH=./AuthKey_XXXX.p8 \
//     npm run musickit:token

import { readFileSync } from "node:fs";
import jwt from "jsonwebtoken";

const teamId = process.env.APPLE_TEAM_ID;
const keyId = process.env.APPLE_KEY_ID;
const keyPath = process.env.APPLE_PRIVATE_KEY_PATH;

if (!teamId || !keyId || !keyPath) {
  console.error(
    "Missing required env vars. Set APPLE_TEAM_ID, APPLE_KEY_ID, and " +
      "APPLE_PRIVATE_KEY_PATH (path to your AuthKey_<KEY_ID>.p8 file), then re-run:\n\n" +
      "  APPLE_TEAM_ID=XXXXXXXXXX APPLE_KEY_ID=YYYYYYYYYY " +
      "APPLE_PRIVATE_KEY_PATH=./AuthKey_YYYYYYYYYY.p8 npm run musickit:token\n",
  );
  process.exit(1);
}

const privateKey = readFileSync(keyPath, "utf8");

// Apple allows a maximum token lifetime of 6 months.
const sixMonthsInSeconds = 60 * 60 * 24 * 180;

const token = jwt.sign({}, privateKey, {
  algorithm: "ES256",
  expiresIn: sixMonthsInSeconds,
  issuer: teamId,
  header: { alg: "ES256", kid: keyId },
});

console.log("\nMusicKit developer token (valid 180 days):\n");
console.log(token);
console.log(
  "\nAdd this to a .env.local file as:\n\n  VITE_MUSICKIT_DEVELOPER_TOKEN=" +
    token +
    "\n",
);
