export function seal(backup: unknown, passphrase: string): Buffer;
export function open(file: Buffer, passphrase: string): any;
export function manifestOf(tables: Record<string, unknown[]>): Record<string, number>;
export function verify(backup: any): string[];
export function restoreOrder(names: string[], refs: Record<string, string[]>): string[];
