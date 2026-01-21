import { doesPathIntersectExistingRoutes } from "./doesPathIntersectExistingRoutes"
import type { Candidate, Port, Region, Routes } from "./HyperGraphSolver"

export function gcost(
  candidate: Candidate,
  ports: Port[],
  regions: Region[],
  routes: Routes,
  congestionMap: Map<string, number>,
  RIPPING_COST: number,
  CONGESTION_COST_MULTIPLIER: number,
): number {
  const currentCandidate = candidate
  const { prevCandidate } = currentCandidate
  if (!prevCandidate) return 0

  const currentPosition = ports.find(
    (port) => port.portId === currentCandidate.portId,
  )
  const prevPosition = ports.find(
    (port) => port.portId === prevCandidate.portId,
  )
  if (!currentPosition || !prevPosition) return 0

  const distance = Math.sqrt(
    (currentPosition.x - prevPosition.x) ** 2 +
      (currentPosition.y - prevPosition.y) ** 2,
  )

  const sameRegion = regions.some(
    (region) =>
      region.portIds.includes(prevPosition.portId) &&
      region.portIds.includes(currentPosition.portId),
  )
  const rippingCost =
    sameRegion &&
    doesPathIntersectExistingRoutes(
      prevPosition,
      currentPosition,
      routes,
      regions,
    )
      ? RIPPING_COST
      : 0

  const congestionCost =
    (congestionMap.get(currentPosition.portId) || 0) *
    CONGESTION_COST_MULTIPLIER

  return prevCandidate.g + distance + rippingCost + congestionCost
}
