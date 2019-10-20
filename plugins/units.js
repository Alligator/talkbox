const units = {
  lbs2kg: num => num * 0.45359237,
  kg2lbs: num => num * 2.204623,
};

const createUnitConverter = (func) => (text) => {
  const num = parseFloat(text, 10);
  if (isNaN(num)) {
    return 'doesn\'t seem to be a number';
  }
  const result = func(text);

  // garbage to make it 3dp but without trailing zeroes
  return parseFloat(result.toFixed(3), 10).toString();
};

commands = {};

Object.keys(units).forEach((name) => {
  commands[name] = createUnitConverter(units[name]);
});
