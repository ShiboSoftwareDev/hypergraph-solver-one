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
  prevCandidate: Candidate
  g: number
}

export class HyperGraphSolver extends BaseSolver {
  constructor(private graph: Graph) {
    super()
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
    this.graph.regions.forEach((region) => {
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
    })
    this.graph.ports.forEach((port) => {
      const { x, y, portId } = port
      graphicsObject.points.push({
        x,
        y,
        label: `x: ${x}\ny: ${y}\nportId: ${portId}`,
      })
    })
    this.graph.connections.forEach((connection) => {
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
    })
    return graphicsObject
  }
}
