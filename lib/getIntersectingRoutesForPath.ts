import { doesLineIntersectLine } from "@tscircuit/math-utils"
import type { Point } from "graphics-debug"
import type { Port, Region, Routes } from "./HyperGraphSolver"

export function getIntersectingRoutesForPath(
  path: Port[],
  routes: Routes,
  regions: Region[],
): string[] {
  const intersectingConnectionIds: string[] = []

  for (let i = 0; i < path.length - 1; i++) {
    const fromPort = path[i]
    const toPort = path[i + 1]
    if (!fromPort || !toPort) continue
    const line1: [Point, Point] = [
      { x: fromPort.x, y: fromPort.y },
      { x: toPort.x, y: toPort.y },
    ]

    const segmentRegion = regions.find(
      (r) =>
        r.portIds.includes(fromPort.portId) &&
        r.portIds.includes(toPort.portId),
    )

    for (const [connectionId, route] of routes) {
      for (let j = 0; j < route.length - 1; j++) {
        const port1 = route[j]
        const port2 = route[j + 1]
        if (!port1 || !port2) continue
        const line2: [Point, Point] = [
          { x: port1.x, y: port1.y },
          { x: port2.x, y: port2.y },
        ]
        if (doesLineIntersectLine(line1, line2)) {
          const existingSegmentRegion = regions.find(
            (r) =>
              r.portIds.includes(port1.portId) &&
              r.portIds.includes(port2.portId),
          )
          if (
            segmentRegion &&
            existingSegmentRegion &&
            segmentRegion.regionId === existingSegmentRegion.regionId
          ) {
            if (!intersectingConnectionIds.includes(connectionId)) {
              intersectingConnectionIds.push(connectionId)
            }
          }
        }
      }
    }
  }
  return intersectingConnectionIds
}
