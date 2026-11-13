export interface PrintQuoteInput {
  filamentUsedGrams: number;
  quantity: number;
  filamentCostPerGram: number;
  estimatedTime: number;
  machineHourlyRate: number;
  laborMinutes: number;
  laborHourlyRate: number;
  materialWastePercent: number;
  modelingCost: number;
  expectedCopies: number;
  extraCostPerUnit: number;
  profitMarginPercent: number;
}

export function calculatePrintQuote(input: PrintQuoteInput) {
  const round = (value: number) => Math.round((value + Number.EPSILON) * 10_000) / 10_000;
  const materialCostPerUnit = round(
    (input.filamentUsedGrams / input.quantity) *
      input.filamentCostPerGram *
      (1 + input.materialWastePercent / 100),
  );
  const machineCostPerUnit = round((input.estimatedTime / 60 * input.machineHourlyRate) / input.quantity);
  const laborCostPerUnit = round((input.laborMinutes / 60 * input.laborHourlyRate) / input.quantity);
  const modelingCostPerUnit = round(input.modelingCost / input.expectedCopies);
  const estimatedCostPerUnit = round(
    materialCostPerUnit +
      machineCostPerUnit +
      laborCostPerUnit +
      modelingCostPerUnit +
      input.extraCostPerUnit,
  );
  const suggestedPricePerUnit = round(
    estimatedCostPerUnit / (1 - input.profitMarginPercent / 100),
  );

  return {
    materialCostPerUnit,
    machineCostPerUnit,
    laborCostPerUnit,
    modelingCostPerUnit,
    estimatedCostPerUnit,
    suggestedPricePerUnit,
  };
}
