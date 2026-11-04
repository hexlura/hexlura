// Shared checks for UK bank details. Used by the organiser and admin "update bank details" routes so
// both enforce the same rules — bank details are what payouts are sent to, so nothing malformed or
// arbitrary should ever be stored.

export interface BankDetails {
    bank_account_name: string
    bank_sort_code: string
    bank_account_number: string
}

export type BankDetailsResult =
    | { ok: true; values: BankDetails }
    | { ok: false; error: string }

export function validateBankDetails(input: { name?: unknown; sortCode?: unknown; accountNumber?: unknown }): BankDetailsResult {
    const name = typeof input.name === 'string' ? input.name.trim().replace(/\s+/g, ' ') : ''
    if (name.length < 2 || name.length > 100) return { ok: false, error: 'Enter the account holder name (2–100 characters).' }

    const sortDigits = typeof input.sortCode === 'string' ? input.sortCode.replace(/[\s-]/g, '') : ''
    if (!/^\d{6}$/.test(sortDigits)) return { ok: false, error: 'Sort code must be 6 digits, e.g. 12-34-56.' }

    const acctDigits = typeof input.accountNumber === 'string' ? input.accountNumber.replace(/\s/g, '') : ''
    if (!/^\d{6,8}$/.test(acctDigits)) return { ok: false, error: 'Account number must be 6 to 8 digits.' }

    return {
        ok: true,
        values: {
            bank_account_name: name,
            bank_sort_code: `${sortDigits.slice(0, 2)}-${sortDigits.slice(2, 4)}-${sortDigits.slice(4, 6)}`,
            // UK account numbers are 8 digits; older 6/7-digit ones are conventionally zero-padded.
            bank_account_number: acctDigits.padStart(8, '0'),
        },
    }
}

/** "••••1234" — never put a full account number in an email, notification or audit log. */
export function maskAccountNumber(n: string | null | undefined): string {
    return n ? `••••${n.slice(-4)}` : 'none'
}
