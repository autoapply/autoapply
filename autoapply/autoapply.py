# Copyright 2017 Pascal
# Licensed under the ISC license, see LICENSE

import sys
import argparse
import tempfile
import subprocess
import shutil
import time
import threading
import traceback
import signal

from autoapply.util import Remote
import autoapply.download

def main():
    parser = argparse.ArgumentParser(prog='autoapply')
    subparsers = parser.add_subparsers(metavar='<command>', help='command to execute',
            dest='command', description=None)
    parser_apply = subparsers.add_parser('apply', help='apply the changes and exit')
    parser_apply.add_argument('url', metavar='<url>', help='the remote URL with data to apply to the cluster')
    parser_apply.add_argument('-n', '--dry-run', action='store_true',
            help="don't execute any actions, only output what would be done")
    parser_server = subparsers.add_parser('server', help='regularly check for changes and apply them')
    parser_server.add_argument('--sleep', metavar='<sleep>', type=int, default=60,
            help='sleep time in seconds between polls')
    parser_server.add_argument('url', metavar='<url>', help='the remote URL with data to apply to the cluster')
    args = parser.parse_args()
    if args.command == 'apply':
        apply(args)
    elif args.command == 'server':
        server(args)
    else:
        parser.print_help()
        sys.exit(1)

def apply(options):
    r = Remote(options.url)
    fetch_apply(r, options.dry_run)

def server(options):
    r = Remote(options.url)
    exit = threading.Event()
    def quit(signal, _frame):
        print('Interrupted by %d, shutting down' % signal)
        exit.set()
    signal.signal(signal.SIGTERM, quit)
    signal.signal(signal.SIGINT, quit)
    while not exit.is_set():
        print(time.ctime(time.time()))
        try:
            fetch_apply(r)
        except:
            traceback.print_exc()
        print('Sleeping for %d seconds ...' % options.sleep)
        exit.wait(options.sleep)
    print('Shutting down...')

def fetch_apply(remote, dry=False):
    tmp = tempfile.mkdtemp()
    try:
        autoapply.download.download(remote, tmp)
        kubectl_apply(tmp, dry)
    finally:
        shutil.rmtree(tmp)

def kubectl_apply(directory, dry=False):
    print('Running kubectl apply ...')
    subprocess.call(['kubectl', 'apply', '--dry-run=%s' % dry, '-f', directory])
