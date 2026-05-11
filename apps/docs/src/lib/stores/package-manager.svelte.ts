import { browser } from '$app/environment';

export type PackageManagerSvelte = 'npm' | 'pnpm' | 'bun' | 'yarn';

export const packageManagers: PackageManagerSvelte[] = ['npm', 'pnpm', 'bun', 'yarn'];

function createPackageManagerStore() {
	const storageKey = 'package-manager';
	const stored = browser ? localStorage.getItem(storageKey) as PackageManagerSvelte : null;

	let active = $state<PackageManagerSvelte>(
	stored && packageManagers.includes(stored) ? stored : 'npm'
	);

	return {
	get active() { return active; },
	set active(v: PackageManagerSvelte) {
	active = v;
	if (browser) localStorage.setItem(storageKey, v);
}
};
}

export const packageManagerStore = createPackageManagerStore();