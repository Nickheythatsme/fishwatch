import {
  GraphQLError,
  Kind,
  type ASTVisitor,
  type FragmentDefinitionNode,
  type SelectionSetNode,
  type ValidationContext,
} from 'graphql'

/**
 * A GraphQL validation rule that rejects queries nested deeper than `maxDepth`.
 *
 * The schema is cyclic (`WaterBody.recentReports -> Report.waterBody -> ...`),
 * so without a depth bound a single query can fan out into an arbitrarily
 * expensive tree of resolver calls. This follows fragment spreads and guards
 * against fragment cycles.
 */
export function maxDepthRule(maxDepth: number) {
  return (context: ValidationContext): ASTVisitor => {
    const fragments: Record<string, FragmentDefinitionNode> = {}
    for (const def of context.getDocument().definitions) {
      if (def.kind === Kind.FRAGMENT_DEFINITION) fragments[def.name.value] = def
    }

    const depthOf = (
      selectionSet: SelectionSetNode,
      visitedFragments: Set<string>
    ): number => {
      let deepest = 0
      for (const selection of selectionSet.selections) {
        if (selection.kind === Kind.FIELD) {
          const sub = selection.selectionSet ? depthOf(selection.selectionSet, visitedFragments) : 0
          deepest = Math.max(deepest, 1 + sub)
        } else if (selection.kind === Kind.INLINE_FRAGMENT && selection.selectionSet) {
          deepest = Math.max(deepest, depthOf(selection.selectionSet, visitedFragments))
        } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
          const name = selection.name.value
          if (visitedFragments.has(name)) continue
          const frag = fragments[name]
          if (frag) {
            deepest = Math.max(
              deepest,
              depthOf(frag.selectionSet, new Set(visitedFragments).add(name))
            )
          }
        }
      }
      return deepest
    }

    return {
      OperationDefinition(node) {
        const depth = depthOf(node.selectionSet, new Set())
        if (depth > maxDepth) {
          context.reportError(
            new GraphQLError(`Query exceeds maximum allowed depth of ${maxDepth}.`, {
              nodes: [node],
            })
          )
        }
      },
    }
  }
}
