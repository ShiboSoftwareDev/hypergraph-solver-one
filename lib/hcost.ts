import type { Candidate, Port } from "./HyperGraphSolver"

export function hcost(
  candidate: Candidate,
  ports: Port[],
  endPortId: string,
): number {
  const currentPort = ports.find((port) => port.portId === candidate.portId)
  const target = ports.find((port) => port.portId === endPortId)
  if (!currentPort || !target) return 0

  const distance = Math.sqrt(
    (currentPort.x - target.x) ** 2 + (currentPort.y - target.y) ** 2,
  )
  return distance
}
