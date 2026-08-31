import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: true,
  // Allow any device on the local network to access the dev server
  allowedDevOrigins: ["*"],
  webpack(config, { dev }) {
    // Fix: [webpack.cache.PackFileCacheStrategy] RangeError: Array buffer
    // allocation failed on Windows with large projects.  The default
    // "filesystem" persistent cache uses pack files that can grow large
    // enough to blow through V8's typed-array allocation cap on
    // restore.  Switching dev to an in-memory cache removes the pack
    // file entirely and makes restarts fast and stable.  Production
    // builds keep the default filesystem cache (they're one-shot).
    if (dev && config.cache && typeof config.cache === "object" && "type" in config.cache) {
      (config.cache as any) = { type: "memory" };
    } else if (dev && typeof config.cache === "undefined") {
      config.cache = { type: "memory" as const };
    }

    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
