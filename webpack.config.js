const
  webpack = require('webpack'),
  path = require('path');

module.exports = {
  entry: './src/main.js',
  output: {
    filename: './dist/build.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      },
      {
        test: /\.css$/,
        use: [ 'style-loader', 'css-loader' ]
      },
      {
        test: /\.scss$/,
        use: [ 'style-loader', 'css-loader', 'sass-loader' ]
      },
      {
        test: /\.(jpe?g|png|gif)$/,
        use: [ 'file-loader?name=dist/images/[name].[ext]' ]
      }
    ]
  },
  resolve: {
    alias: {
      config: path.resolve(__dirname, 'src/config'),
      ca: path.resolve(__dirname, 'src/ca'),
      utils: path.resolve(__dirname, 'src/utils')
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      '$': 'jquery',
      'jQuery': 'jquery',
      'window.jQuery': 'jquery'
    }),
  ],
};
