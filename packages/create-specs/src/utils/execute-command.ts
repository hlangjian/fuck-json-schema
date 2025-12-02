import { spawn } from "child_process"

export interface ExecuteCommandOptions {
    cwd?: string
    command: string
    args?: string[]
    shell?: boolean
}

export async function executeCommand(options: ExecuteCommandOptions) {

    const { cwd = process.cwd(), command, args = [], shell = false } = options

    return new Promise<void>((resolve, reject) => {

        const child = spawn(command, args, { cwd, stdio: 'inherit', shell })

        child.on('error', (error) => {
            reject(error)
            throw error
        })

        child.on('exit', code => {
            if (code === 0) resolve()
            else reject(new Error(`${command} exited with code ${code}`))
        })
    })
}