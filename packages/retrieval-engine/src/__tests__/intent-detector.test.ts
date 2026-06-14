import { IntentDetector } from '../intent-detector'

describe('IntentDetector', () => {
  const detector = new IntentDetector()

  it.each([
    ['where is authentication handled?', 'find-ownership'],
    ['who handles the login?', 'find-ownership'],
    ['which service is responsible for payments?', 'find-ownership'],
    ['how does login work?', 'trace-flow'],
    ['what happens when a user registers?', 'trace-flow'],
    ['trace the request flow', 'trace-flow'],
    ['explain the overall architecture', 'explain-arch'],
    ['give me an overview of this codebase', 'explain-arch'],
    ['where are JWT tokens generated?', 'locate-logic'],
    ['find all database calls', 'locate-logic'],
    ['locate the validation logic', 'locate-logic'],
    ['what breaks if I change UserService?', 'explain-deps'],
    ['what depends on the AuthModule?', 'explain-deps'],
    ['what imports this utility?', 'explain-deps'],
  ])('detects "%s" as %s', (question, expected) => {
    expect(detector.detect(question)).toBe(expected)
  })

  it('extracts meaningful keywords', () => {
    const keywords = detector.extractKeywords('where is authentication handled?')
    expect(keywords).toContain('authentication')
    expect(keywords).not.toContain('where')
    expect(keywords).not.toContain('is')
  })

  it('defaults to explain-arch for ambiguous questions', () => {
    expect(detector.detect('tell me something')).toBe('explain-arch')
  })
})
