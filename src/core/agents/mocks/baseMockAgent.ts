import type { ZodType, ZodTypeDef } from 'zod';

import type { AgentModuleId, AgentService } from '../interfaces';

export abstract class ValidatedMockAgent<TInput, TOutput>
  implements AgentService<TInput, TOutput>
{
  readonly mode = 'mock' as const;

  constructor(
    readonly id: AgentModuleId,
    private readonly inputSchema: ZodType<TInput, ZodTypeDef, unknown>,
    private readonly outputSchema: ZodType<TOutput, ZodTypeDef, unknown>,
  ) {}

  async run(input: TInput): Promise<TOutput> {
    const validatedInput = this.inputSchema.parse(input);
    const result = await this.execute(validatedInput);
    return this.outputSchema.parse(result);
  }

  protected abstract execute(input: TInput): Promise<TOutput> | TOutput;
}
