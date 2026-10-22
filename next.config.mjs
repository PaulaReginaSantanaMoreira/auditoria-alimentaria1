/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async redirects() {
    return [
      {
        source: "/auditoria/nova",
        destination: "/auditorias/nova",
        permanent: true,
      },
      {
        source: "/auditoria",
        destination: "/auditorias/nova",
        permanent: true,
      },
    ];
  },
  webpack: (config) => {
    // Evita erro de EINVAL / readlink no Windows e OneDrive
    config.resolve.symlinks = false;

    // Suprime avisos internos de cache do Webpack (ex: Serializing big strings)
    config.infrastructureLogging = {
      ...config.infrastructureLogging,
      level: "error",
    };

    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { message: /Serializing big strings/ },
    ];

    return config;
  },
};

export default nextConfig;
