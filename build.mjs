// Build do bundle único. Escrevemos em ES Modules e entregamos IIFE:
// ES Modules soltos quebram sob file:// no WebView do Android.
import { context } from 'esbuild';

const dev = process.argv.includes('--dev');
const serve = process.argv.includes('--serve');

/** @type {import('esbuild').BuildOptions} */
const options = {
  // O loader `copy` põe o index.html no watch do esbuild junto com o código.
  entryPoints: [
    { in: 'src/main.js', out: 'bundle' },
    { in: 'index.html', out: 'index' },
  ],
  loader: { '.html': 'copy' },
  outdir: 'dist',
  bundle: true,
  format: 'iife',
  target: ['es2020', 'chrome80'],
  define: { __DEV__: String(dev) },
  minify: !dev,
  sourcemap: dev ? 'inline' : false,
  legalComments: 'none',
  logLevel: 'info',
};

const ctx = await context(options);

if (serve) {
  await ctx.watch();
  // host 0.0.0.0 é o que faz o esbuild aceitar conexão do celular e imprimir
  // a URL de rede. Servir só em localhost não presta para testar no aparelho.
  await ctx.serve({ servedir: 'dist', host: '0.0.0.0', port: 8000 });
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
