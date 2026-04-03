export const signalResolvers = {
  Signal: {
    compositeScore: (parent: Record<string, unknown>) => parent.composite_score,
    scoreDate: (parent: Record<string, unknown>) => parent.score_date,
    flowScore: (parent: Record<string, unknown>) => parent.flow_score,
    sentimentScore: (parent: Record<string, unknown>) => parent.sentiment_score,
    consensusScore: (parent: Record<string, unknown>) => parent.consensus_score,
    recommendedSpecies: (parent: Record<string, unknown>) =>
      (parent.recommended_species as string[]) ?? [],
    recommendedFlies: (parent: Record<string, unknown>) =>
      (parent.recommended_flies as string[]) ?? [],
  },
}
