import { constant, number, operation, record, response, routes, string } from "@huanglangjian/schema"

export const Book = record({
    id: 'Book',
    properties: {
        title: string(),
        price: number(),
    },
    description: 'Book'
})

export const BookRoute = routes('/books', {
    id: 'BookRoute',
    operations: {
        CreateBook: operation('POST', '/', {
            responses: {
                Ok: response({
                    status: 200,
                    content: constant(Book, {
                        title: 'Book title',
                        price: 100
                    })
                }),
                NotFound: response({
                    status: 404,
                    content: constant(string(), 'Book not found')
                })
            }
        })
    },
    tags: ['Book']
})