/** Static BHD-based FX rates for Store 2.
 *  These replace the live getRates() call used by Store 1.
 *  1 unit of the foreign currency = rate BHD. */

export const STORE2_FX_RATES: Record<string, number> = {
  KWD: 1.22,
  OMR: 0.98,
  QAR: 0.10,
  SAR: 0.10,
  AED: 0.10,
  BHD: 1.00,
};
