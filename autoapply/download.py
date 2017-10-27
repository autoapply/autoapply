# Copyright 2017 Pascal
# Licensed under the ISC license, see LICENSE

import os
import re
import base64
import json
import subprocess
import urllib.request

from autoapply.util import remove_prefix

GITHUB_PATH = re.compile('^(?P<repo>[^/]+/[^/]+)(?:/tree/(?P<branch>[^/]+)/(?P<path>.*))?$')

def download(remote, target):
    ''' Downloads from the remote location into the target directory '''
    if remote.scheme == 'https':
        if remote.isdir():
            if remote.host == 'github.com' or remote.host.startswith('github.com:'):
                download_directory_github(remote, target)
            else:
                raise Exception('Directory fetching not supported for %s, scheme %s' % (url.netloc, url.scheme))
        else:
            f = remote.filename or 'output.yaml'
            download_file(remote.url, '%s/%s' % (target, f))
    elif remote.scheme == 'ssh':
        download_git_archive(remote, target)
    else:
        raise Exception('Unsupported scheme: %s' % remote)

def download_file(url, target):
    r = urllib.request.urlopen(url)
    with open(target, 'wb') as f:
        f.write(r.read())

def download_git_archive(remote, target):
    ''' Uses the git-archive command to download the required part of the repository '''
    r = '%s:%s' % (remote.host, remote.repository)
    components = remote.path.count('/')
    git_archive_cmd = ['git', 'archive', '--remote', r, remote.branch, remote.path]
    tar_cmd = ['tar', '-x', '-C', target, '--strip-components=%d' % components]
    with subprocess.Popen(git_archive_cmd, stdout=subprocess.PIPE) as git_archive:
        with subprocess.Popen(tar_cmd, stdin=git_archive.stdout, stdout=subprocess.PIPE) as tar:
            tar.communicate()
    if git_archive.returncode != 0 or tar.returncode != 0:
        raise Exception('Download failed!')

def download_directory_github(remote, target):
    # we have to use the GitHub API, because git archive is not supported:
    m = GITHUB_PATH.match(remote.path)
    if m:
        repo = m.group('repo')
        path = m.group('path') or ''
        api_url = 'https://api.github.com/repos/%s' % repo
        branch = m.group('branch') or remote.branch
        head_ref = get_github_json('%s/git/refs/heads/%s' % (api_url, branch))
        head_commit = get_github_json('%s/git/commits/%s' % (api_url, head_ref['object']['sha']))
        head_tree = get_github_json('%s/git/trees/%s?recursive=1' % (api_url, head_commit['tree']['sha']))
        truncated = head_tree['truncated']
        if truncated:
            raise Exception('Output has been truncated!')
        for obj in head_tree['tree']:
            if path == '/' or obj['path'].startswith(path):
                out = '%s/%s' % (target, remove_prefix(obj['path'], path))
                if obj['type'] == 'tree':
                    os.mkdir(out)
                else:
                    get_github_blob(obj['url'], out)
    else:
        raise Exception('Invalid path: %s' % remote.path)

def get_github_json(url):
    return json.load(urllib.request.urlopen(github_request(url)))

def get_github_blob(url, target):
    req = github_request(url)
    req.add_header('Accept', 'application/vnd.github.v3.raw')
    r = urllib.request.urlopen(req)
    with open(target, 'wb') as f:
        f.write(r.read())

def github_request(url):
    req = urllib.request.Request(url)
    username = os.getenv('GITHUB_USERNAME', '')
    password = os.getenv('GITHUB_PASSWORD', '')
    if username and password:
        auth = base64.b64encode(('%s:%s' % (username, password)).encode('utf-8'))
        req.add_header('Authorization', 'Basic %s' % auth.decode('ascii'))
    return req
