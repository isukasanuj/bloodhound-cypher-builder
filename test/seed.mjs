// Synthetic BloodHound-shaped graph. Every label, edge type and property mirrors the CE schema.
const D = 'S-1-5-21-1-2-3';
const T0 = { tz: true };
export const nodes = [
  // [label, name, objectid, props, flags]
  ['Domain', 'CORP.LOCAL', D, {}, T0],
  ['Group', 'DOMAIN ADMINS@CORP.LOCAL', D + '-512', {}, T0],
  ['Group', 'DOMAIN USERS@CORP.LOCAL', D + '-513', {}],
  ['Group', 'DOMAIN CONTROLLERS@CORP.LOCAL', D + '-516', {}, T0],
  ['Group', 'ENTERPRISE ADMINS@CORP.LOCAL', D + '-519', {}, T0],
  ['Group', 'PROTECTED USERS@CORP.LOCAL', D + '-525', {}],
  ['Group', 'ADMINISTRATORS@CORP.LOCAL', 'CORP.LOCAL-S-1-5-32-544', {}, T0],
  ['Group', 'ACCOUNT OPERATORS@CORP.LOCAL', 'CORP.LOCAL-S-1-5-32-548', {}, T0],
  ['Group', 'ENTERPRISE DOMAIN CONTROLLERS@CORP.LOCAL', 'CORP.LOCAL-S-1-5-9', {}, T0],
  ['Group', 'AUTHENTICATED USERS@CORP.LOCAL', 'CORP.LOCAL-S-1-5-11', {}],
  ['Group', 'HELPDESK@CORP.LOCAL', D + '-1105', {}],
  ['Group', 'WORKSTATION ADMINS@CORP.LOCAL', D + '-1106', {}],
  ['Group', 'NESTED@CORP.LOCAL', D + '-1107', {}],
  ['User', 'JDOE@CORP.LOCAL', D + '-1101', { enabled: true, admincount: false }, { owned: true }],
  ['User', 'ALICE@CORP.LOCAL', D + '-1102', { enabled: true, admincount: false }],
  ['User', 'BOB@CORP.LOCAL', D + '-1103', { enabled: true, admincount: false }],
  ['User', 'CAROL@CORP.LOCAL', D + '-1104', { enabled: false, admincount: false }],
  ['User', 'ADMIN1@CORP.LOCAL', D + '-1110', { enabled: true, admincount: true, sensitive: false }, T0],
  ['User', 'ADMIN2@CORP.LOCAL', D + '-1111', { enabled: true, admincount: true, sensitive: true }, T0],
  ['User', 'ADMIN3@CORP.LOCAL', D + '-1112', { enabled: true, admincount: true, sensitive: false }, T0],
  ['User', 'SVC_SQL@CORP.LOCAL', D + '-1120', { enabled: true, hasspn: true, admincount: false, serviceprincipalnames: ['MSSQLSvc/srv01.corp.local:1433'] }],
  ['User', 'KRBTGT@CORP.LOCAL', D + '-502', { enabled: false, hasspn: true, serviceprincipalnames: ['kadmin/changepw'] }],
  ['User', 'ASREP1@CORP.LOCAL', D + '-1121', { enabled: true, dontreqpreauth: true }],
  ['User', 'NOPWD1@CORP.LOCAL', D + '-1122', { enabled: true, passwordnotreqd: true }],
  ['User', 'DESCU@CORP.LOCAL', D + '-1123', { enabled: true, description: 'Temp Password: Winter2025' }],
  ['User', 'DESCJP@CORP.LOCAL', D + '-1124', { enabled: true, description: '初期パスワードは変更してください' }],
  ['User', 'GMSA1$@CORP.LOCAL', D + '-1130', { enabled: true }],
  ['Computer', 'DC01.CORP.LOCAL', D + '-1000', { enabled: true, unconstraineddelegation: true }, T0],
  ['Computer', 'PC01.CORP.LOCAL', D + '-1201', { enabled: true }],
  ['Computer', 'PC02.CORP.LOCAL', D + '-1202', { enabled: true }],
  ['Computer', 'PC03.CORP.LOCAL', D + '-1203', { enabled: false }],
  ['Computer', 'PC04.CORP.LOCAL', D + '-1204', { enabled: true, haslaps: true }],
  ['Computer', 'SRV01.CORP.LOCAL', D + '-1205', { enabled: true, unconstraineddelegation: true }],
  ['Computer', 'ATTACKER.CORP.LOCAL', D + '-1206', { enabled: true }],
  ['GPO', 'WORKSTATION POLICY@CORP.LOCAL', 'GPO-0001', {}],
  ['OU', 'WORKSTATIONS@CORP.LOCAL', 'OU-0001', {}]
];
export const edges = [
  // membership
  ...['JDOE', 'ALICE', 'BOB', 'CAROL', 'ADMIN1', 'ADMIN2', 'ADMIN3', 'SVC_SQL'].map(u => [u + '@CORP.LOCAL', 'MemberOf', 'DOMAIN USERS@CORP.LOCAL']),
  ['ADMIN1@CORP.LOCAL', 'MemberOf', 'DOMAIN ADMINS@CORP.LOCAL'],
  ['ADMIN2@CORP.LOCAL', 'MemberOf', 'DOMAIN ADMINS@CORP.LOCAL'],
  ['ADMIN3@CORP.LOCAL', 'MemberOf', 'DOMAIN ADMINS@CORP.LOCAL'],
  ['ADMIN3@CORP.LOCAL', 'MemberOf', 'PROTECTED USERS@CORP.LOCAL'],
  ['DOMAIN ADMINS@CORP.LOCAL', 'MemberOf', 'ADMINISTRATORS@CORP.LOCAL'],
  ['ALICE@CORP.LOCAL', 'MemberOf', 'HELPDESK@CORP.LOCAL'],
  ['NESTED@CORP.LOCAL', 'MemberOf', 'HELPDESK@CORP.LOCAL'],
  ['BOB@CORP.LOCAL', 'MemberOf', 'NESTED@CORP.LOCAL'],
  ['ALICE@CORP.LOCAL', 'MemberOf', 'WORKSTATION ADMINS@CORP.LOCAL'],
  ['DC01.CORP.LOCAL', 'MemberOf', 'DOMAIN CONTROLLERS@CORP.LOCAL'],
  // RBCD-capable rights
  ['JDOE@CORP.LOCAL', 'WriteAccountRestrictions', 'PC01.CORP.LOCAL'],
  ['HELPDESK@CORP.LOCAL', 'GenericWrite', 'PC02.CORP.LOCAL'],
  ['CAROL@CORP.LOCAL', 'AddAllowedToAct', 'PC02.CORP.LOCAL'],
  ['DOMAIN ADMINS@CORP.LOCAL', 'GenericAll', 'PC01.CORP.LOCAL'],
  ['DOMAIN ADMINS@CORP.LOCAL', 'GenericAll', 'PC02.CORP.LOCAL'],
  ['ACCOUNT OPERATORS@CORP.LOCAL', 'GenericAll', 'PC01.CORP.LOCAL'],
  ['JDOE@CORP.LOCAL', 'WriteDacl', 'PC03.CORP.LOCAL'],
  ['JDOE@CORP.LOCAL', 'Owns', 'PC04.CORP.LOCAL'],
  ['PC01.CORP.LOCAL', 'WriteAccountRestrictions', 'PC01.CORP.LOCAL'],
  ['JDOE@CORP.LOCAL', 'AllExtendedRights', 'PC04.CORP.LOCAL'],
  // other primitives
  ['PC01.CORP.LOCAL', 'HasSession', 'ADMIN1@CORP.LOCAL'],
  ['DC01.CORP.LOCAL', 'HasSession', 'ADMIN2@CORP.LOCAL'],
  ['ALICE@CORP.LOCAL', 'AddKeyCredentialLink', 'BOB@CORP.LOCAL'],
  ['HELPDESK@CORP.LOCAL', 'ForceChangePassword', 'SVC_SQL@CORP.LOCAL'],
  ['HELPDESK@CORP.LOCAL', 'ForceChangePassword', 'CAROL@CORP.LOCAL'],
  ['JDOE@CORP.LOCAL', 'AddSelf', 'WORKSTATION ADMINS@CORP.LOCAL'],
  ['DOMAIN CONTROLLERS@CORP.LOCAL', 'DCSync', 'CORP.LOCAL'],
  ['SVC_SQL@CORP.LOCAL', 'DCSync', 'CORP.LOCAL'],
  ['BOB@CORP.LOCAL', 'GetChangesAll', 'CORP.LOCAL'],
  ['JDOE@CORP.LOCAL', 'GenericWrite', 'WORKSTATION POLICY@CORP.LOCAL'],
  ['ALICE@CORP.LOCAL', 'WriteGPLink', 'WORKSTATIONS@CORP.LOCAL'],
  ['PC01.CORP.LOCAL', 'ReadGMSAPassword', 'GMSA1$@CORP.LOCAL'],
  ['BOB@CORP.LOCAL', 'SyncLAPSPassword', 'CORP.LOCAL'],
  ['ATTACKER.CORP.LOCAL', 'AllowedToAct', 'PC02.CORP.LOCAL'],
  ['SVC_SQL@CORP.LOCAL', 'AllowedToDelegate', 'SRV01.CORP.LOCAL'],
  ['WORKSTATION ADMINS@CORP.LOCAL', 'AdminTo', 'PC01.CORP.LOCAL'],
  ['DOMAIN USERS@CORP.LOCAL', 'CanRDP', 'SRV01.CORP.LOCAL'],
  ['AUTHENTICATED USERS@CORP.LOCAL', 'CoerceAndRelayNTLMToSMB', 'PC02.CORP.LOCAL'],
  ['DOMAIN USERS@CORP.LOCAL', 'ADCSESC1', 'CORP.LOCAL']
];

export function seedStatements() {
  const st = ['MATCH (x) DETACH DELETE x'];
  for (const [label, name, objectid, props, flags = {}] of nodes) {
    const p = { name, objectid, ...props };
    if (flags.tz) { p.system_tags = 'admin_tier_0'; p.highvalue = true; }
    if (flags.owned) { p.system_tags = 'owned'; p.owned = true; }
    const labels = ['Base', label, flags.tz ? 'Tag_Tier_Zero' : null, flags.owned ? 'Tag_Owned' : null].filter(Boolean).join(':');
    st.push({ statement: `CREATE (n:${labels}) SET n = $p`, parameters: { p } });
  }
  for (const [a, t, b] of edges) {
    st.push({ statement: `MATCH (a {name:$a}), (b {name:$b}) CREATE (a)-[:${t}]->(b)`, parameters: { a, b } });
  }
  return st.map(s => typeof s === 'string' ? { statement: s } : s);
}
