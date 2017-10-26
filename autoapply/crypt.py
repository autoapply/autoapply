# Copyright 2017 Pascal
# Licensed under the ISC license, see LICENSE

import os
import base64

import yaml
from cryptography.fernet import Fernet
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

import autoapply.util

CRYPT_PREFIX = 'autoapply-crypt::'
KDF_ITERATIONS = 100001

def encrypt_yaml(password, objs):
    result = []
    for obj in objs:
        if 'data' in obj:
            data = obj['data']
            for key in data.keys():
                raw = base64.b64decode(data[key])
                data[key] = encrypt(password, raw)
        result.append(obj)
    return result

def decrypt_yaml(password, objs):
    result = []
    for obj in objs:
        if 'data' in obj:
            data = obj['data']
            for key in data.keys():
                if data[key].startswith(CRYPT_PREFIX):
                    data[key] = base64.b64encode(decrypt(password, data[key])).decode('ascii')
        result.append(obj)
    return result

def encrypt(password, msg):
    ''' Returns a base64 encoded str with the encrypted message '''
    salt = os.urandom(16)
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=KDF_ITERATIONS,
            backend=default_backend())
    key = base64.urlsafe_b64encode(kdf.derive(password.encode('utf-8')))
    f = Fernet(key)
    encrypted = f.encrypt(msg)
    encrypted_raw = base64.urlsafe_b64decode(encrypted)
    return CRYPT_PREFIX + base64.b64encode(salt + encrypted_raw).decode('ascii')

def decrypt(password, msg):
    ''' Returns the raw bytes of the decrypted message '''
    msg_raw = base64.b64decode(autoapply.util.remove_prefix(msg, CRYPT_PREFIX))
    salt = msg_raw[:16]
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=KDF_ITERATIONS,
            backend=default_backend())
    key = base64.urlsafe_b64encode(kdf.derive(password.encode('utf-8')))
    f = Fernet(key)
    return f.decrypt(base64.urlsafe_b64encode(msg_raw[16:]))
