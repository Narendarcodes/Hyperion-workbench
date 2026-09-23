import { StaticModelRegistry, ModelProfile } from './registry';
import { LayaClient } from './laya-client';
import { RoutingPolicy, RoutingConstraint } from './policy';

export interface RoutingDecision {
  selectedModel: ModelProfile;
  taskRequirements?: {
    type: string;
    complexity: number;
  };
}

export class UniversalModelRouter {
  private registry: StaticModelRegistry;
  private laya: LayaClient;
  private policy: RoutingPolicy;

  constructor() {
    this.registry = new StaticModelRegistry();
    this.laya = new LayaClient();
    this.policy = new RoutingPolicy(this.registry);
  }

  async route(promptText: string, constraints?: RoutingConstraint): Promise<RoutingDecision> {
    try {
      const taskChar = await this.laya.characterize(promptText);
      const selectedModel = this.policy.selectModel(taskChar, constraints);
      
      if (!selectedModel) {
        throw new Error("No eligible model found for routing constraints.");
      }

      return {
        selectedModel,
        taskRequirements: {
          type: taskChar.task_type,
          complexity: taskChar.complexity,
        }
      };
    } catch (e) {
      console.warn("[UniversalModelRouter] Laya routing failed, falling back to default model.", e);
      // Fallback behavior
      const defaultModel = this.registry.getModel('gpt-4o-mini');
      if (!defaultModel) throw new Error("Fallback default model not found in registry");
      
      return { selectedModel: defaultModel };
    }
  }

  shutdown() {
    this.laya.shutdown();
  }
}
