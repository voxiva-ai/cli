export type UpdateInfo = {
    latest: string;
    current: string;
    url: string;
    /** Short hint for the banner */
    installHint: string;
    /** Full one-liner if /update isn't used */
    reinstallHint: string;
};
/** Semver-ish compare: 1 if a>b, -1 if a<b, 0 if equal/unknown. */
export declare function compareVersions(a: string, b: string): number;
export declare function reinstallHint(): string;
/** Clear cache so the next check hits the network. */
export declare function clearUpdateCache(): Promise<void>;
export declare function newestUpdate<T extends {
    latest: string;
}>(candidates: T[]): T | null;
/**
 * Non-blocking update check. Returns info only when a newer release exists.
 */
export declare function checkForUpdate(force?: boolean): Promise<UpdateInfo | null>;
