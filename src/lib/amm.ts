/**
 * BurgaBet AMM (Automated Market Maker) Modulis
 * 
 * Naudoja modifikuotą Constant Product Market Maker (CPMM) formulę:
 * Ry * Rn = k
 * 
 * Kur:
 * - Ry yra YES kontraktų rezervas
 * - Rn yra NO kontraktų rezervas
 * - 1 kontraktas išsprendus rinką išmokamas 100 žetonų (jei teisingas) arba 0 (jei neteisingas).
 * - Kontrakto kaina visada svyruoja tarp 1 ir 99 žetonų.
 */

export type Outcome = 'YES' | 'NO';

/**
 * Apskaičiuoja dabartinę momentinę (Spot) akcijos kainą žetonais (1-99).
 */
export function getSpotPrice(yesReserves: number, noReserves: number, outcome: Outcome): number {
  const total = yesReserves + noReserves;
  if (total === 0) return 50; // Apsauga nuo dalybos iš nulio

  let price = 0;
  if (outcome === 'YES') {
    // YES kaina priklauso nuo to, kiek NO rezervų yra fonde.
    // Jei NO rezervų daug (daug kas statė prieš YES), YES yra pigesnis.
    price = (noReserves / total) * 100;
  } else {
    price = (yesReserves / total) * 100;
  }

  // Apribojame kainą tarp 1 ir 99 žetonų, kaip nurodyta reikalavimuose
  return Math.max(1, Math.min(99, Math.round(price * 100) / 100));
}

/**
 * Apskaičiuoja, kiek akcijų (shares) gaus vartotojas už tam tikrą žetonų sumą (betAmount).
 */
export function calculateBuyShares(
  yesReserves: number,
  noReserves: number,
  outcome: Outcome,
  betAmount: number
): number {
  if (betAmount <= 0) return 0;
  
  // Konvertuojame žetonus į kontraktų poras (1 pora = 100 žetonų)
  const M = betAmount / 100;

  if (outcome === 'YES') {
    // Formulė: Sy = M * (1 + Ry / (Rn + M))
    const shares = M * (1 + yesReserves / (noReserves + M));
    return shares;
  } else {
    // Formulė: Sn = M * (1 + Rn / (Ry + M))
    const shares = M * (1 + noReserves / (yesReserves + M));
    return shares;
  }
}

/**
 * Apskaičiuoja, kiek žetonų vartotojas susigrąžins pardavęs turimas akcijas (sharesToSell).
 */
export function calculateSellRefund(
  yesReserves: number,
  noReserves: number,
  outcome: Outcome,
  sharesToSell: number
): number {
  if (sharesToSell <= 0) return 0;

  // Sprendžiame kvadratinę lygtį M pagal formulę:
  // M^2 - (Ry + Rn + S)*M + S * R_priešinga = 0
  const S = sharesToSell;
  const B = -(yesReserves + noReserves + S);
  
  // C_quad priklauso nuo to, kurias akcijas parduodame
  const C_quad = outcome === 'YES' ? S * noReserves : S * yesReserves;

  // Diskriminantas: D = B^2 - 4*A*C (A = 1)
  const D = B * B - 4 * C_quad;
  if (D < 0) return 0; // Apsauga nuo neigiamo diskriminanto (teoriškai neturėtų nutikti)

  // Pasirenkame mažesnę šaknį (-), kad M neviršytų esamų rezervų
  const M = (-B - Math.sqrt(D)) / 2;

  // Konvertuojame iš kontraktų į žetonus
  return M * 100;
}

/**
 * Apskaičiuoja prognozuojamus rezervus po statymo pirkimo sandorio.
 */
export function getExpectedNewReserves(
  yesReserves: number,
  noReserves: number,
  outcome: Outcome,
  betAmount: number
): { yesReserves: number; noReserves: number } {
  if (betAmount <= 0) return { yesReserves, noReserves };

  const M = betAmount / 100;
  const shares = calculateBuyShares(yesReserves, noReserves, outcome, betAmount);

  if (outcome === 'YES') {
    return {
      yesReserves: yesReserves + M - shares,
      noReserves: noReserves + M,
    };
  } else {
    return {
      yesReserves: yesReserves + M,
      noReserves: noReserves + M - shares,
    };
  }
}

/**
 * Apskaičiuoja kainos poveikį (Slippage) procentais.
 */
export function calculateSlippage(
  yesReserves: number,
  noReserves: number,
  outcome: Outcome,
  betAmount: number
): number {
  const currentPrice = getSpotPrice(yesReserves, noReserves, outcome);
  const shares = calculateBuyShares(yesReserves, noReserves, outcome, betAmount);
  if (shares === 0) return 0;

  const avgPrice = betAmount / shares;
  const slippage = ((avgPrice - currentPrice) / currentPrice) * 100;
  return Math.max(0, Math.round(slippage * 100) / 100);
}
