/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Uppladdade produktfoton serveras från Vercel Blobs publika
    // *.public.blob.vercel-storage.com-domän — måste vitlistas för att
    // next/image ska få optimera dem.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
