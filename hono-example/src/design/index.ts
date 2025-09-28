import * as o from "@huanglangjian/schema"

const profile = o.record('com.examples.profile', {
    name: o.string(),
    age: o.optional(o.number('int'))
})

const notfound = o.record('com.examples.errors.notfound', {
    code: o.constant(o.number(), 404),
    message: o.constant(o.string(), 'Profile not found')
})

export const ProfileController = o.resource('com.examples.profileController', '/', {
    security: o.httpSecurity({
        id: 'my-security',
        schema: 'bearer',
    }),
    tags: ['Profile Resource']
})(
    o.route('/{id}', {
        id: o.derived('com.examples.profileId', o.string(), { description: 'Profile Id' })
    })({
        GetProfile: o.operation('GET', {
            responses: {
                Ok: { status: 200, content: profile },
                notfound: { status: 404, content: notfound }
            }
        })
    })
)

export const openapi = o.createOpenapi({
    resources: [ProfileController],
    title: 'My Openapi',
    version: 'v1'
})