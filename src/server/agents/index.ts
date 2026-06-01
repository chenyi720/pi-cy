export {
  registerAgent,
  getAgentDefinition,
  getAllAgentDefinitions,
  spawnAgent,
  getAgentInstance,
  getAllAgentInstances,
  deleteAgentInstance,
  getAllSwarmInstances,
  spawnSwarm,
} from "./manager.js";
export type { AgentDefinition, AgentInstance, AgentStatus } from "./types.js";
