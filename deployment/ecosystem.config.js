// PM2 Configuration File
// This file configures how PM2 manages the application process

module.exports = {
  apps: [
    {
      // Application Configuration
      name: process.env.PROJECT_NAME || 'vvg-app',
      script: 'npm',
      args: 'start',
      cwd: `/home/ubuntu/${process.env.PROJECT_NAME || 'vvg-app'}`,
      
      // Process Management
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      
      // Environment Variables
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      // Merge with system environment variables
      env_production: {
        NODE_ENV: 'production',
      },
      
      // Logging Configuration
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      log_file: `/home/ubuntu/logs/${process.env.PROJECT_NAME || 'vvg-app'}/combined.log`,
      out_file: `/home/ubuntu/logs/${process.env.PROJECT_NAME || 'vvg-app'}/out.log`,
      error_file: `/home/ubuntu/logs/${process.env.PROJECT_NAME || 'vvg-app'}/error.log`,
      
      // Advanced PM2 Features
      min_uptime: '10s',
      listen_timeout: 3000,
    }
  ],

  // Deployment Configuration
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'your-git-repo',
      path: `/home/ubuntu/${process.env.PROJECT_NAME || 'vvg-app'}`,
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
    }
  }
};
