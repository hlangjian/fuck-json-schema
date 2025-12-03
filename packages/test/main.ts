import { createFileBaseSchemaWatcher } from '@huanglangjian/schema-file-base-watcher'

const subscription = await createFileBaseSchemaWatcher()

process.on('exit', async () => await subscription.unsubscribe())
