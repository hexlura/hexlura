export const MAX_ENTRIES_PER_UPLOAD = 5000

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Reject values that start with a formula-trigger character — defends against CSV
// injection if this list is ever re-exported and opened in Excel/Sheets.
const CSV_FORMULA_PREFIX_RE = /^[=+\-@\t]/

export function isValidEmail(value: string): boolean {
    if (value.length > 254) return false
    if (CSV_FORMULA_PREFIX_RE.test(value)) return false
    return EMAIL_RE.test(value)
}

// Splits a comma/newline/semicolon separated blob of emails into a deduped,
// validated list. Returns both the accepted emails and how many were dropped
// so callers can report "added X, skipped Y".
export function parseEmailBlob(raw: string): { valid: string[]; invalidCount: number } {
    const tokens = raw
        .split(/[,\n\r;]+/)
        .map(t => t.trim().toLowerCase())
        .filter(Boolean)

    const seen = new Set<string>()
    const valid: string[] = []
    let invalidCount = 0

    for (const token of tokens) {
        if (!isValidEmail(token)) {
            invalidCount++
            continue
        }
        if (seen.has(token)) continue
        seen.add(token)
        valid.push(token)
    }

    return { valid, invalidCount }
}

// Minimal CSV parser for a single-column (or "email"-column) contact file.
// Handles quoted fields with embedded commas; does not attempt full RFC 4180
// multi-line-quoted-field support since we only ever read one column out of it.
export function parseCsvEmails(raw: string): { valid: string[]; invalidCount: number; truncated: boolean } {
    const lines = raw.split(/\r\n|\n|\r/).map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return { valid: [], invalidCount: 0, truncated: false }

    const truncated = lines.length > MAX_ENTRIES_PER_UPLOAD + 1
    const capped = lines.slice(0, MAX_ENTRIES_PER_UPLOAD + 1)

    function splitCsvRow(line: string): string[] {
        const cells: string[] = []
        let current = ''
        let inQuotes = false
        for (let i = 0; i < line.length; i++) {
            const ch = line[i]
            if (ch === '"') {
                if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
                else inQuotes = !inQuotes
            } else if (ch === ',' && !inQuotes) {
                cells.push(current); current = ''
            } else {
                current += ch
            }
        }
        cells.push(current)
        return cells.map(c => c.trim())
    }

    const firstRow = splitCsvRow(capped[0])
    let emailColIndex = 0
    let dataLines = capped

    if (firstRow.length > 1) {
        const headerIdx = firstRow.findIndex(c => c.toLowerCase() === 'email')
        if (headerIdx !== -1) {
            emailColIndex = headerIdx
            dataLines = capped.slice(1)
        }
    } else if (firstRow[0].toLowerCase() === 'email') {
        dataLines = capped.slice(1)
    }

    const seen = new Set<string>()
    const valid: string[] = []
    let invalidCount = 0

    for (const line of dataLines) {
        const cells = splitCsvRow(line)
        const raw = (cells[emailColIndex] || cells[0] || '').trim().toLowerCase()
        if (!raw) continue
        if (!isValidEmail(raw)) { invalidCount++; continue }
        if (seen.has(raw)) continue
        seen.add(raw)
        valid.push(raw)
    }

    return { valid, invalidCount, truncated }
}
