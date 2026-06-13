export class RipError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'RipError'
  }
}

export class IngestionError extends RipError {
  constructor(message: string, cause?: unknown) {
    super(message, 'INGESTION_ERROR', cause)
    this.name = 'IngestionError'
  }
}

export class ParseError extends RipError {
  constructor(message: string, public readonly filePath: string, cause?: unknown) {
    super(message, 'PARSE_ERROR', cause)
    this.name = 'ParseError'
  }
}

export class GraphError extends RipError {
  constructor(message: string, cause?: unknown) {
    super(message, 'GRAPH_ERROR', cause)
    this.name = 'GraphError'
  }
}
