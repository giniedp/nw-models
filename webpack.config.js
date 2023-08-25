
const webpack = require('webpack')
const SveltePreprocess = require('svelte-preprocess')
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin');
const Autoprefixer = require('autoprefixer')

module.exports = (arg) => {
  const mode = arg.mode ?? 'development'
  const isProduction = mode === 'production'
  return {
    mode: mode,
    entry: {
      index: ['./packages/viewer/src/main.ts'],
    },
    devServer: {
      port: 9000,
      static: {
        directory: path.join(__dirname, './'),
        watch: false,
      },
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './packages/viewer/index.html',
      })
    ],
    resolve: {
      alias: {
        svelte: path.dirname(require.resolve('svelte/package.json'))
      },
      conditionNames: ['svelte'],
      extensions: ['.mjs', '.js', '.svelte', '.ts'],
      mainFields: ['svelte', 'browser', 'module', 'main']
    },
    output: {
      path: path.resolve(__dirname, 'out'),
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
            
          }
        },
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/i,
          use: ["style-loader", "css-loader"],
        }
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
