export default {
  name: "dndgrid",
  version: "1.0.0",
  extra: {
    enableWeb: true
  },
  web: {
    bundler: "webpack",
    output: {
      path: "dist"
    },
    build: {
      babel: {
        include: ["@expo/vector-icons"]
      }
    }
  }
}; 