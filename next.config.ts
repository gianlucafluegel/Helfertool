import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Prisma's generated client lives outside node_modules (custom `output` path
  // in prisma/schema.prisma) and loads its query-compiler WASM at runtime via
  // dynamic fs reads, which the standalone file tracer doesn't follow statically.
  outputFileTracingIncludes: {
    "/*": ["./generated/prisma/**/*"],
  },
};

export default nextConfig;
