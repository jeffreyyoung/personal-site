const nextPathMapHelper = require('./util/nextConfigHelper');
module.exports = {
  exportPathMap: function () {
    return nextPathMapHelper({
      "/": { page: "/" },
      "/about": { page: "/about" }
    })
  },
}