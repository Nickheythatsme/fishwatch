"""Shared database connection helper for all jobs."""

import os

import psycopg2
from dotenv import load_dotenv

load_dotenv()


def get_connection():
    """Return a psycopg2 connection using DATABASE_URL.

    Forces TLS (sslmode=require) so the connection — and the credentials in
    DATABASE_URL — can never silently fall back to plaintext. The keyword
    overrides any sslmode in the URL; to use a stricter mode (e.g. verify-full)
    set it here rather than in the connection string.
    """
    return psycopg2.connect(os.environ["DATABASE_URL"], sslmode="require")
