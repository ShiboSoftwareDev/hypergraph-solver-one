import { getIntersectingRoutesForPath } from "./getIntersectingRoutesForPath"
import type { Port, Region, Routes } from "./HyperGraphSolver"

export function doesPathIntersectExistingRoutes(
  fromPort: Port,
  toPort: Port,
  routes: Routes,
  regions: Region[],
): boolean {
  return (
    getIntersectingRoutesForPath([fromPort, toPort], routes, regions).length > 0
  )
}
