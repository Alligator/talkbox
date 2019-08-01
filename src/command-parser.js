const STATE_NORMAL = 'STATE_NORMAL';
const STATE_IN_QUOTE = 'STATE_IN_QUOTE';
const STATE_IN_SPACE = 'STATE_IN_SPACE';

// parse bash style command lines, e.g.
//
//   parseCommands('abc "two words" | def | ghj')
//
// results in
//
//  [
//    { commandName: 'abc', args: ['two words'] },
//    { commandName: 'def', args: [] },
//    { commandName: 'ghj', args: [] },
//  ]
function parseCommands(text) {
  const commands = text.split(/ ?\| ?/);
  return commands.map((commandText) => {
    const firstSpaceIdx = commandText.indexOf(' ');

    // simple case, just a command name
    if (firstSpaceIdx === -1) {
      return {
        commandName: commandText,
        args: [],
      };
    }

    const commandName = commandText.slice(0, firstSpaceIdx);
    const rest = commandText.slice(firstSpaceIdx + 1);

    const tokens = rest.split('');
    let tokenIdx = 0;

    const result = {
      commandName,
      args: [],
    };

    // start in the space state to handle starting with a quote
    let state = STATE_IN_SPACE;
    let currentArg = '';

    while (tokenIdx < tokens.length) {
      const token = tokens[tokenIdx];
      switch (state) {
        case STATE_NORMAL: {
          if (token === ' ') {
            result.args.push(currentArg);

            // start eating spaces
            state = STATE_IN_SPACE;
            tokenIdx++;
          } else {
            currentArg += token;
            tokenIdx++;
          }
          break;
        }

        case STATE_IN_SPACE: {
          if (token === ' ') {
            tokenIdx++;
          } else if (token === '"') {
            state = STATE_IN_QUOTE;
            currentArg = '';
            tokenIdx++;
          } else {
            state = STATE_NORMAL;
            currentArg = '';
          }
          break;
        }

        case STATE_IN_QUOTE: {
          if (token === '"') {
            state = STATE_NORMAL;
            tokenIdx++;
          } else {
            currentArg += token;
            tokenIdx++;
          }
          break;
        }
      }
    }

    if (currentArg.length > 0) {
      result.args.push(currentArg);
    }

    return result;
  });
}

module.exports = parseCommands;
