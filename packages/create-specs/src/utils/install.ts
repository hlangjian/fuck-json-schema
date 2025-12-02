import { detectPackageManager } from "./detect-package-manager"

export interface InstallOptions {
    dev?: boolean
    packages?: string[]
}

export function getInstallCommand(options?: InstallOptions): { command: string, args: string[] } {

    const { dev = false, packages = [] } = options ?? {}

    const packageManager = detectPackageManager()

    if (packageManager.startsWith('npm')) {
        const args: string[] = ['install']
        if (dev) args.push('--save-dev')
        args.push(...packages)
        return { command: packageManager, args }
    }

    if (packageManager.startsWith('pnpm')) {
        const args: string[] = ['add']
        if (dev) args.push('--save-dev')
        args.push(...packages)
        return { command: packageManager, args }
    }

    if (packageManager.startsWith('yarn')) {
        const args: string[] = ['add']
        if (dev) args.push('--dev')
        args.push(...packages)
        return { command: packageManager, args }
    }

    throw Error(`unknown package manager ${packageManager}`)
}