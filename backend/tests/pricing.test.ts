import { describe, expect, it } from 'vitest';
import { calculatePrintQuote } from '../src/services/pricing.service';

describe('Cálculo do preço de impressão', () => {
  it('distribui o consumo e o tempo do trabalho entre as peças e amortiza a modelagem', () => {
    const quote = calculatePrintQuote({
      filamentUsedGrams: 100,
      quantity: 2,
      filamentCostPerGram: 0.1,
      estimatedTime: 120,
      machineHourlyRate: 2,
      laborMinutes: 30,
      laborHourlyRate: 20,
      materialWastePercent: 10,
      modelingCost: 60,
      expectedCopies: 30,
      extraCostPerUnit: 1,
      profitMarginPercent: 20,
    });

    expect(quote).toEqual({
      materialCostPerUnit: 5.5,
      machineCostPerUnit: 2,
      laborCostPerUnit: 5,
      modelingCostPerUnit: 2,
      estimatedCostPerUnit: 15.5,
      suggestedPricePerUnit: 19.375,
    });
  });

  it('handles zero costs and zero target margin without dividing by zero', () => {
    const quote = calculatePrintQuote({
      filamentUsedGrams: 0,
      quantity: 1,
      filamentCostPerGram: 0,
      estimatedTime: 60,
      machineHourlyRate: 0,
      laborMinutes: 0,
      laborHourlyRate: 0,
      materialWastePercent: 5,
      modelingCost: 0,
      expectedCopies: 1,
      extraCostPerUnit: 0,
      profitMarginPercent: 0,
    });

    expect(quote.estimatedCostPerUnit).toBe(0);
    expect(quote.suggestedPricePerUnit).toBe(0);
  });
});
