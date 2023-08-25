function cutafter(text, message, currentOutput) {
  const wc = parseInt(text, 10);
  if (isNaN(wc)) {
    return 'after how many words?';
  }

  const textToCut = currentOutput.text;
  let inSpace = false;
  let wordCount = 1;
  for (let i = 0; i < textToCut.length; i++) {
    switch (textToCut[i]) {
      case ' ':
      case '\n':
      case '\r':
      case '\t':
        inSpace = true;
        break;
      default:
        if (inSpace)
          wordCount++;
        inSpace = false;
        break;
    }
    if (inSpace && wordCount === wc) {
      return textToCut.slice(0, i);
    }
  }
  return textToCut;
}

commands = { cutafter };
