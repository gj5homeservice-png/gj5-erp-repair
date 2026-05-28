'use server';
/**
 * @fileOverview A Genkit flow that provides AI-generated diagnostic steps and common repair suggestions
 * based on device details and issue description.
 *
 * - troubleshootingAssistant - A function that triggers the AI assistant for troubleshooting.
 * - TroubleshootingAssistantInput - The input type for the troubleshootingAssistant function.
 * - TroubleshootingAssistantOutput - The return type for the troubleshootingAssistant function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TroubleshootingAssistantInputSchema = z.object({
  deviceCategory: z.string().describe('The category of the device (e.g., TV, AC, Computer, Fridge).'),
  deviceBrand: z.string().describe('The brand of the device.'),
  deviceModel: z.string().describe('The model number of the device.'),
  issueDescription: z.string().describe('A detailed description of the device issue or symptoms.'),
});
export type TroubleshootingAssistantInput = z.infer<typeof TroubleshootingAssistantInputSchema>;

const TroubleshootingAssistantOutputSchema = z.object({
  diagnosticSteps: z.array(z.string()).describe('A list of step-by-step diagnostic procedures.'),
  repairSuggestions: z.array(z.string()).describe('A list of common repair suggestions for the identified issue.'),
  estimatedComplexity: z.enum(['Low', 'Medium', 'High']).describe('An estimation of the complexity of the repair.'),
});
export type TroubleshootingAssistantOutput = z.infer<typeof TroubleshootingAssistantOutputSchema>;

export async function troubleshootingAssistant(
  input: TroubleshootingAssistantInput
): Promise<TroubleshootingAssistantOutput> {
  return troubleshootingAssistantFlow(input);
}

const troubleshootingAssistantPrompt = ai.definePrompt({
  name: 'troubleshootingAssistantPrompt',
  input: {schema: TroubleshootingAssistantInputSchema},
  output: {schema: TroubleshootingAssistantOutputSchema},
  prompt: `You are an expert technician assistant. Your task is to provide diagnostic steps and common repair suggestions for electronic devices.

Based on the following device information and issue description, provide a list of diagnostic steps, common repair suggestions, and an estimated complexity (Low, Medium, or High) for the repair.

Device Category: {{{deviceCategory}}}
Device Brand: {{{deviceBrand}}}
Device Model: {{{deviceModel}}}
Issue Description: {{{issueDescription}}}

Provide the response in a JSON format matching the TroubleshootingAssistantOutputSchema.`,
});

const troubleshootingAssistantFlow = ai.defineFlow(
  {
    name: 'troubleshootingAssistantFlow',
    inputSchema: TroubleshootingAssistantInputSchema,
    outputSchema: TroubleshootingAssistantOutputSchema,
  },
  async input => {
    const {output} = await troubleshootingAssistantPrompt(input);
    return output!;
  }
);
