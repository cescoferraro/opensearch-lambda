/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const nodeExternals = require('webpack-node-externals');
const CopyPlugin = require('copy-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const _ = require('lodash');


module.exports = {
    mode: 'production',
    entry: {'handler': "./handler.ts", "lambda-wrapper": "./lambda-wrapper.js"},
    target: 'node',
    resolve: {
        extensions: ['.mjs', '.ts', '.js'],
        plugins: [new TsconfigPathsPlugin()],
    },
    output: {
        libraryTarget: 'commonjs2',
        path: path.join(__dirname, '.webpack'),
        filename: '[name].js',
    },
    externals: [nodeExternals()],
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: 'migrations', to: 'migrations' },
            ],
        }),
    ],
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [{loader: 'ts-loader', options: {onlyCompileBundledFiles: true}}],
            },
        ],
    },
    optimization: {
        // fix node modules not packaged into zip
        // concatenateModules: true,
    },
};