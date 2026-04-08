const BASE = "https://api.fiken.no/api/v2";

function token(): string {
    const t = process.env.FIKEN_API_TOKEN;
    if (!t) throw new Error("FIKEN_API_TOKEN environment variable is required");
    return t;
}

export function slug(): string {
    const s = process.env.FIKEN_COMPANY_SLUG;
    if (!s) throw new Error("FIKEN_COMPANY_SLUG environment variable is required");
    return s;
}

/** Build a company-scoped path, e.g. cp('/invoices') → /companies/my-slug/invoices */
export function cp(path: string): string {
    return `/companies/${slug()}${path}`;
}

type Params = Record<string, string | number | boolean | undefined | null>;

export async function get(path: string, params?: Params): Promise<unknown> {
    const url = new URL(`${BASE}${path}`);
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            if (v != null) url.searchParams.set(k, String(v));
        }
    }
    const r = await fetch(url, {
        headers: { Authorization: `Bearer ${token()}` },
    });
    if (!r.ok) throw new Error(`Fiken ${r.status}: ${await r.text()}`);
    return r.status === 204 ? null : r.json();
}

export async function mutate(method: string, path: string, body?: unknown): Promise<unknown> {
    const r = await fetch(`${BASE}${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${token()}`,
            "Content-Type": "application/json",
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) throw new Error(`Fiken ${r.status}: ${await r.text()}`);
    if (r.status === 204) return { success: true };
    if (r.status === 201) return { created: true, location: r.headers.get("Location") };
    try {
        return await r.json();
    } catch {
        return { success: true };
    }
}
