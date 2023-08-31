const SveltePreprocess = require('svelte-preprocess')
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const Autoprefixer = require('autoprefixer')

const WORKSPACE = path.resolve(__dirname, '../../')
const MODELS_DIR = path.resolve(WORKSPACE, process.env.NW_MODELS_DIR || path.join('out', 'models'))

module.exports = (arg) => {
  const mode = arg.mode ?? 'development'
  const isProduction = mode === 'production'
  return {
    mode: mode,
    entry: {
      index: ['./index.ts'],
    },
    devServer: {
      port: 9000,
      static: {
        directory: MODELS_DIR,
        watch: false,
      },
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './index.html',
      }),
    ],
    resolve: {
      alias: {
        svelte: path.dirname(require.resolve('svelte/package.json')),
      },
      conditionNames: ['svelte'],
      extensions: ['.mjs', '.js', '.svelte', '.ts'],
      mainFields: ['svelte', 'browser', 'module', 'main'],
    },
    output: {
      path: path.resolve(WORKSPACE, 'dist/viewer'),
      filename: '[name].js',
      publicPath: '/',
    },
    module: {
      rules: [
        {
          test: /\.svelte$/,
          use: {
            loader: 'svelte-loader',
            options: {
              compilerOptions: {
                dev: !isProduction,
              },
              emitCss: isProduction,
              hotReload: !isProduction,
              preprocess: SveltePreprocess({
                typescript: true,
                scss: true,
                sass: true,
                postcss: {
                  plugins: [Autoprefixer()],
                },
              }),
            },
          },
        },
        {
          // required to prevent errors from Svelte on Webpack 5+, omit on Webpack 4
          test: /node_modules\/svelte\/.*\.mjs$/,
          resolve: {
            fullySpecified: false,
          },
        },
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader', 'postcss-loader'],
        },
      ],
    },
    target: 'web',
    devtool: isProduction ? false : 'source-map',
    stats: {
      chunks: false,
      chunkModules: false,
      modules: false,
      assets: true,
      entrypoints: false,
    },
  }
}
