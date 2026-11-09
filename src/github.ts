/**
 * Repo metrics read at build time, so the pages ship with current values and
 * no flash on load. A script in Layout refreshes them in the browser between
 * deploys. If the GitHub API can't be reached, the last known values show.
 */

export interface RepoStats {
  stars: number;
  /** Every asset of every release, summed. */
  downloads: number;
}

const HEADERS = { Accept: "application/vnd.github+json", "User-Agent": "snap2link-site-build" };
const FALLBACK: RepoStats = { stars: 2, downloads: 0 };

async function fetchStats(): Promise<RepoStats> {
  const stats = { ...FALLBACK };
  try {
    const response = await fetch("https://api.github.com/repos/amys94fr/Snap2Link", { headers: HEADERS });
    if (response.ok) {
      const data = (await response.json()) as { stargazers_count?: number };
      if (typeof data.stargazers_count === "number") stats.stars = data.stargazers_count;
    }
  } catch {
    /* keep the fallback */
  }
  try {
    const response = await fetch("https://api.github.com/repos/amys94fr/Snap2Link/releases?per_page=100", {
      headers: HEADERS,
    });
    if (response.ok) {
      const releases = (await response.json()) as Array<{ assets?: Array<{ download_count?: number }> }>;
      stats.downloads = releases.reduce(
        (sum, release) => sum + (release.assets ?? []).reduce((s, a) => s + (a.download_count ?? 0), 0),
        0,
      );
    }
  } catch {
    /* keep the fallback */
  }
  return stats;
}

let cached: Promise<RepoStats> | undefined;

/** One request per build, whatever the number of pages. */
export function repoStats(): Promise<RepoStats> {
  cached ??= fetchStats();
  return cached;
}
