# Copyright 2017 Pascal
# Licensed under the ISC license, see LICENSE

import re
import os
import urllib.parse

DEFAULT_BRANCH = 'master'
SCP_URL_PATTERN = re.compile('^(?P<host>[^:#/]+):(?P<repo>[^:#/][^:#]*)(?::(?P<path>[^#:]+))?(?:#(?P<branch>.+))?$')

class Remote:
    def __init__(self, url):
        self.url = url
        if url.startswith('https://'):
            self.scheme = 'https'
            u = urllib.parse.urlparse(url)
            self.host = u.netloc
            self.repository = None
            self.path = u.path
            self.branch = u.fragment or DEFAULT_BRANCH
        elif url.startswith('ssh://'):
            self.scheme = 'ssh'
            u = urllib.parse.urlparse(url)
            self.host = u.netloc
            arr = u.path.split(':', 2)
            self.repository = remove_prefix(arr[0], '/')
            self.path = arr[1] if len(arr) == 2 else ''
            self.branch = u.fragment or DEFAULT_BRANCH
        else:
            m = SCP_URL_PATTERN.match(url)
            if m:
                self.scheme = 'ssh'
                self.host = m.group('host')
                self.repository = m.group('repo')
                self.path = m.group('path') or ''
                self.branch = m.group('branch') or DEFAULT_BRANCH
            else:
                raise Exception('Invalid URL: %s' % url)
        if not self.host:
            raise Exception('Missing host: %s' % url)
        while '//' in self.path:
            self.path = self.path.replace('//', '/')
        self.path = remove_prefix(self.path, '/')

    def isdir(self):
        return self.path.endswith('/')

    @property
    def filename(self):
        idx = self.path.rfind('/')
        return '' if idx == -1 else self.path[idx + 1:]

    def __str__(self):
        return 'Remote(%s)' % self.url

def remove_prefix(s, prefix):
    return s[len(prefix):] if s.startswith(prefix) else s
