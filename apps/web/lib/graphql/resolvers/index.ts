import { waterBodyResolvers } from './waterBody'
import { signalResolvers } from './signal'
import { reportResolvers } from './report'
import { gaugeResolvers } from './gauge'
import { regionConditionsResolvers } from './regionConditions'
import { basinResolvers } from './basin'

export const resolvers = {
  Query: {
    ...waterBodyResolvers.Query,
    ...reportResolvers.Query,
    ...regionConditionsResolvers.Query,
    ...basinResolvers.Query,
  },
  WaterBody: {
    ...waterBodyResolvers.WaterBody,
    ...basinResolvers.WaterBody,
  },
  Basin: basinResolvers.Basin,
  Signal: signalResolvers.Signal,
  Report: reportResolvers.Report,
  GaugeReading: gaugeResolvers.GaugeReading,
}
