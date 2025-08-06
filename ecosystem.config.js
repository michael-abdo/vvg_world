// PM2 Ecosystem Configuration for VVG World
// Supports both staging and production environments
// Usage: pm2 start ecosystem.config.js --env staging|production

module.exports = {
  apps: [
    {
      name: 'vvg-world-staging',
      script: './node_modules/.bin/next',
      args: 'start',
      cwd: '/home/ubuntu/vvg-world',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        ENVIRONMENT: 'staging'
      },
      env_staging: {
        NODE_ENV: 'production',
        PORT: 3001,
        ENVIRONMENT: 'staging'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        ENVIRONMENT: 'production'
      },
      // Logging
      out_file: './logs/staging-out.log',
      error_file: './logs/staging-error.log',
      log_file: './logs/staging-combined.log',
      time: true,
      // Health monitoring
      min_uptime: '10s',
      max_restarts: 10,
      // Graceful reload
      listen_timeout: 3000,
      kill_timeout: 5000
    },
    {
      name: 'vvg-world-production',
      script: './node_modules/.bin/next',
      args: 'start',
      cwd: '/home/ubuntu/vvg-world',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        ENVIRONMENT: 'production'
      },
      // Logging
      out_file: './logs/production-out.log',
      error_file: './logs/production-error.log',
      log_file: './logs/production-combined.log',
      time: true,
      // Health monitoring
      min_uptime: '10s',
      max_restarts: 10,
      // Graceful reload
      listen_timeout: 3000,
      kill_timeout: 5000
    }
  ]
};