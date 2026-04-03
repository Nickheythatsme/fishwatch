export const gaugeResolvers = {
  GaugeReading: {
    stationId: (parent: Record<string, unknown>) => parent.station_id,
    measuredAt: (parent: Record<string, unknown>) => parent.measured_at,
    flowCfs: (parent: Record<string, unknown>) => parent.flow_cfs,
    gaugeHeightFt: (parent: Record<string, unknown>) => parent.gauge_height_ft,
    waterTempF: (parent: Record<string, unknown>) => parent.water_temp_f,
  },
}
