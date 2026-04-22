module.exports = {
  apps: [
    {
      name: "bakerlane", // This name will match your GH Variable PM2_NAME
      script: "./app.js",
      // This tells PM2 to look for the .env file in the folder it's running in
      env_file: ".env", 
    }
  ]
};