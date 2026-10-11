"""
Script de diagnostic : verifie la connexion PostgreSQL en contournant
le bug d'encodage Windows qui masque le vrai message d'erreur.
"""
import os
from decouple import Config, RepositoryEnv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(BASE_DIR, ".env")

if not os.path.exists(env_path):
    print("ERREUR : le fichier .env n'existe pas a cet endroit :", env_path)
    raise SystemExit(1)

config = Config(RepositoryEnv(env_path))

db_name = config("DB_NAME", default="(non defini)")
db_user = config("DB_USER", default="(non defini)")
db_host = config("DB_HOST", default="(non defini)")
db_port = config("DB_PORT", default="(non defini)")
db_password = config("DB_PASSWORD", default="")

print("--- Valeurs lues dans .env ---")
print("DB_NAME     :", repr(db_name))
print("DB_USER     :", repr(db_user))
print("DB_HOST     :", repr(db_host))
print("DB_PORT     :", repr(db_port))
print("DB_PASSWORD : longueur =", len(db_password), "| repr =", repr(db_password))
print()

print("--- Tentative de connexion directe (psycopg2) ---")
import psycopg2

try:
    conn = psycopg2.connect(
        dbname=db_name,
        user=db_user,
        password=db_password,
        host=db_host,
        port=db_port,
        client_encoding="UTF8",
    )
    print("SUCCES : connexion reussie a la base", db_name)
    conn.close()
except UnicodeDecodeError:
    print("ERREUR : le serveur a refuse la connexion (message contenant des")
    print("accents que Windows n'arrive pas a afficher). Cause la plus probable :")
    print("mot de passe incorrect, OU le mot de passe dans .env contient un")
    print("caractere special/accentue mal encode.")
except psycopg2.OperationalError as e:
    print("ERREUR OperationalError :")
    print(str(e))