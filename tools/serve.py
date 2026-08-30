#!/usr/bin/env python3
"""Static preview server with caching disabled, so edits show on a plain
refresh (python -m http.server sends no Cache-Control and Chrome caches
heuristically). Usage: python serve.py PORT DIRECTORY"""
import functools, http.server, sys


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


port = int(sys.argv[1])
directory = sys.argv[2]
http.server.ThreadingHTTPServer(
    ("", port), functools.partial(Handler, directory=directory)
).serve_forever()
