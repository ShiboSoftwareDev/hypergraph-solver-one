import { getBoundsCenter } from "@tscircuit/math-utils"
import { BaseSolver } from "@tscircuit/solver-utils"
import type { GraphicsObject } from "graphics-debug"
import { gcost as gcostFn } from "./gcost"
import { getCandidatePath } from "./getCandidatePath"
import { getIntersectingRoutesForPath } from "./getIntersectingRoutesForPath"
import { hcost as hcostFn } from "./hcost"

export type Region = {
  minX: number
  maxX: number
  minY: number
  maxY: number
  regionId: string
  portIds: string[]
}

export type Port = {
  x: number
  y: number
  portId: string
}

export type Connection = {
  startPortId: string
  endPortId: string
  connectionId: string
}

export type Graph = {
  regions: Region[]
  connections: Connection[]
  ports: Port[]
}

export type Candidate = {
  portId: string
  prevCandidate: Candidate | null
  g: number
}

export type Routes = Map<string, Port[]>

export class HyperGraphSolver extends BaseSolver {
  private readonly RIPPING_COST = 5000
  private readonly CONGESTION_COST_MULTIPLIER = 10
  candidateQueue: Candidate[]
  connectionQueue: Connection[]
  currentConnection: Connection | undefined = undefined
  solvedConnections: Array<{ connection: Connection; route: Port[] }> = []
  routes: Routes = new Map()
  visitedPortIds: Set<string>
  congestionMap: Map<string, number>

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
    this.congestionMap = new Map()

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
      currentCandidate &&
      (this.visitedPortIds.has(currentCandidate.portId) ||
        this.usedPortIds.has(currentCandidate.portId))
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
      const finalRoute = this.getCandidatePath(currentCandidate)
      const intersectingConnectionIds = getIntersectingRoutesForPath(
        finalRoute,
        this.routes,
        this.graph.regions,
      )

      for (const id of intersectingConnectionIds) {
        this.solvedConnections = this.solvedConnections.filter(
          (sc) => sc.connection.connectionId !== id,
        )
        this.routes.delete(id)

        const rippedConnection = this.graph.connections.find(
          (c) => c.connectionId === id,
        )
        if (rippedConnection) {
          this.connectionQueue.unshift(rippedConnection)
        }
      }

      this.solvedConnections.push({
        connection: this.currentConnection,
        route: finalRoute,
      })
      const currentConnectionId: string =
        this.currentConnection?.connectionId || ""
      this.routes.set(currentConnectionId, finalRoute)

      for (const port of finalRoute) {
        this.congestionMap.set(
          port.portId,
          (this.congestionMap.get(port.portId) || 0) + 1,
        )
      }

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

    const adjacentPortIds = connectedRegions.flatMap((region) => region.portIds)
    for (const portId of adjacentPortIds) {
      const currentPort = this.graph.ports.find(
        (port) => port.portId === currentCandidate.portId,
      )
      const currentAdjacentPort = this.graph.ports.find(
        (port) => port.portId === portId,
      )
      const portRegion = this.graph.regions.find((region) =>
        region.portIds.includes(portId),
      )
      if (!currentPort || !currentAdjacentPort || !portRegion) continue

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
    return getCandidatePath(candidate, this.graph.ports)
  }

  hcost(candidate: Candidate): number {
    return hcostFn(
      candidate,
      this.graph.ports,
      this.currentConnection?.endPortId || "",
    )
  }

  gcost(candidate: Candidate): number {
    return gcostFn(
      candidate,
      this.graph.ports,
      this.graph.regions,
      this.routes,
      this.congestionMap,
      this.RIPPING_COST,
      this.CONGESTION_COST_MULTIPLIER,
    )
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
