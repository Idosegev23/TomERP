import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        minify: 'esbuild',
        cssMinify: true,
        sourcemap: false, // Disable source maps in production
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    router: ['react-router-dom'],
                    ui: ['@dnd-kit/core', '@dnd-kit/sortable', 'lucide-react'],
                    supabase: ['@supabase/supabase-js'],
                    i18n: ['i18next', 'react-i18next']
                },
                // Clean file names for production
                entryFileNames: 'assets/[name]-[hash].js',
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash].[ext]'
            }
        },
        chunkSizeWarningLimit: 1000
    },
    server: {
        open: false,
        strictPort: false
    },
    optimizeDeps: {
        include: [
            'react',
            'react-dom',
            'react-router-dom',
            '@supabase/supabase-js',
            'i18next',
            'react-i18next'
        ]
    }
});
