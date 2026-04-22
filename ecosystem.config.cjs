module.exports = {
  apps: [
    {
      name: "bakerlane",           // prod → pm2 list shows this
      script: "./app.js",
      node_args: "--env-file=.env",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "bakerlane-test",      // dev → pm2 list shows this
      script: "./app.js",
      node_args: "--env-file=.env",
      env: {
        NODE_ENV: "development"
      }
    }
  ]
};