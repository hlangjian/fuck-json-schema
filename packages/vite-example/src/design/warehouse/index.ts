import { array, constant, record, routes, string, optional, response, taggedUnion, operation, minLength, trimStart } from "@huanglangjian/schema";

const warehouse = record({
    id: 'Warehouses',

    description: trimStart`
        # Warehouse

        用于描述仓库（Warehouse）的基础信息模型。

        该模型通常用于库存管理、分拣系统、WMS（Warehouse Management System）等业务场景中，
        作为仓库实体的核心数据结构。

        一个仓库代表货物的实际存放地点，包含唯一标识、名称、说明信息，
        以及用于分类或过滤的标签。
    `,
    properties: {
        id: string({
            description: trimStart`
                仓库 ID（Warehouse ID）。

                用于唯一标识一个仓库实例，通常由系统自动生成并保持全局唯一。

                该标识可以用于库存查询、日志记录、出入库跟踪等业务流程中。
                最小长度为 10 是为了提升标识的不可猜测性与系统兼容性。
            `.trim(),
            validations: [
                minLength(10)
            ]
        }),

        name: string({
            description: trimStart`
                仓库名称  
                
                用于展示和识别仓库，通常由业务人员命名，
                应能够清晰表达仓库的功能或地理位置。

                
                例如：“上海一号仓”、“华南中心仓”、“备件仓”等。
            `,
        }),

        description: optional(string({
            description: trimStart`
                仓库描述（可选字段）。

                用于补充仓库的背景信息，例如仓库的用途、存储品类限制、
                温控要求、运营规则或业务备注。

                该字段通常用于文档化仓库的附加属性，
                便于运营人员和系统使用者更好地理解仓库特性。
            `,
        })),

        tags: array(string({
            description: trimStart`
                仓库标签列表。
                        
                每个标签用于给仓库添加分类、标记或属性，
                例如：“冷链”、“海外”、“电商仓”、“备件仓”等。
                        
                标签常用于过滤、搜索和数据聚类分析。
                格式不做强制限制，但建议保持系统内一致的命名规范。
            `,
        })),
    },
})

const warehouseConstant = constant(warehouse, {
    id: 'id',
    name: 'warehouse-name',
    tags: [],
})

const warehouseDraft = record({
    id: 'WarehouseDraft',

    title: 'This is Warehouse Draft',

    properties: {
        type: constant(string(), 'warehouseDraft'),
        name: string({ description: '仓库名称' }),
        description: optional(string()),
        tags: array(string()),
        data: warehouseConstant
    }
})

const warehousePatch = record({
    id: 'WarehousePatch',

    properties: {
        ...warehouseDraft.properties,
        type: constant(string(), 'warehousePatch')
    }
})

const warehouseNotFoundError = record({
    id: 'WarehouseNotFoundError',

    properties: {
        code: constant(string(), 'warehouse not found')
    }
})

const maybe = taggedUnion({
    id: 'WarehouseMaybe',

    variants: {
        warehouseDraft,
        warehousePatch,
    }
})

export const warehouseResource = routes('/warehouse', {
    id: 'WarehouseResource',

    description: trimStart`
        仓库管理api
    `,

    operations: {

        listWarehouses: operation('GET', '/', {

            summary: 'List Warehouses',

            description: '列出所有仓库',

            responses: {
                ok: response({
                    status: 200,
                    content: array(warehouse),
                }),
            }
        }),


        createWarehouse: operation('POST', '/', {

            summary: 'Create Warehouse',

            content: warehouseDraft,

            headerParams: {
                name: optional(string())
            },

            responses: {
                ok: response({
                    status: 200,

                    content: warehouse,

                    headers: {
                        name: string()
                    }
                }),
            }
        }),

        getWarehouse: operation('GET', '/{warehouseId}', {

            summary: 'Get Warehouse',

            responses: {
                ok: response({ status: 200, content: warehouse }),

                notfound: response({ status: 404, content: warehouseNotFoundError }),
            }
        }),

        updateWarehouse: operation('PUT', '/{warehouseId}', {
            summary: 'Update Warehouse',

            content: warehousePatch,

            responses: {
                ok: response({ status: 200 }),

                notfound: response({ status: 404, content: warehouseNotFoundError }),
            }
        }),

        markWarehouseActive: operation('POST', '/{warehouseId}/active', {

            summary: 'Mark warehouse as active',

            responses: {
                ok: response({ status: 200 }),
                notfound: response({ status: 404, content: warehouseNotFoundError }),
            }
        }),

        markWarehouseInactive: operation('POST', '/{warehouseId}/inactive', {

            summary: 'Mark warehouse as inactive',

            responses: {
                ok: response({ status: 200 }),
                notfound: response({ status: 404, content: warehouseNotFoundError }),
            }
        }),

        markWarehouseMaintence: operation('POST', '/{warehouseId}/maintence', {

            summary: 'Mark warehouse as maintence',

            description: trimStart`
                # Mark warehouse as 'Maintence'
            `,

            responses: {
                ok: response({ status: 200 }),
                notfound: response({ status: 404, content: warehouseNotFoundError }),
            }
        }),


        getMaybe: operation('GET', '/maybe', {

            responses: {
                ok: response({ status: 200, content: maybe })
            }
        })
    }
})
