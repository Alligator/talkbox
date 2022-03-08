function textWrap(text, width) {
  let lines = [];

  if (text.includes('\n')) {
    // if it's got newlines just wrap it was it was given
    lines = text.split('\n');
  } else {
    const words = text.split(/ +/);
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if ((currentLine.length + word.length + 1) > width) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        if (currentLine.length > 0) {
          currentLine += ' ';
        }
        currentLine = currentLine + word;
      }
    }

    if (currentLine.length) {
      lines.push(currentLine);
    }
  }

  const longestLine = lines.reduce((acc, val) => val.length > acc.length ? val : acc);

  return { lines, longestLine };
}

function wrapTextForCanvas(ctx, text, width) {
  const lines = [];
  let lastSpace = null;
  let lastLineEnd = 0;
  let i = 0;
  while (i < text.length) {
    if (text[i] === ' ') {
      lastSpace = i;
    }

    if (text[i] === '\n') {
      lines.push(text.slice(lastLineEnd, i));
      lastLineEnd = i+1;
      lastSpace = null;
      i++;
      continue;
    }

    const metrics = ctx.measureText(text.slice(lastLineEnd, i));
    if (metrics.width > width) {
      if (lastSpace === null) {
        // no space on the this line, split the word
        lines.push(text.slice(lastLineEnd, i-1));
        lastLineEnd = i-1;
        i++;
      } else {
        // split at last space and rewind to there
        lines.push(text.slice(lastLineEnd, lastSpace));
        lastLineEnd = lastSpace + 1; // eat the space
        i = lastLineEnd;
        lastSpace = null;
      }
    } else {
      i++;
    }
  }

  lines.push(text.slice(lastLineEnd));
  return lines;
}

module.exports = { textWrap, wrapTextForCanvas };
