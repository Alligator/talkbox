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

module.exports = textWrap;
