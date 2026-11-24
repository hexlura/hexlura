import { logAuditAction } from '@/lib/audit'
import { notifyAdmins } from '@/lib/notify-admins'

// After an organiser's or promoter's bank details change, bank-transfer payouts to them are held for a
// fixed number of days, and the new details are withheld from the admin payouts screen. This is the
// control that stops "change the bank details, then get paid" (the 24 Nov 2026 incident): the person
// paying would otherwise be shown — and send money to — the attacker's account.
//
// Deliberately a constant, not an admin setting: a compromised admin must not be able to switch it off
// from the settings page. Changing the length is a code change.
export const BANK_CHANGE_HOLD_DAYS = 7
export const HOLD_REASON_MIN = 10
export const HOLD_REASON_MAX = 300

const DAY_MS = 24 * 60 * 60 * 1000

export interface BankHold {
    held: boolean
    changedAt: string | null
    releasesAt: string | null
}

/** Is a payout destination still inside the hold window? An unparseable timestamp counts as held. */
export function bankHold(changedAt: string | null | undefined, now: number = Date.now()): BankHold {
    if (!changedAt) return { held: false, changedAt: null, releasesAt: null }
    const changed = Date.parse(changedAt)
    if (Number.isNaN(changed)) return { held: true, changedAt, releasesAt: null }
    const releases = changed + BANK_CHANGE_HOLD_DAYS * DAY_MS
    return { held: now < releases, changedAt, releasesAt: new Date(releases).toISOString() }
}

/** The override reason an admin must give to act during a hold, or null if missing / too short / too long. */
export function parseHoldOverrideReason(raw: unknown): string | null {
    if (typeof raw !== 'string') return null
    const reason = raw.trim()
    return reason.length >= HOLD_REASON_MIN && reason.length <= HOLD_REASON_MAX ? reason : null
}

export function formatHoldDate(iso: string | null): string {
    return iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'unknown'
}

/** Audit-log a hold override and alert every admin. Never include a full account number. */
export async function recordHoldOverride(args: {
    actorId: string
    actorEmail: string | null | undefined
    entityType: 'organiser' | 'promoter'
    entityId: string
    label: string
    reason: string
    hold: BankHold
    accountMasked: string
    via: 'reveal' | 'process' | 'status'
}): Promise<void> {
    await logAuditAction({
        actorId: args.actorId,
        action: 'bank_hold_override',
        entityType: args.entityType,
        entityId: args.entityId,
        metadata: {
            reason: args.reason,
            via: args.via,
            changed_at: args.hold.changedAt,
            releases_at: args.hold.releasesAt,
            account: args.accountMasked,
        },
    })
    await notifyAdmins({
        type: 'bank_hold_override',
        title: 'Bank-change hold overridden',
        body: `${args.actorEmail ?? 'An admin'} overrode the ${BANK_CHANGE_HOLD_DAYS}-day hold on ${args.label} (bank details changed ${formatHoldDate(args.hold.changedAt)}). Reason: "${args.reason}"`,
        link: '/admin/payouts',
    })
}
