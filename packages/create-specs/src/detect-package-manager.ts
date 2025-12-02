export function detectPackageManager() {
    const execPath = process.env['npm_execpath']

    return execPath
}