const path = require('path')

module.exports = {
  assets: [
    path.resolve(__dirname, '../../packages/shared/assets/fonts'),
  ],
  opsqlite: {
    sqliteVec: true,
  },
}
