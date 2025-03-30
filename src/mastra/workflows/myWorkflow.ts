import { Step, Workflow } from '@mastra/core/workflows';
import { z } from 'zod';

const stepOne = new Step({
  id: 'stepOne',
  execute: async ({ context }) => ({
    doubledValue: context.triggerData.inputValue * 2,
  }),
});

const stepTwo = new Step({
  id: 'stepTwo',
  execute: async ({ context }) => {
    if (context.steps.stepOne.status !== 'success') {
      return { incrementedValue: 0 };
    }

    return { incrementedValue: context.steps.stepOne.output.doubledValue + 1 };
  },
});

const stepThree = new Step({
  id: 'stepThree',
  execute: async ({ context }) => {
    if (context.steps.stepTwo.status !== 'success') {
      return { tripledValue: 0 };
    }

    return { tripledValue: context.steps.stepTwo.output.incrementedValue * 3 };
  },
});

// Build the workflow
export const myWorkflow = new Workflow({
  name: 'my-workflow',
  triggerSchema: z.object({
    inputValue: z.number(),
  }),
});

// sequential steps
myWorkflow.step(stepOne).then(stepTwo).then(stepThree).commit();
