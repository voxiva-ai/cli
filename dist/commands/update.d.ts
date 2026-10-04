/**
 * Reinstall CLI from GitHub into ~/.voxiva/prefix (same layout as installer).
 * Falls back to the one-line install script.
 */
export declare function runUpdate(opts?: {
    force?: boolean;
}): Promise<number>;
