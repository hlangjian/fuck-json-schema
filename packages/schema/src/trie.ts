export interface TrieNode<T> {
    type: 'trie'
    insert(path: string[], payload: T): void
    get(path: string[]): T | null
    getDirectPayloads(path: string[]): T[]
    travel(callback: (context: TravelContext<T>) => void, paths?: string[]): void
    map: Map<string, TrieNode<T> | TriePayloadNode<T>>
}

export interface TravelContext<T> {
    paths: string[]
    payloads: Map<string, T>
}

export interface TriePayloadNode<T> {
    type: 'payload'
    payload: T
}

export function createTrie<T>(): TrieNode<T> {

    const map = new Map<string, TrieNode<T> | TriePayloadNode<T>>()

    const insert = (path: string[], payload: T) => {

        if (path.length === 0) return

        const [key, ...rest] = path

        const cache = map.get(key)

        if (rest.length === 0) {
            if (cache != null) throw Error()
            map.set(key, { type: 'payload', payload })
            return
        }

        if (cache != null) {
            if (cache.type === 'trie') cache.insert(rest, payload)
            return
        }

        const subnode = createTrie<T>()

        map.set(key, subnode)

        subnode.insert(rest, payload)
    }

    const get = (path: string[]): T | null => {

        if (path.length === 0) return null

        const [key, ...rest] = path

        const subNode = map.get(key)

        if (subNode != null && subNode.type === 'trie') return subNode.get(rest)

        return null
    }

    const getDirectPayloads = (path: string[]): T[] => {

        if (path.length === 0) return [...map.values().filter(o => o.type === 'payload').map(o => o.payload)]

        const [key, ...rest] = path

        const subNode = map.get(key)

        if (subNode != null && subNode.type === 'trie') return subNode.getDirectPayloads(rest)

        return []
    }

    const travel = (callback: (context: TravelContext<T>) => void, paths: string[] = []) => {

        const payloads = new Map<string, T>()

        const subNodes = new Map<string, TrieNode<T>>()

        for (const [key, node] of map) {
            if (node.type === 'payload') payloads.set(key, node.payload)
            else subNodes.set(key, node)
        }

        if (payloads.size > 0) callback({ paths, payloads })

        for (const [key, node] of subNodes) node.travel(callback, [...paths, key])
    }

    return { type: 'trie', insert, get, getDirectPayloads, travel, map }
}