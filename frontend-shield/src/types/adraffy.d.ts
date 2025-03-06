// src/types/adraffy.d.ts
declare module '@adraffy/words' {
  export const words: string[];
  export default words;
}

declare module '@adraffy/eth-addr' {
  export function checksumAddress(address: string): string;
  export function isAddress(address: string): boolean;
  
  const ethAddr = {
    checksumAddress,
    isAddress
  };
  
  export default ethAddr;
}

declare module '@adraffy' {
  export * from '@adraffy/words';
  export * from '@adraffy/eth-addr';
}