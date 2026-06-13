import path from 'path'

export function getAstPath(dataDir: string, repositoryId: string, filePath: string): string {
  const sanitized = filePath.replace(/\//g, '-').replace(/\\/g, '-').replace(/^-/, '')
  return path.join(dataDir, repositoryId, 'ast', `${sanitized}.json`)
}

export function getSourcePath(dataDir: string, repositoryId: string): string {
  return path.join(dataDir, repositoryId, 'source')
}

export function getRepoDataDir(dataDir: string, repositoryId: string): string {
  return path.join(dataDir, repositoryId)
}

export function toRelativePath(absolutePath: string, basePath: string): string {
  return path.relative(basePath, absolutePath).replace(/\\/g, '/')
}
