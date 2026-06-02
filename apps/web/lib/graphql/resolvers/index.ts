import { waterBodyResolvers } from './waterBody'
import { signalResolvers } from './signal'
import { reportResolvers } from './report'
import { gaugeResolvers } from './gauge'
import { regionConditionsResolvers } from './regionConditions'

export const resolvers = {
  Query: {
    ...waterBodyResolvers.Query,
    ...reportResolvers.Query,
    ...regionConditionsResolvers.Query,
  },
  WaterBody: waterBodyResolvers.WaterBody,
  Signal: signalResolvers.Signal,
  Report: reportResolvers.Report,
  GaugeReading: gaugeResolvers.GaugeReading,
}
