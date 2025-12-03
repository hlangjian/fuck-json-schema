import { array, constant, number, operation, optional, record, response, routes, string } from "@huanglangjian/schema";

export const Book = record({
    properties: {
        title: string(),
        price: optional(number())
    }
})

export const CreateBook = operation('POST', '/', {
    responses: {
        Ok: response({ status: 200 }),

        Error: response({
            status: 400,
            content: constant(string(), 'Some error happened')
        })
    }
})


export const ListBook = operation('GET', '/', {
    responses: {
        Ok: response({ status: 200, content: array(Book) }),

        NotFound: response({
            status: 404,
            content: constant(string(), 'Book not found')
        })
    }
})

export const BookController = routes('/book', {
    tags: ['Book'],
    description: 'The Book Controller provides simple APIs for managing books',
    operations: {
        CreateBook,
        ListBook,
    },
})