const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

const targets = [
  'server/src/modules/dispute/dispute.service.ts',
  'server/src/modules/booking/booking-automation.service.ts',
  'server/src/modules/booking/booking.service.ts',
  'server/src/modules/ledger/settlement.service.ts',
  'server/src/modules/admin/admin.service.ts',
  'server/src/modules/auth/auth.service.ts',
  'server/src/modules/companion/companion.service.ts',
  'server/src/modules/companion/companion.dto.ts',
  'server/src/modules/session/session.service.ts',
  'client/src/App.tsx',
  'client/src/components/RegisterModal.tsx',
  'client/src/components/AuthenticatedAppFrame.tsx',
  'client/src/components/EscrowProcessSection.tsx',
  'client/src/pages/EscrowPolicyPage.tsx',
  'client/src/components/VoiceIntroRecorder.tsx',
  'client/src/components/ProfileView.tsx',
  'client/src/components/CompanionCard.tsx'
];

const auditEntries = [];

for (const rel of targets) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) continue;
  const content = fs.readFileSync(full, 'utf8');
  const lines = content.split('\n');

  lines.forEach((l, idx) => {
    const lineNum = idx + 1;
    const trimmed = l.trim();

    // Check for internal codes in user-facing contexts (strings, JSX, messages, notifications)
    const hasGroupDecision = trimmed.includes('NHÓM ĐÃ CHỐT') || trimmed.includes('Nhóm đã chốt') || trimmed.includes('Charter');
    const hasDCode = /\(D\d+\)/.test(trimmed);
    const hasBRCode = /\(BR-\d+\)/.test(trimmed);
    const hasREFCode = /REF-[A-Z]+-\d+/.test(trimmed);
    const hasRawEnum = /NO_SHOW|EVIDENCE_PENDING|UNDER_REVIEW|SERVICE_NOT_AS_PROMISED|PENALTY_DEBT/.test(trimmed);
    const hasRawId = /#\$\{[^}]+\.slice\(0,\s*8\)\}/.test(trimmed) || /#[a-f0-9]{8}/.test(trimmed);

    // Filter to lines that appear to be user facing
    const isUserFacing = 
      trimmed.includes('message:') || 
      trimmed.includes('reason:') || 
      trimmed.includes('reason =') || 
      trimmed.includes('reasonCategory') || 
      trimmed.includes('historyReason') ||
      trimmed.includes('throw new') ||
      trimmed.includes('title:') ||
      trimmed.includes('<p') ||
      trimmed.includes('<span') ||
      trimmed.includes('<span>') ||
      trimmed.includes('title=') ||
      trimmed.includes('conversion_rate_formula') ||
      trimmed.includes('result:');

    if (isUserFacing && (hasGroupDecision || hasDCode || hasBRCode || hasREFCode || hasRawEnum || hasRawId)) {
      auditEntries.push({
        file: rel,
        line: lineNum,
        raw: trimmed,
        hasGroupDecision,
        hasDCode,
        hasBRCode,
        hasREFCode,
        hasRawEnum,
        hasRawId
      });
    }
  });
}

console.log(`Audited ${auditEntries.length} UI text issues.`);
fs.writeFileSync(path.join(ROOT, 'audit_entries.json'), JSON.stringify(auditEntries, null, 2));
