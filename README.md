# BloodHound Cypher Builder

Pick an Active Directory attack primitive and get the BloodHound Cypher that actually answers it. No memorising edge names, no hand-written queries.

**Open it:** https://isukasanuj.github.io/bloodhound-cypher-builder/ (or open `index.html` locally; it's a single file with no build step).

For authorized security testing only.

## Why

Two mistakes make hand-written BloodHound queries undercount:

1. **Querying one edge when several grant the same capability.** For RBCD, `AddAllowedToAct`, `WriteAccountRestrictions`, `GenericAll` and `GenericWrite` are separate edges. A query for `AddAllowedToAct` alone misses the rest.
2. **Matching `(u:User)-[...]->` directly.** Rights in AD are usually granted to groups, often nested. A direct match misses every user who gets the right through membership.

The builder encodes the edge set for each question and follows `MemberOf` for you.

## What it does

- **26 checks** in the order you'd work through a foothold: roastable accounts, object takeover (RBCD, Shadow Credentials, password reset, targeted Kerberoast, group membership, GPO edit/link), secrets (LAPS, DirSync, gMSA, DCSync), delegation, lateral movement, coerce-and-relay, AD CS, and shortest path to domain admin. A last page lists checks BloodHound can't answer (MachineAccountQuota, LDAP/SMB signing, WebClient, GPP, pre2k, ADIDNS).
- **Who:** every user through nested groups, whoever holds the right directly, a principal you name (wildcards allowed), or principals marked Owned.
- **Output:** graph (paths for the BloodHound UI), a table (one row per principal or per target, for reports) or counts.
- **Noise filter:** hides holders who are expected to have the right: built-in admin groups and DCs by well-known RID, or everything tagged Tier Zero.
- **Two-step rights:** optionally adds `WriteDacl`, `WriteOwner` and `Owns`, labelled so they can be reported separately.
- **Caveats and live checks:** each check lists what the graph can't tell you and the NetExec, bloodyAD, Impacket or Certipy command to confirm it.
- **Checklist:** tick checks as you go. Settings and progress stay in your browser's local storage.

## BloodHound versions

| Setting | Owned | Tier Zero |
|---|---|---|
| CE v7 or newer | `:Tag_Owned` label | `:Tag_Tier_Zero` label |
| CE before v7 | `system_tags CONTAINS 'owned'` | `system_tags CONTAINS 'admin_tier_0'` |
| Legacy 4.x | `owned = true` | `highvalue = true` |

Edge names follow the BloodHound CE edge reference. Legacy BloodHound has no AD CS or coerce-and-relay edges.

## Testing

`test/` holds a synthetic BloodHound-shaped graph and a runner that:

- builds **every query the UI can generate** (11,286 distinct queries) and runs each one against Neo4j, failing on any error;
- runs **28 checks of expected results**: nested groups, disabled accounts, two-step rights, noise filters, owned and Tier Zero syntax for all three versions, DC exclusion, Protected Users, and more;
- prints what the two naive queries described above return on the same graph, for comparison.

```bash
docker run -d --name cqb-neo4j -e NEO4J_AUTH=none -p 127.0.0.1:27474:7474 neo4j:4.4.42
node test/run.mjs
docker rm -f cqb-neo4j
```

The runner wipes the database it points at. Only use a throwaway container. Set `NEO4J_HTTP` to use a different address.

**What has been verified:** all generated queries run without errors on Neo4j 4.4.42 (the database BloodHound CE ships with), and all 28 result checks pass.

**What hasn't been verified:**
- **BloodHound CE's own Cypher parser.** The queries avoid constructs CE documents as unsupported (CASE, EXISTS subqueries, list comprehensions, `labels()`). If CE still rejects one, run it in the Neo4j Browser on port 7474.
- **Real directory data.**
- **The live-check commands.** Their flags were checked against each tool's source, but the commands haven't been run against a domain.
