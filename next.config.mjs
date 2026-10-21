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
    return config;
  },
};

export default nextConfig;

