// the order of this list is the precedence
const validOperators = [
  // spaced are lower precedence
  ' | ', ' ^ ', ' & ', ' + ', ' - ', ' % ', ' / ', ' * ',
  // than non-spaced
  '|', '^', '&', '+', '-', '%', '/', '*',
];

function precedence(operator) {
  return validOperators.indexOf(operator);
}

// shutning yard yo
function shunt(inTokens) {
  const tokens = [...inTokens];
  const output = [];
  const operators = [];

  while (tokens.length) {
    const token = tokens.shift();
    const tokenNum = parseInt(token, 10);

    if (!isNaN(tokenNum)) {
      // is a number
      output.push(tokenNum);
    } else if (validOperators.includes(token)) {
      // is an operator
      while (
        operators.length
        && precedence(operators[operators.length - 1]) > precedence(token)
      ) {
        output.push(operators.pop());
      }
      operators.push(token);
    } else if (token === '(') {
      operators.push(token);
    } else if (token === ')') {
      while (
        operators.length
        && operators[operators.length - 1] !== '('
      ) {
        output.push(operators.pop());
      }

      if (operators[operators.length - 1] === '(') {
        operators.pop();
      } else if (operators.length === 0) {
        throw new Error('unmatched paren');
      }
    } else {
      throw new Error(`unrecognised token: ${token}`);
    }
  }

  while (operators.length) {
    const op = operators.pop();
    if (op === '(' || op === ')') {
      throw new Error('unmatched paren');
    }
    output.push(op);
  }

  return output;
}

function evaluate(tokens) {
  const stack = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    // log(`token: "${token}", stack:${JSON.stringify(stack)}`);

    if (typeof token === 'number') {
      stack.push(token);
      continue;
    }

    const arg1 = stack.pop();
    const arg2 = stack.pop();
    switch (token.trim()) {
      case '|': stack.push(arg2 | arg1); break;
      case '^': stack.push(arg2 ^ arg1); break;
      case '&': stack.push(arg2 & arg1); break;
      case '%': stack.push(arg2 % arg1); break;
      case '+': stack.push(arg2 + arg1); break;
      case '-': stack.push(arg2 - arg1); break;
      case '*': stack.push(arg2 * arg1); break;
      case '/': stack.push(arg2 / arg1); break;
    }
  }

  return stack;
}

function tokenize(string) {
  const rules = [
    /^-?[0-9]+(\.[0-9]+)?/,
    /^ [+\-*\/] /,  // spaced
    /^[+\-*\/]/,    // non-spaced
  ];

  const tokens = [];
  let idx = 0;
  while (idx < string.length) {
    let matched = false;
    for (let i = 0; i < rules.length; i++) {
      const m = rules[i].exec(string.substring(idx));
      if (m) {
        matched = true;
        tokens.push(m[0]);
        idx += m[0].length
        break;
      }
    }

    if (!matched) {
      return null;
    }
  }

  return tokens;
}

function calc(txt) {
  const tokens = tokenize(txt);
  if (tokens === null) {
    return 'uhh something went wrong';
  }

  let stack = [];
  log(`evaluating ${JSON.stringify(tokens)}`);
  try {
    const shunted = shunt(tokens);
    log(`shunted: ${JSON.stringify(shunted)}`);
    stack = evaluate(shunted);
  } catch (e) {
    return e.message;
  }

  if (stack.length === 1) {
    return stack[0].toString();
  } else {
    log(stack);
    return 'uhh something went wrong';
  }
}

calc._help = 'calculator';

commands = { calc };

if (!require.main.filename.endsWith('index.js')) {
  console.log('--------------------');
  const assert = require('assert');
  log = console.log;

  assert.equal(calc('1 + 2'), 3);
  assert.equal(calc('1+2'), 3);
  assert.equal(calc('1 + 2 * 3'), 7);
  assert.equal(calc('2 * 3 + 1'), 7);
  assert.equal(calc('2 * 3 + 1'), 7);
}
