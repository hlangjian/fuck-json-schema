
import { isModel, isRoutesModel } from '@huanglangjian/schema'
import type { Model, RoutesModel } from '@huanglangjian/schema'

const modules: Record<string, object> = {
    "com/examples/book": await import('./specs/com/examples/book'),
}

const models = new Map<string, Model | RoutesModel>()

for(const [moduleId, module] of Object.entries(modules)) for(const [name, obj] of Object.entries(module)) {
    if(isModel(obj) || isRoutesModel(obj)){
        const id = [moduleId, name].join('.')
        models.set(id, obj)
    }
}

export { models }