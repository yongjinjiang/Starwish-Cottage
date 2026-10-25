// Run locally. The server secret is read without echo and never saved or sent to the frontend.
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { Writable } from "node:stream";
import readline from "node:readline";
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
if (!url) {
  console.error("Set SUPABASE_URL in .env.local first.");
  process.exit(1);
}
let secret = process.env.SUPABASE_SECRET_KEY;
if (secret === "YOUR_SERVER_SECRET_KEY") secret = undefined;
if (!secret) {
  if (!process.stdin.isTTY) {
    console.error(
      "Use an interactive terminal to enter your Supabase server secret.",
    );
    process.exit(1);
  }
  let muted = false;
  const output = new Writable({
    write(chunk, _encoding, done) {
      if (!muted) process.stdout.write(chunk);
      done();
    },
  });
  const input = readline.createInterface({
    input: process.stdin,
    output,
    terminal: true,
  });
  secret = await new Promise((resolve) => {
    input.question(
      "Supabase server secret (hidden, never saved): ",
      (answer) => {
        input.close();
        process.stdout.write("\n");
        resolve(answer.trim());
      },
    );
    muted = true;
  });
}
if (!secret) {
  console.error("No server secret supplied.");
  process.exit(1);
}
const db = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const accounts = [
  ["sonya12", "Sonya", "celebrant"],
  ["Mia14", "Mia", "contributor"],
  ["Aletheia10", "Aletheia", "contributor"],
  ["mom45", "妈妈", "parent"],
  ["dad51", "爸爸", "parent"],
];
const reset = process.argv.includes("--reset-passwords");
for (const [handle, display_name, role] of accounts) {
  const email = `${handle.toLowerCase()}@family.starwish.example`;
  const { data: existing, error: lookupError } = await db
    .from("family_members")
    .select("user_id")
    .eq("handle", handle)
    .maybeSingle();
  if (lookupError)
    throw new Error(`Membership lookup failed: ${lookupError.message}`);
  let userId = existing?.user_id;
  let password;
  if (!userId) {
    const { data: list, error: listError } = await db.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listError) throw listError;
    userId = list.users.find((user) => user.email === email)?.id;
  }
  if (!userId) {
    password = `Sw!${randomBytes(12).toString("base64url")}`;
    const { data, error } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw new Error(`Create ${handle}: ${error.message}`);
    userId = data.user.id;
  } else if (reset) {
    password = `Sw!${randomBytes(12).toString("base64url")}`;
    const { error } = await db.auth.admin.updateUserById(userId, { password });
    if (error) throw error;
  }
  const { error } = await db
    .from("family_members")
    .upsert(
      { user_id: userId, handle, display_name, role },
      { onConflict: "user_id" },
    );
  if (error) throw new Error(`Register ${handle}: ${error.message}`);
  console.log(
    password
      ? `${handle}: ${password}`
      : `${handle}: already registered (password unchanged)`,
  );
}
console.log(
  "Save these passwords privately. No email is sent. Re-run with --reset-passwords only when you intend to reset all five passwords.",
);
