const QUERY = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        weeks { firstDay contributionDays { contributionCount } }
      }
    }
  }
}`;

/**
 * Weekly contribution counts for the last year: [{ start, count }], oldest first.
 * GitHub's GraphQL API needs a token (the Action's GITHUB_TOKEN is enough).
 */
export async function fetchContributionWeeks(login, token) {
  const res = await fetch(process.env.GITHUB_GRAPHQL_URL || "https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "User-Agent": "research-profile-builder" },
    body: JSON.stringify({ query: QUERY, variables: { login } }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`GraphQL ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
  const weeks = json.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
  if (!Array.isArray(weeks)) throw new Error(`no contribution calendar for "${login}"`);
  return weeks.map((w) => ({ start: w.firstDay, count: w.contributionDays.reduce((s, d) => s + d.contributionCount, 0) }));
}
