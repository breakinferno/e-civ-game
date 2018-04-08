// 配置文件
const path = require("path");
const webpack = require('webpack');
const OpenBrowserPlugin = require('open-browser-webpack-plugin');
// const CommonsChunkPlugin = require('webpack').optimize.CommonsChunkPlugin;

module.exports = {
    context: __dirname,
    devtool: 'source-map',
    // target: 'node',  //会爆global is not defined;
　　entry: './test/test.js',
　　output: {
　　    path: path.resolve(__dirname, './dist'), //生成的文件存放目录
    　　filename: "test.js", //生成的文件 name 表示entry下面的app,
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
                    limit: 8192,  
                    name: '[path].[name].[ext]?[hash]'  
                }  
            }
        ]
    },
    // node: {
    //     fs: "empty"
    // },
    optimization: {
        splitChunks: {
            name: 'chunk',
            minChunks: 2
        }
    }
}