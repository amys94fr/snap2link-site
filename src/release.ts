/**
 * The latest Snap2Link release, read from GitHub when the site is built, so
 * the version and download sizes never go stale between releases. A script in
 * Layout refreshes the version in the browser, for releases published after
 * the last deploy. The fallback only shows if the GitHub API can't be reached.
 */

export interface Release {
  /** Without the leading "v", such as "1.8.0". */
  version: string;
  /** Rounded sizes, such as "3.6 MB", when the asset was found. */
  sizes: { windows?: string; mac?: string };
}

const FALLBACK: Release = { version: "1.8.0", sizes: {} };

const megabytes = (bytes: number) => `${(bytes / 1_000_000).toFixed(bytes < 10_000_000 ? 1 : 0)} MB`;

async function fetchRelease(): Promise<Release> {
  try {
    const response = await fetch("https://api.github.com/repos/amys94fr/Snap2Link/releases/latest", {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "snap2link-site-build" },
    });
    if (!response.ok) return FALLBACK;
    const release = (await response.json()) as {
      tag_name?: string;
      assets?: { name: string; size: number }[];
    };
    const version = release.tag_name?.replace(/^v/, "");
    if (!version || !/^\d+\.\d+\.\d+$/.test(version)) return FALLBACK;
    const size = (pattern: RegExp) => {
      const asset = release.assets?.find(({ name }) => pattern.test(name));
      return asset ? megabytes(asset.size) : undefined;
    };
    return { version, sizes: { windows: size(/x64-setup\.exe$/), mac: size(/universal\.dmg$/) } };
  } catch {
    return FALLBACK;
  }
}

let cached: Promise<Release> | undefined;

/** One request per build, whatever the number of pages. */
export function latestRelease(): Promise<Release> {
  cached ??= fetchRelease();
  return cached;
}
