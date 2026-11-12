import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { seedStatements } from './seed.mjs';

// Point NEO4J_HTTP at a throwaway Neo4j started with NEO4J_AUTH=none. The test wipes the database.
const URL_TX = (process.env.NEO4J_HTTP || 'http://127.0.0.1:27474') + '/db/neo4j/tx/commit';
const htmlPath = process.argv[2] || new URL('../index.html', import.meta.url);

async function tx(statements) {
  const r = await fetch(URL_TX, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ statements }) });
  return r.json();
}
async function q(statement) {
  const j = await tx([{ statement, resultDataContents: ['row'] }]);
  if (j.errors && j.errors.length) return { error: j.errors[0].code + ': ' + j.errors[0].message.split('\n')[0] };
  const res = j.results[0];
  return { cols: res.columns, rows: res.data.map(d => d.row) };
}

// 1. seed
const seed = await tx(seedStatements());
if (seed.errors.length) { console.log('SEED ERROR', seed.errors); process.exit(1); }
const cnt = await q('MATCH (n) WITH count(n) AS n MATCH ()-[r]->() RETURN n, count(r)');
console.log('seeded nodes/edges:', cnt.rows[0]);

// 2. load the engine exactly as the page ships it
const html = readFileSync(htmlPath, 'utf8');
const m = html.match(/<script id="cqb-engine">([\s\S]*?)<\/script>/);
const ctx = { globalThis: {} }; ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(m[1], ctx);
const CQB = ctx.CQB;

// 3. every option combination the UI can produce
const queries = new Map();
for (const p of CQB.P) {
  if (p.kind === 'info') continue;
  const sources = p.kind === 'acl' ? ['any', 'users', 'named', 'owned'] : p.kind === 'shortest' ? ['users', 'named', 'owned'] : ['users'];
  for (const edition of ['ce7', 'ce6', 'legacy'])
    for (const source of sources)
      for (const output of ['graph', 'table', 'count'])
        for (const groupBy of ['principal', 'target'])
          for (const noise of ['sids', 'tier0', 'off'])
            for (const twoStep of [true, false])
              for (const enabledOnly of [true, false])
                for (const targetGlob of ['', 'pc*'])
                  for (const lapsOnly of [false, true]) {
                    const o = { edition, source, name: "jdoe", output, groupBy, noise, twoStep, enabledOnly, targetGlob, lapsOnly };
                    const s = CQB.build(p, o);
                    if (!queries.has(s)) queries.set(s, p.id + ' ' + JSON.stringify(o));
                  }
}
console.log('distinct queries generated:', queries.size);
let errors = 0, i = 0;
const list = [...queries.entries()];
const workers = Array.from({ length: 8 }, async () => {
  while (i < list.length) {
    const [s, label] = list[i++];
    const r = await q(s);
    if (r.error) { errors++; if (errors <= 10) console.log('ERROR', label, '\n', s, '\n', r.error); }
  }
});
await Promise.all(workers);
console.log('queries with errors:', errors, 'of', list.length);

// 4. semantic checks against the seeded scenario
const P = id => CQB.P.find(p => p.id === id);
const base = { edition: 'ce7', source: 'users', name: '', output: 'table', groupBy: 'principal', noise: 'sids', twoStep: true, enabledOnly: true, targetGlob: '', lapsOnly: false };
const run = async (id, over = {}) => q(CQB.build(P(id), { ...base, ...over }));
const pick = (r, ...cols) => r.error ? r.error : r.rows.map(row => cols.map(c => { const v = row[r.cols.indexOf(c)]; return JSON.stringify(Array.isArray(v) && c !== 'rights' ? [...v].sort() : v); }).join(' ')).sort();
let fails = 0;
function expect(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log((ok ? 'PASS ' : 'FAIL ') + label + (ok ? '' : '\n   got:  ' + JSON.stringify(got) + '\n   want: ' + JSON.stringify(want)));
}

expect('RBCD, every user via groups', pick(await run('rbcd'), 'principal', 'target_names'),
  ['"ALICE@CORP.LOCAL" ["PC02.CORP.LOCAL"]', '"BOB@CORP.LOCAL" ["PC02.CORP.LOCAL"]', '"JDOE@CORP.LOCAL" ["PC01.CORP.LOCAL","PC04.CORP.LOCAL"]']);
expect('RBCD, two-step off drops Owns on PC04', pick(await run('rbcd', { twoStep: false }), 'principal', 'targets'),
  ['"ALICE@CORP.LOCAL" 1', '"BOB@CORP.LOCAL" 1', '"JDOE@CORP.LOCAL" 1']);
expect('RBCD, disabled included when filter off', pick(await run('rbcd', { enabledOnly: false }), 'principal', 'targets'),
  ['"ALICE@CORP.LOCAL" 1', '"BOB@CORP.LOCAL" 1', '"CAROL@CORP.LOCAL" 1', '"JDOE@CORP.LOCAL" 3']);
expect('RBCD, holders as granted', pick(await run('rbcd', { source: 'any' }), 'principal', 'rights'),
  ['"HELPDESK@CORP.LOCAL" ["GenericWrite"]', '"JDOE@CORP.LOCAL" ["WriteAccountRestrictions","Owns"]']);
expect('RBCD, noise off shows admins', pick(await run('rbcd', { source: 'any', noise: 'off' }), 'principal'),
  ['"ACCOUNT OPERATORS@CORP.LOCAL"', '"DOMAIN ADMINS@CORP.LOCAL"', '"HELPDESK@CORP.LOCAL"', '"JDOE@CORP.LOCAL"']);
expect('RBCD, Tier Zero filter (CE7 label)', pick(await run('rbcd', { source: 'any', noise: 'tier0' }), 'principal'), ['"HELPDESK@CORP.LOCAL"', '"JDOE@CORP.LOCAL"']);
expect('RBCD, Tier Zero filter (CE6 system_tags)', pick(await run('rbcd', { source: 'any', noise: 'tier0', edition: 'ce6' }), 'principal'), ['"HELPDESK@CORP.LOCAL"', '"JDOE@CORP.LOCAL"']);
expect('RBCD, Tier Zero filter (legacy highvalue)', pick(await run('rbcd', { source: 'any', noise: 'tier0', edition: 'legacy' }), 'principal'), ['"HELPDESK@CORP.LOCAL"', '"JDOE@CORP.LOCAL"']);
expect('RBCD, group by target', pick(await run('rbcd', { groupBy: 'target' }), 'target', 'principals'),
  ['"PC01.CORP.LOCAL" 1', '"PC02.CORP.LOCAL" 2', '"PC04.CORP.LOCAL" 1']);
expect('RBCD, counts', pick(await run('rbcd', { output: 'count' }), 'principals', 'targets'), ['3 3']);
expect('RBCD, named "bob" follows nested groups', pick(await run('rbcd', { source: 'named', name: 'bob' }), 'principal', 'granted_via'), ['"BOB@CORP.LOCAL" ["HELPDESK@CORP.LOCAL"]']);
for (const ed of ['ce7', 'ce6', 'legacy'])
  expect('RBCD, owned (' + ed + ')', pick(await run('rbcd', { source: 'owned', edition: ed }), 'principal'), ['"JDOE@CORP.LOCAL"']);
expect('RBCD, target filter pc02', pick(await run('rbcd', { targetGlob: 'pc02' }), 'principal'), ['"ALICE@CORP.LOCAL"', '"BOB@CORP.LOCAL"']);
expect('LAPS includes AllExtendedRights, RBCD does not', pick(await run('laps', { twoStep: false }), 'principal', 'rights'), ['"JDOE@CORP.LOCAL" ["AllExtendedRights"]']);
expect('Shadow creds (GenericWrite on PC02 via HELPDESK, Owns on PC04 count too)', pick(await run('shadow'), 'principal', 'target_names'),
  ['"ALICE@CORP.LOCAL" ["BOB@CORP.LOCAL","PC02.CORP.LOCAL"]', '"BOB@CORP.LOCAL" ["PC02.CORP.LOCAL"]', '"JDOE@CORP.LOCAL" ["PC04.CORP.LOCAL"]']);
expect('Force password (disabled target dropped)', pick(await run('forcepw'), 'principal', 'target_names'),
  ['"ALICE@CORP.LOCAL" ["SVC_SQL@CORP.LOCAL"]', '"BOB@CORP.LOCAL" ["SVC_SQL@CORP.LOCAL"]']);
expect('DCSync hides DCs, ignores GetChangesAll alone', pick(await run('dcsync'), 'principal'), ['"SVC_SQL@CORP.LOCAL"']);
expect('Kerberoast skips krbtgt', pick(await run('kerberoast', { enabledOnly: false }), 'user'), ['"SVC_SQL@CORP.LOCAL"']);
expect('Password in description (English + Japanese)', pick(await run('desc'), 'user'), ['"DESCJP@CORP.LOCAL"', '"DESCU@CORP.LOCAL"']);
expect('Unconstrained drops DCs', pick(await run('unconstrained'), 'principal'), ['"SRV01.CORP.LOCAL"']);
expect('Impersonable admins', pick(await run('impersonable'), 'admin'), ['"ADMIN1@CORP.LOCAL"']);
expect('Admin sessions hide DCs', pick(await run('sessions'), 'computer', 'admin_sessions'), ['"PC01.CORP.LOCAL" ["ADMIN1@CORP.LOCAL"]']);
expect('Admin sessions graph hides DCs', (await q(CQB.build(P('sessions'), { ...base, output: 'graph' }).replace('RETURN p', 'RETURN DISTINCT nodes(p)[0].name AS start'))).rows.map(r => r[0]), ['PC01.CORP.LOCAL']);
expect('Shortest path from owned', pick(await run('shortest', { source: 'owned' }), 'start', 'hops'), ['"JDOE@CORP.LOCAL" 3', '"JDOE@CORP.LOCAL" 4']);
expect('Relay edge, holders', pick(await run('relay', { source: 'any' }), 'principal'), ['"AUTHENTICATED USERS@CORP.LOCAL"']);
expect('AD CS, every user via groups', (await run('adcs')).rows.length, 7);

// 5. naive queries for comparison: one edge only, direct User ACEs only
console.log('\n--- naive queries on the same graph, for comparison ---');
const chat1 = await q("MATCH (u:User)-[:AddAllowedToAct]->(c:Computer) RETURN u.name AS user, collect(c.name) AS computers, count(c) AS num ORDER BY num DESC");
console.log('AddAllowedToAct only, direct User ACEs:', pick(chat1, 'user', 'computers'));
const chat2 = await q("MATCH (u:User)-[r]->(c:Computer) WHERE type(r) IN ['AddAllowedToAct','WriteAccountRestrictions','GenericAll','GenericWrite','WriteDacl','WriteOwner'] RETURN u.name AS user, collect(DISTINCT c.name) AS computers, count(DISTINCT c) AS num ORDER BY num DESC");
console.log('type(r) IN [...], direct User ACEs:', pick(chat2, 'user', 'computers'));
console.log('\nsemantic failures:', fails);
process.exitCode = errors || fails ? 1 : 0;
