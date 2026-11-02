// Hello world
export function fCapitalizeFirstLetter(str: string): string {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

// Hello World
export function fTitleCase(str: string): string {
  if (str) {
    return str
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return '';
}

// HELLO WORLD
export function fUppercase(str: string): string {
  return str ? str.toUpperCase() : '';
}

// hello world
export function fLowercase(str: string): string {
  return str ? str.toLowerCase() : '';
}

// hello-world
export function fSlug(str: string): string {
  return str
    ? str
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, '')
    : '';
}

// h
export function fFirstChar(str: string): string {
  return str ? str.charAt(0).toUpperCase() : '';
}
