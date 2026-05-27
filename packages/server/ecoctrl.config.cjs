module.exports = {
  apps: [
    {
      name: "ecoctrl-server",
      script: "index.mjs",
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,

      vizion: false,
      pmx: false,
      source_map_support: false,

      max_memory_restart: "1G",
      node_args: "--max-old-space-size=1024",

      max_restarts: 5,
      min_uptime: "10s",
      restart_delay: 3000,

      kill_timeout: 5000,
      listen_timeout: 5000,

      env: {
        NODE_ENV: "production",
      },

      env_file: "./.env.local",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      merge_logs: true,
    },
  ],
};
