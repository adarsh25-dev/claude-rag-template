/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["tesseract.js", "pdf-to-img", "pdfjs-dist"],
  },
};

export default nextConfig;
