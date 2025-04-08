module.exports = {
  apps: [
    {
      name: "demodashboard",
      script: ".next/standalone/server.js",
      instances: 1,
      exec_mode: "fork",
      cwd: "/home/ec2-user/demos",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        NEXT_TELEMETRY_DISABLED: 1
      }
    }
  ]
} 