import type { ZodType } from 'zod';

import type { AgentModuleId, AgentService } from '../interfaces';

export abstract class ValidatedMockAgent<TInput, TOutput>
  implements AgentService<TInput, TOutput>
{
  readonly mode = 'mock' as const;

  constructor(
    readonly id: AgentModuleId,
    private readonly inputSchema: ZodType<TInput>,
    private readonly outputSchema: ZodType<TOutput>,
  ) {}

  async run(input: TInput): Promise<TOutput> {
    const validatedInput = this.inputSchema.parse(input);
    const result = await this.execute(validatedInput);
    return this.outputSchema.parse(result);
  }

  protected abstract execute(input: TInput): Promise<TOutput> | TOutput;
}
