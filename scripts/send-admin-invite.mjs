// Send admin invitation emails with temporary staff passcode
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const here = dirname(fileURLToPath(import.meta.url));
function loadEnv(){
  try{
    const text = readFileSync(join(here,"..",".env"),"utf8");
    for(const line of text.split("\n")){
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if(!match||line.trim().startsWith("#")) continue;
      const [,key,raw]=match;
      if(process.env[key]===undefined) process.env[key]=raw.replace(/^["']|["']$/g,"");
    }
  }catch{}
}
loadEnv();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "tickets@example.com";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const PASSCODE = process.env.STAFF_PASSCODE ?? "staff1234";

const ADMINS = [
  "cholmosesayiel@gmail.com",
  "jeanjacquesmartino08@gmail.com"
];

// Optional: generate a one-time temporary code if you want to rotate per invite
const TEMP_PASSCODE = randomBytes(6).toString("hex"); // 12 hex chars

async function sendInvite(to, tempCode){
  const subject = "Shots & Secrets Admin Access";
  const html = `
  <div style="font-family:system-ui,sans-serif;max-width:520px">
    <h2 style="margin:0 0 8px">Admin access to Shots & Secrets</h2>
    <p>Hi,</p>
    <p>You’ve been added as an admin. Use the details below to sign in to the admin dashboard.</p>
    <p>
      <strong>Dashboard:</strong> <a href="${APP_URL}/scanner/login">${APP_URL}/scanner/login</a><br>
      <strong>Admin page:</strong> <a href="${APP_URL}/admin">${APP_URL}/admin</a>
    </p>
    <div style="background:#f7f7f7;border:1px solid #ddd;border-radius:8px;padding:12px;margin:16px 0">
      <p style="margin:0 0 4px"><strong>Temporary passcode:</strong> <code style="font-size:16px">${tempCode}</code></p>
      <p style="margin:6px 0 0;color:#555">Enter this on the login form together with your name. You can reset/change the shared passcode via env vars.</p>
    </div>
    <p>After signing in you can manage events, bookings, scans and gate sales.</p>
    <p>— Shots & Secrets team</p>
  </div>`;
  const body = {
    from: EMAIL_FROM,
    to,
    subject,
    html,
  };
  const response = await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{
      Authorization:`Bearer ${RESEND_API_KEY}`,
      "Content-Type":"application/json"
    },
    body: JSON.stringify(body)
  });
  if(!response.ok){
    const text = await response.text().catch(()=> "unknown");
    throw new Error(`Resend failed for ${to}: ${response.status} ${text}`);
  }
  console.log(`✅ Invite sent to ${to}`);
}

(async () => {
  if(!RESEND_API_KEY){
    console.error("RESEND_API_KEY is not set in env");
    process.exit(1);
  }
  // Choose which passcode to send: shared STAFF_PASSCODE or a generated TEMP_PASSCODE
  const codeToSend = process.env.SEND_SHARED_PASSCODE === "true" ? PASSCODE : TEMP_PASSCODE;
  console.log(`Using passcode: ${codeToSend}`);
  for(const email of ADMINS){
    await sendInvite(email, codeToSend);
  }
  console.log("All invites sent.");
})();
