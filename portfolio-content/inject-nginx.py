#!/usr/bin/env python3
import sys
import os

HOME = os.path.expanduser('~')
NGINX_CONF = next(
    path for path in (
        f'{HOME}/justin-portfolio/docker/nginx.conf',
        f'{HOME}/web-projects/justin-portfolio/docker/nginx.conf',
    )
    if os.path.exists(path)
)
SNIPPET_FILE = next(
    path for path in (
        f'{HOME}/agentic-bi-dataops-copilot/portfolio-content/nginx-proxy.conf',
        f'{HOME}/web-projects/agentic-bi-dataops-copilot/portfolio-content/nginx-proxy.conf',
    )
    if os.path.exists(path)
)
MARKER = 'agentic-bi-dataops-copilot'

snippet = open(SNIPPET_FILE).read()
conf = open(NGINX_CONF).read()

if MARKER in conf:
    print('Nginx proxy rules already present, skipping.')
    sys.exit(0)

# Insert snippet before the last closing brace of the server block
idx = conf.rfind('}')
if idx == -1:
    print('ERROR: Could not find closing brace in nginx.conf', file=sys.stderr)
    sys.exit(1)

new_conf = conf[:idx] + snippet + '\n' + conf[idx:]
open(NGINX_CONF, 'w').write(new_conf)
print('Nginx proxy rules injected successfully.')
