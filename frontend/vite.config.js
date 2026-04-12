import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repoName = 'handwritten-font-generator';
const isGithubPages = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  plugins: [react()],
  base: isGithubPages ? `/${repoName}/` : '/',
  server: {
    port: 5173,
  },
});
