import numeral from 'numeral';

// ----------------------------------------------------------------------

export function fNumber(number: number = 0): string {
  return numeral(number).format();
}

export function fCurrency(number: number = 0): string {
  const format = number ? numeral(number).format('$0,0.00') : '0';

  return result(format, '.00');
}

export function fPercent(number: number = 0): string {
  const format = number ? numeral(Number(number) / 100).format('0.0%') : '0';

  return result(format, '.0');
}

export function fShortenNumber(number: number = 0): string {
  const format = number ? numeral(number).format('0.00a') : '0';

  return result(format, '.00');
}

export function fData(number: number = 0): string {
  const format = number ? numeral(number).format('0.0 b') : '0';

  return result(format, '.0');
}

export function fRupiah(number: number = 0): string {
  const format = number ? numeral(number).format('0,0') : '0';

  return format.replace(/,/g, '.');
}

function result(format: string, key: string = '.00'): string {
  const isInteger = format.includes(key);

  return isInteger ? format.replace(key, '') : format;
}
