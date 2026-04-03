import { waterBodyResolvers } from './waterBody'
import { signalResolvers } from './signal'
import { reportResolvers } from './report'
import { gaugeResolvers } from './gauge'

export const resolvers = {
  Query: {
    ...waterBodyResolvers.Query,
    ...reportResolvers.Query,
  },
  WaterBody: waterBodyResolvers.WaterBody,
  Signal: signalResolvers.Signal,
  Report: reportResolvers.Report,
  GaugeReading: gaugeResolvers.GaugeReading,
}
