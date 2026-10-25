import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(`
  create role anon; create role authenticated;
  alter default privileges in schema public grant execute on functions to anon,authenticated;
  create schema auth; create schema storage;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  grant usage on schema auth,storage,public to anon,authenticated;
  grant execute on function auth.uid() to anon,authenticated;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text unique);
  alter table storage.objects enable row level security;
  grant select,insert,update,delete on storage.objects to authenticated;
`);
await db.exec(
  await readFile(
    new URL("../supabase/migrations/202610240001_cottage.sql", import.meta.url),
    "utf8",
  ),
);
await db.exec(
  await readFile(
    new URL(
      "../supabase/migrations/202610240002_explicit_function_grants.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
const ids = [
  "00000000-0000-4000-8000-000000000012",
  "00000000-0000-4000-8000-000000000014",
  "00000000-0000-4000-8000-000000000010",
  "00000000-0000-4000-8000-000000000045",
  "00000000-0000-4000-8000-000000000051",
];
const handles = ["sonya12", "Mia14", "Aletheia10", "mom45", "dad51"];
for (let i = 0; i < ids.length; i++) {
  await db.query("insert into auth.users(id) values ($1)", [ids[i]]);
  await db.query(
    "insert into public.family_members(user_id,handle,display_name,role) values ($1,$2,$2,$3)",
    [
      ids[i],
      handles[i],
      i === 0 ? "celebrant" : i < 3 ? "contributor" : "parent",
    ],
  );
}
let checks = 0;
async function as(i) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    i === null ? "" : ids[i],
  ]);
  await db.exec(i === null ? "set role anon" : "set role authenticated");
}
async function root() {
  await db.exec("reset role");
}
async function rejects(sql, args, pattern) {
  await assert.rejects(db.query(sql, args), pattern);
  checks++;
}
async function eq(sql, args, expected) {
  const result = await db.query(sql, args);
  assert.deepEqual(result.rows, expected);
  checks++;
}
await root();
await db.exec("update cottage_event set reveal_at=now()+interval '1 day'");
const giftId = "11111111-1111-4111-8111-111111111111";
const imagePath = `${ids[1]}/art.png`;
await as(1);
await db.query("insert into storage.objects(bucket_id,name) values ($1,$2)", [
  "family-art",
  imagePath,
]);
await db.query(
  "insert into gift_drafts(id,author_id,title,body,image_paths) values($1,$2,'Surprise','Original',$3)",
  [giftId, ids[1], [imagePath]],
);
await db.query("select publish_gift($1)", [giftId]);
await db.query("update gift_drafts set body='Unpublished change' where id=$1", [
  giftId,
]);
await eq("select body from gift_publications", [], [{ body: "Original" }]);
await as(0);
await eq("select id from gift_drafts", [], []);
await eq("select id from gift_publications", [], []);
await eq("select name from storage.objects", [], []);
await eq("select family_gallery() as gallery", [], [{ gallery: [] }]);
await rejects(
  "update cottage_event set reveal_at=now()",
  [],
  /permission denied/,
);
await as(2);
await eq("select id from gift_drafts", [], []);
await rejects("select publish_gift($1)", [giftId], /not_owner/);
await rejects("select withdraw_gift($1)", [giftId], /not_owner/);
await rejects(
  "insert into storage.objects(bucket_id,name) values($1,$2)",
  ["family-art", `${ids[1]}/stolen.png`],
  /row-level security/,
);
await as(null);
await rejects("select * from gift_publications", [], /permission denied/);
await rejects("select family_gallery()", [], /permission denied/);
await as(0);
const bank = [
  { id: "book", prompt: "Favorite book?", options: ["A", "B"], answer: 1 },
];
await db.query(
  "insert into quiz_drafts(owner_id,title,questions) values($1,'Sonya quiz',$2)",
  [ids[0], JSON.stringify(bank)],
);
const publication = (await db.query("select publish_quiz() as p")).rows[0].p;
assert.match(publication.share_token, /^[a-f0-9]{64}$/);
checks++;
await as(null);
const publicPaper = (
  await db.query("select get_public_quiz($1) as p", [publication.share_token])
).rows[0].p;
assert.equal(publicPaper.questions[0].answer, undefined);
checks++;
await rejects("select * from quiz_publications", [], /permission denied/);
const request = "22222222-2222-4222-8222-222222222222";
const receipt = (
  await db.query("select submit_quiz($1,$2,$3,$4) as r", [
    publication.share_token,
    "A friend",
    '{"book":1}',
    request,
  ])
).rows[0].r;
assert.equal(receipt.score, 1);
checks++;
const retry = (
  await db.query("select submit_quiz($1,$2,$3,$4) as r", [
    publication.share_token,
    "A friend",
    '{"book":1}',
    request,
  ])
).rows[0].r;
assert.deepEqual(retry, receipt);
checks++;
await rejects(
  "select submit_quiz($1,$2,$3,$4)",
  [publication.share_token, "A friend", '{"book":0}', request],
  /invalid_answers/,
);
await rejects(
  "select submit_quiz($1,$2,$3,$4)",
  [publication.share_token, "A friend", '{"book":99}', crypto.randomUUID()],
  /invalid_answers/,
);
await rejects(
  "select submit_quiz($1,$2,$3,$4)",
  [publication.share_token, "A friend", "{}", crypto.randomUUID()],
  /invalid_answers/,
);
await rejects("select * from quiz_submissions", [], /permission denied/);
for (const i of [1, 2, 3, 4]) {
  await as(i);
  await eq("select * from quiz_drafts", [], []);
  await eq("select * from quiz_publications", [], []);
  await eq("select * from quiz_submissions", [], []);
  await rejects("select quiz_results()", [], /sonya_only/);
  await rejects("select publish_quiz()", [], /sonya_only/);
  await eq(
    "update quiz_submissions set reward_status='given' where id=$1 returning id",
    [receipt.id],
    [],
  );
}
await as(0);
assert.equal(
  (await db.query("select quiz_results() as r")).rows[0].r.length,
  1,
);
checks++;
await rejects(
  "update quiz_submissions set score=999 where id=$1",
  [receipt.id],
  /permission denied/,
);
await eq(
  "update quiz_submissions set reward_status='given' where id=$1 returning reward_status",
  [receipt.id],
  [{ reward_status: "given" }],
);
// Re-publishing rotates the URL; previous attempts remain bound to their original paper.
await db.query("select publish_quiz()");
await as(null);
await rejects(
  "select get_public_quiz($1)",
  [publication.share_token],
  /not_found/,
);
await root();
await db.exec("update cottage_event set reveal_at=now()-interval '1 second'");
for (const i of [0, 1, 2, 3, 4]) {
  await as(i);
  await eq("select body from gift_publications", [], [{ body: "Original" }]);
  await eq("select name from storage.objects", [], [{ name: imagePath }]);
  const gallery = (await db.query("select family_gallery() as g")).rows[0].g;
  assert.equal(gallery.length, 1);
  assert.equal(gallery[0].body, "Original");
  checks++;
  if (i !== 0) await rejects("select quiz_results()", [], /sonya_only/);
}
await as(null);
await rejects("select family_gallery()", [], /permission denied/);
await as(1);
await db.query("select withdraw_gift($1)", [giftId]);
await as(0);
await eq("select name from storage.objects", [], []);
await db.close();
console.log(
  `Database verification passed: ${checks} assertions, including real RLS, private images, release timing, snapshots, grading, retries, and Sonya-only results.`,
);
