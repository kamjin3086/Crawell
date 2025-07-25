declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.css';

declare module '*.png?url' {
  const src: string;
  export default src;
} 