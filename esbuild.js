const esbuild = require('esbuild');

const watch = process.argv.includes('--watch');

const config = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  platform: 'node',
  format: 'cjs',
  target: 'node16',
  sourcemap: true,
  minify: false,
  logLevel: 'info'
};

(async () => {
  if (watch) {
    const ctx = await esbuild.context(config);
    await ctx.watch();
    console.log('Watching...');
  } else {
    await esbuild.build(config);
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
