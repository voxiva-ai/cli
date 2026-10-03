export type UpdateInfo = {
    latest: string;
    current: string;
    url: string;
    installHint: string;
};
/** Semver-ish compare: 1 if a>b, -1 if a<b, 0 if equal/unknown. */
export declare function compareVersions(a: string, b: string): number;
/**
 * Non-blocking update check. Returns info only when a newer release exists.
 * Cached for 24h so startups stay fast and installs never break.
 */
export declare function checkForUpdate(force?: boolean): Promise<UpdateInfo | null>;
