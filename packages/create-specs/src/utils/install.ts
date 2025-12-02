import { detectPackageManager } from "./detect-package-manager"

export interface InstallOptions {
    dev?: boolean
    saveOnly?: boolean
    packages?: string[]
}

export function getInstallCommand(options?: InstallOptions): { command: string, args: string[] } {

    const { dev = false, saveOnly = false, packages = [] } = options ?? {}

    const packageManager = detectPackageManager()

    if (packageManager.startsWith('npm')) {
        const args: string[] = ['install']
        if (dev) args.push('--dev')
        if (saveOnly) args.push('--save-only')
        args.push(...packages)
        return { command: packageManager, args }
    }

    if (packageManager.startsWith('npm')) {
        const args: string[] = ['add']
        if (dev) args.push('--dev')
        if (saveOnly) args.push('--save-only')
        args.push(...packages)
        return { command: packageManager, args }
    }

    if (packageManager.startsWith('npm')) {
        const args: string[] = ['add']
        if (dev) args.push('--dev')
        if (saveOnly) args.push('--save-only')
        args.push(...packages)
        return { command: packageManager, args }
    }

    throw Error(`unknown package manager ${packageManager}`)
}