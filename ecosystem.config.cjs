module.exports = {
  apps: [
    {
      name: "bakerlane", // This name will match your GH Variable PM2_NAME
      script: "./app.js",
      // This tells PM2 to look for the .env file in the folder it's running in
      env_file: ".env", 
      env: {
        NODE_ENV: "development",
        // Manually add one key here just to test
        RZP_KEY_ID: "rzp_live_your_actual_id1212" 
      }
    }
  ]
};