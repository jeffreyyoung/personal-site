function FileListPlugin(options) {}

FileListPlugin.prototype.apply = function(compiler) {
  compiler.plugin('emit', function(compilation, callback) {
    
		// Create a header string for the generated file:
    var filelist = 'In this build:\n\n';

    // Loop through all compiled assets,
    // adding a new line item for each filename.
    for (var filename in compilation.assets) {
			console.log(filename)
			setTimeout(() => console.log(filename), 5000);
      filelist += ('- '+ filename +'\n');
    }
    
    // Insert this list into the Webpack build as a new file asset:
    compilation.assets['filelist.md'] = {
      source: function() {
        return filelist;
      },
      size: function() {
        return filelist.length;
      }
    };

    callback();
  });
};


const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const nextPathMapHelper = require('./util/nextConfigHelper');
const generatePosts = require('./generatePostHtml');
module.exports = {
  exportPathMap: function () {
    return nextPathMapHelper({
      "/": { page: "/" },
      "/about": { page: "/about" },
			"/resume": { page: "/resume" }
    })
  },
}