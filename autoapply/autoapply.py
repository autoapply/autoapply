# Copyright 2017 Pascal
# Licensed under the ISC license, see LICENSE

import os
import sys
import argparse
import getpass
import tempfile
import subprocess
import shutil
import time
import threading
import traceback
import signal

import yaml

import autoapply.util
import autoapply.crypt
import autoapply.download

PASSWORD_FILE = '~/.autoapply/crypt.key'

def main():
    parser = argparse.ArgumentParser(prog='autoapply')
    subparsers = parser.add_subparsers(metavar='<command>', help='command to execute',
            dest='command', description=None)
    parser_apply = subparsers.add_parser('apply', help='apply the changes and exit')
    parser_apply.add_argument('url', metavar='<url>', help='the remote URL with data to apply to the cluster')
    parser_apply.add_argument('-n', '--dry-run', action='store_true',
            help="don't execute any actions, only output what would be done")
    parser_crypt = subparsers.add_parser('crypt', help='encrypt and decrypt input')
    parser_crypt.add_argument('-p', '--password', type=str, metavar='<password>', help='a file with the password to use')
    parser_crypt.add_argument('-f', '--file', type=str, metavar='<file>', help='the file to encrypt')
    parser_crypt.add_argument('-d', '--decrypt', action='store_true', help='decrypt the input instead of encrypt')
    parser_server = subparsers.add_parser('server', help='regularly check for changes and apply them')
    parser_server.add_argument('--sleep', metavar='<sleep>', type=int, default=60,
            help='sleep time in seconds between polls')
    parser_server.add_argument('url', metavar='<url>', help='the remote URL with data to apply to the cluster')
    args = parser.parse_args()
    if args.command == 'apply':
        apply(args)
    elif args.command == 'crypt':
        crypt(args)
    elif args.command == 'server':
        server(args)
    else:
        parser.print_help()
        sys.exit(1)

def apply(options):
    r = autoapply.util.Remote(options.url)
    password = read_password()
    fetch_apply(r, options.dry_run, password)

def crypt(options):
    if options.password:
        with open(options.password) as f:
            password = f.read().strip()
    else:
        password = getpass.getpass()
    if options.file:
        if not os.path.exists(options.file):
            raise Exception('no such file: %s' % options.file)
        if options.decrypt:
            if not options.file.endswith('.crypt'):
                raise Exception('missing .crypt prefix: %s' % options.file)
            output_file = options.file[:-len('.crypt')]
        else:
            output_file = options.file + '.crypt'
        if os.path.exists(output_file):
            raise Exception('output file exists: %s' % output_file)
        with open(options.file) as f:
            objs = yaml.safe_load_all(f)
            if options.decrypt:
                output_objs = autoapply.crypt.decrypt_yaml(password, objs)
            else:
                output_objs = autoapply.crypt.encrypt_yaml(password, objs)
        with open(output_file, 'w') as f:
            yaml.dump_all(output_objs, f, default_flow_style=False)
        os.remove(options.file)
    else:
        input_bytes = sys.stdin.read().strip().encode('utf-8')
        if options.decrypt:
            print(autoapply.crypt.decrypt(password, input_bytes).decode('utf-8'), end='')
        else:
            print(autoapply.crypt.encrypt(password, input_bytes))

def server(options):
    r = autoapply.util.Remote(options.url)
    password = read_password()
    exit = threading.Event()
    def quit(signal, _frame):
        print('Interrupted by %d, shutting down' % signal)
        exit.set()
    signal.signal(signal.SIGTERM, quit)
    signal.signal(signal.SIGINT, quit)
    while not exit.is_set():
        print(time.ctime(time.time()))
        try:
            fetch_apply(r, password=password)
        except:
            traceback.print_exc()
        print('Sleeping for %d seconds ...' % options.sleep)
        for s in range(options.sleep):
            exit.wait(1)
    print('Shutting down...')

def fetch_apply(remote, dry=False, password=None):
    tmp = tempfile.mkdtemp()
    try:
        autoapply.download.download(remote, tmp)
        for filename in os.listdir(tmp):
            path = '%s/%s' % (tmp, filename)
            if filename.endswith('.yaml.crypt') and os.path.isfile(path):
                if not password:
                    raise Exception('No password provided to decrypt %s' % filename)
                with open(path) as f:
                    input_objs = yaml.safe_load_all(f)
                    output_objs = autoapply.crypt.decrypt_yaml(password, input_objs)
                    kubectl_input = yaml.dump_all(output_objs).encode('utf-8')
                    print('Running kubectl apply [%s] ...' % filename)
                    subprocess.run(['kubectl', 'apply', '--dry-run=%s' % dry, '-f', '-'], input=kubectl_input)
        print('Running kubectl apply ...')
        subprocess.call(['kubectl', 'apply', '--dry-run=%s' % dry, '-f', tmp])
    finally:
        shutil.rmtree(tmp)

def read_password():
    path = os.path.expanduser(PASSWORD_FILE)
    if os.path.exists(path):
        with open(path) as f:
            return f.read().strip()
    return None
