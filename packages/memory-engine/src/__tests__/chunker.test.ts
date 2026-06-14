import { Chunker } from '../chunker'
import type { ParsedFile } from '@rip/types'
import * as fsModule from 'fs/promises'

jest.mock('fs/promises')
const mockReadFile = fsModule.readFile as jest.Mock

const makeFile = (overrides: Partial<ParsedFile> = {}): ParsedFile => ({
  id: 'repo1:src/greeting.ts',
  repositoryId: 'repo1',
  path: '/data/src/greeting.ts',
  language: 'typescript',
  contentHash: 'abc123',
  functions: [],
  classes: [],
  imports: [],
  exports: [],
  frameworkHints: [],
  metadata: {
    parserVersion: '1.0',
    parsedAt: new Date('2026-01-01'),
    parseDurationMs: 0,
  },
  ...overrides,
})

describe('Chunker', () => {
  let chunker: Chunker

  beforeEach(() => {
    chunker = new Chunker()
    mockReadFile.mockResolvedValue(
      'function greet(name: string): string {\n  return `Hello, ${name}`\n}\n\nfunction bye() {\n  return "bye"\n}'
    )
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('creates one chunk per function', async () => {
    const file = makeFile({
      functions: [
        {
          name: 'greet',
          params: ['name: string'],
          returnType: 'string',
          location: { filePath: '/data/src/greeting.ts', startLine: 1, endLine: 3 },
          isAsync: false,
          isExported: false,
        },
        {
          name: 'bye',
          params: [],
          returnType: undefined,
          location: { filePath: '/data/src/greeting.ts', startLine: 5, endLine: 7 },
          isAsync: false,
          isExported: false,
        },
      ],
    })

    const chunks = await chunker.chunkFile(file)

    expect(chunks).toHaveLength(2)
    expect(chunks[0].nodeType).toBe('function')
    expect(chunks[0].name).toBe('greet')
    expect(chunks[0].content).toContain('function greet')
    expect(chunks[0].repositoryId).toBe('repo1')
    expect(chunks[1].name).toBe('bye')
  })

  it('creates one file-level chunk when no functions or classes', async () => {
    const file = makeFile()
    const chunks = await chunker.chunkFile(file)
    expect(chunks).toHaveLength(1)
    expect(chunks[0].nodeType).toBe('file')
    expect(chunks[0].name).toBe('greeting.ts')
  })

  it('creates class chunk + method chunks', async () => {
    mockReadFile.mockResolvedValue(
      'class AuthService {\n  login() {\n    return true\n  }\n  logout() {\n    return false\n  }\n}'
    )
    const file = makeFile({
      path: '/data/src/auth.service.ts',
      classes: [
        {
          name: 'AuthService',
          implements: [],
          isAbstract: false,
          methods: [
            {
              name: 'login',
              params: [],
              returnType: undefined,
              location: { filePath: '/data/src/auth.service.ts', startLine: 2, endLine: 4 },
              isAsync: false,
              isExported: false,
            },
            {
              name: 'logout',
              params: [],
              returnType: undefined,
              location: { filePath: '/data/src/auth.service.ts', startLine: 5, endLine: 7 },
              isAsync: false,
              isExported: false,
            },
          ],
          location: { filePath: '/data/src/auth.service.ts', startLine: 1, endLine: 8 },
        },
      ],
    })

    const chunks = await chunker.chunkFile(file)

    expect(chunks).toHaveLength(3)
    expect(chunks.find(c => c.nodeType === 'class')?.name).toBe('AuthService')
    expect(chunks.filter(c => c.nodeType === 'method')).toHaveLength(2)
  })

  it('truncates content at 2000 characters', async () => {
    mockReadFile.mockResolvedValue('x'.repeat(5000))
    const file = makeFile({
      functions: [
        {
          name: 'big',
          params: [],
          returnType: undefined,
          location: { filePath: '/data/src/greeting.ts', startLine: 1, endLine: 1 },
          isAsync: false,
          isExported: false,
        },
      ],
    })
    const chunks = await chunker.chunkFile(file)
    expect(chunks[0].content.length).toBeLessThanOrEqual(2000)
  })

  it('returns empty array when file cannot be read', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'))
    const chunks = await chunker.chunkFile(makeFile())
    expect(chunks).toHaveLength(0)
  })

  it('chunkFiles aggregates chunks from multiple files', async () => {
    mockReadFile.mockResolvedValue('function foo() {}')
    const file1 = makeFile({
      id: 'repo1:a.ts',
      path: '/data/a.ts',
      functions: [
        { name: 'foo', params: [], returnType: undefined, location: { filePath: '/data/a.ts', startLine: 1, endLine: 1 }, isAsync: false, isExported: false },
      ],
    })
    const file2 = makeFile({
      id: 'repo1:b.ts',
      path: '/data/b.ts',
      functions: [
        { name: 'foo', params: [], returnType: undefined, location: { filePath: '/data/b.ts', startLine: 1, endLine: 1 }, isAsync: false, isExported: false },
      ],
    })

    const chunks = await chunker.chunkFiles([file1, file2])

    expect(chunks).toHaveLength(2)
    expect(chunks[0].filePath).toBe('/data/a.ts')
    expect(chunks[1].filePath).toBe('/data/b.ts')
  })

  it('does not produce file-level chunk when file has both functions and classes', async () => {
    const file = makeFile({
      functions: [
        { name: 'foo', params: [], returnType: undefined, location: { filePath: '/data/src/greeting.ts', startLine: 1, endLine: 1 }, isAsync: false, isExported: false },
      ],
      classes: [
        { name: 'Bar', implements: [], isAbstract: false, methods: [], location: { filePath: '/data/src/greeting.ts', startLine: 3, endLine: 5 } },
      ],
    })

    const chunks = await chunker.chunkFile(file)

    // 1 function + 1 class (no file fallback)
    expect(chunks).toHaveLength(2)
    expect(chunks.some(c => c.nodeType === 'file')).toBe(false)
  })
})
