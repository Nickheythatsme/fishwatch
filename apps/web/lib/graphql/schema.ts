export const typeDefs = /* GraphQL */ `
  type Query {
    """All water bodies, optionally filtered by region"""
    waterBodies(region: String): [WaterBody!]!

    """Single water body by ID or slug"""
    waterBody(id: ID, slug: String): WaterBody

    """Top-scoring water bodies right now"""
    topPicks(limit: Int = 5): [WaterBody!]!

    """Search parsed reports across all sources"""
    reports(
      waterBodyId: ID
      sourceName: String
      limit: Int = 20
      offset: Int = 0
    ): [Report!]!
  }

  type WaterBody {
    id: ID!
    name: String!
    slug: String!
    region: String!
    latitude: Float!
    longitude: Float!
    description: String
    typicalSpecies: [String!]!

    """Most recent signal score"""
    currentSignal: Signal

    """Historical signals for charting"""
    signals(days: Int = 30): [Signal!]!

    """Latest parsed reports from all shops"""
    recentReports(limit: Int = 10): [Report!]!

    """Current and recent gauge readings"""
    gaugeReadings(hours: Int = 24): [GaugeReading!]!

    """Current flow in CFS from most recent reading"""
    currentFlow: Float
  }

  type Signal {
    id: ID!
    scoreDate: String!
    compositeScore: Float!
    flowScore: Float
    sentimentScore: Float
    consensusScore: Float
    recommendedSpecies: [String!]!
    recommendedFlies: [String!]!
    summary: String
  }

  type Report {
    id: ID!
    sourceName: String!
    reportDate: String
    sentiment: Sentiment
    speciesMentioned: [String!]!
    flyPatternsMentioned: [String!]!
    conditionsSummary: String
    flowCommentary: String
    waterClarity: String
    hatches: [Hatch!]!
    riverSection: String
    waterBody: WaterBody
  }

  type Hatch {
    name: String!
    stage: String
    timing: String
  }

  type GaugeReading {
    id: ID!
    stationId: String!
    measuredAt: String!
    flowCfs: Float
    gaugeHeightFt: Float
    waterTempF: Float
  }

  enum Sentiment {
    EXCELLENT
    GOOD
    FAIR
    POOR
    OFF
  }
`
