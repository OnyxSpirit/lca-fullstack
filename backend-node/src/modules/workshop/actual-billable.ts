export type ActualBillableState = {
  expectedItems: number;
  confirmedItems: number;
  confirmed: boolean;
};

export function actualBillableState(expectedItems: number, confirmedItems: number, activeActualItems: number): ActualBillableState {
  return {
    expectedItems,
    confirmedItems,
    confirmed: expectedItems > 0 ? confirmedItems === expectedItems : activeActualItems > 0,
  };
}
