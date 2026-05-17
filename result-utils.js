// result-parts.jsx — Result dashboard sub-components

function formatNum(n) {
  if (n == null || isNaN(n)) return '-';
  return Math.round(n).toLocaleString('en-US');
}

function parseAmount(s) {
  if (s == null) return NaN;
  return Number(String(s).replace(/[^\d.-]/g, ''));
}

// Compute bid price = base * rate% * lowerBound%
function bidPrice(basePrice, rate, lowerBound) {
  if (isNaN(basePrice) || isNaN(rate) || isNaN(lowerBound)) return null;
  return basePrice * (rate / 100) * (lowerBound / 100);
}

window.formatNum = formatNum;
window.parseAmount = parseAmount;
window.bidPrice = bidPrice;
