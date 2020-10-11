function temp(text) {
  const num = parseInt(text, 10);
  if (isNaN(num)) {
    return 'not a number mate';
  }

  // nonsense here because we want toFixed(2) but without extra traling zeroes
  const c = parseFloat(((num - 32) * (5 / 9)).toFixed(2)).toString();
  const f = parseFloat(((num * (9 / 5)) + 32).toFixed(2)).toString();
  const n = parseFloat(num.toFixed(2)).toString();

  return `${num}°F is ${c}°C. ${num}°C is ${f}°F`;
}

commands = { temp };
