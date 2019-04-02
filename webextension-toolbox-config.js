const CopyWebpackPlugin = require('copy-webpack-plugin')
const webpack = require('webpack')
const { join } = require('path')

module.exports = {
  webpack: (config, { dev, vendor }) => {

    // inject environment variables
    config.plugins.unshift(new webpack.EnvironmentPlugin(Object.keys(process.env)))

    // copy js files to /dist
    // TODO: do not copy jquery
    config.plugins.unshift(new CopyWebpackPlugin([
      { from: 'copy/**/*' }
    ]))

    config.module.rules.push({
      test: /\.js$/,
      use: [
        {
          loader: 'babel-loader',
          options: {
            babelrc: true,
            extends: join(__dirname + '/.babelrc'),
            cacheDirectory: true,
            envName: dev ? 'development' : 'production'
          }
        }
      ]
    })

    return config
  }
}