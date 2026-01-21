import type { Candidate, Port } from "./HyperGraphSolver"

export function getCandidatePath(candidate: Candidate, ports: Port[]): Port[] {
  const path: Port[] = []

  let currentCandidate: Candidate | null = candidate
  while (currentCandidate) {
    const port = ports.find((port) => port.portId === currentCandidate?.portId)
    if (port) path.push(port)
    currentCandidate = currentCandidate.prevCandidate
  }

  return path.reverse()
}
