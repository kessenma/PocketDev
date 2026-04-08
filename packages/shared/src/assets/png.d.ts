declare module '*.png' {
  const value: number;
  export default value;
}

// Allow require() for React Native asset loading without pulling in @types/node
declare function require(id: string): any;
