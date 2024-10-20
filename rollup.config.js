import resolve, { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
    input: 'src/index.js',
    output: {
      file: 'dist/bundle.js',
      format: 'es',
      // name: 'howlong'
    },
    plugins: [
      resolve()
    ]
  };