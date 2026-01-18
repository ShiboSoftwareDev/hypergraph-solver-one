import { GenericSolverDebugger } from "@tscircuit/solver-utils/react"
import { HyperGraphSolver } from "../../lib/HyperGraphSolver"
import input from "./basics02-input.json"

export default () => {
  return (
    <GenericSolverDebugger createSolver={() => new HyperGraphSolver(input)} />
  )
}
