export interface Contributions {
  total: number;
  days: { date: string; count: number }[];
}

// Parses GitHub's public contribution calendar fragment (github.com/users/<user>/contributions).
// Each day cell has data-date + id; its count lives in a <tool-tip for="<id>"> label.
export function parseContributionsHtml(html: string): Contributions {
  const dateById = new Map<string, string>();
  for (const m of html.matchAll(/<td\b[^>]*>/g)) {
    const tag = m[0];
    const date = tag.match(/data-date="(\d{4}-\d{2}-\d{2})"/)?.[1];
    const id = tag.match(/\bid="([^"]+)"/)?.[1];
    if (date && id) dateById.set(id, date);
  }
  const countById = new Map<string, number>();
  for (const m of html.matchAll(/<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([^<]*)</g)) {
    const n = m[2].match(/^\s*(\d[\d,]*)\s+contributions?\b/);
    countById.set(m[1], n ? Number(n[1].replace(/,/g, "")) : 0);
  }
  const days = [...dateById.entries()]
    .map(([id, date]) => ({ date, count: countById.get(id) ?? 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (days.length === 0) throw new Error("No contribution days found in GitHub HTML");
  return { total: days.reduce((s, d) => s + d.count, 0), days };
}

export async function fetchContributions(user: string, token: string | undefined, fetchImpl: typeof fetch): Promise<Contributions> {
  if (token) {
    const res = await fetchImpl("https://api.github.com/graphql", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "User-Agent": "siyad-portfolio" },
      body: JSON.stringify({
        query: `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}`,
        variables: { login: user },
      }),
    });
    if (res.ok) {
      const json = (await res.json()) as any;
      const cal = json?.data?.user?.contributionsCollection?.contributionCalendar;
      if (cal) {
        return {
          total: cal.totalContributions,
          days: cal.weeks.flatMap((w: any) => w.contributionDays.map((d: any) => ({ date: d.date, count: d.contributionCount }))),
        };
      }
    }
  }
  const res = await fetchImpl(`https://github.com/users/${encodeURIComponent(user)}/contributions`, {
    headers: { "User-Agent": "Mozilla/5.0 (siyad-portfolio)", Accept: "text/html" },
  });
  if (!res.ok) throw new Error(`GitHub contributions ${res.status}`);
  return parseContributionsHtml(await res.text());
}
