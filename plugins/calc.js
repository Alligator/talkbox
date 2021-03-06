// the order of this list is the precedence
const validOperators = ['|', '^', '&', '+', '-', '%', '/', '*'];

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
    switch (token) {
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
  const allOps = validOperators.join('');
  // very lazy, just add spaces around every word and operator
  return string
    .replace(/\)/g, ' ) ')
    .replace(/\(/g, ' ( ')
    .trim()
    .split(/ +/);
}

function calc(txt) {
  const tokens = tokenize(txt);
  let stack = [];
  log(`evaluating ${tokens}`);
  try {
    const shunted = shunt(tokens);
    log(`shunted: ${shunted}`);
    stack = evaluate(shunted);
  } catch (e) {
    return e.message;
  }

  if (stack.length === 1) {
    return stack[0];
  } else {
    log(stack);
    return 'uhh something went wrong';
  }
}

commands = { calc };
