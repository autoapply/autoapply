# Copyright 2017 Pascal
# Licensed under the ISC license, see LICENSE

import unittest

from autoapply.util import Remote

class TestRemote(unittest.TestCase):
    def test_parse_https_1(self):
        r = Remote('https://example.com:8443/path/to/repo.git/some/other-path/')
        self.assertEqual(r.scheme, 'https')
        self.assertEqual(r.host, 'example.com:8443')
        self.assertEqual(r.repository, None)
        self.assertEqual(r.path, 'path/to/repo.git/some/other-path/')
        self.assertEqual(r.filename, '')

    def test_parse_https_2(self):
        r = Remote('https://some.prefix.example.com')
        self.assertEqual(r.scheme, 'https')
        self.assertEqual(r.host, 'some.prefix.example.com')
        self.assertEqual(r.repository, None)
        self.assertEqual(r.path, '')
        self.assertEqual(r.filename, '')

    def test_parse_https_3(self):
        r = Remote('https://some.prefix.example.com/some/file.txt')
        self.assertEqual(r.scheme, 'https')
        self.assertEqual(r.host, 'some.prefix.example.com')
        self.assertEqual(r.repository, None)
        self.assertEqual(r.path, 'some/file.txt')
        self.assertEqual(r.filename, 'file.txt')

    def test_parse_ssh_1(self):
        r = Remote('ssh://git@git.example.com/path/to/repo.git:some/other-path/')
        self.assertEqual(r.scheme, 'ssh')
        self.assertEqual(r.host, 'git@git.example.com')
        self.assertEqual(r.repository, 'path/to/repo.git')
        self.assertEqual(r.path, 'some/other-path/')

    def test_parse_ssh_2(self):
        r = Remote('ssh://git@git.example.com/path/to/repo.git')
        self.assertEqual(r.scheme, 'ssh')
        self.assertEqual(r.host, 'git@git.example.com')
        self.assertEqual(r.repository, 'path/to/repo.git')
        self.assertEqual(r.path, '')

    def test_parse_ssh_3(self):
        r = Remote('ssh://git@git.example.com/')
        self.assertEqual(r.scheme, 'ssh')
        self.assertEqual(r.host, 'git@git.example.com')
        self.assertEqual(r.repository, '')
        self.assertEqual(r.path, '')

    def test_parse_scp_1(self):
        r = Remote('git@git.example.com:path/to/repo.git:some/other-path/')
        self.assertEqual(r.scheme, 'ssh')
        self.assertEqual(r.host, 'git@git.example.com')
        self.assertEqual(r.repository, 'path/to/repo.git')
        self.assertEqual(r.path, 'some/other-path/')

    def test_parse_scp_2(self):
        r = Remote('git@git.example.com:path/to/repo.git')
        self.assertEqual(r.scheme, 'ssh')
        self.assertEqual(r.host, 'git@git.example.com')
        self.assertEqual(r.repository, 'path/to/repo.git')
        self.assertEqual(r.path, '')

    def test_parse_invalid_scheme_1(self):
        with self.assertRaises(Exception):
            Remote('http://insecure.example.com/')

    def test_parse_invalid_scheme_2(self):
        with self.assertRaises(Exception):
            Remote('git+ssh://example.com/')
