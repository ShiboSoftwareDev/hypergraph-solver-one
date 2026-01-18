import { BaseSolver } from "@tscircuit/solver-utils"
import type { GraphicsObject } from "graphics-debug"
import { getBoundsCenter } from "@tscircuit/math-utils"

type Region = {
  minX: number
  maxX: number
  minY: number
  maxY: number
  regionId: string
  portIds: string[]
}

type Port = {
  x: number
  y: number
  portId: string
}

type Connection = {
  startPortId: string
  endPortId: string
  connectionId: string
}

type Graph = {
  regions: Region[]
  connections: Connection[]
  ports: Port[]
}

type Candidate = {
  portId: string
  prevCandidate: Candidate | null
  g: number
}

type Routes = Map<string, Port[]>

export class HyperGraphSolver extends BaseSolver {
  candidateQueue: Candidate[]
  connectionQueue: Connection[]
  currentConnection: Connection | undefined = undefined
  solvedConnections: Array<{ connection: Connection; route: Port[] }> = []
  routes: Routes = new Map()
  visitedPortIds: Set<string>

  get usedPortIds() {
    const usedPortIds = new Set()
    for (const { route } of this.solvedConnections) {
      for (const port of route) {
        usedPortIds.add(port.portId)
      }
    }
    return usedPortIds
  }

  constructor(private graph: Graph) {
    super()

    this.connectionQueue = [...graph.connections]
    this.candidateQueue = []
    this.visitedPortIds = new Set()

    const firstConnection = this.connectionQueue.shift()
    if (!firstConnection) {
      this.failed = true
      this.error = "No connections found"
      return
    }

    this.currentConnection = firstConnection

    this.candidateQueue.push({
      g: 0,
      portId: firstConnection.startPortId,
      prevCandidate: null,
    })
  }

  override _step() {
    this.candidateQueue.sort(
      (a, b) => a.g + this.hcost(a) - (b.g + this.hcost(b)),
    )

    let currentCandidate = this.candidateQueue.shift()
    while (
      this.visitedPortIds.has(currentCandidate?.portId!) ||
      this.usedPortIds.has(currentCandidate?.portId)
    ) {
      currentCandidate = this.candidateQueue.shift()
    }

    if (!currentCandidate) {
      this.failed = true
      this.error = `Ran out of candidates when processing connection: ${this.currentConnection?.connectionId}`
      return
    }

    this.visitedPortIds.add(currentCandidate.portId)

    if (currentCandidate.portId === this.currentConnection?.endPortId) {
      this.solvedConnections.push({
        connection: this.currentConnection,
        route: this.getCandidatePath(currentCandidate),
      })
      const currentConnectionId: string =
        this.currentConnection?.connectionId || ""
      const finalRoute = this.getCandidatePath(currentCandidate)
      this.routes.set(currentConnectionId, finalRoute)

      if (this.connectionQueue.length === 0) {
        this.solved = true
        return
      } else {
        const nextConnection: Connection = this.connectionQueue.shift()!
        this.currentConnection = nextConnection
        const nextPort = this.graph.ports.find(
          (port) => port.portId === nextConnection.startPortId,
        )
        if (!nextPort) {
          this.failed = true
          this.error = `port: ${nextConnection.startPortId} not found`
          return
        }
        this.candidateQueue = [
          {
            portId: nextPort.portId,
            g: 0,
            prevCandidate: null,
          },
        ]
        this.visitedPortIds.clear()
        return
      }
    }

    const connectedRegions = this.graph.regions.filter((region) =>
      region.portIds.includes(currentCandidate.portId),
    )

    const adjacentPortIds = connectedRegions
      .map((region) => region.portIds)
      .flat()
    for (const portId of adjacentPortIds) {
      if (!this.visitedPortIds.has(portId))
        this.candidateQueue.push({
          portId,
          g: this.gcost({
            portId,
            g: 0,
            prevCandidate: currentCandidate,
          }),
          prevCandidate: currentCandidate,
        })
    }
  }

  getCandidatePath(candidate: Candidate): Port[] {
    const path: Port[] = []

    let currentCandidate: Candidate | null = candidate
    while (currentCandidate) {
      const port = this.graph.ports.find(
        (port) => port.portId === currentCandidate?.portId,
      )
      if (port) path.push(port)
      currentCandidate = currentCandidate.prevCandidate
    }

    return path.reverse()
  }

  hcost(candidate: Candidate): number {
    const currentPort = this.graph.ports.find(
      (port) => port.portId === candidate.portId,
    )
    const target = this.graph.ports.find(
      (port) => port.portId === this.currentConnection?.endPortId,
    )
    if (!currentPort || !target) return 0

    const distance = Math.sqrt(
      (currentPort.x - target.x) ** 2 + (currentPort.y - target.y) ** 2,
    )
    return distance
  }

  gcost(candidate: Candidate): number {
    const currentCandidate = candidate
    const { prevCandidate } = currentCandidate
    if (!prevCandidate) return 0

    const currentPosition = this.graph.ports.find(
      (port) => port.portId === currentCandidate.portId,
    )
    const prevPosition = this.graph.ports.find(
      (port) => port.portId === prevCandidate.portId,
    )
    if (!currentPosition || !prevPosition) return 0

    const distance = Math.sqrt(
      (currentPosition.x - prevPosition.x) ** 2 +
        (currentPosition.y - prevPosition.y) ** 2,
    )

    return prevCandidate.g + distance
  }

  override visualize(): GraphicsObject {
    const graphicsObject: Required<GraphicsObject> = {
      lines: [],
      points: [],
      arrows: [],
      circles: [],
      rects: [],
      texts: [],
      title: "",
      coordinateSystem: "cartesian",
    }

    if (this.iterations === 0) {
      for (const region of this.graph.regions) {
        const { maxX, maxY, minX, minY } = region
        const regionCenter = getBoundsCenter({ maxX, maxY, minX, minY })
        const regionHeight = maxY - minY
        const regionWidth = maxX - minX

        graphicsObject.rects.push({
          center: regionCenter,
          height: regionHeight,
          width: regionWidth,
          fill: "none",
          stroke: "#ce7b7b",
        })

        for (const portId of region.portIds) {
          const port = this.graph.ports.find((port) => port.portId === portId)
          if (port)
            graphicsObject.lines.push({
              points: [{ x: port.x, y: port.y }, regionCenter],
            })
        }
      }

      for (const port of this.graph.ports) {
        const { x, y, portId } = port
        graphicsObject.points.push({
          x,
          y,
          label: `portId: ${portId}`,
        })
      }
    }

    for (const connection of this.graph.connections) {
      const { endPortId, startPortId } = connection
      const startPort = this.graph.ports.find(
        (port) => port.portId === startPortId,
      )
      const endPort = this.graph.ports.find((port) => port.portId === endPortId)

      if (startPort && endPort)
        graphicsObject.lines.push({
          points: [startPort, endPort],
          strokeDash: [1, 2],
        })
    }

    for (const route of this.routes.values()) {
      for (let i = 0; i < route.length - 1; i++) {
        const firstPort = route[i]
        const secondPort = route[i + 1]

        if (firstPort && secondPort)
          graphicsObject.lines.push({
            points: [
              { x: firstPort.x, y: firstPort.y },
              { x: secondPort.x, y: secondPort.y },
            ],
            strokeColor: "red",
          })
      }
    }

    if (!this.solved)
      for (const candidate of this.candidateQueue.slice(0, 20)) {
        const currentPort = this.graph.ports.find(
          (port) => port.portId === candidate.portId,
        )
        if (!currentPort) continue
        if (!candidate.prevCandidate) continue

        const previousPort = this.graph.ports.find(
          (port) => port.portId === candidate.prevCandidate?.portId,
        )
        if (!previousPort) continue

        graphicsObject.lines.push({
          points: [
            { x: currentPort.x, y: currentPort.y },
            { x: previousPort.x, y: previousPort.y },
          ],
        })
      }

    return graphicsObject
  }
}
