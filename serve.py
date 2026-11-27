"""Static dev server with caching disabled, so edits show on reload.

Usage: python3 serve.py [port]   (default 8496)
"""
import http.server
import sys


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8496
    http.server.ThreadingHTTPServer(("127.0.0.1", port), NoCache).serve_forever()
