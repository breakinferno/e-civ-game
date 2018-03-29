// 配置文件
const path = require("path");
const webpack = require('webpack');
const OpenBrowserPlugin = require('open-browser-webpack-plugin');
// const CommonsChunkPlugin = require('webpack').optimize.CommonsChunkPlugin;

module.exports = {
    context: __dirname,
    devtool: 'source-map',
　　entry: './test/test.js',
　　output: {
　　    path: path.resolve(__dirname, './dist'), //生成的文件存放目录
        publicPath: '/dist/',
    　　filename: "bundle.js", //生成的文件 name 表示entry下面的app,
        library: 'e-civ-game',
        libraryTarget: 'umd'
　　},
    resolve: {
        extensions: ['.js', '.jsx', '.json'],
        alias: {
            '@': path.join(__dirname, 'src')
        }
    },
    module: {
        rules: [
            {  
                test: /\.js$/,  
                exclude: /node_modules/,  
                include: path.resolve(__dirname, 'src'),
                loader: 'babel-loader'  
            }, 
            {
                test: /\.html/,
                loader: "html-loader"
            }, 
            {  
                test: /\.(png|jpg|gif|ttf|svg|woff|eot)$/,  
                loader: 'url-loader',  
                query: {  
                    limit: 10000,  
                    name: '[name].[ext]?[hash]'  
                }  
            }
        ]
    },
    plugins: [
        new webpack.optimize.ModuleConcatenationPlugin(),
        new OpenBrowserPlugin({ url: 'http://localhost:8080/test/index.html' })
    ],
    optimization: {
        splitChunks: {
            name: 'chunk',
            minChunks: 2
        }
    },
    devServer: {
        contentBase: __dirname,
        compress: true,
        historyApiFallback: true,
        inline: true,
        hot: true,
        port: 8080
    }
}