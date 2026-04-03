"""Shared database connection helper for all jobs."""

import os

import psycopg2
from dotenv import load_dotenv

load_dotenv()


def get_connection():
    """Return a psycopg2 connection using DATABASE_URL."""
    return psycopg2.connect(os.environ["DATABASE_URL"])
