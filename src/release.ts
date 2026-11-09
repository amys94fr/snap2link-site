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
  /** Direct links to the installers, or the releases page when one is missing. */
  downloads: { windows: string; mac: string };
}

/** Where a download button goes when the installer itself can't be found. */
export const RELEASES_PAGE = "https://github.com/amys94fr/Snap2Link/releases/latest";

/** The installer names, also matched by the script in Layout that refreshes the links. */
export const INSTALLERS = { windows: /x64-setup\.exe$/, mac: /universal\.dmg$/ };

const FALLBACK: Release = {
  version: "1.8.0",
  sizes: {},
  downloads: { windows: RELEASES_PAGE, mac: RELEASES_PAGE },
};

const megabytes = (bytes: number) => `${(bytes / 1_000_000).toFixed(bytes < 10_000_000 ? 1 : 0)} MB`;

async function fetchRelease(): Promise<Release> {
  try {
    const response = await fetch("https://api.github.com/repos/amys94fr/Snap2Link/releases/latest", {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "snap2link-site-build" },
    });
    if (!response.ok) return FALLBACK;
    const release = (await response.json()) as {
      tag_name?: string;
      assets?: { name: string; size: number; browser_download_url?: string }[];
    };
    const version = release.tag_name?.replace(/^v/, "");
    if (!version || !/^\d+\.\d+\.\d+$/.test(version)) return FALLBACK;
    const asset = (pattern: RegExp) => release.assets?.find(({ name }) => pattern.test(name));
    const size = (pattern: RegExp) => {
      const found = asset(pattern);
      return found ? megabytes(found.size) : undefined;
    };
    const link = (pattern: RegExp) => {
      const url = asset(pattern)?.browser_download_url;
      return url?.startsWith("https://github.com/") ? url : RELEASES_PAGE;
    };
    return {
      version,
      sizes: { windows: size(INSTALLERS.windows), mac: size(INSTALLERS.mac) },
      downloads: { windows: link(INSTALLERS.windows), mac: link(INSTALLERS.mac) },
    };
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

/**
 * The Android app has its own releases, tagged `android-v1.2.3` and never
 * marked "latest", so the desktop updater and `latestRelease` don't see them.
 */
export interface AndroidRelease {
  version: string;
  size?: string;
  /** The APK itself, or the releases page when it can't be found. */
  download: string;
  /** The release's own page, with its notes and checksum. */
  page: string;
}

/** Desktop tags look like `v1.2.3`, Android ones like `android-v1.2.3`. */
export const TAGS = { desktop: /^v\d+\.\d+\.\d+$/, android: /^android-v\d+\.\d+\.\d+$/ };
export const APK = /_android\.apk$/;
const ALL_RELEASES = "https://github.com/amys94fr/Snap2Link/releases";

const ANDROID_FALLBACK: AndroidRelease = {
  version: "0.1.0",
  download: ALL_RELEASES,
  page: ALL_RELEASES,
};

async function fetchAndroidRelease(): Promise<AndroidRelease> {
  try {
    const response = await fetch("https://api.github.com/repos/amys94fr/Snap2Link/releases?per_page=30", {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "snap2link-site-build" },
    });
    if (!response.ok) return ANDROID_FALLBACK;
    const releases = (await response.json()) as {
      tag_name?: string;
      draft?: boolean;
      prerelease?: boolean;
      html_url?: string;
      assets?: { name: string; size: number; browser_download_url?: string }[];
    }[];
    // Newest first.
    const release = releases.find((r) => !r.draft && !r.prerelease && TAGS.android.test(r.tag_name ?? ""));
    if (!release?.tag_name) return ANDROID_FALLBACK;
    const apk = release.assets?.find(({ name }) => APK.test(name));
    const github = (url?: string) => (url?.startsWith("https://github.com/") ? url : undefined);
    return {
      version: release.tag_name.replace(/^android-v/, ""),
      size: apk ? megabytes(apk.size) : undefined,
      download: github(apk?.browser_download_url) ?? ALL_RELEASES,
      page: github(release.html_url) ?? ALL_RELEASES,
    };
  } catch {
    return ANDROID_FALLBACK;
  }
}

let cachedAndroid: Promise<AndroidRelease> | undefined;

export function latestAndroidRelease(): Promise<AndroidRelease> {
  cachedAndroid ??= fetchAndroidRelease();
  return cachedAndroid;
}
