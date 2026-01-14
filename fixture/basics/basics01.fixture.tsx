import { GenericSolverDebugger } from "@tscircuit/solver-utils/react"
import { HyperGraphSolver } from "../../lib/HyperGraphSolver"
import inputGraphJsonObject from "./basics01-input.json"

export default () => {
  return (
    <GenericSolverDebugger
      createSolver={() => new HyperGraphSolver(inputGraphJsonObject)}
    />
  )
}
