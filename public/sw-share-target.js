// Custom service worker for handling Share Target API
// This file is merged with the Workbox-generated service worker

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle share target POST request
  if (url.pathname === '/share-pdf' && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request));
  }
});

async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('pdf');

    if (file && file.size > 0) {
      // Store the file in cache for the page to retrieve
      const cache = await caches.open('share-target-cache');
      const response = new Response(file, {
        headers: {
          'Content-Type': file.type,
          'X-Filename': file.name
        }
      });
      await cache.put('/shared-pdf', response);

      // Redirect to the share-pdf page
      return Response.redirect('/share-pdf?shared=true', 303);
    }

    // No file received, redirect anyway
    return Response.redirect('/share-pdf', 303);
  } catch (error) {
    console.error('Share target error:', error);
    return Response.redirect('/share-pdf?error=true', 303);
  }
}
