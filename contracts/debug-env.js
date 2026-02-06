const dotenv = require("dotenv");
dotenv.config();

console.log("--- DEBUG ENV VARS ---");
if (!process.env.PRIVATE_KEY) {
    console.log("❌ PRIVATE_KEY is NOT set in process.env");
} else {
    console.log("✅ PRIVATE_KEY found");
    console.log("Length:", process.env.PRIVATE_KEY.length);
    console.log("Starts with 0x:", process.env.PRIVATE_KEY.startsWith("0x"));
}
console.log("----------------------");
