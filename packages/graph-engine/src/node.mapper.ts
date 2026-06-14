import path from "path"
import type { ParsedFile, ParsedClass, ParsedFunction } from "@rip/types"
import type { GraphNode, GraphEdge, NodeType } from "@rip/types"

let _edgeCounter = 0
function edgeId(type: string, src: string, tgt: string): string {
  return `${type}:${src}->${tgt}:${_edgeCounter++}`
}

function detectNodeType(filePath: string, hints: ParsedFile["frameworkHints"]): NodeType {
  const base = path.basename(filePath)
  const frameworks = hints.map((h) => h.framework)

  if (base.endsWith(".controller.ts") || base.endsWith(".controller.js")) return "controller"
  if (base.endsWith(".service.ts") || base.endsWith(".service.js")) return "service"
  if (base.endsWith(".module.ts") || base.endsWith(".module.js")) return "module"
  if (frameworks.includes("nestjs") || frameworks.includes("spring")) return "service"
  return "file"
}

export interface MappedGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export function mapParsedFileToGraph(file: ParsedFile): MappedGraph {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  const fileNodeType = detectNodeType(file.path, file.frameworkHints)
  const fileNode: GraphNode = {
    id: file.id,
    type: fileNodeType,
    label: path.basename(file.path),
    repositoryId: file.repositoryId,
    metadata: {
      path: file.path,
      language: file.language,
      contentHash: file.contentHash,
    },
  }
  nodes.push(fileNode)

  // Class nodes
  for (const cls of file.classes) {
    const classId = `${file.repositoryId}:${file.path}#${cls.name}`
    const classNode: GraphNode = {
      id: classId,
      type: cls.isAbstract ? "interface" : "class",
      label: cls.name,
      repositoryId: file.repositoryId,
      metadata: {
        filePath: file.path,
        startLine: cls.location.startLine,
        endLine: cls.location.endLine,
        extends: cls.extends,
        implements: cls.implements,
      },
    }
    nodes.push(classNode)

    edges.push({
      id: edgeId("CONTAINS", file.id, classId),
      sourceId: file.id,
      targetId: classId,
      type: "CONTAINS",
    })

    // Method nodes
    for (const method of cls.methods) {
      const methodId = `${classId}#${method.name}`
      nodes.push({
        id: methodId,
        type: "function",
        label: method.name,
        repositoryId: file.repositoryId,
        metadata: {
          filePath: file.path,
          startLine: method.location.startLine,
          isAsync: method.isAsync,
          params: method.params,
        },
      })
      edges.push({
        id: edgeId("CONTAINS", classId, methodId),
        sourceId: classId,
        targetId: methodId,
        type: "CONTAINS",
      })
    }

    // Inheritance edges (target resolved at merge time — using label as provisional ID)
    if (cls.extends) {
      const parentId = `${file.repositoryId}:?:${cls.extends}`
      edges.push({
        id: edgeId("EXTENDS", classId, parentId),
        sourceId: classId,
        targetId: parentId,
        type: "EXTENDS",
        properties: { targetLabel: cls.extends, unresolved: true },
      })
    }

    for (const iface of cls.implements) {
      const ifaceId = `${file.repositoryId}:?:${iface}`
      edges.push({
        id: edgeId("IMPLEMENTS", classId, ifaceId),
        sourceId: classId,
        targetId: ifaceId,
        type: "IMPLEMENTS",
        properties: { targetLabel: iface, unresolved: true },
      })
    }
  }

  // Top-level function nodes
  for (const fn of file.functions) {
    const fnId = `${file.id}#${fn.name}`
    nodes.push({
      id: fnId,
      type: "function",
      label: fn.name,
      repositoryId: file.repositoryId,
      metadata: {
        filePath: file.path,
        startLine: fn.location.startLine,
        isAsync: fn.isAsync,
        isExported: fn.isExported,
        params: fn.params,
      },
    })
    edges.push({
      id: edgeId("CONTAINS", file.id, fnId),
      sourceId: file.id,
      targetId: fnId,
      type: "CONTAINS",
    })
  }

  // Import edges (FILE --IMPORTS--> external_dependency or other FILE)
  for (const imp of file.imports) {
    const isExternal = !imp.source.startsWith(".") && !imp.source.startsWith("/")
    const targetId = isExternal
      ? `external:${imp.source}`
      : `${file.repositoryId}:${resolveImportPath(file.path, imp.source)}`

    if (isExternal) {
      // Ensure external_dependency node exists
      nodes.push({
        id: targetId,
        type: "external_dependency",
        label: imp.source,
        repositoryId: file.repositoryId,
        metadata: { package: imp.source },
      })
    }

    edges.push({
      id: edgeId("IMPORTS", file.id, targetId),
      sourceId: file.id,
      targetId: targetId,
      type: "IMPORTS",
      properties: { specifiers: imp.specifiers },
    })
  }

  return { nodes, edges }
}

function resolveImportPath(fromFile: string, importSource: string): string {
  const dir = path.dirname(fromFile)
  const resolved = path.posix.normalize(path.posix.join(dir.replace(/\\/g, "/"), importSource))
  // Strip leading ./ or / for consistency
  return resolved.replace(/^\.\//, "").replace(/^\//, "")
}
