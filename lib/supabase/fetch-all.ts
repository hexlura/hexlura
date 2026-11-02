// PostgREST silently caps a single request at 1,000 rows (db max-rows), with no error and no
// warning. Any total computed from one uncapped `.select()` therefore goes quietly wrong once a
// table passes 1,000 rows. Use this for any query whose rows are summed or counted in code.
//
// `build` must apply a stable `.order(...)` (e.g. `.order('id')`) — paging over an unordered
// query can skip or repeat rows between pages — and `.range(from, to)`.
const PAGE_SIZE = 1000
const MAX_PAGES = 200 // 200k rows — a runaway-loop guard, not an expected limit

export async function fetchAllRows<T>(
    build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
    const rows: T[] = []
    for (let page = 0; page < MAX_PAGES; page++) {
        const from = page * PAGE_SIZE
        const { data, error } = await build(from, from + PAGE_SIZE - 1)
        if (error) throw new Error(`fetchAllRows failed at row ${from}: ${error.message}`)
        const batch = data ?? []
        rows.push(...batch)
        if (batch.length < PAGE_SIZE) return rows
    }
    throw new Error(`fetchAllRows hit the ${MAX_PAGES}-page limit — refusing to return partial data`)
}
