# VOLTRA — GitHub Pages export

Upload the contents of this folder to the root of your GitHub repository (not the enclosing folder). In Settings → Pages choose GitHub Actions, then run the included Deploy Pages workflow. Alternatively, choose Deploy from a branch, main, / (root).

No build or installation is required. All asset paths work beneath a repository subdirectory. The right panel shows pallets only; select rows using the left panel.

Cross-device sync uses the existing VOLTRA hosted backend at https://voltra-load-studio.skodovajarmilatt.chatgpt.site/api/workspace and therefore requires that service to remain online. GitHub Pages hosts the UI, not the storage service. Without an internet connection, the planner and device-local saved plans remain usable after the page has loaded, but sync waits for connectivity. Do not include personal workspace links in the repository.

To use your own backend, change window.VOLTRA_SYNC_URL in index.html and implement the authenticated GET/PUT workspace API with CORS and ETag conditional writes.
